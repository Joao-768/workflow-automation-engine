import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
    EXECUTION_STATUSES,
    TRIGGER_LABELS,
    TRIGGER_TYPES,
    type ExecutionStatus,
    type TriggerType,
} from '@wae/shared'
import { executions, workflows } from '../../api/endpoints'
import { Fault, Loading, PageHead, Pager, Status } from '../../components/ui'
import { useResource } from '../../hooks/useResource'
import { formatDuration, formatShort } from '../../lib/format'

const PAGE_SIZE = 20

/** Execution history. Filters live in the URL, so a filtered view can be linked to. */
export default function ExecutionsPage() {
    const navigate = useNavigate()
    const [params, setParams] = useSearchParams()
    const filters = {
        workflowId: params.get('workflowId') ? Number(params.get('workflowId')) : undefined,
        status: (params.get('status') || undefined) as ExecutionStatus | undefined,
        triggerType: (params.get('triggerType') || undefined) as TriggerType | undefined,
        from: params.get('from') || undefined,
        page: Number(params.get('page') ?? 1),
    }

    const list = useResource(
        () =>
            executions.list({
                ...filters,
                pageSize: PAGE_SIZE,
                // A day picked in the browser means "from the start of that local day".
                from: filters.from ? new Date(`${filters.from}T00:00:00`).toISOString() : undefined,
            }),
        params.toString(),
        {
            pollMs: 4000,
            shouldPoll: (data) => data.items.some((e) => !['success', 'failed'].includes(e.status)),
        },
    )
    const workflowOptions = useResource(() => workflows.list(), 'workflows')

    const setFilter = (key: string, value: string) => {
        const next = new URLSearchParams(params)
        if (value) next.set(key, value)
        else next.delete(key)
        next.delete('page')
        setParams(next)
    }

    const hasFilters = ['workflowId', 'status', 'triggerType', 'from'].some((key) =>
        params.get(key),
    )

    return (
        <>
            <PageHead
                title="Executions"
                sub="Every run of every workflow, newest first. Open one to see each step."
            />
            <Fault message={list.error} />

            <div className="filters">
                <select
                    className="field"
                    aria-label="Workflow"
                    value={filters.workflowId ?? ''}
                    onChange={(e) => setFilter('workflowId', e.target.value)}
                >
                    <option value="">All workflows</option>
                    {(workflowOptions.data ?? []).map((w) => (
                        <option key={w.id} value={w.id}>
                            {w.name}
                        </option>
                    ))}
                </select>
                <select
                    className="field"
                    aria-label="Status"
                    value={filters.status ?? ''}
                    onChange={(e) => setFilter('status', e.target.value)}
                >
                    <option value="">Any status</option>
                    {EXECUTION_STATUSES.map((status) => (
                        <option key={status} value={status}>
                            {status}
                        </option>
                    ))}
                </select>
                <select
                    className="field"
                    aria-label="Trigger"
                    value={filters.triggerType ?? ''}
                    onChange={(e) => setFilter('triggerType', e.target.value)}
                >
                    <option value="">Any trigger</option>
                    {TRIGGER_TYPES.map((type) => (
                        <option key={type} value={type}>
                            {TRIGGER_LABELS[type]}
                        </option>
                    ))}
                </select>
                <input
                    className="field"
                    type="date"
                    aria-label="Since"
                    value={filters.from ?? ''}
                    onChange={(e) => setFilter('from', e.target.value)}
                />
                {hasFilters && (
                    <button className="btn-ghost" onClick={() => setParams(new URLSearchParams())}>
                        Clear
                    </button>
                )}
            </div>

            {list.loading && !list.data ? (
                <Loading />
            ) : list.data && list.data.items.length === 0 ? (
                <div className="strip">
                    <div className="blank">
                        <h3>
                            {hasFilters ? 'Nothing matches these filters' : 'No executions yet'}
                        </h3>
                        <p>
                            Run a workflow from the builder, or fire an event from the{' '}
                            <Link to="/playground">playground</Link>.
                        </p>
                    </div>
                </div>
            ) : (
                list.data && (
                    <>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Workflow</th>
                                        <th>Status</th>
                                        <th className="hide-sm">Trigger</th>
                                        <th className="hide-sm">Started</th>
                                        <th className="num">Duration</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {list.data.items.map((execution) => (
                                        <tr
                                            key={execution.id}
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => navigate(`/executions/${execution.id}`)}
                                        >
                                            <td className="muted mono">{execution.id}</td>
                                            <td>
                                                <Link
                                                    to={`/executions/${execution.id}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {execution.workflowName}
                                                </Link>
                                                {execution.workflowDeleted && (
                                                    <span className="tag" style={{ marginLeft: 8 }}>
                                                        deleted
                                                    </span>
                                                )}
                                                <span
                                                    className="muted mono"
                                                    style={{ marginLeft: 8, fontSize: 12 }}
                                                >
                                                    v{execution.workflowVersion}
                                                </span>
                                            </td>
                                            <td>
                                                <Status value={execution.status} />
                                            </td>
                                            <td className="muted hide-sm">
                                                {execution.triggerType}
                                            </td>
                                            <td className="muted hide-sm">
                                                {formatShort(
                                                    execution.startedAt ?? execution.createdAt,
                                                )}
                                            </td>
                                            <td className="num muted">
                                                {formatDuration(execution.durationMs)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pager
                            page={filters.page}
                            pageSize={PAGE_SIZE}
                            total={list.data.total}
                            onPage={(page) => {
                                const next = new URLSearchParams(params)
                                next.set('page', String(page))
                                setParams(next)
                            }}
                        />
                    </>
                )
            )}
        </>
    )
}
