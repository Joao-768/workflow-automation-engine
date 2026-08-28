import fillTemplate from './template';

export default async function executeAction(
    action_type: string,
    action_config: Record<string, unknown>,
    data: Record<string, unknown>
) {
    /* action fields may carry {{field}} — the value comes from the event,
       so one workflow can serve each customer with their own data */
    const cfg = (key: string) => fillTemplate(action_config[key], data);

    switch (action_type) {
        case 'send_notification': {
            console.log("Notification Sent!");
            return { message: cfg('message') };
        }
        case 'send_email': {
            const to = cfg('to');
            if (!to) throw new Error('send_email with no recipient');
            console.log(`Email Sent to ${to}!`);
            return { to, subject: cfg('subject') };
        }
        case 'create_record': {
            console.log("Record Created!");
            return { table: cfg('table'), fields: cfg('fields') };
        }
        default: throw new Error(`Unknown Action: ${action_type}`);
    }
}
