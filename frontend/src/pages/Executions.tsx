import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Execution } from '../types'
import { api } from '../api'

export default function Executions() {
    const [executions, setExecutions] = useState<Execution[]>([])
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api('/executions')
            .then(data => setExecutions(data))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <p className="standby">Loading...</p>

    return (
        <>
            <div className="head">
                <div>
                    <h2>History</h2>
                    <p>Every time a workflow ran, and how it turned out.</p>
                </div>
            </div>

            {error && <p className="fault">{error}</p>}

            <div className="strip-head">
                <span>{executions.length} {executions.length === 1 ? 'execution' : 'executions'}</span>
            </div>

            <div className="strip">
                {executions.length === 0 ? (
                    <div className="blank">
                        <h3>No executions yet</h3>
                        <p>Fire an event from the <Link to="/simulator">simulator</Link>.</p>
                    </div>
                ) : (
                    executions.map(e => (
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
