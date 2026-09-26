import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NODE_META, type TriggerType } from '@wae/shared'
import type { FlowNode } from './graphMapping'
import { NODE_ICONS, summarize, TRIGGER_ICONS, triggerLabel } from './nodeCatalog'

/**
 * One node on the canvas. Handles follow the graph rules: the trigger has
 * no input, a condition has a "true" and a "false" output, everything else
 * has one output.
 */
export function FlowNodeCard({ data, selected }: NodeProps<FlowNode>) {
    const isTrigger = data.kind === 'trigger'
    const Icon = isTrigger
        ? (TRIGGER_ICONS[data.config.type as TriggerType] ?? NODE_ICONS.trigger)
        : NODE_ICONS[data.kind]
    const title = data.label || (isTrigger ? triggerLabel(data.config) : NODE_META[data.kind].label)

    const classes = ['flow-node']
    if (selected) classes.push('selected')
    if (data.issues?.length) classes.push('has-issue')
    if (data.runState) classes.push(`state-${data.runState}`)

    return (
        <div className={classes.join(' ')} title={data.issues?.join('\n')}>
            {!isTrigger && <Handle type="target" position={Position.Top} />}

            <div className="flow-node-head">
                <Icon size={15} aria-hidden="true" />
                <span className="flow-node-title">{title}</span>
                <span className="flow-node-type">
                    {isTrigger ? 'when' : data.kind === 'condition' ? 'if' : 'do'}
                </span>
            </div>
            <div className="flow-node-summary">{summarize(data.kind, data.config)}</div>
            {(data.runState || data.issues?.length) && (
                <div className="flow-node-foot">
                    {data.runState ? (
                        <>
                            <span>{data.runState}</span>
                            <span>{data.runNote}</span>
                        </>
                    ) : (
                        <span style={{ color: 'var(--halt)' }}>
                            {data.issues!.length} issue{data.issues!.length > 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            )}

            {data.kind === 'condition' ? (
                <>
                    <Handle
                        type="source"
                        id="true"
                        position={Position.Bottom}
                        style={{ left: '30%' }}
                    />
                    <span className="handle-label" style={{ left: '30%' }}>
                        true
                    </span>
                    <Handle
                        type="source"
                        id="false"
                        position={Position.Bottom}
                        style={{ left: '70%' }}
                    />
                    <span className="handle-label" style={{ left: '70%' }}>
                        false
                    </span>
                </>
            ) : (
                <Handle type="source" position={Position.Bottom} />
            )}
        </div>
    )
}

/** Registered with React Flow under the node type "workflow". */
export const nodeTypes = { workflow: memo(FlowNodeCard) }
