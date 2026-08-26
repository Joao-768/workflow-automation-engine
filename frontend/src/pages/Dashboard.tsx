import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Workflow, Execution } from '../types'
import { api } from '../api'

export default function Dashboard() {
    const [workflows, setWorkflows] = useState<Workflow[]>([])
    const [executions, setExecutions] = useState<Execution[]>([])
    const [error, setError] = useState('')

    useEffect(() => {
        Promise.all([api('/workflows'), api('/executions')])
            .then(([w, e]) => {
                setWorkflows(w)
                setExecutions(e)
            })
            .catch(err => setError(err.message))
    }, [])

    const active = workflows.filter(w => w.is_active).length

    return (
        <>
            <h2>Dashboard</h2>
            {error && <p>{error}</p>}

            <div className="stats">
                <div className="stat">
                    <span className="value">{workflows.length}</span>
                    <span className="label">Workflows</span>
                </div>
                <div className="stat">
                    <span className="value">{active}</span>
                    <span className="label">Ativos</span>
                </div>
                <div className="stat">
                    <span className="value">{executions.length}</span>
                    <span className="label">Execuções</span>
                </div>
            </div>

            <h3>Execuções recentes</h3>
            {executions.length === 0 && <p>Ainda não há execuções. Experimenta o <Link to="/simulator">simulador</Link>.</p>}
            <ul>
                {executions.slice(0, 5).map(e => (
                    <li key={e.id}>
                        <Link to={`/executions/${e.id}`}>
                            {e.workflow_name} <b>{e.status}</b>
                        </Link>
                    </li>
                ))}
            </ul>
        </>
    )
}
