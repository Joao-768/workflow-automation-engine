import {
    NODE_META,
    TRIGGER_LABELS,
    TRIGGER_TYPES,
    type NodeType,
    type TriggerType,
} from '@wae/shared'
import { NODE_ICONS, TRIGGER_ICONS } from './nodeCatalog'

export const DRAG_MIME = 'application/x-workflow-node'

const LOGIC: NodeType[] = ['condition', 'delay']
const ACTIONS: NodeType[] = ['http_request', 'notification', 'email', 'create_record']

const TRIGGER_HINTS: Record<TriggerType, string> = {
    manual: 'Run it yourself with a JSON payload.',
    event: 'A named event, e.g. order.created.',
    webhook: 'A public URL that accepts JSON.',
    schedule: 'A cron schedule.',
}

/**
 * Left-hand panel. Steps can be dragged onto the canvas or clicked (a click
 * adds the node under the selected one and connects it). A workflow has one
 * trigger, so the trigger entries switch its kind instead of adding a node.
 */
export function Palette({
    triggerType,
    onTrigger,
    onAdd,
}: {
    triggerType?: TriggerType
    onTrigger: (type: TriggerType) => void
    onAdd: (type: NodeType) => void
}) {
    const item = (type: NodeType) => {
        const Icon = NODE_ICONS[type]
        return (
            <button
                key={type}
                type="button"
                className="palette-item"
                draggable
                onDragStart={(event) => {
                    event.dataTransfer.setData(DRAG_MIME, type)
                    event.dataTransfer.effectAllowed = 'move'
                }}
                onClick={() => onAdd(type)}
            >
                <Icon size={15} aria-hidden="true" />
                <span>
                    <strong>{NODE_META[type].label}</strong>
                    <small>{NODE_META[type].description}</small>
                </span>
            </button>
        )
    }

    return (
        <aside className="palette" aria-label="Node palette">
            <div className="palette-group">
                <span className="plate">When</span>
                {TRIGGER_TYPES.map((type) => {
                    const Icon = TRIGGER_ICONS[type]
                    return (
                        <button
                            key={type}
                            type="button"
                            className="palette-item"
                            style={{
                                cursor: 'pointer',
                                borderColor: triggerType === type ? 'var(--ink-mid)' : undefined,
                            }}
                            aria-pressed={triggerType === type}
                            onClick={() => onTrigger(type)}
                        >
                            <Icon size={15} aria-hidden="true" />
                            <span>
                                <strong>{TRIGGER_LABELS[type]}</strong>
                                <small>{TRIGGER_HINTS[type]}</small>
                            </span>
                        </button>
                    )
                })}
            </div>
            <div className="palette-group">
                <span className="plate">If / wait</span>
                {LOGIC.map(item)}
            </div>
            <div className="palette-group">
                <span className="plate">Do</span>
                {ACTIONS.map(item)}
            </div>
            <p className="palette-foot">
                Drag onto the canvas, or click to add under the selected node.
            </p>
        </aside>
    )
}
