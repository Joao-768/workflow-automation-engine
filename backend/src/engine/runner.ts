import { pool } from '../db';
import evaluateCondition from './conditions';
import executeAction from './actions';

export default async function runWorkflows(
    type: string,
    data: Record<string, unknown>
) {
    const found = await pool.query('SELECT * FROM workflows WHERE trigger_type = $1 AND is_active = true', [type]);
    const results = [];

    for (const workflow of found.rows) {
        let result;
        let actionResult;

        if(!evaluateCondition(workflow.conditions, data)) 
            result = 'skipped';
        else
            try {
                actionResult = await executeAction(workflow.action_type, workflow.action_config, data)
                result = 'success';
            } catch (err) {
                result = 'failed';
                actionResult = { error: (err as Error).message };
            }

        results.push({ workflowId: workflow.id, status: result, result: actionResult })
    
        await pool.query('INSERT INTO executions (workflow_id, status, event_data, result) VALUES ($1, $2, $3, $4)', [workflow.id, result, data, actionResult])
    }

    return results;
}
