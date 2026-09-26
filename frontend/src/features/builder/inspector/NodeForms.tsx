import {
    CONDITION_OPERATORS,
    DELAY_UNITS,
    EVENT_PRESETS,
    HTTP_BODY_TYPES,
    HTTP_METHODS,
    MAX_ATTEMPTS_LIMIT,
    NOTIFICATION_LEVELS,
    OPERATOR_LABELS,
    TRIGGER_TYPES,
    TRIGGER_LABELS,
    UNARY_OPERATORS,
    type ConditionOperator,
    type NodeType,
    type TriggerType,
} from '@wae/shared'
import { defaultTriggerConfig } from '../nodeCatalog'
import {
    JsonField,
    KeyValueList,
    NumberInput,
    Select,
    TextArea,
    TextInput,
    type KeyValue,
} from './fields'

/**
 * One form per node type. Each form edits the node's `config` object and
 * nothing else; validation messages come from the shared validator.
 */

export type FormProps = {
    config: Record<string, unknown>
    update: (patch: Record<string, unknown>) => void
    replace: (config: Record<string, unknown>) => void
    fieldError: (field: string) => string | undefined
}

const str = (value: unknown) => (typeof value === 'string' ? value : '')
const num = (value: unknown) => (typeof value === 'number' ? value : undefined)
const list = (value: unknown) => (Array.isArray(value) ? (value as KeyValue[]) : [])
const options = <T extends string>(values: readonly T[], label: (v: T) => string = (v) => v) =>
    values.map((value) => ({ value, label: label(value) }))

export function TriggerForm({ config, update, replace, fieldError }: FormProps) {
    const type = (config.type as TriggerType) ?? 'manual'
    return (
        <>
            <Select
                label="Starts when"
                value={type}
                options={options(TRIGGER_TYPES, (t) => TRIGGER_LABELS[t])}
                onChange={(next) => replace(defaultTriggerConfig(next))}
                hint={
                    {
                        manual: 'Only when you press Run. Useful for testing.',
                        event: 'When an event with this name is fired (playground or POST /events).',
                        webhook: 'When JSON is POSTed to this workflow’s webhook URL.',
                        schedule: 'On a cron schedule, while the workflow is active.',
                    }[type]
                }
            />
            {type === 'event' && (
                <>
                    <TextInput
                        label="Event name"
                        code
                        value={str(config.eventName)}
                        onChange={(eventName) => update({ eventName })}
                        error={fieldError('eventName')}
                        placeholder="order.created"
                    />
                    <div className="token-bar" style={{ marginTop: -8, marginBottom: 16 }}>
                        {EVENT_PRESETS.map((preset) => (
                            <button
                                key={preset.name}
                                type="button"
                                onClick={() => update({ eventName: preset.name })}
                            >
                                {preset.name}
                            </button>
                        ))}
                    </div>
                </>
            )}
            {type === 'schedule' && (
                <>
                    <TextInput
                        label="Cron expression"
                        code
                        value={str(config.cron)}
                        onChange={(cron) => update({ cron })}
                        error={fieldError('cron')}
                        hint="minute hour day month weekday, e.g. */5 * * * * for every 5 minutes"
                    />
                    <TextInput
                        label="Timezone"
                        code
                        value={str(config.timezone) || 'UTC'}
                        onChange={(timezone) => update({ timezone })}
                        error={fieldError('timezone')}
                    />
                </>
            )}
        </>
    )
}

export function ConditionForm({ config, update, fieldError }: FormProps) {
    const operator = (config.operator as ConditionOperator) ?? 'equals'
    const unary = UNARY_OPERATORS.includes(operator)
    return (
        <>
            <TextInput
                label="Value to check"
                code
                value={str(config.path)}
                onChange={(path) => update({ path })}
                error={fieldError('path')}
                hint="A path, not a template: event.total, event.customer.country, steps.http_1.status"
            />
            <Select
                label="Operator"
                value={operator}
                options={options(CONDITION_OPERATORS, (o) => OPERATOR_LABELS[o])}
                onChange={(next) =>
                    update({
                        operator: next,
                        value: UNARY_OPERATORS.includes(next) ? undefined : (config.value ?? ''),
                    })
                }
            />
            {!unary && (
                <TextInput
                    label="Compare with"
                    code
                    value={str(config.value)}
                    onChange={(value) => update({ value })}
                    error={fieldError('value')}
                    hint="Converted to the checked value’s type: 100 becomes a number, true a boolean. Templates allowed."
                />
            )}
            <p className="hint">
                The true and false handles lead to the two branches. Leave one unconnected to end
                there.
            </p>
        </>
    )
}

export function DelayForm({ config, update, fieldError }: FormProps) {
    return (
        <div className="row-2">
            <NumberInput
                label="Wait"
                value={num(config.amount)}
                min={1}
                onChange={(amount) => update({ amount })}
                error={fieldError('amount')}
            />
            <Select
                label="Unit"
                value={(config.unit as (typeof DELAY_UNITS)[number]) ?? 'seconds'}
                options={options(DELAY_UNITS)}
                onChange={(unit) => update({ unit })}
            />
        </div>
    )
}

