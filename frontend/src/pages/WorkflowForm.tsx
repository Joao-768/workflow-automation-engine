import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'


const TRIGGERS = ['order.created', 'user.created', 'payment.completed', 'form.submitted']
const ACTIONS = ['send_notification', 'send_email', 'create_record']

export default function WorkflowForm() {
    const navigate = useNavigate()
    
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [triggerType, setTriggerType] = useState(TRIGGERS[0])
    const [actionType, setActionType] = useState(ACTIONS[0])
    const [actionConfig, setActionConfig] = useState('{}')
    const [conditions, setConditions] = useState('')
    const [error, setError] = useState('')

    const { id } = useParams()

    useEffect(() => {
        if (!id) return
        api(`/workflows/${id}`)
            .then(w => {
                setName(w.name)
                setDescription(w.description ?? '')
                setTriggerType(w.trigger_type)
                setActionType(w.action_type)
                setActionConfig(JSON.stringify(w.action_config))
                setConditions(w.conditions ? JSON.stringify(w.conditions) : '')
            })
            .catch(err => setError(err.message))
    }, [id])

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        let body
        try {
            body = JSON.stringify({
                name,
                description,
                trigger_type: triggerType,
                action_type: actionType,
                action_config: JSON.parse(actionConfig),
                conditions: conditions.trim() === '' ? null : JSON.parse(conditions),
            })
        } catch {
            return setError('JSON inválido nos campos de configuração ou condição')
        }

        api(id ? `/workflows/${id}` : '/workflows', {
            method: id ? 'PUT' : 'POST',
            body,
        })
            .then(() => navigate('/'))
            .catch(err => setError(err.message))
    }

    return (
        <>
            <h2>{id ? 'Editar' : 'Novo'} Workflow</h2>
            {error && <p>{error}</p>}
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Nome </label>
                    <input value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div>
                    <label>Descrição </label>
                    <input value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <div>
                    <label>WHEN </label>
                    <select value={triggerType} onChange={e => setTriggerType(e.target.value)}>
                        {TRIGGERS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label>IF (JSON, vazio = sem condição) </label>
                    <textarea
                        value={conditions}
                        onChange={e => setConditions(e.target.value)}
                        placeholder='{"field":"total","operator":">","value":100}'
                    />
                </div>
                <div>
                    <label>DO </label>
                    <select value={actionType} onChange={e => setActionType(e.target.value)}>
                        {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
                <div>
                    <label>Config (JSON) </label>
                    <textarea
                        value={actionConfig}
                        onChange={e => setActionConfig(e.target.value)}
                        placeholder='{"message":"Olá"}'
                    />
                </div>
                <button type="submit">{id ? 'Guardar' : 'Criar'}</button>
            </form>
        </>
    )
}
