import { useState } from 'react'
import { JsonEditor } from '../../components/JsonEditor'
import { Dialog, Fault } from '../../components/ui'

/**
 * Asks for the JSON payload of a manual run. The run itself happens on the
 * backend: this only collects the input and hands it back.
 */
export function RunDialog({
    open,
    initialPayload,
    dirty,
    onRun,
    onClose,
}: {
    open: boolean
    initialPayload: Record<string, unknown>
    dirty: boolean
    onRun: (payload: Record<string, unknown>) => Promise<void>
    onClose: () => void
}) {
    const [payload, setPayload] = useState<Record<string, unknown> | null>(initialPayload)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    const run = async () => {
        if (!payload) return
        setBusy(true)
        setError('')
        try {
            await onRun(payload)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Run failed')
            setBusy(false)
        }
    }

    return (
        <Dialog open={open} onClose={onClose}>
            <div className="dialog-body">
                <h3>Run workflow</h3>
                <p style={{ marginBottom: 14 }}>
                    Starts a real execution on the backend with this payload as <code>event</code>.
                    It works while the workflow is inactive, whatever its trigger.
                    {dirty && ' Unsaved changes are saved first.'}
                </p>
                <Fault message={error} />
                <JsonEditor
                    id="run-payload"
                    initial={initialPayload}
                    onChange={setPayload}
                    rows={10}
                />
            </div>
            <div className="dialog-actions">
                <button type="button" onClick={onClose}>
                    Cancel
                </button>
                <button
                    type="button"
                    className="btn-primary"
                    onClick={run}
                    disabled={!payload || busy}
                >
                    {busy ? 'Starting...' : 'Run'}
                </button>
            </div>
        </Dialog>
    )
}
