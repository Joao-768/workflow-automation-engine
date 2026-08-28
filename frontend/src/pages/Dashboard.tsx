import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Workflow, Execution } from '../types'
import { api } from '../api'

export default function Dashboard() {
    const [workflows, setWorkflows] = useState<Workflow[]>([])
    const [executions, setExecutions] = useState<Execution[]>([])
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([api('/workflows'), api('/executions')])
            .then(([w, e]) => { setWorkflows(w); setExecutions(e) })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <p className="standby">Loading...</p>

    const active = workflows.filter(w => w.is_active).length
    const recent = executions.slice(0, 5)

    return (
        <>
            <div className="head">
                <div>
                    <h2>Dashboard</h2>
                    <p>An overview of your workflows and executions.</p>
                </div>
                <Link to="/workflows/new" className="btn btn-primary">New workflow</Link>
            </div>

            {error && <p className="fault">{error}</p>}

            <div className="readouts">
                <div className="readout">
                    <span className="plate">Workflows</span>
                    <span className="v">{workflows.length}</span>
                </div>
                <div className="readout">
                    <span className="plate">Active</span>
                    <span className="v">{active}</span>
                </div>
                <div className="readout">
                    <span className="plate">Executions</span>
                    <span className="v">{executions.length}</span>
                </div>
            </div>

            <div className="strip-head">
                <span>Recent executions</span>
                {recent.length > 0 && <Link to="/executions">View all</Link>}
            </div>

            <div className="strip">
                {recent.length === 0 ? (
                    <div className="blank">
                        <h3>No executions yet</h3>
                        <p>Fire an event from the <Link to="/simulator">simulator</Link>.</p>
                    </div>
                ) : (
                    recent.map(e => (
                        <div key={e.id} className="line">
                            <div className="line-main">
                                <Link to={`/executions/${e.id}`} className="line-title">{e.workflow_name}</Link>
                                <span className="line-sub">{new Date(e.executed_at).toLocaleString()}</span>
                            </div>
                            <span className={`signal signal-${e.status}`}>{e.status}</span>
                        </div>
                    ))
                )}
            </div>
        </>
    )
}
