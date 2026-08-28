import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'

type Detail = {
    id: number
    workflow_name: string
    trigger_type: string
    action_type: string
    status: string
    executed_at: string
    event_data: Record<string, unknown>
    result: Record<string, unknown> | null
}

export default function ExecutionDetail() {
    const { id } = useParams()
    const [execution, setExecution] = useState<Detail | null>(null)
    const [error, setError] = useState('')

    useEffect(() => {
        api(`/executions/${id}`)
            .then(data => setExecution(data))
            .catch(err => setError(err.message))
    }, [id])

    if (error) return <p className="fault">{error}</p>
    if (!execution) return <p className="standby">reading record...</p>


    return (
        <>
            <div className="head">
                <div>
                    <span className="plate">Execution {String(execution.id).padStart(4, '0')}</span>
                    <h2>{execution.workflow_name}</h2>
                    <p>{new Date(execution.executed_at).toLocaleString()}</p>
                </div>
                <span className={`signal signal-${execution.status}`}>{execution.status}</span>
            </div>


            <div className="strip-head"><span className="plate">Record</span></div>
            <dl className="log">
                <div><dt>status</dt><dd>{execution.status}</dd></div>
                <div><dt>trigger</dt><dd>{execution.trigger_type}</dd></div>
                <div><dt>action</dt><dd>{execution.action_type}</dd></div>
            </dl>

            <div className="strip-head"><span className="plate">Event received</span></div>
            <pre style={{ marginTop: 16 }}>{JSON.stringify(execution.event_data, null, 2)}</pre>

            <div className="strip-head"><span className="plate">Result</span></div>
            <pre style={{ marginTop: 16 }}>{JSON.stringify(execution.result, null, 2)}</pre>

            <Link to="/executions" className="btn">Back to history</Link>
        </>
    )
}
