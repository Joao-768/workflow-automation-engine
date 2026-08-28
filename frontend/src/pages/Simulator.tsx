import { useState } from 'react'
import { api } from '../api'

const EVENTS = [
    { type: 'order.created', label: 'Order Created', data: { orderId: 123, customer: 'João', email: 'joao@mail.com', total: 149.99 } },
    { type: 'user.created', label: 'User Created', data: { userId: 45, email: 'ana@mail.com', name: 'Ana' } },
    { type: 'payment.completed', label: 'Payment Completed', data: { paymentId: 9, amount: 59.9 } },
    { type: 'form.submitted', label: 'Form Submitted', data: { formId: 2, field: 'value' } },
]

export default function Simulator() {
    const [result, setResult] = useState<unknown>(null)
    const [error, setError] = useState('')

    function simulate(type: string, data: Record<string, unknown>) {
        api('/events', { method: 'POST', body: JSON.stringify({ type, data }) })
            .then(json => { setResult(json); setError('') })
            .catch(err => setError(err.message))
    }

    return (
        <>
            <div className="head">
                <div>
                    <h2>Simulator</h2>
                    <p>Simulate an external event. Active workflows on that trigger run automatically.</p>
                </div>
            </div>

            {error && <p className="fault">{error}</p>}

            <div className="strip-head">
                <span>Available events</span>
            </div>

            <div className="strip">
                {EVENTS.map(e => (
                    <div key={e.type} className="line">
                        <div className="line-main">
                            <span className="line-title">{e.label}</span>
                            <span className="line-sub">{e.type}</span>
                        </div>
                        <button className="btn-sm" onClick={() => simulate(e.type, e.data)}>Fire</button>
                    </div>
                ))}
            </div>

            {result != null && (
                <>
                    <div className="strip-head" style={{ marginTop: 40 }}>
                        <span>Result</span>
                    </div>
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                </>
            )}
        </>
    )
}
