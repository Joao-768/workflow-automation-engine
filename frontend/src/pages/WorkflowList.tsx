import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Workflow } from '../types'
import { api } from '../api'

export default function WorkflowList() {
    const [workflows, setWorkflows] = useState<Workflow[]>([])
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api('/workflows')
            .then(data => setWorkflows(data))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false))
    }, [])

    function handleDelete(id: number) {
        api(`/workflows/${id}`, { method: 'DELETE' })
            .then(() => setWorkflows(workflows.filter(w => w.id !== id)))
            .catch(err => setError(err.message))
    }

    function handleToggle(id: number) {
        api(`/workflows/${id}/toggle`, { method: 'PATCH' })
            .then(updated => setWorkflows(workflows.map(w => w.id === id ? updated : w)))
            .catch(err => setError(err.message))
    }

    if (loading) return <p className="standby">Loading...</p>

    return (
        <>
            <div className="head">
                <div>
                    <h2>Workflows</h2>
                    <p>The rules that run when an event arrives.</p>
                </div>
                <Link to="/workflows/new" className="btn btn-primary">New workflow</Link>
            </div>

            {error && <p className="fault">{error}</p>}

            <div className="strip-head">
                <span>{workflows.length} {workflows.length === 1 ? 'workflow' : 'workflows'}</span>
            </div>

            <div className="strip">
                {workflows.length === 0 ? (
                    <div className="blank">
                        <h3>No workflows yet</h3>
                        <p>Create your first one to start automating.</p>
                    </div>
                ) : (
                    workflows.map(w => (
                        <div key={w.id} className="line">
                            <div className="line-main">
                                <Link to={`/workflows/${w.id}/edit`} className="line-title">{w.name}</Link>
                                <span className="line-sub">{w.trigger_type} → {w.action_type}</span>
                            </div>
                            <span className={`signal ${w.is_active ? 'signal-on' : ''}`}>
                                {w.is_active ? 'active' : 'inactive'}
                            </span>
                            <div className="line-acts">
                                <button className="btn-sm" onClick={() => handleToggle(w.id)}>
                                    {w.is_active ? 'Disable' : 'Enable'}
                                </button>
                                <button className="btn-sm btn-halt" onClick={() => handleDelete(w.id)}>
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </>
    )
}
