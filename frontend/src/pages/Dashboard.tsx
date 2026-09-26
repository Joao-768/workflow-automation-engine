import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { DashboardStats } from '@wae/shared'
import { errorText } from '../api/client'
import { dashboard, workflows } from '../api/endpoints'
import { Fault, Loading, PageHead, Status } from '../components/ui'
import { useResource } from '../hooks/useResource'
import { formatDuration, formatRelative } from '../lib/format'

export default function Dashboard() {
    const navigate = useNavigate()
    const stats = useResource(() => dashboard.get(), 'dashboard', { pollMs: 5000 })
    const [error, setError] = useState('')

    const createWorkflow = async () => {
        try {
            const created = await workflows.create({ name: 'Untitled workflow' })
            navigate(`/workflows/${created.id}`)
        } catch (err) {
            setError(errorText(err))
        }
    }

    if (stats.loading && !stats.data) return <Loading />
    const data = stats.data

    return (
        <>
            <PageHead
                title="Dashboard"
                sub="Are your automations healthy? The last 24 hours at a glance."
            >
                <Link to="/playground" className="btn">
                    Fire an event
                </Link>
                <button className="btn-primary" onClick={createWorkflow}>
                    New workflow
                </button>
            </PageHead>

            <Fault message={error || stats.error} />

            {data && (
                <>
                    <div className="readouts">
                        <div className="readout">
                            <span className="plate">Workflows</span>
                            <span className="v">{data.workflows.total}</span>
                            <span className="sub">{data.workflows.active} active</span>
                        </div>
                        <div className="readout">
                            <span className="plate">Executions, 24h</span>
                            <span className="v">{data.last24h.total}</span>
                            <span className="sub">{data.last24h.inProgress} in progress</span>
                        </div>
                        <div className="readout">
                            <span className="plate">Success rate, 24h</span>
                            <span className="v">
                                {data.successRate === null
                                    ? 'n/a'
                                    : `${Math.round(data.successRate * 100)}%`}
                            </span>
                            <span className="sub">of finished executions</span>
                        </div>
                        <div className="readout">
                            <span className="plate">Failed</span>
                            <span
                                className="v"
                                style={{
                                    color: data.last24h.failed > 0 ? 'var(--halt)' : undefined,
                                }}
                            >
                                {data.last24h.failed}
                            </span>
                            <span className="sub">{data.failedTotal} all time</span>
                        </div>
                    </div>

                    <section className="section">
                        <div className="section-head">
                            <span>Executions per day, last 14 days</span>
                        </div>
                        <DailyChart daily={data.daily} />
                    </section>

                    <section className="section">
                        <div className="section-head">
                            <span>Recent executions</span>
                            {data.recent.length > 0 && <Link to="/executions">View all</Link>}
                        </div>
                        <div className="strip">
                            {data.recent.length === 0 ? (
                                <div className="blank">
                                    <h3>No executions yet</h3>
                                    <p>
                                        Create a workflow, or fire an event from the{' '}
                                        <Link to="/playground">playground</Link>.
                                    </p>
                                </div>
                            ) : (
                                data.recent.map((execution) => (
                                    <div key={execution.id} className="line">
                                        <div className="line-main">
                                            <Link
                                                to={`/executions/${execution.id}`}
                                                className="line-title"
                                            >
                                                {execution.workflowName}
                                            </Link>
                                            <span className="line-sub">
                                                #{execution.id} · {execution.triggerType}
                                                {execution.error
                                                    ? ` · ${execution.error.message}`
                                                    : ''}
                                            </span>
                                        </div>
                                        <div className="line-meta">
                                            <span>{formatRelative(execution.createdAt)}</span>
                                            <span>{formatDuration(execution.durationMs)}</span>
                                        </div>
                                        <Status value={execution.status} />
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </>
            )}
        </>
    )
}

const SUCCESS_FILL = '#8c8c8c'
const FAILED_FILL = '#f05a5a'

/**
 * Stacked daily bars: successes in neutral grey, failures in red on top.
 * Grey rather than green keeps the palette monochrome and stays distinct
 * from red for colour-blind readers. Hover a day for exact numbers.
 */
function DailyChart({ daily }: { daily: DashboardStats['daily'] }) {
    const [hover, setHover] = useState<number | null>(null)
    const max = Math.max(1, ...daily.map((d) => d.success + d.failed))
    const pct = (value: number) => `${(value / max) * 100}%`
    const hovered = hover === null ? null : daily[hover]

    return (
        <div className="chart">
            <div className="bars" role="img" aria-label="Executions per day, success and failed">
                {daily.map((day, i) => (
                    <div
                        key={day.date}
                        className={`bar-slot${hover === i ? ' on' : ''}`}
                        onMouseEnter={() => setHover(i)}
                        onMouseLeave={() => setHover(null)}
                        title={`${day.date}: ${day.success} success, ${day.failed} failed`}
                    >
                        <div className="bar-stack">
                            {day.failed > 0 && (
                                <i style={{ height: pct(day.failed), background: FAILED_FILL }} />
                            )}
                            {day.success > 0 && (
                                <i style={{ height: pct(day.success), background: SUCCESS_FILL }} />
                            )}
                        </div>
                        <span className="bar-label">
                            {i === 0 || i === daily.length - 1 || i % 7 === 0
                                ? day.date.slice(5)
                                : ''}
                        </span>
                    </div>
                ))}
            </div>
            <div className="chart-legend">
                <span>
                    <i style={{ background: SUCCESS_FILL }} /> success
                </span>
                <span>
                    <i style={{ background: FAILED_FILL }} /> failed
                </span>
                <span style={{ marginLeft: 'auto' }} aria-live="polite">
                    {hovered
                        ? `${hovered.date}: ${hovered.success} success, ${hovered.failed} failed`
                        : 'Hover a day for details'}
                </span>
            </div>
        </div>
    )
}
