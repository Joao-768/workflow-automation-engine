import { describe, expect, it } from 'vitest'
import { TemplateError, workflowNodeSchema, type WorkflowNode } from '@wae/shared'
import { NodeError, toNodeError } from './errors'
import { backoffDelay, maxAttemptsFor, shouldRetry } from './retryPolicy'

const node = (input: unknown): WorkflowNode => workflowNodeSchema.parse(input)
const at = { x: 0, y: 0 }

describe('maxAttemptsFor', () => {
    it('uses per-type defaults', () => {
        expect(maxAttemptsFor(node({ id: 'c', type: 'condition', position: at, config: { path: 'x', operator: 'exists' } }))).toBe(1)
        expect(
            maxAttemptsFor(node({ id: 'h', type: 'http_request', position: at, config: { method: 'GET', url: 'https://example.com' } })),
        ).toBe(3)
    })

    it('lets HTTP and email nodes choose their own', () => {
        const http = node({
            id: 'h',
            type: 'http_request',
            position: at,
            config: { method: 'GET', url: 'https://example.com', maxAttempts: 5 },
        })
        expect(maxAttemptsFor(http)).toBe(5)
    })
})

describe('shouldRetry', () => {
    const transient = new NodeError('http_status', '500', true)
    const permanent = new NodeError('http_status', '404', false)

    it('retries retryable errors while attempts remain', () => {
        expect(shouldRetry(transient, 1, 3)).toBe(true)
        expect(shouldRetry(transient, 2, 3)).toBe(true)
        expect(shouldRetry(transient, 3, 3)).toBe(false)
    })

    it('never retries permanent errors', () => {
        expect(shouldRetry(permanent, 1, 3)).toBe(false)
    })
})

describe('toNodeError', () => {
    it('makes template errors permanent', () => {
        const error = toNodeError(new TemplateError(['event.phone']))
        expect(error.code).toBe('template_error')
        expect(error.retryable).toBe(false)
    })

    it('gives unknown exceptions the benefit of the doubt', () => {
        const error = toNodeError(new Error('connection reset'))
        expect(error.code).toBe('node_exception')
        expect(error.retryable).toBe(true)
    })

    it('keeps NodeErrors as they are', () => {
        const original = new NodeError('invalid_url', 'bad', false)
        expect(toNodeError(original)).toBe(original)
    })
})

describe('backoffDelay', () => {
    it('doubles on every attempt', () => {
        expect([1, 2, 3].map((attempt) => backoffDelay(attempt, 2000))).toEqual([2000, 4000, 8000])
    })
})
