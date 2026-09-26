import { MarkerType, type Edge, type Node } from '@xyflow/react'
import type { BranchHandle, NodeType, StepStatus, WorkflowDefinition } from '@wae/shared'

/**
 * The saved definition and React Flow use slightly different shapes. These
 * two functions are the only place that converts between them, so the graph
 * the user draws is exactly the graph the backend executes.
 */

export type RunState = StepStatus | 'queued' | 'idle'

export type FlowNodeData = {
    kind: NodeType
    label?: string
    config: Record<string, unknown>
    /** Validation problems on this node (builder). */
    issues?: string[]
    /** What happened to this node in an execution (execution page). */
    runState?: RunState
    runNote?: string
}

export type FlowNode = Node<FlowNodeData, 'workflow'>

/** Branch names are printed on the condition's handles, so edges stay unlabelled. */
export function edgeStyle(): Partial<Edge> {
    return {
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#5a5a5a' },
    }
}

export function toFlow(definition: WorkflowDefinition): { nodes: FlowNode[]; edges: Edge[] } {
    return {
        nodes: definition.nodes.map((node) => ({
            id: node.id,
            type: 'workflow',
            position: node.position,
            deletable: node.type !== 'trigger',
            data: { kind: node.type, label: node.label, config: node.config },
        })),
        edges: definition.edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle ?? null,
            ...edgeStyle(),
        })),
    }
}

export function fromFlow(nodes: FlowNode[], edges: Edge[]): WorkflowDefinition {
    return {
        nodes: nodes.map((node) => ({
            id: node.id,
            type: node.data.kind,
            ...(node.data.label ? { label: node.data.label } : {}),
            position: { x: Math.round(node.position.x), y: Math.round(node.position.y) },
            config: node.data.config,
        })),
        edges: edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            ...(edge.sourceHandle ? { sourceHandle: edge.sourceHandle as BranchHandle } : {}),
        })),
    }
}
