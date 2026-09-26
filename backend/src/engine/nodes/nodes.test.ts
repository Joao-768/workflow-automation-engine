import { describe, expect, it } from 'vitest'
import {
    TemplateError,
    workflowNodeSchema,
    type ExecutionContext,
    type NodeOfType,
} from '@wae/shared'
import { conditionNode } from './condition'
import { httpRequestNode } from './httpRequest'

const context: ExecutionContext = {
    event: { total: 149.99, country: 'PT', token: 's3cret', customer: { id: 7 } },
    trigger: { type: 'event', receivedAt: '2026-01-01T00:00:00.000Z' },
    execution: { id: 1, workflowId: 1, workflowVersion: 1 },
    steps: { lookup: { body: { id: 42 } } },
}

const at = { x: 0, y: 0 }

describe('condition node', () => {
    it('reads the path, resolves the value and picks a branch', async () => {
        const node = workflowNodeSchema.parse({
            id: 'c',
            type: 'condition',
            position: at,
            config: { path: 'event.total', operator: 'gt', value: '100' },
        }) as NodeOfType<'condition'>
        const input = conditionNode.prepare(node, context)
        expect(input).toMatchObject({ left: 149.99, right: '100' })
        const result = await conditionNode.run(input, node, {} as never)
        expect(result.branch).toBe('true')
    })

    it('can compare against an earlier step', async () => {
        const node = workflowNodeSchema.parse({
            id: 'c',
            type: 'condition',
            position: at,
            config: {
                path: 'steps.lookup.body.id',
                operator: 'equals',
                value: '{{event.customer.id}}',
            },
        }) as NodeOfType<'condition'>
        const result = await conditionNode.run(
            conditionNode.prepare(node, context),
            node,
            {} as never,
        )
        expect(result.branch).toBe('false')
    })
})

describe('http request node', () => {
    const node = workflowNodeSchema.parse({
        id: 'h',
        type: 'http_request',
        position: at,
        config: {
            method: 'POST',
            url: 'https://api.example.com/customers/{{steps.lookup.body.id}}',
            query: [
                { key: 'country', value: '{{event.country}}' },
                { key: 'api_key', value: '{{event.token}}' },
            ],
            headers: [{ key: 'Authorization', value: 'Bearer {{event.token}}' }],
            bodyType: 'json',
            body: { total: '{{event.total}}', nested: ['{{event.country}}'] },
        },
    }) as NodeOfType<'http_request'>

    it('resolves templates in the URL, query, headers and nested body', () => {
        const input = httpRequestNode.prepare(node, context)
        expect(input.url).toBe('https://api.example.com/customers/42?country=PT&api_key=s3cret')
        expect(input.headers.authorization).toBe('Bearer s3cret')
        expect(input.body).toEqual({ total: 149.99, nested: ['PT'] })
    })

    it('redacts secrets from the stored input', () => {
        const stored = httpRequestNode.redact!(httpRequestNode.prepare(node, context)) as {
            url: string
            headers: Record<string, string>
        }
        expect(stored.headers.authorization).toBe('[redacted]')
        expect(stored.url).toContain('api_key=%5Bredacted%5D')
        expect(JSON.stringify(stored)).not.toContain('s3cret')
    })

    it('fails on missing variables instead of calling a broken URL', () => {
        const broken = {
            ...node,
            config: { ...node.config, url: 'https://x.test/{{event.missing}}' },
        }
        expect(() => httpRequestNode.prepare(broken, context)).toThrow(TemplateError)
    })
})
