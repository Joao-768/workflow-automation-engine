import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'

type ExecutionDetail = {
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
    const [execution, setExecution] = useState<ExecutionDetail | null>(null)
    const [error, setError] = useState('')

    useEffect(() => {
        api(`/executions/${id}`)
            .then(data => setExecution(data))
            .catch(err => setError(err.message))
    }, [id])

    if (error) return <p>{error}</p>
    if (!execution) return <p>A carregar...</p>

    const steps = [
        { label: 'Evento recebido', done: true },
        { label: 'Workflow correspondido', done: true },
        { label: `Condição avaliada`, done: execution.status !== 'skipped' },
        { label: `Ação ${execution.action_type}`, done: execution.status === 'success' },
    ]

    return (
        <>
            <h2>Execução #{execution.id}</h2>

            <dl>
                <dt>Workflow</dt>
                <dd>{execution.workflow_name}</dd>

                <dt>Evento</dt>
                <dd>{execution.trigger_type}</dd>

                <dt>Estado</dt>
                <dd><b>{execution.status}</b></dd>

                <dt>Data</dt>
                <dd>{new Date(execution.executed_at).toLocaleString()}</dd>
            </dl>

            <h3>Passos</h3>
            <ul>
                {steps.map(s => (
                    <li key={s.label}>
                        {s.done ? '✓' : '✗'} {s.label}
                    </li>
                ))}
            </ul>

            <h3>Dados do evento</h3>
            <pre>{JSON.stringify(execution.event_data, null, 2)}</pre>

            <h3>Resultado</h3>
            <pre>{JSON.stringify(execution.result, null, 2)}</pre>

            <p><Link to="/executions">Voltar ao histórico</Link></p>
        </>
    )
}
