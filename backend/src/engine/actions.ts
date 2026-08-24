export default async function executeAction(
    action_type: string,
    action_config: Record<string, unknown>,
    data: Record<string, unknown>
) {
    switch (action_type) {
        case 'send_notification': {
            console.log("Notification Sent!");
            return { message: action_config.message };
        }
        case 'send_email': {
            console.log("Email Sent!");
            return { to: action_config.to, subject: action_config.subject };
        }
        case 'create_record': {
            console.log("Record Created!");
            return { table: action_config.table, fields: action_config.fields };
        }
        default: throw new Error(`Unknown Action: ${action_type}`);
    }
}