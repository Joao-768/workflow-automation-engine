/**
 * What each trigger carries in its event, and what each action needs.
 * Mirrors engine/conditions.ts and engine/actions.ts — if those change, change this.
 */

export type FieldKind = 'number' | 'text'

export const TRIGGERS: { value: string; label: string; fields: { name: string; kind: FieldKind }[] }[] = [
    {
        value: 'order.created',
        label: 'Order created',
        fields: [
            { name: 'total', kind: 'number' },
            { name: 'orderId', kind: 'number' },
            { name: 'customer', kind: 'text' },
            { name: 'email', kind: 'text' },
        ],
    },
    {
        value: 'user.created',
        label: 'User created',
        fields: [
            { name: 'userId', kind: 'number' },
            { name: 'email', kind: 'text' },
            { name: 'name', kind: 'text' },
        ],
    },
    {
        value: 'payment.completed',
        label: 'Payment completed',
        fields: [
            { name: 'amount', kind: 'number' },
            { name: 'paymentId', kind: 'number' },
        ],
    },
    {
        value: 'form.submitted',
        label: 'Form submitted',
        fields: [
            { name: 'formId', kind: 'number' },
            { name: 'field', kind: 'text' },
        ],
    },
]

/* the engine only knows these three — conditions.ts */
export const OPERATORS = [
    { value: '>', label: 'greater than' },
    { value: '<', label: 'less than' },
    { value: '==', label: 'equals' },
]

export const ACTIONS: { value: string; label: string; fields: { name: string; label: string; placeholder: string }[] }[] = [
    {
        value: 'send_notification',
        label: 'Send notification',
        fields: [{ name: 'message', label: 'Message', placeholder: 'Large order received' }],
    },
    {
        value: 'send_email',
        label: 'Send email',
        fields: [
            { name: 'to', label: 'To', placeholder: 'customer@mail.com' },
            { name: 'subject', label: 'Subject', placeholder: 'Your order' },
        ],
    },
    {
        value: 'create_record',
        label: 'Create record',
        fields: [
            { name: 'table', label: 'Table', placeholder: 'orders' },
            { name: 'fields', label: 'Fields', placeholder: 'status=paid' },
        ],
    },
]

export const triggerBy = (v: string) => TRIGGERS.find(t => t.value === v) ?? TRIGGERS[0]
export const actionBy = (v: string) => ACTIONS.find(a => a.value === v) ?? ACTIONS[0]
