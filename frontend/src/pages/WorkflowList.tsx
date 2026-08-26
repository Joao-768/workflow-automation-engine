import { useEffect, useState } from "react"
import type { Workflow } from '../types'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function WorkflowList() {
    const [workflows, setWorkflows] = useState<Workflow[]>([])
    const [error, setError] = useState('')

    useEffect(() => {
        api('/workflows')
            .then(data => setWorkflows(data))
            .catch(err => setError(err.message))
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


    return (
        <>
            <h2>WorkflowList</h2>
            {error && <p>{error}</p>}
            <ul>
                {workflows.map((workflow) => (
                    <li key={workflow.id}>
                        {workflow.name} ({workflow.trigger_type} &gt; {workflow.action_type})
                        <Link to={`/workflows/${workflow.id}/edit`}>Editar</Link>
                        <button onClick={() => handleDelete(workflow.id)}>Apagar</button>
                        <button onClick={() => handleToggle(workflow.id)}>
                            {workflow.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                    </li>
                ))}
            </ul>
        </>
    )
}
