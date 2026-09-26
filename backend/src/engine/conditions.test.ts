import { describe, expect, it } from 'vitest'
import { evaluateCondition } from './conditions'

const check = (left: unknown, operator: Parameters<typeof evaluateCondition>[1], right?: unknown) =>
    evaluateCondition(left, operator, right).result

describe('evaluateCondition', () => {
    it('compares numbers, coercing the text value from the builder', () => {
        expect(check(149.99, 'gt', '100')).toBe(true)
        expect(check(40, 'gt', '100')).toBe(false)
        expect(check(100, 'gte', '100')).toBe(true)
        expect(check(99, 'lt', '100')).toBe(true)
        expect(check(100, 'lte', 100)).toBe(true)
        expect(check(100, 'equals', '100')).toBe(true)
        expect(check(100, 'not_equals', '100.5')).toBe(true)
    })

    it('treats numeric strings as numbers for ordering', () => {
        expect(check('250', 'gt', '100')).toBe(true)
    })

    it('never orders non-numbers and says why', () => {
        const outcome = evaluateCondition('abc', 'gt', '1')
        expect(outcome.result).toBe(false)
        expect(outcome.reason).toMatch(/numbers/)
    })

    it('compares strings exactly', () => {
        expect(check('PT', 'equals', 'PT')).toBe(true)
        expect(check('pt', 'equals', 'PT')).toBe(false)
        expect(check('ES', 'not_equals', 'PT')).toBe(true)
    })

    it('coerces booleans and null', () => {
        expect(check(true, 'equals', 'true')).toBe(true)
        expect(check(false, 'equals', 'true')).toBe(false)
        expect(check(null, 'equals', 'null')).toBe(true)
        // "true" is only coerced when the left side is a boolean
        expect(check('true', 'equals', 'true')).toBe(true)
    })

    it('checks containment in strings and arrays', () => {
        expect(check('ana@example.com', 'contains', '@example.com')).toBe(true)
        expect(check(['vip', 'new'], 'contains', 'vip')).toBe(true)
        expect(check([1, 2, 3], 'contains', '2')).toBe(true)
        expect(check(['vip'], 'not_contains', 'new')).toBe(true)
        expect(check(12, 'contains', '1')).toBe(false)
    })

    it('handles missing values', () => {
        expect(check(undefined, 'exists')).toBe(false)
        expect(check(null, 'exists')).toBe(false)
        expect(check(0, 'exists')).toBe(true)
        expect(check('', 'exists')).toBe(true)
        expect(check(undefined, 'not_exists')).toBe(true)
        // A missing value is never equal, greater or contained
        expect(check(undefined, 'equals', 'x')).toBe(false)
        expect(check(undefined, 'gt', '1')).toBe(false)
        expect(check(undefined, 'not_equals', 'x')).toBe(true)
    })

    it('reports both sides for the execution trace', () => {
        expect(evaluateCondition(149.99, 'gt', '100')).toEqual({
            result: true,
            left: 149.99,
            operator: 'gt',
            right: 100,
        })
    })
})
