import { useState } from 'react'

const EVENTOS = [
    { type: 'order.created', label: 'Order Created', data: { orderId: 123, customer: 'João', total: 149.99 } },
    { type: 'user.created', label: 'User Created', data: { userId: 45, email: 'joao@mail.com' } },
    { type: 'payment.completed', label: 'Payment Completed', data: { paymentId: 9, amount: 59.9 } },
    { type: 'form.submitted', label: 'Form Submitted', data: { formId: 2, campo: 'valor' } },
]

export default function Simulator() {
    const [resultado, setResultado] = useState<unknown>(null)
    const [erro, setErro] = useState('')

    function simular(type: string, data: Record<string, unknown>) {
        fetch('http://localhost:3000/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, data }),
        })
            .then(res => {
                if (!res.ok) throw new Error('Erro ao simular o evento')
                return res.json()
            })
            .then(json => { setResultado(json); setErro('') })
            .catch(err => setErro(err.message))
    }

    return (
        <>
            <h2>Event Simulator</h2>
            {erro && <p>{erro}</p>}
            {EVENTOS.map((evento) => (
                <button key={evento.type} onClick={() => simular(evento.type, evento.data)}>
                    Simulate {evento.label}
                </button>
            ))}

            {resultado != null && <pre>{JSON.stringify(resultado, null, 2)}</pre>}
        </>
    )
}
