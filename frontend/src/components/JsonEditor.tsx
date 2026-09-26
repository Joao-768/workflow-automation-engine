import { useState } from 'react'

/**
 * A textarea for JSON objects. It keeps the raw text while the user types and
 * reports the parsed object (or null when the text is not a valid object).
 */
export function JsonEditor({
    id,
    initial,
    onChange,
    rows = 10,
}: {
    id?: string
    initial: unknown
    onChange: (value: Record<string, unknown> | null) => void
    rows?: number
}) {
    const [text, setText] = useState(() => JSON.stringify(initial ?? {}, null, 2))
    const [error, setError] = useState('')

    const update = (next: string) => {
        setText(next)
        try {
            const parsed: unknown = JSON.parse(next)
            if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
                setError('Must be a JSON object: { ... }')
                onChange(null)
                return
            }
            setError('')
            onChange(parsed as Record<string, unknown>)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Invalid JSON')
            onChange(null)
        }
    }

    return (
        <>
            <textarea
                id={id}
                className={`field code${error ? ' invalid' : ''}`}
                rows={rows}
                spellCheck={false}
                value={text}
                onChange={(e) => update(e.target.value)}
            />
            {error && <span className="hint bad">{error}</span>}
        </>
    )
}
