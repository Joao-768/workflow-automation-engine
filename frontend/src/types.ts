export type Workflow = {
    id: number
    name: string
    description: string | null
    trigger_type: string
    action_type: string
    is_active: boolean
}

export type Execution = {
    id: number
    workflow_id: number
    workflow_name: string
    status: 'success' | 'skipped' | 'failed'
    executed_at: string
    event_data: Record<string, unknown>
    result: Record<string, unknown> | null
}
