import { useMemo } from 'react'
import { Background, Controls, ReactFlow, ReactFlowProvider } from '@xyflow/react'
import type { ExecutionDetail } from '@wae/shared'
import { nodeTypes } from '../builder/FlowNodeCard'
import { toFlow, type RunState } from '../builder/graphMapping'
import { formatDuration } from '../../lib/format'

/**
 * The workflow version this execution ran, drawn read-only, with every node
 * coloured by what happened to it: success, failed, waiting, skipped, or not
 * reached. Edges on the path that actually ran are highlighted.
 */
export function ExecutionGraph({ execution }: { execution: ExecutionDetail }) {
    const { nodes, edges } = useMemo(() => {
        const flow = toFlow(execution.definition)
        const latest = new Map<string, ExecutionDetail['steps'][number]>()
        for (const step of execution.steps) latest.set(step.nodeId, step)

        const inProgress = !['success', 'failed'].includes(execution.status)
        const stateOf = (id: string): RunState => {
            const step = latest.get(id)
            if (step) return step.status
            if (inProgress && execution.currentNodeId === id) return 'queued'
            return 'idle'
        }

        const ran = new Set(
            execution.steps.filter((s) => s.status !== 'skipped').map((s) => s.nodeId),
        )

        return {
            nodes: flow.nodes.map((node) => {
                const step = latest.get(node.id)
                return {
                    ...node,
                    draggable: false,
                    selectable: false,
                    data: {
                        ...node.data,
                        runState: stateOf(node.id),
                        runNote:
                            step && step.status !== 'skipped'
                                ? `${step.attempt > 1 ? `try ${step.attempt} · ` : ''}${formatDuration(step.durationMs)}`
                                : '',
                    },
                }
            }),
            edges: flow.edges.map((edge) => {
                const taken = ran.has(edge.source) && ran.has(edge.target)
                return {
                    ...edge,
                    animated: taken && inProgress,
                    style: { stroke: taken ? '#bdbdbd' : '#2e2e2e', strokeWidth: taken ? 1.6 : 1 },
                }
            }),
        }
    }, [execution])

    return (
        <div className="exec-graph">
            <ReactFlowProvider>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    colorMode="dark"
                    fitView
                    fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
                    nodesConnectable={false}
                    nodesDraggable={false}
                    elementsSelectable={false}
                    proOptions={{ hideAttribution: true }}
                    minZoom={0.3}
                >
                    <Background gap={20} size={1} />
                    <Controls showInteractive={false} />
                </ReactFlow>
            </ReactFlowProvider>
        </div>
    )
}
