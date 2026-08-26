import { useEffect, useState } from "react"
import type { Workflow } from '../types'
import { Link } from 'react-router-dom'

export default function WorkflowList() {
    const [workflows, setWorkflows] = useState<Workflow[]>([])
    const [erro, setErro] = useState('')

    useEffect(() => {
        fetch('http://localhost:3000/workflows')
            .then(res => {
                if (!res.ok) throw new Error('Erro ao carregar os workflows')
                return res.json()
            })
            .then(data => setWorkflows(data))
            .catch(err => setErro(err.message))
    }, [])

    function handleDelete(id: number) {
        fetch(`http://localhost:3000/workflows/${id}`, { method: 'DELETE' })
            .then(res => {
                if (!res.ok) throw new Error('Erro ao apagar o workflow')
                return res.json()
            })
            .then(() => setWorkflows(workflows.filter(w => w.id !== id)))
            .catch(err => setErro(err.message))
    }

    function handleToggle(id: number) {
        fetch(`http://localhost:3000/workflows/${id}/toggle`, { method: 'PATCH' })
            .then(res => {
                if (!res.ok) throw new Error('Erro ao alterar o estado do workflow')
                return res.json()
            })
            .then(updated => setWorkflows(workflows.map(w => w.id === id ? updated : w)))
            .catch(err => setErro(err.message))
    }


    return (
        <>
            <h2>WorkflowList</h2>
            {erro && <p>{erro}</p>}
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
