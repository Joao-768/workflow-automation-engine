import { useEffect, useState } from 'react'
import type { Execution } from '../types'

export default function Executions() {
    const [executions, setExecutions] = useState<Execution[]>([])

    useEffect(() => {
        fetch('http://localhost:3000/executions')
            .then(res => res.json())
            .then(data => setExecutions(data))
    }, [])

    return (
        <>
            <h2>Histórico</h2>
            <ul>
                {executions.map((e) => (
                    <li key={e.id}>
                        {new Date(e.executed_at).toLocaleString()} — {e.workflow_name} — <b>{e.status}</b>
                        {e.result && <> — {JSON.stringify(e.result)}</>}
                    </li>
                ))}
            </ul>
        </>
    )
}
