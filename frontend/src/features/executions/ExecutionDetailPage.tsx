import { Link, useParams } from 'react-router-dom'
import { NODE_META, type ExecutionDetail, type ExecutionStep } from '@wae/shared'
import { executions } from '../../api/endpoints'
import { Fault, Json, Loading, PageHead, Status } from '../../components/ui'
import { useResource } from '../../hooks/useResource'
import { formatDateTime, formatDuration, formatShort } from '../../lib/format'
import { ExecutionGraph } from './ExecutionGraph'

const LIVE = ['queued', 'running', 'waiting']

export default function ExecutionDetailPage() {
    const id = Number(useParams().id)
    const detail = useResource(() => executions.get(id), String(id), {
        pollMs: 1000,
        shouldPoll: (execution) => LIVE.includes(execution.status),
    })

    if (detail.loading && !detail.data) return <Loading what="Reading the execution" />
    if (!detail.data) {
        return (
            <>
                <Fault message={detail.error || 'Execution not found'} />
                <Link to="/executions">Back to executions</Link>
            </>
        )
    }

    const execution = detail.data
    const live = LIVE.includes(execution.status)

    return (
        <>
            <PageHead
                plate={`Execution #${execution.id}`}
                title={execution.workflowName}
                sub={
                    live
                        ? 'This execution is still in progress. The page updates by itself.'
                        : `Finished ${formatDateTime(execution.finishedAt)} in ${formatDuration(execution.durationMs)}.`
                }
            >
                <Status value={execution.status} />
                {!execution.workflowDeleted && (
                    <Link to={`/workflows/${execution.workflowId}`} className="btn btn-sm">
                        Open workflow
                    </Link>
                )}
            </PageHead>

            {execution.error && (
                <div className="step-error" style={{ marginBottom: 24 }}>
                    <strong>
                        Failed{execution.error.nodeId ? ` at ${execution.error.nodeId}` : ''}:
                    </strong>{' '}
                    {execution.error.message} <code>{execution.error.code}</code>
                </div>
            )}

            <dl className="kv kv-wide" style={{ marginBottom: 28 }}>
                <div>
                    <dt>status</dt>
                    <dd>
                        <Status value={execution.status} />
                    </dd>
                </div>
                <div>
                    <dt>workflow</dt>
                    <dd>
                        {execution.workflowName}{' '}
                        <span className="muted mono">v{execution.workflowVersion}</span>
                        {execution.workflowDeleted && (
                            <span className="tag" style={{ marginLeft: 8 }}>
                                deleted
                            </span>
                        )}
                    </dd>
                </div>
                <div>
                    <dt>trigger</dt>
                    <dd>{execution.triggerType}</dd>
                </div>
                <div>
                    <dt>queued</dt>
                    <dd>{formatDateTime(execution.createdAt)}</dd>
                </div>
                <div>
                    <dt>started</dt>
                    <dd>{formatDateTime(execution.startedAt)}</dd>
                </div>
                <div>
                    <dt>finished</dt>
                    <dd>{formatDateTime(execution.finishedAt)}</dd>
                </div>
                <div>
                    <dt>duration</dt>
                    <dd>{formatDuration(execution.durationMs)}</dd>
                </div>
            </dl>

            <div className="exec-grid">
                <section>
                    <div className="section-head">
                        <span>Graph, as it ran</span>
                        <span>solid: ran · dashed: skipped or not reached</span>
                    </div>
                    <ExecutionGraph execution={execution} />
                    <div style={{ marginTop: 20 }}>
                        <Json label="Trigger payload (event)" value={execution.triggerData} />
                    </div>
                </section>

                <section>
                    <div className="section-head">
                        <span>Timeline</span>
                        <span>{execution.steps.length} steps</span>
                    </div>
                    <Timeline execution={execution} />
                </section>
            </div>
        </>
    )
}

function nodeTitle(execution: ExecutionDetail, step: ExecutionStep) {
    const node = execution.definition.nodes.find((n) => n.id === step.nodeId)
    return node?.label || NODE_META[step.nodeType]?.label || step.nodeId
}

function Timeline({ execution }: { execution: ExecutionDetail }) {
    if (execution.steps.length === 0) {
        return <p className="standby">Waiting for the worker to pick up the first step...</p>
    }
    return (
        <ol className="timeline">
            {execution.steps.map((step) => {
                const skipped = step.status === 'skipped'
                return (
                    <li key={step.id} className={skipped ? 'is-skipped' : ''}>
                        <details open={step.status === 'failed'}>
                            <summary>
                                <span className="step-name">
                                    <strong>{nodeTitle(execution, step)}</strong>
                                    <span>
                                        {step.nodeId} · {step.nodeType}
                                        {!skipped &&
                                            ` · attempt ${step.attempt}/${step.maxAttempts}`}
                                        {!skipped && ` · ${formatShort(step.startedAt)}`}
                                    </span>
                                </span>
                                <span className="muted mono" style={{ fontSize: 12 }}>
                                    {skipped ? '' : formatDuration(step.durationMs)}
                                </span>
                                <Status value={step.status} />
                            </summary>
                            <div className="step-body">
                                {skipped ? (
                                    <p className="standby">
                                        This node was on a branch that was not taken, so it never
                                        ran.
                                    </p>
                                ) : (
                                    <>
                                        {step.error && (
                                            <div className="step-error">
                                                {step.error.message} <code>{step.error.code}</code>
                                                {step.status === 'retrying' && (
                                                    <span className="muted">
                                                        {' '}
                                                        · retried with backoff
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {step.status === 'waiting' && (
                                            <p className="standby">
                                                Waiting in the queue until the delay is over.
                                            </p>
                                        )}
                                        <Json label="Input" value={step.input ?? null} />
                                        {step.output !== null && (
                                            <Json label="Output" value={step.output} />
                                        )}
                                        {step.error && 'details' in step.error && (
                                            <Json
                                                label="Error details"
                                                value={
                                                    (step.error as { details?: unknown }).details
                                                }
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        </details>
                    </li>
                )
            })}
        </ol>
    )
}
