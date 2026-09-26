import { describe, expect, it } from 'vitest'
import { findTemplatePaths, resolveTemplate, TemplateError } from './template'
import type { ExecutionContext } from './paths'

const context: ExecutionContext = {
    event: {
        email: 'ana@example.com',
        total: 149.99,
        paid: true,
        coupon: null,
        customer: { name: 'Ana', country: 'PT' },
        items: [{ sku: 'A-1' }, { sku: 'B-2' }],
    },
    trigger: { type: 'event', receivedAt: '2026-01-01T00:00:00.000Z' },
    execution: { id: 7, workflowId: 3, workflowVersion: 2 },
    steps: { http_1: { status: 201, body: { id: 42 } } },
}

describe('resolveTemplate', () => {
    it('replaces placeholders inside text', () => {
        expect(
            resolveTemplate('Hi {{event.customer.name}} from {{event.customer.country}}', context),
        ).toBe('Hi Ana from PT')
    })

    it('keeps the V1 shorthand: a bare field reads from the event', () => {
        expect(resolveTemplate('Mail {{email}}', context)).toBe('Mail ana@example.com')
    })

    it('reads outputs of earlier steps', () => {
        expect(resolveTemplate('Created {{steps.http_1.body.id}}', context)).toBe('Created 42')
    })

    it('keeps the type when the string is a single placeholder', () => {
        expect(resolveTemplate('{{event.total}}', context)).toBe(149.99)
        expect(resolveTemplate('{{ event.paid }}', context)).toBe(true)
        expect(resolveTemplate('{{event.customer}}', context)).toEqual({
            name: 'Ana',
            country: 'PT',
        })
    })

    it('reads array items by index', () => {
        expect(resolveTemplate('{{event.items.1.sku}}', context)).toBe('B-2')
    })

    it('resolves objects and arrays recursively', () => {
        const resolved = resolveTemplate(
            {
                order: { total: '{{event.total}}', tags: ['{{event.customer.country}}', 'fixed'] },
                n: 1,
            },
            context,
        )
        expect(resolved).toEqual({ order: { total: 149.99, tags: ['PT', 'fixed'] }, n: 1 })
    })

    it('renders null as empty text and objects as JSON inside text', () => {
        expect(resolveTemplate('coupon=[{{event.coupon}}]', context)).toBe('coupon=[]')
        expect(resolveTemplate('c={{event.customer}}', context)).toBe(
            'c={"name":"Ana","country":"PT"}',
        )
    })

    it('fails with every missing path instead of writing "undefined"', () => {
        try {
            resolveTemplate({ a: '{{event.phone}}', b: 'x {{steps.nope.id}}' }, context)
            expect.unreachable()
        } catch (err) {
            expect(err).toBeInstanceOf(TemplateError)
            expect((err as TemplateError).missing).toEqual(['event.phone', 'steps.nope.id'])
            expect((err as Error).message).toContain('{{event.phone}}')
        }
    })

    it('never follows prototype properties', () => {
        expect(() => resolveTemplate('{{event.constructor}}', context)).toThrow(TemplateError)
        expect(() => resolveTemplate('{{event.__proto__}}', context)).toThrow(TemplateError)
    })

    it('leaves values without placeholders untouched', () => {
        expect(resolveTemplate('plain', context)).toBe('plain')
        expect(resolveTemplate(12, context)).toBe(12)
    })
})

describe('findTemplatePaths', () => {
    it('lists normalised paths at any depth', () => {
        expect(
            findTemplatePaths({ a: '{{email}}', b: ['{{steps.x.y}} and {{ trigger.type }}'] }),
        ).toEqual(['event.email', 'steps.x.y', 'trigger.type'])
    })
})
