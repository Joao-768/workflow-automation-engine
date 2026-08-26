import { useEffect, useState } from 'react'
import type { Execution } from '../types'
import { api } from '../api'

export default function Executions() {
    const [executions, setExecutions] = useState<Execution[]>([])
    const [error, setError] = useState('')

    useEffect(() => {
        api('/executions')
            .then(data => setExecutions(data))
            .catch(err => setError(err.message))
    }, [])

    return (
        <>
            <h2>Histórico</h2>
            {error && <p>{error}</p>}
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
