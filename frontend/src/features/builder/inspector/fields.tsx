import { useId, useState, type ReactNode } from 'react'

/** Small form primitives shared by every node form. All controls use `.field`. */

export function Row({
    label,
    hint,
    error,
    children,
    htmlFor,
}: {
    label: string
    hint?: ReactNode
    error?: string
    children: ReactNode
    htmlFor?: string
}) {
    return (
        <div className="form-row">
            <label htmlFor={htmlFor}>{label}</label>
            {children}
            {error ? (
                <span className="hint bad">{error}</span>
            ) : hint ? (
                <span className="hint">{hint}</span>
            ) : null}
        </div>
    )
}

export function TextInput(props: {
    label: string
    value: string
    onChange: (value: string) => void
    hint?: ReactNode
    error?: string
    placeholder?: string
    code?: boolean
}) {
    const id = useId()
    return (
        <Row label={props.label} hint={props.hint} error={props.error} htmlFor={id}>
            <input
                id={id}
                className={`field${props.code ? ' code' : ''}${props.error ? ' invalid' : ''}`}
                value={props.value}
                placeholder={props.placeholder}
                spellCheck={false}
                onChange={(e) => props.onChange(e.target.value)}
            />
        </Row>
    )
}

export function TextArea(props: {
    label: string
    value: string
    onChange: (value: string) => void
    hint?: ReactNode
    error?: string
    rows?: number
    code?: boolean
}) {
    const id = useId()
    return (
        <Row label={props.label} hint={props.hint} error={props.error} htmlFor={id}>
            <textarea
                id={id}
                className={`field${props.code ? ' code' : ''}${props.error ? ' invalid' : ''}`}
                rows={props.rows ?? 4}
                value={props.value}
                spellCheck={false}
                onChange={(e) => props.onChange(e.target.value)}
            />
        </Row>
    )
}

export function Select<T extends string>(props: {
    label: string
    value: T
    options: readonly { value: T; label: string }[]
    onChange: (value: T) => void
    hint?: ReactNode
    error?: string
}) {
    const id = useId()
    return (
        <Row label={props.label} hint={props.hint} error={props.error} htmlFor={id}>
            <select
                id={id}
                className="field"
                value={props.value}
                onChange={(e) => props.onChange(e.target.value as T)}
            >
                {props.options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </Row>
    )
}

export function NumberInput(props: {
    label: string
    value: number | undefined
    onChange: (value: number | undefined) => void
    min?: number
    max?: number
    hint?: ReactNode
    error?: string
}) {
    const id = useId()
    return (
        <Row label={props.label} hint={props.hint} error={props.error} htmlFor={id}>
            <input
                id={id}
                type="number"
                className={`field${props.error ? ' invalid' : ''}`}
                value={props.value ?? ''}
                min={props.min}
                max={props.max}
                onChange={(e) =>
                    props.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                }
            />
        </Row>
    )
}

export type KeyValue = { key: string; value: string }

/** Editable list of key / value pairs (HTTP headers, query parameters). */
export function KeyValueList({
    label,
    items,
    onChange,
    keyPlaceholder,
}: {
    label: string
    items: KeyValue[]
    onChange: (items: KeyValue[]) => void
    keyPlaceholder: string
}) {
    const set = (index: number, patch: Partial<KeyValue>) =>
        onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
    return (
        <div className="form-row">
            <span className="label">{label}</span>
            <div className="kv-list">
                {items.map((item, i) => (
                    <div className="kv-list-row" key={i}>
                        <input
                            className="field field-sm code"
                            aria-label={`${label} key`}
                            placeholder={keyPlaceholder}
                            value={item.key}
                            onChange={(e) => set(i, { key: e.target.value })}
                        />
                        <input
                            className="field field-sm code"
                            aria-label={`${label} value`}
                            placeholder="value or {{template}}"
                            value={item.value}
                            onChange={(e) => set(i, { value: e.target.value })}
                        />
                        <button
                            type="button"
                            className="btn-sm btn-ghost"
                            aria-label="Remove"
                            onClick={() => onChange(items.filter((_, j) => j !== i))}
                        >
                            ×
                        </button>
                    </div>
                ))}
                <div>
                    <button
                        type="button"
                        className="btn-sm"
                        onClick={() => onChange([...items, { key: '', value: '' }])}
                    >
                        Add
                    </button>
                </div>
            </div>
        </div>
    )
}

/** Edits a JSON value as text and reports it only when it parses. */
export function JsonField({
    label,
    value,
    onChange,
    hint,
}: {
    label: string
    value: unknown
    onChange: (value: unknown) => void
    hint?: ReactNode
}) {
    const id = useId()
    const [text, setText] = useState(() => JSON.stringify(value ?? {}, null, 2))
    const [error, setError] = useState('')
    return (
        <Row label={label} hint={hint} error={error} htmlFor={id}>
            <textarea
                id={id}
                className={`field code${error ? ' invalid' : ''}`}
                rows={7}
                spellCheck={false}
                value={text}
                onChange={(e) => {
                    setText(e.target.value)
                    try {
                        onChange(JSON.parse(e.target.value))
                        setError('')
                    } catch (err) {
                        setError(err instanceof Error ? err.message : 'Invalid JSON')
                    }
                }}
            />
        </Row>
    )
}

/**
 * Clickable variables the selected node can use. Clicking copies the
 * placeholder, ready to paste into any field.
 */
export function VariableHints({ tokens }: { tokens: string[] }) {
    const [copied, setCopied] = useState('')
    if (tokens.length === 0) return null
    return (
        <div className="form-row">
            <span className="label">Variables</span>
            <div className="token-bar">
                {tokens.map((token) => (
                    <button
                        key={token}
                        type="button"
                        title="Copy"
                        onClick={() => {
                            void navigator.clipboard?.writeText(`{{${token}}}`)
                            setCopied(token)
                        }}
                    >
                        {copied === token ? 'copied' : `{{${token}}}`}
                    </button>
                ))}
            </div>
            <span className="hint">
                Click to copy. A missing variable fails the step with a clear error.
            </span>
        </div>
    )
}
