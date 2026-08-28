import fillTemplate from './template';

export default async function executeAction(
    action_type: string,
    action_config: Record<string, unknown>,
    data: Record<string, unknown>
) {
    /* os campos da acao podem trazer {{campo}} — o valor vem do evento,
       para o mesmo workflow servir cada cliente com os seus dados */
    const cfg = (key: string) => fillTemplate(action_config[key], data);

    switch (action_type) {
        case 'send_notification': {
            console.log("Notification Sent!");
            return { message: cfg('message') };
        }
        case 'send_email': {
            const to = cfg('to');
            if (!to) throw new Error('send_email sem destinatario');
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
