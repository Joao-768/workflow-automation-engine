import { useEffect, useState } from 'react'
import type { Execution } from '../types'

export default function Executions() {
    const [executions, setExecutions] = useState<Execution[]>([])
    const [erro, setErro] = useState('')

    useEffect(() => {
        fetch('http://localhost:3000/executions')
            .then(res => {
                if (!res.ok) throw new Error('Erro ao carregar o histórico')
                return res.json()
            })
            .then(data => setExecutions(data))
            .catch(err => setErro(err.message))
    }, [])

    return (
        <>
            <h2>Histórico</h2>
            {erro && <p>{erro}</p>}
            <ul>
                {executions.map((e) => (
                    <li key={e.id}>
                        {new Date(e.executed_at).toLocaleString()} | {e.workflow_name} | <b>{e.status}</b>
                        {e.result && <> | {JSON.stringify(e.result)}</>}
                    </li>
                ))}
            </ul>
        </>
    )
}