export function HttpForm({ config, update, fieldError }: FormProps) {
    const method = (config.method as (typeof HTTP_METHODS)[number]) ?? 'GET'
    const bodyType = (config.bodyType as (typeof HTTP_BODY_TYPES)[number]) ?? 'none'
    return (
        <>
            <div className="row-2" style={{ gridTemplateColumns: '100px 1fr' }}>
                <Select
                    label="Method"
                    value={method}
                    options={options(HTTP_METHODS)}
                    onChange={(next) =>
                        update({ method: next, ...(next === 'GET' ? { bodyType: 'none' } : {}) })
                    }
                />
                <TextInput
                    label="URL"
                    code
                    value={str(config.url)}
                    onChange={(url) => update({ url })}
                    error={fieldError('url')}
                    placeholder="https://api.example.com/items/{{event.id}}"
                />
            </div>
            <KeyValueList
                label="Query parameters"
                keyPlaceholder="param"
                items={list(config.query)}
                onChange={(query) => update({ query })}
            />
            <KeyValueList
                label="Headers"
                keyPlaceholder="Header-Name"
                items={list(config.headers)}
                onChange={(headers) => update({ headers })}
            />
            {method !== 'GET' && (
                <>
                    <Select
                        label="Body"
                        value={bodyType}
                        options={options(
                            HTTP_BODY_TYPES,
                            (t) => ({ none: 'No body', json: 'JSON', text: 'Plain text' })[t],
                        )}
                        onChange={(next) =>
                            update({
                                bodyType: next,
                                body: next === 'json' ? {} : next === 'text' ? '' : undefined,
                            })
                        }
                        error={fieldError('bodyType')}
                    />
                    {bodyType === 'json' && (
                        <JsonField
                            key="json"
                            label="JSON body"
                            value={config.body}
                            onChange={(body) => update({ body })}
                            hint="Templates work at any depth."
                        />
                    )}
                    {bodyType === 'text' && (
                        <TextArea
                            label="Text body"
                            code
                            value={str(config.body)}
                            onChange={(body) => update({ body })}
                            error={fieldError('body')}
                        />
                    )}
                </>
            )}
            <div className="row-2">
                <NumberInput
                    label="Timeout (ms)"
                    value={num(config.timeoutMs) ?? 10000}
                    min={500}
                    max={30000}
                    onChange={(timeoutMs) => update({ timeoutMs })}
                    error={fieldError('timeoutMs')}
                />
                <NumberInput
                    label="Max attempts"
                    value={num(config.maxAttempts) ?? 3}
                    min={1}
                    max={MAX_ATTEMPTS_LIMIT}
                    onChange={(maxAttempts) => update({ maxAttempts })}
                    error={fieldError('maxAttempts')}
                />
            </div>
            <p className="hint">
                Timeouts, network errors, 5xx and 429 are retried with exponential backoff. Other
                4xx fail at once.
            </p>
        </>
    )
}

export function NotificationForm({ config, update, fieldError }: FormProps) {
    return (
        <>
            <TextArea
                label="Message"
                value={str(config.message)}
                onChange={(message) => update({ message })}
                error={fieldError('message')}
                rows={3}
            />
            <Select
                label="Level"
                value={(config.level as (typeof NOTIFICATION_LEVELS)[number]) ?? 'info'}
                options={options(NOTIFICATION_LEVELS)}
                onChange={(level) => update({ level })}
            />
        </>
    )
}

export function EmailForm({ config, update, fieldError }: FormProps) {
    return (
        <>
            <TextInput
                label="To"
                code
                value={str(config.to)}
                onChange={(to) => update({ to })}
                error={fieldError('to')}
                placeholder="{{event.email}}"
            />
            <TextInput
                label="Subject"
                value={str(config.subject)}
                onChange={(subject) => update({ subject })}
                error={fieldError('subject')}
            />
            <TextArea
                label="Body"
                value={str(config.body)}
                onChange={(body) => update({ body })}
                rows={5}
            />
            <NumberInput
                label="Max attempts"
                value={num(config.maxAttempts) ?? 3}
                min={1}
                max={MAX_ATTEMPTS_LIMIT}
                onChange={(maxAttempts) => update({ maxAttempts })}
            />
            <p className="hint">
                Without SMTP settings on the server, delivery is simulated and the trace says so.
            </p>
        </>
    )
}

export function RecordForm({ config, update, fieldError }: FormProps) {
    return (
        <>
            <TextInput
                label="Collection"
                code
                value={str(config.collection)}
                onChange={(collection) => update({ collection })}
                error={fieldError('collection')}
                placeholder="orders"
            />
            <JsonField
                label="Data"
                value={config.data}
                onChange={(data) => update({ data })}
                hint={
                    <>
                        A JSON object. <code>{'"{{event.total}}"'}</code> keeps its type (a number
                        stays a number).
                    </>
                }
            />
            {fieldError('data') && <span className="hint bad">{fieldError('data')}</span>}
        </>
    )
}

export const NODE_FORMS: Record<NodeType, (props: FormProps) => React.ReactNode> = {
    trigger: TriggerForm,
    condition: ConditionForm,
    delay: DelayForm,
    http_request: HttpForm,
    notification: NotificationForm,
    email: EmailForm,
    create_record: RecordForm,
}
