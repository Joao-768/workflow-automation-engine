import { useState } from 'react'
import { Link } from 'react-router-dom'
import { records } from '../api/endpoints'
import { Fault, Loading, PageHead, Pager } from '../components/ui'
import { useResource } from '../hooks/useResource'
import { formatShort } from '../lib/format'

const PAGE_SIZE = 25

/** What "Create record" nodes wrote: proof that the action persisted something. */
export default function Records() {
    const [collection, setCollection] = useState('')
    const [page, setPage] = useState(1)
    const collections = useResource(() => records.collections(), 'collections')
    const list = useResource(
        () => records.list({ collection: collection || undefined, page, pageSize: PAGE_SIZE }),
        `${collection}:${page}`,
    )

    return (
        <>
            <PageHead
                title="Records"
                sub="Structured JSON written by Create record nodes, grouped in collections."
            />
            <Fault message={list.error || collections.error} />

            <div className="filters">
                <select
                    className="field"
                    aria-label="Collection"
                    value={collection}
                    onChange={(e) => {
                        setCollection(e.target.value)
                        setPage(1)
                    }}
                >
                    <option value="">All collections</option>
                    {(collections.data ?? []).map((c) => (
                        <option key={c.collection} value={c.collection}>
                            {c.collection} ({c.count})
                        </option>
                    ))}
                </select>
            </div>

            {list.loading && !list.data ? (
                <Loading />
            ) : list.data && list.data.items.length === 0 ? (
                <div className="strip">
                    <div className="blank">
                        <h3>No records yet</h3>
                        <p>Add a Create record node to a workflow and run it.</p>
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
                                        <th>Collection</th>
                                        <th>Data</th>
                                        <th>Written by</th>
                                        <th>Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {list.data.items.map((record) => (
                                        <tr key={record.id}>
                                            <td className="muted mono">{record.id}</td>
                                            <td>
                                                <span className="tag">{record.collection}</span>
                                            </td>
                                            <td
                                                className="mono"
                                                style={{
                                                    whiteSpace: 'normal',
                                                    minWidth: 260,
                                                    fontSize: 12,
                                                    color: 'var(--ink-mid)',
                                                }}
                                            >
                                                {JSON.stringify(record.data)}
                                            </td>
                                            <td>
                                                {record.executionId ? (
                                                    <Link to={`/executions/${record.executionId}`}>
                                                        {record.workflowName ?? 'workflow'} · #
                                                        {record.executionId}
                                                    </Link>
                                                ) : (
                                                    <span className="muted">n/a</span>
                                                )}
                                            </td>
                                            <td className="muted">
                                                {formatShort(record.createdAt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pager
                            page={page}
                            pageSize={PAGE_SIZE}
                            total={list.data.total}
                            onPage={setPage}
                        />
                    </>
                )
            )}
        </>
    )
}
