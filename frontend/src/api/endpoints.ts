import type {
    AuthResponse,
    DashboardStats,
    DataRecord,
    EventResponse,
    ExecutionDetail,
    ExecutionStatus,
    ExecutionSummary,
    Paginated,
    TriggerType,
    User,
    WorkflowDefinition,
    WorkflowDetail,
    WorkflowSummary,
} from '@wae/shared'
import { request } from './client'

/** One typed function per API route. Components never build URLs themselves. */

export const auth = {
    register: (body: { name: string; email: string; password: string }) =>
        request<AuthResponse>('/auth/register', { method: 'POST', body }),
    login: (body: { email: string; password: string }) =>
        request<AuthResponse>('/auth/login', { method: 'POST', body }),
    me: () => request<User>('/auth/me'),
    updateMe: (body: { name: string }) => request<User>('/auth/me', { method: 'PATCH', body }),
    changePassword: (body: { currentPassword: string; newPassword: string }) =>
        request<void>('/auth/me/password', { method: 'POST', body }),
}

type WorkflowWrite = { name: string; description?: string | null; definition?: WorkflowDefinition }

export const workflows = {
    list: () => request<WorkflowSummary[]>('/workflows'),
    get: (id: number) => request<WorkflowDetail>(`/workflows/${id}`),
    create: (body: WorkflowWrite) =>
        request<WorkflowDetail>('/workflows', { method: 'POST', body }),
    update: (id: number, body: WorkflowWrite) =>
        request<WorkflowDetail>(`/workflows/${id}`, { method: 'PUT', body }),
    remove: (id: number) => request<void>(`/workflows/${id}`, { method: 'DELETE' }),
    activate: (id: number) =>
        request<WorkflowDetail>(`/workflows/${id}/activate`, { method: 'POST' }),
    deactivate: (id: number) =>
        request<WorkflowDetail>(`/workflows/${id}/deactivate`, { method: 'POST' }),
    duplicate: (id: number) =>
        request<WorkflowDetail>(`/workflows/${id}/duplicate`, { method: 'POST' }),
    run: (id: number, payload: Record<string, unknown>) =>
        request<{ executionId: number; status: ExecutionStatus }>(`/workflows/${id}/run`, {
            method: 'POST',
            body: { payload },
        }),
    rotateSecret: (id: number) =>
        request<{ secret: string }>(`/workflows/${id}/webhook-secret`, { method: 'POST' }),
    removeSecret: (id: number) =>
        request<void>(`/workflows/${id}/webhook-secret`, { method: 'DELETE' }),
}

export type ExecutionFilters = {
    page?: number
    pageSize?: number
    workflowId?: number
    status?: ExecutionStatus
    triggerType?: TriggerType
    from?: string
    to?: string
}

export const executions = {
    list: (filters: ExecutionFilters) =>
        request<Paginated<ExecutionSummary>>('/executions', {
            query: filters as Record<string, string | number | undefined>,
        }),
    get: (id: number) => request<ExecutionDetail>(`/executions/${id}`),
}

export const events = {
    fire: (type: string, data: Record<string, unknown>) =>
        request<EventResponse>('/events', { method: 'POST', body: { type, data } }),
}

export const records = {
    list: (query: { collection?: string; page?: number; pageSize?: number }) =>
        request<Paginated<DataRecord>>('/records', { query }),
    collections: () => request<{ collection: string; count: number }[]>('/records/collections'),
}

export const dashboard = {
    get: () => request<DashboardStats>('/dashboard'),
}
