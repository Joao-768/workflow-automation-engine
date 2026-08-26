import { useEffect, useState } from "react"
import type { Workflow } from '../types'
import { Link } from 'react-router-dom'

export default function WorkflowList() {
    const [workflows, setWorkflows] = useState<Workflow[]>([])

    useEffect(() => {
        fetch('http://localhost:3000/workflows')
            .then(res => res.json())
            .then(data => setWorkflows(data))
    }, [])

    function handleDelete(id: number) {
        fetch(`http://localhost:3000/workflows/${id}`, { method: 'DELETE' })
            .then(() => setWorkflows(workflows.filter(w => w.id !== id)))
    }

    function handleToggle(id: number) {
        fetch(`http://localhost:3000/workflows/${id}/toggle`, { method: 'PATCH' })
            .then(res => res.json())
            .then(updated => setWorkflows(workflows.map(w => w.id === id ? updated : w)))
    }


    return (
        <>
            <h2>WorkflowList</h2>
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
