import http from 'node:http'
import type { AddressInfo } from 'node:net'
import request from 'supertest'
import type { Worker } from 'bullmq'
import type { AuthResponse, ExecutionDetail, ExecutionStatus, WorkflowDefinition, WorkflowDetail } from '@wae/shared'
import { createApp } from '../src/http/app'
import { SimulatedEmailSender } from '../src/adapters/email'
import { sendHttpRequest } from '../src/adapters/httpClient'
import { createRecordOnce } from '../src/repositories/records'
import { enqueueNode } from '../src/queue/queue'
import { createWorker } from '../src/queue/worker'

export const app = createApp()
export const api = () => request(app)

let counter = 0

export async function registerUser(name = 'Tester'): Promise<AuthResponse & { auth: { Authorization: string } }> {
    counter++
    const res = await api()
        .post('/auth/register')
        .send({ name, email: `user${Date.now()}${counter}@example.com`, password: 'password123' })
        .expect(201)
    return { ...res.body, auth: { Authorization: `Bearer ${res.body.token}` } }
}

export async function createWorkflow(
    auth: { Authorization: string },
    definition: WorkflowDefinition,
    options: { name?: string; activate?: boolean } = {},
): Promise<WorkflowDetail> {
    const created = await api()
        .post('/workflows')
        .set(auth)
        .send({ name: options.name ?? 'Test workflow', definition })
        .expect(201)
    if (options.activate === false) return created.body
    const activated = await api().post(`/workflows/${created.body.id}/activate`).set(auth).expect(200)
    return activated.body
}

/** Polls the API until the execution reaches one of `statuses`. */
export async function waitForExecution(
    auth: { Authorization: string },
    id: number,
    statuses: ExecutionStatus[] = ['success', 'failed'],
    timeoutMs = 10_000,
): Promise<ExecutionDetail> {
    const deadline = Date.now() + timeoutMs
    let last: ExecutionDetail | undefined
    while (Date.now() < deadline) {
        const res = await api().get(`/executions/${id}`).set(auth).expect(200)
        last = res.body
        if (statuses.includes(res.body.status)) return res.body
        await new Promise((resolve) => setTimeout(resolve, 50))
    }
    throw new Error(`Execution ${id} did not reach ${statuses.join('/')} (last: ${last?.status})`)
}

/** A worker running in the test process, with email captured in memory. */
export function startTestWorker(): { worker: Worker; email: SimulatedEmailSender } {
    const email = new SimulatedEmailSender()
    const worker = createWorker(
        { services: { email, http: sendHttpRequest, createRecord: createRecordOnce }, enqueue: enqueueNode },
        5,
    )
    return { worker, email }
}

/**
 * A tiny local HTTP server standing in for an external API. `respond` can be
 * swapped per test; every request is recorded.
 */
export async function startMockServer() {
    const requests: { method: string; url: string; headers: http.IncomingHttpHeaders; body: string }[] = []
    let respond: (req: http.IncomingMessage, res: http.ServerResponse) => void = (_req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}')
    }

    const server = http.createServer((req, res) => {
        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', () => {
            requests.push({ method: req.method ?? '', url: req.url ?? '', headers: req.headers, body })
            respond(req, res)
        })
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address() as AddressInfo

    return {
        url: `http://127.0.0.1:${port}`,
        requests,
        setHandler(handler: typeof respond) {
            respond = handler
        },
        close: () =>
            new Promise<void>((resolve) => {
                server.closeAllConnections()
                server.close(() => resolve())
            }),
    }
}

export const at = { x: 0, y: 0 }

export function stepsOf(execution: ExecutionDetail, nodeId: string) {
    return execution.steps.filter((step) => step.nodeId === nodeId)
}
