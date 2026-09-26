import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TRIGGER_LABELS, type WorkflowSummary } from '@wae/shared'
import { ApiError, errorText } from '../api/client'
import { workflows } from '../api/endpoints'
import { ConfirmDialog, Fault, Loading, PageHead, Status } from '../components/ui'
import { useResource } from '../hooks/useResource'
import { formatRelative } from '../lib/format'

function triggerText(workflow: WorkflowSummary) {
    if (!workflow.triggerType) return 'no trigger'
    if (workflow.triggerType === 'event') return `event · ${workflow.triggerEvent ?? '?'}`
    return TRIGGER_LABELS[workflow.triggerType].toLowerCase()
}

export default function WorkflowList() {
    const navigate = useNavigate()
    const list = useResource(() => workflows.list(), 'workflows')
    const [error, setError] = useState('')
    const [pendingDelete, setPendingDelete] = useState<WorkflowSummary | null>(null)

    const act = async (work: () => Promise<unknown>) => {
        setError('')
        try {
            await work()
            await list.reload()
        } catch (err) {
            // Activation refused: send the user to the builder to see why.
            if (err instanceof ApiError && err.code === 'invalid_workflow') {
                setError(`${err.message} Open the workflow to see what is missing.`)
            } else {
                setError(errorText(err))
            }
        }
    }

    const create = async () => {
        try {
            const created = await workflows.create({ name: 'Untitled workflow' })
            navigate(`/workflows/${created.id}`)
        } catch (err) {
            setError(errorText(err))
        }
    }

    if (list.loading && !list.data) return <Loading />
    const items = list.data ?? []

    return (
        <>
            <PageHead
                title="Workflows"
                sub="Each workflow is a graph: one trigger, then conditions and actions."
            >
                <button className="btn-primary" onClick={create}>
                    New workflow
                </button>
            </PageHead>

            <Fault message={error || list.error} />

            <div className="strip">
                {items.length === 0 ? (
                    <div className="blank">
                        <h3>No workflows yet</h3>
                        <p>
                            Create one and build it in the visual editor, or run the seed command
                            for demo workflows.
                        </p>
                        <button className="btn-primary" onClick={create}>
                            New workflow
                        </button>
                    </div>
                ) : (
                    items.map((workflow) => (
                        <div key={workflow.id} className="line">
                            <div className="line-main">
                                <Link to={`/workflows/${workflow.id}`} className="line-title">
                                    {workflow.name}
                                </Link>
                                <span className="line-sub">
                                    {triggerText(workflow)} · v{workflow.version} · updated{' '}
                                    {formatRelative(workflow.updatedAt)}
                                </span>
                            </div>

                            <div className="line-meta">
                                {workflow.lastExecution ? (
                                    <Link
                                        to={`/executions/${workflow.lastExecution.id}`}
                                        style={{ textDecoration: 'none' }}
                                    >
                                        <Status value={workflow.lastExecution.status} />
                                    </Link>
                                ) : (
                                    <span>never ran</span>
                                )}
                                <span>
                                    {workflow.lastExecution
                                        ? formatRelative(workflow.lastExecution.createdAt)
                                        : ''}
                                </span>
                            </div>

                            <Status
                                value={workflow.isActive ? 'on' : 'off'}
                                label={workflow.isActive ? 'active' : 'inactive'}
                            />

                            <div className="line-acts">
                                <button
                                    className="btn-sm"
                                    onClick={() =>
                                        act(() =>
                                            workflow.isActive
                                                ? workflows.deactivate(workflow.id)
                                                : workflows.activate(workflow.id),
                                        )
                                    }
                                >
                                    {workflow.isActive ? 'Disable' : 'Enable'}
                                </button>
                                <button
                                    className="btn-sm"
                                    onClick={() => act(() => workflows.duplicate(workflow.id))}
                                >
                                    Duplicate
                                </button>
                                <button
                                    className="btn-sm btn-halt"
                                    onClick={() => setPendingDelete(workflow)}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <ConfirmDialog
                open={pendingDelete !== null}
                title={`Delete "${pendingDelete?.name}"?`}
                message="It stops running and disappears from this list. Its execution history is kept and stays visible under Executions."
                confirmLabel="Delete workflow"
                danger
                onConfirm={() => pendingDelete && act(() => workflows.remove(pendingDelete.id))}
                onClose={() => setPendingDelete(null)}
            />
        </>
    )
}
