import {
    Clock,
    GitBranch,
    Globe,
    Bell,
    Mail,
    Database,
    Zap,
    Webhook,
    CalendarClock,
    Play,
    type LucideIcon,
} from 'lucide-react'
import {
    OPERATOR_LABELS,
    TRIGGER_LABELS,
    UNARY_OPERATORS,
    type ConditionOperator,
    type NodeType,
    type TriggerType,
} from '@wae/shared'

/**
 * Builder-side knowledge about each node type: its icon, the config a new
 * node starts with, the prefix used for its id and a one-line summary shown
 * on the canvas. The *rules* for a valid config live in @wae/shared.
 */

export const NODE_ICONS: Record<NodeType, LucideIcon> = {
    trigger: Zap,
    condition: GitBranch,
    delay: Clock,
    http_request: Globe,
    notification: Bell,
    email: Mail,
    create_record: Database,
}

export const TRIGGER_ICONS: Record<TriggerType, LucideIcon> = {
    manual: Play,
    event: Zap,
    webhook: Webhook,
    schedule: CalendarClock,
}

const ID_PREFIX: Record<NodeType, string> = {
    trigger: 'trigger',
    condition: 'condition',
    delay: 'delay',
    http_request: 'http',
    notification: 'notify',
    email: 'email',
    create_record: 'record',
}

export function nextNodeId(type: NodeType, taken: Set<string>): string {
    for (let n = 1; ; n++) {
        const id = `${ID_PREFIX[type]}_${n}`
        if (!taken.has(id)) return id
    }
}

export function defaultConfig(type: NodeType): Record<string, unknown> {
    switch (type) {
        case 'trigger':
            return { type: 'manual' }
        case 'condition':
            return { path: 'event.total', operator: 'gt', value: '100' }
        case 'delay':
            return { amount: 10, unit: 'seconds' }
        case 'http_request':
            return {
                method: 'GET',
                url: 'https://httpbin.org/get',
                headers: [],
                query: [],
                bodyType: 'none',
                timeoutMs: 10000,
            }
        case 'notification':
            return { message: 'New {{trigger.type}} execution #{{execution.id}}', level: 'info' }
        case 'email':
            return { to: '{{event.email}}', subject: 'Hello', body: '' }
        case 'create_record':
            return { collection: 'records', data: { receivedAt: '{{trigger.receivedAt}}' } }
    }
}

export function defaultTriggerConfig(type: TriggerType): Record<string, unknown> {
    switch (type) {
        case 'event':
            return { type, eventName: 'order.created' }
        case 'schedule':
            return { type, cron: '*/5 * * * *', timezone: 'UTC' }
        default:
            return { type }
    }
}

const str = (value: unknown) => (typeof value === 'string' ? value : '')

/** The one line of detail printed on a node card. */
export function summarize(type: NodeType, config: Record<string, unknown>): string {
    switch (type) {
        case 'trigger': {
            const kind = config.type as TriggerType | undefined
            if (kind === 'event') return `event ${str(config.eventName) || '?'}`
            if (kind === 'schedule') return `cron ${str(config.cron) || '?'}`
            return kind ? TRIGGER_LABELS[kind].toLowerCase() : 'not configured'
        }
        case 'condition': {
            const operator = config.operator as ConditionOperator | undefined
            if (!operator) return 'not configured'
            const value = UNARY_OPERATORS.includes(operator)
                ? ''
                : ` ${JSON.stringify(config.value ?? '')}`
            return `${str(config.path)} ${OPERATOR_LABELS[operator]}${value}`
        }
        case 'delay':
            return `wait ${config.amount ?? '?'} ${str(config.unit)}`
        case 'http_request':
            return `${str(config.method)} ${str(config.url)}`
        case 'notification':
            return str(config.message)
        case 'email':
            return `to ${str(config.to)}`
        case 'create_record':
            return `into ${str(config.collection)}`
    }
}

export function triggerLabel(config: Record<string, unknown>): string {
    const kind = config.type as TriggerType | undefined
    return kind ? `${TRIGGER_LABELS[kind]} trigger` : 'Trigger'
}
