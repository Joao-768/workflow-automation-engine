import { describe, expect, it } from 'vitest'
import { validateDefinition, type ValidationIssue } from './validation'
import { nextNodeId } from './graph'
import type { WorkflowDefinition } from './definition'

const at = { x: 0, y: 0 }

/** Event trigger → condition → (true) notification, (false) record. */
function branchingWorkflow(): WorkflowDefinition {
    return {
        nodes: [
            { id: 'trigger', type: 'trigger', position: at, config: { type: 'event', eventName: 'order.created' } },
            {
                id: 'condition_1',
                type: 'condition',
                position: at,
                config: { path: 'event.total', operator: 'gt', value: '100' },
            },
            { id: 'notify', type: 'notification', position: at, config: { message: 'Big order {{event.orderId}}' } },
            {
                id: 'record',
                type: 'create_record',
                position: at,
                config: { collection: 'orders', data: { total: '{{event.total}}' } },
            },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'condition_1' },
            { id: 'e2', source: 'condition_1', target: 'notify', sourceHandle: 'true' },
            { id: 'e3', source: 'condition_1', target: 'record', sourceHandle: 'false' },
        ],
    }
}

function messages(issues: ValidationIssue[]) {
    return issues.map((issue) => issue.message)
}

function invalid(definition: unknown) {
    const result = validateDefinition(definition)
    if (result.valid) throw new Error('expected the definition to be invalid')
    return result.issues
}

describe('validateDefinition', () => {
    it('accepts a well-formed branching workflow and fills in defaults', () => {
        const result = validateDefinition(branchingWorkflow())
        expect(result.valid).toBe(true)
        if (result.valid) {
            const notify = result.definition.nodes.find((node) => node.id === 'notify')
            expect(notify?.config).toMatchObject({ level: 'info' })
        }
    })

    it('rejects graphs without a trigger or with two', () => {
        const none = branchingWorkflow()
        none.nodes = none.nodes.filter((node) => node.type !== 'trigger')
        none.edges = none.edges.filter((edge) => edge.source !== 'trigger')
        expect(messages(invalid(none))).toContain('A workflow needs a trigger node')

        const two = branchingWorkflow()
        two.nodes.push({ id: 'trigger_2', type: 'trigger', position: at, config: { type: 'manual' } })
        expect(messages(invalid(two))).toContain('A workflow can only have one trigger')
    })

    it('rejects cycles', () => {
        const graph = branchingWorkflow()
        graph.edges.push({ id: 'loop', source: 'notify', target: 'condition_1' })
        expect(messages(invalid(graph)).join()).toMatch(/Loops are not supported/)
    })

    it('rejects nodes the trigger cannot reach', () => {
        const graph = branchingWorkflow()
        graph.nodes.push({ id: 'orphan', type: 'notification', position: at, config: { message: 'x' } })
        expect(invalid(graph)).toContainEqual({
            nodeId: 'orphan',
            message: 'This node is not connected to the trigger',
        })
    })

    it('requires conditions to branch through true/false handles', () => {
        const graph = branchingWorkflow()
        graph.edges[1] = { id: 'e2', source: 'condition_1', target: 'notify' }
        expect(messages(invalid(graph)).join()).toMatch(/true or false handle/)
    })

    it('allows only one edge per exit', () => {
        const graph = branchingWorkflow()
        graph.nodes.push({ id: 'second', type: 'notification', position: at, config: { message: 'x' } })
        graph.edges.push({ id: 'e4', source: 'condition_1', target: 'second', sourceHandle: 'true' })
        expect(messages(invalid(graph))).toContain('The true branch can only lead to one node')
    })

    it('rejects edges to missing nodes and into the trigger', () => {
        const graph = branchingWorkflow()
        graph.edges.push({ id: 'ghost', source: 'notify', target: 'nowhere' })
        graph.edges.push({ id: 'back', source: 'record', target: 'trigger' })
        const found = messages(invalid(graph))
        expect(found).toContain('This connection points at a node that does not exist')
        expect(found).toContain('Nothing can connect into the trigger')
    })

    it('reports invalid node configuration with the field name', () => {
        const graph = branchingWorkflow()
        graph.nodes[0].config = { type: 'schedule', cron: '61 * * * *' }
        const issues = invalid(graph)
        expect(issues[0]).toMatchObject({ nodeId: 'trigger', field: 'cron' })
    })

    it('rejects step references to nodes that do not run earlier', () => {
        const graph = branchingWorkflow()
        // "record" sits on the false branch, "notify" on the true one.
        graph.nodes[2].config = { message: 'Record {{steps.record.id}}' }
        expect(messages(invalid(graph)).join()).toMatch(/does not run before this node/)
    })

    it('rejects malformed input without throwing', () => {
        expect(validateDefinition(null).valid).toBe(false)
        expect(validateDefinition({ nodes: [{ id: 'Bad Id' }], edges: [] }).valid).toBe(false)
    })
})

describe('nextNodeId', () => {
    it('follows the branch a condition selected', () => {
        const graph = branchingWorkflow()
        expect(nextNodeId(graph, 'trigger')).toBe('condition_1')
        expect(nextNodeId(graph, 'condition_1', 'true')).toBe('notify')
        expect(nextNodeId(graph, 'condition_1', 'false')).toBe('record')
        expect(nextNodeId(graph, 'notify')).toBeNull()
    })
})
