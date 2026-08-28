/**
 * O que cada gatilho traz no evento e o que cada ação precisa.
 * Espelha engine/conditions.ts e engine/actions.ts — se lá mudar, muda aqui.
 */

export type FieldKind = 'number' | 'text'

export const TRIGGERS: { value: string; label: string; fields: { name: string; kind: FieldKind }[] }[] = [
    {
        value: 'order.created',
        label: 'Encomenda criada',
        fields: [
            { name: 'total', kind: 'number' },
            { name: 'orderId', kind: 'number' },
            { name: 'customer', kind: 'text' },
        ],
    },
    {
        value: 'user.created',
        label: 'Utilizador criado',
        fields: [
            { name: 'userId', kind: 'number' },
            { name: 'email', kind: 'text' },
        ],
    },
    {
        value: 'payment.completed',
        label: 'Pagamento concluído',
        fields: [
            { name: 'amount', kind: 'number' },
            { name: 'paymentId', kind: 'number' },
        ],
    },
    {
        value: 'form.submitted',
        label: 'Formulário submetido',
        fields: [
            { name: 'formId', kind: 'number' },
            { name: 'field', kind: 'text' },
        ],
    },
]

/* o engine só conhece estes três — conditions.ts */
export const OPERATORS = [
    { value: '>', label: 'maior que' },
    { value: '<', label: 'menor que' },
    { value: '==', label: 'igual a' },
]

export const ACTIONS: { value: string; label: string; fields: { name: string; label: string; placeholder: string }[] }[] = [
    {
        value: 'send_notification',
        label: 'Enviar notificação',
        fields: [{ name: 'message', label: 'Mensagem', placeholder: 'Encomenda grande recebida' }],
    },
    {
        value: 'send_email',
        label: 'Enviar email',
        fields: [
            { name: 'to', label: 'Para', placeholder: 'cliente@mail.com' },
            { name: 'subject', label: 'Assunto', placeholder: 'A tua encomenda' },
        ],
    },
    {
        value: 'create_record',
        label: 'Criar registo',
        fields: [
            { name: 'table', label: 'Tabela', placeholder: 'orders' },
            { name: 'fields', label: 'Campos', placeholder: 'status=pago' },
        ],
    },
]

export const triggerBy = (v: string) => TRIGGERS.find(t => t.value === v) ?? TRIGGERS[0]
export const actionBy = (v: string) => ACTIONS.find(a => a.value === v) ?? ACTIONS[0]
