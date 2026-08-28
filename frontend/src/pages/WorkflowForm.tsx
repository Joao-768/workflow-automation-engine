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

    /* condição em partes, não em JSON */
    const [hasCondition, setHasCondition] = useState(false)
    const [condField, setCondField] = useState(TRIGGERS[0].fields[0].name)
    const [condOperator, setCondOperator] = useState(OPERATORS[0].value)
    const [condValue, setCondValue] = useState('')

    /* um valor por campo da ação escolhida */
    const [config, setConfig] = useState<Record<string, string>>({})
    /* onde inserir o {{campo}} quando se carrega num atalho */
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

                /* o que vem da BD pode ter campos que esta ação não usa — o
                   render só mostra os dela, e o submit só envia esses */
                const cfg: Record<string, string> = {}
                for (const [k, v] of Object.entries(w.action_config ?? {})) {
                    cfg[k] = typeof v === 'string' ? v : JSON.stringify(v)
                }
                setConfig(cfg)
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false))
    }, [id])

    /* trocar de gatilho pode invalidar o campo escolhido: derivamos o campo
       efetivo durante o render em vez de o corrigir num efeito, senao havia
       um render intermedio com um campo que nao existe neste gatilho */
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
                return setError('Indica o valor a comparar na condição.')
            }
            /* '==' compara sem converter (conditions.ts), por isso um campo de
               texto tem de ir como texto e um numérico como número */
            const value = fieldKind === 'number' ? Number(condValue) : condValue
            if (fieldKind === 'number' && Number.isNaN(value as number)) {
                return setError('O valor da condição tem de ser um número.')
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

    if (loading) return <p className="standby">A carregar...</p>

    return (
        <>
            <div className="head">
                <div>
                    <h2>{id ? 'Editar workflow' : 'Novo workflow'}</h2>
                    <p>Define quando o workflow corre e o que faz.</p>
                </div>
            </div>

            {error && <p className="fault">{error}</p>}

            <form onSubmit={handleSubmit}>
                <div className="field">
                    <label>Nome</label>
                    <input value={name} onChange={e => setName(e.target.value)} required />
                </div>

                <div className="field">
                    <label>Descrição</label>
                    <input value={description} onChange={e => setDescription(e.target.value)} />
                </div>

                <div className="block">
                    <span className="plate">Quando</span>
                    <div className="field">
                        <label>O evento que despoleta</label>
                        <select value={triggerType} onChange={e => setTriggerType(e.target.value)}>
                            {TRIGGERS.map(t => (
                                <option key={t.value} value={t.value}>{t.label} — {t.value}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="block">
                    <span className="plate">Se</span>

                    <div className="choice">
                        <label>
                            <input
                                type="radio"
                                checked={!hasCondition}
                                onChange={() => setHasCondition(false)}
                            />
                            Corre sempre
                        </label>
                        <label>
                            <input
                                type="radio"
                                checked={hasCondition}
                                onChange={() => setHasCondition(true)}
                            />
                            Só se a condição passar
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
                                placeholder={fieldKind === 'number' ? '100' : 'valor'}
                            />
                        </div>
                    )}
                </div>

                <div className="block">
                    <span className="plate">Então</span>

                    <div className="field">
                        <label>O que acontece</label>
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
                        Usa <code>{'{{campo}}'}</code> para meter dados do evento:
                        {trigger.fields.map(f => (
                            <button
                                type="button"
                                key={f.name}
                                className="token"
                                title={`inserir {{${f.name}}}`}
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
                    <button type="submit" className="btn-primary">{id ? 'Guardar' : 'Criar'}</button>
                    <Link to="/workflows">Cancelar</Link>
                </div>
            </form>
        </>
    )
}
