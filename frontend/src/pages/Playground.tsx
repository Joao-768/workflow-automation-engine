import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EVENT_NAME_PATTERN, EVENT_PRESETS, type EventResponse } from '@wae/shared'
import { errorText } from '../api/client'
import { events } from '../api/endpoints'
import { JsonEditor } from '../components/JsonEditor'
import { Fault, PageHead } from '../components/ui'

/**
 * The event simulator from V1, extended: pick a preset or type any event
 * name, edit the payload, fire it, and follow the executions it started.
 */
export default function Playground() {
    const [eventName, setEventName] = useState(EVENT_PRESETS[0].name)
    const [payload, setPayload] = useState<Record<string, unknown> | null>(EVENT_PRESETS[0].payload)
    const [editorKey, setEditorKey] = useState(0)
    const [results, setResults] = useState<(EventResponse & { firedAt: string })[]>([])
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    const nameValid = EVENT_NAME_PATTERN.test(eventName)

    const choose = (name: string) => {
        const preset = EVENT_PRESETS.find((p) => p.name === name)
        setEventName(name)
        if (preset) {
            setPayload(preset.payload)
            setEditorKey((k) => k + 1)
        }
    }

    const fire = async () => {
        if (!payload || !nameValid) return
        setBusy(true)
        setError('')
        try {
            const res = await events.fire(eventName, payload)
            setResults((prev) =>
                [{ ...res, firedAt: new Date().toLocaleTimeString() }, ...prev].slice(0, 10),
            )
        } catch (err) {
            setError(errorText(err))
        } finally {
            setBusy(false)
        }
    }

    return (
        <>
            <PageHead
                title="Playground"
                sub="Fire an event as if an external system sent it. Every active workflow listening for that event name starts an execution."
            />
            <Fault message={error} />

            <div className="play">
                <div className="presets" role="list" aria-label="Event presets">
                    {EVENT_PRESETS.map((preset) => (
                        <button
                            key={preset.name}
                            className={preset.name === eventName ? 'on' : ''}
                            onClick={() => choose(preset.name)}
                        >
                            {preset.label}
                            <small>{preset.name}</small>
                        </button>
                    ))}
                </div>

                <div>
                    <div className="form-row">
                        <label htmlFor="event-name">Event name</label>
                        <input
                            id="event-name"
                            className={`field code${nameValid ? '' : ' invalid'}`}
                            value={eventName}
                            onChange={(e) => setEventName(e.target.value.trim())}
                            placeholder="invoice.paid"
                        />
                        <span className={`hint${nameValid ? '' : ' bad'}`}>
                            {nameValid
                                ? 'Any name works, e.g. invoice.paid. Workflows match it exactly.'
                                : 'Use letters, digits, dots, dashes and underscores.'}
                        </span>
                    </div>

                    <div className="form-row">
                        <label htmlFor="payload">Payload</label>
                        <JsonEditor
                            key={editorKey}
                            id="payload"
                            initial={payload}
                            onChange={setPayload}
                            rows={11}
                        />
                        <span className="hint">
                            Available in workflows as <code>{'{{event.<field>}}'}</code>.
                        </span>
                    </div>

                    <div className="form-actions">
                        <button
                            className="btn-primary"
                            onClick={fire}
                            disabled={busy || !payload || !nameValid}
                        >
                            {busy ? 'Firing...' : 'Fire event'}
                        </button>
                    </div>

                    {results.length > 0 && (
                        <section className="section">
                            <div className="section-head">
                                <span>Fired events</span>
                            </div>
                            <div className="strip">
                                {results.map((result, i) => (
                                    <div className="line" key={i}>
                                        <div className="line-main">
                                            <span className="line-title mono">{result.event}</span>
                                            <span className="line-sub">
                                                {result.firedAt} · {result.matched.length} workflow
                                                {result.matched.length === 1 ? '' : 's'} matched
                                            </span>
                                        </div>
                                        <div
                                            className="line-acts"
                                            style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}
                                        >
                                            {result.matched.length === 0 ? (
                                                <span className="muted" style={{ fontSize: 13 }}>
                                                    No active workflow listens for this event.
                                                </span>
                                            ) : (
                                                result.matched.map((match) => (
                                                    <Link
                                                        key={match.executionId}
                                                        to={`/executions/${match.executionId}`}
                                                        className="btn btn-sm"
                                                    >
                                                        {match.workflowName} · #{match.executionId}
                                                    </Link>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </>
    )
}
