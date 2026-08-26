import { useState } from 'react'
import { api } from '../api'

const EVENTS = [
    { type: 'order.created', label: 'Order Created', data: { orderId: 123, customer: 'João', total: 149.99 } },
    { type: 'user.created', label: 'User Created', data: { userId: 45, email: 'joao@mail.com' } },
    { type: 'payment.completed', label: 'Payment Completed', data: { paymentId: 9, amount: 59.9 } },
    { type: 'form.submitted', label: 'Form Submitted', data: { formId: 2, field: 'value' } },
]

export default function Simulator() {
    const [result, setResult] = useState<unknown>(null)
    const [error, setError] = useState('')

    function simulate(type: string, data: Record<string, unknown>) {
        api('/events', {
            method: 'POST',
            body: JSON.stringify({ type, data }),
        })
            .then(json => { setResult(json); setError('') })
            .catch(err => setError(err.message))
    }

    return (
        <>
            <h2>Event Simulator</h2>
            {error && <p>{error}</p>}
            {EVENTS.map((event) => (
                <button key={event.type} onClick={() => simulate(event.type, event.data)}>
                    Simulate {event.label}
                </button>
            ))}

            {result != null && <pre>{JSON.stringify(result, null, 2)}</pre>}
        </>
    )
}
