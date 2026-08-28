import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { api } from '../api'
import { TRIGGERS, ACTIONS, OPERATORS, triggerBy, actionBy } from '../schema'

export default function WorkflowForm() {
    const navigate = useNavigate()
    const { id } = useParams()

    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [triggerType, setTriggerType] = useState(TRIGGERS[0].value)
    const [actionType, setActionType] = useState(ACTIONS[0].value)

    /* condition split into parts, not raw JSON */
    const [hasCondition, setHasCondition] = useState(false)
    const [condField, setCondField] = useState(TRIGGERS[0].fields[0].name)
    const [condOperator, setCondOperator] = useState(OPERATORS[0].value)
    const [condValue, setCondValue] = useState('')

    /* one value per field of the selected action */
    const [config, setConfig] = useState<Record<string, string>>({})
    /* which field a {{token}} shortcut inserts into */
    const [lastField, setLastField] = useState('')

    const [error, setError] = useState('')
    const [loading, setLoading] = useState(Boolean(id))

    const trigger = triggerBy(triggerType)
    const action = actionBy(actionType)

    useEffect(() => {
        if (!id) return
        api(`/workflows/${id}`)
            .then(w => {
                setName(w.name)
                setDescription(w.description ?? '')
                setTriggerType(w.trigger_type)
                setActionType(w.action_type)

                if (w.conditions) {
                    setHasCondition(true)
                    setCondField(w.conditions.field ?? '')
                    setCondOperator(w.conditions.operator ?? OPERATORS[0].value)
                    setCondValue(String(w.conditions.value ?? ''))
                }

                /* what comes back from the DB may hold fields this action
                   doesn't use — the render only shows its own, and submit
                   only sends those */
                const cfg: Record<string, string> = {}
                for (const [k, v] of Object.entries(w.action_config ?? {})) {
                    cfg[k] = typeof v === 'string' ? v : JSON.stringify(v)
                }
                setConfig(cfg)
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false))
    }, [id])

    /* switching trigger can invalidate the selected field: derive the
       effective one during render instead of fixing it in an effect, which
       would leave an intermediate render holding a field this trigger
       doesn't have */
    const field = trigger.fields.some(f => f.name === condField)
        ? condField
        : trigger.fields[0].name

    const fieldKind = trigger.fields.find(f => f.name === field)?.kind ?? 'text'

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        let conditions = null
        if (hasCondition) {
            if (condValue.trim() === '') {
                return setError('Enter the value to compare in the condition.')
            }
            /* '==' compares without coercing (conditions.ts), so a text field
               must go as text and a numeric one as a number */
            const value = fieldKind === 'number' ? Number(condValue) : condValue
            if (fieldKind === 'number' && Number.isNaN(value as number)) {
                return setError('The condition value must be a number.')
            }
            conditions = { field, operator: condOperator, value }
        }

        const action_config: Record<string, string> = {}
        for (const f of action.fields) {
            const v = config[f.name]?.trim()
            if (v) action_config[f.name] = v
        }

        api(id ? `/workflows/${id}` : '/workflows', {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify({
                name,
                description,
                trigger_type: triggerType,
                action_type: actionType,
                action_config,
                conditions,
            }),
        })
            .then(() => navigate('/workflows'))
            .catch(err => setError(err.message))
    }

    if (loading) return <p className="standby">Loading...</p>

    return (
        <>
            <div className="head">
                <div>
                    <h2>{id ? 'Edit workflow' : 'New workflow'}</h2>
                    <p>Set when the workflow runs and what it does.</p>
                </div>
            </div>

            {error && <p className="fault">{error}</p>}

            <form onSubmit={handleSubmit}>
                <div className="field">
                    <label>Name</label>
                    <input value={name} onChange={e => setName(e.target.value)} required />
                </div>

                <div className="field">
                    <label>Description</label>
                    <input value={description} onChange={e => setDescription(e.target.value)} />
                </div>

                <div className="block">
                    <span className="plate">When</span>
                    <div className="field">
                        <label>The event that fires it</label>
                        <select value={triggerType} onChange={e => setTriggerType(e.target.value)}>
                            {TRIGGERS.map(t => (
                                <option key={t.value} value={t.value}>{t.label} — {t.value}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="block">
                    <span className="plate">If</span>

                    <div className="choice">
                        <label>
                            <input
                                type="radio"
                                checked={!hasCondition}
                                onChange={() => setHasCondition(false)}
                            />
                            Runs always
                        </label>
                        <label>
                            <input
                                type="radio"
                                checked={hasCondition}
                                onChange={() => setHasCondition(true)}
                            />
                            Only if the condition passes
                        </label>
                    </div>

                    {hasCondition && (
                        <div className="condition">
                            <select value={field} onChange={e => setCondField(e.target.value)}>
                                {trigger.fields.map(f => (
                                    <option key={f.name} value={f.name}>{f.name}</option>
                                ))}
                            </select>
                            <select value={condOperator} onChange={e => setCondOperator(e.target.value)}>
                                {OPERATORS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <input
                                type={fieldKind === 'number' ? 'number' : 'text'}
                                step="any"
                                value={condValue}
                                onChange={e => setCondValue(e.target.value)}
                                placeholder={fieldKind === 'number' ? '100' : 'value'}
                            />
                        </div>
                    )}
                </div>

                <div className="block">
                    <span className="plate">Then</span>

                    <div className="field">
                        <label>What happens</label>
                        <select value={actionType} onChange={e => setActionType(e.target.value)}>
                            {ACTIONS.map(a => (
                                <option key={a.value} value={a.value}>{a.label}</option>
                            ))}
                        </select>
                    </div>

                    {action.fields.map(f => (
                        <div className="field" key={f.name}>
                            <label>{f.label}</label>
                            <input
                                value={config[f.name] ?? ''}
                                onChange={e => setConfig({ ...config, [f.name]: e.target.value })}
                                onFocus={() => setLastField(f.name)}
                                placeholder={f.placeholder}
                            />
                        </div>
                    ))}

                    <p className="tokens">
                        Use <code>{'{{field}}'}</code> to pull in event data:
                        {trigger.fields.map(f => (
                            <button
                                type="button"
                                key={f.name}
                                className="token"
                                title={`insert {{${f.name}}}`}
                                onClick={() => {
                                    const target = action.fields.some(a => a.name === lastField)
                                        ? lastField
                                        : action.fields[0].name
                                    setConfig({ ...config, [target]: (config[target] ?? '') + `{{${f.name}}}` })
                                }}
                            >
                                {`{{${f.name}}}`}
                            </button>
                        ))}
                    </p>
                </div>

                <div className="form-actions">
                    <button type="submit" className="btn-primary">{id ? 'Save' : 'Create'}</button>
                    <Link to="/workflows">Cancel</Link>
                </div>
            </form>
        </>
    )
}
