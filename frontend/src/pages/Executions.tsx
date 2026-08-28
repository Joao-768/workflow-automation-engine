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

    if (loading) return <p className="standby">A carregar...</p>

    return (
        <>
            <div className="head">
                <div>
                    <h2>Histórico</h2>
                    <p>Cada vez que um workflow correu, e com que resultado.</p>
                </div>
            </div>

            {error && <p className="fault">{error}</p>}

            <div className="strip-head">
                <span>{executions.length} {executions.length === 1 ? 'execução' : 'execuções'}</span>
            </div>

            <div className="strip">
                {executions.length === 0 ? (
                    <div className="blank">
                        <h3>Ainda não há execuções</h3>
                        <p>Dispara um evento no <Link to="/simulator">simulador</Link>.</p>
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
