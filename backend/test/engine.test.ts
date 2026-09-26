import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Worker } from 'bullmq'
import type { SimulatedEmailSender } from '../src/adapters/email'
import type { WorkflowDefinition } from '@wae/shared'
import { pool } from '../src/db/pool'
import { getQueue, JOB } from '../src/queue/queue'
import {
    api,
    at,
    createWorkflow,
    registerUser,
    startMockServer,
    startTestWorker,
    stepsOf,
    waitForExecution,
} from './helpers'

/**
 * End-to-end engine behaviour: API -> Postgres -> BullMQ -> worker -> engine
 * -> Postgres, with a real worker in this process, a local mock server in
 * place of external APIs and email captured in memory.
 */

let worker: Worker
let email: SimulatedEmailSender
let mock: Awaited<ReturnType<typeof startMockServer>>
let auth: { Authorization: string }

beforeAll(async () => {
    ;({ worker, email } = startTestWorker())
    mock = await startMockServer()
    ;({ auth } = await registerUser('Engine'))
})

afterAll(async () => {
    await worker.close()
    await mock.close()
})

/** Scenario A/B graph: order.created -> total > 100 ? (notify -> record) : record */
function largeOrderGraph(eventName: string): WorkflowDefinition {
    return {
        nodes: [
            { id: 'trigger', type: 'trigger', position: at, config: { type: 'event', eventName } },
            {
                id: 'is_large',
                type: 'condition',
                position: at,
                config: { path: 'event.total', operator: 'gt', value: '100' },
            },
            {
                id: 'notify',
                type: 'notification',
                position: at,
                config: { message: 'Large order {{event.orderId}} from {{event.customer}}' },
            },
            {
                id: 'save_large',
                type: 'create_record',
                position: at,
                config: {
                    collection: 'large_orders',
                    data: {
                        orderId: '{{event.orderId}}',
                        total: '{{event.total}}',
                        note: '{{steps.notify.message}}',
                    },
                },
            },
            {
                id: 'save_small',
                type: 'create_record',
                position: at,
                config: { collection: 'small_orders', data: { orderId: '{{event.orderId}}' } },
            },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'is_large' },
            { id: 'e2', source: 'is_large', target: 'notify', sourceHandle: 'true' },
            { id: 'e3', source: 'notify', target: 'save_large' },
            { id: 'e4', source: 'is_large', target: 'save_small', sourceHandle: 'false' },
        ],
    }
}

function httpGraph(url: string, extra: Record<string, unknown> = {}): WorkflowDefinition {
    return {
        nodes: [
            { id: 'trigger', type: 'trigger', position: at, config: { type: 'manual' } },
            {
                id: 'call',
                type: 'http_request',
                position: at,
                config: {
                    method: 'GET',
                    url,
                    headers: [],
                    query: [],
                    bodyType: 'none',
                    timeoutMs: 2000,
                    ...extra,
                },
            },
        ],
        edges: [{ id: 'e1', source: 'trigger', target: 'call' }],
    }
}

async function runManual(workflowId: number, payload: Record<string, unknown> = {}) {
    const res = await api()
        .post(`/workflows/${workflowId}/run`)
        .set(auth)
        .send({ payload })
        .expect(202)
    return res.body.executionId as number
}

describe('Scenario A: true branch', () => {
    it('queues, runs the true branch and persists a record', async () => {
        await createWorkflow(auth, largeOrderGraph('order.a'))
        const fired = await api()
            .post('/events')
            .set(auth)
            .send({
                type: 'order.a',
                data: { orderId: 123, customer: 'João', email: 'joao@example.com', total: 149.99 },
            })
            .expect(202)
        expect(fired.body.matched).toHaveLength(1)

        const execution = await waitForExecution(auth, fired.body.matched[0].executionId)
        expect(execution.status).toBe('success')
        expect(execution.durationMs).toEqual(expect.any(Number))

        const ran = execution.steps.filter((s) => s.status === 'success').map((s) => s.nodeId)
        expect(ran).toEqual(['trigger', 'is_large', 'notify', 'save_large'])
        for (const step of execution.steps.filter((s) => s.status === 'success')) {
            expect(step.durationMs).toEqual(expect.any(Number))
            expect(step.output).toBeDefined()
        }
        expect(stepsOf(execution, 'is_large')[0].output).toMatchObject({
            result: true,
            left: 149.99,
            right: 100,
        })
        expect(stepsOf(execution, 'save_small')[0].status).toBe('skipped')

        const { rows } = await pool.query('SELECT data FROM records WHERE execution_id = $1', [
            execution.id,
        ])
        expect(rows).toEqual([
            { data: { orderId: 123, total: 149.99, note: 'Large order 123 from João' } },
        ])
    })
})

describe('Scenario B: false branch', () => {
    it('skips the true branch and runs the false one', async () => {
        await createWorkflow(auth, largeOrderGraph('order.b'))
        const fired = await api()
            .post('/events')
            .set(auth)
            .send({ type: 'order.b', data: { orderId: 7, total: 40 } })
            .expect(202)
        const execution = await waitForExecution(auth, fired.body.matched[0].executionId)

        expect(execution.status).toBe('success')
        expect(stepsOf(execution, 'save_small')[0].status).toBe('success')
        expect(stepsOf(execution, 'notify')[0].status).toBe('skipped')
        expect(stepsOf(execution, 'save_large')[0].status).toBe('skipped')
    })
})

describe('Scenario C: webhook', () => {
    it('accepts JSON, answers 202 and runs asynchronously with the payload as event', async () => {
        const workflow = await createWorkflow(auth, {
            nodes: [
                { id: 'trigger', type: 'trigger', position: at, config: { type: 'webhook' } },
                {
                    id: 'note',
                    type: 'notification',
                    position: at,
                    config: { message: 'Customer {{event.name}} ({{event.country}})' },
                },
            ],
            edges: [{ id: 'e1', source: 'trigger', target: 'note' }],
        })

        const res = await api()
            .post(workflow.webhook.path)
            .send({ name: 'Rita', country: 'PT' })
            .expect(202)
        expect(res.body).toEqual({ status: 'queued', executionId: expect.any(Number) })

        const execution = await waitForExecution(auth, res.body.executionId)
        expect(execution).toMatchObject({
            status: 'success',
            triggerType: 'webhook',
            triggerData: { name: 'Rita', country: 'PT' },
        })
        expect(stepsOf(execution, 'note')[0].output).toMatchObject({
            message: 'Customer Rita (PT)',
        })
    })

    it('enforces the webhook secret', async () => {
        const workflow = await createWorkflow(auth, {
            nodes: [
                { id: 'trigger', type: 'trigger', position: at, config: { type: 'webhook' } },
                { id: 'note', type: 'notification', position: at, config: { message: 'x' } },
            ],
            edges: [{ id: 'e1', source: 'trigger', target: 'note' }],
        })
        const { body } = await api()
            .post(`/workflows/${workflow.id}/webhook-secret`)
            .set(auth)
            .expect(201)

        await api().post(workflow.webhook.path).send({}).expect(401)
        await api()
            .post(workflow.webhook.path)
            .set('X-Webhook-Secret', 'wrong')
            .send({})
            .expect(401)
        await api()
            .post(workflow.webhook.path)
            .set('X-Webhook-Secret', body.secret)
            .send({})
            .expect(202)
    })

    it('does not reveal unknown or malformed webhooks', async () => {
        await api().post('/webhooks/0123456789abcdef0123456789abcdef').send({}).expect(404)
        await api().post('/webhooks/1').send({}).expect(400)
    })
})

describe('Scenario D: manual run', () => {
    it('creates a real backend execution from a JSON payload, even for an inactive workflow', async () => {
        const workflow = await createWorkflow(
            auth,
            {
                nodes: [
                    { id: 'trigger', type: 'trigger', position: at, config: { type: 'manual' } },
                    {
                        id: 'mail',
                        type: 'email',
                        position: at,
                        config: {
                            to: '{{event.email}}',
                            subject: 'Hi {{event.name}}',
                            body: 'Welcome',
                        },
                    },
                ],
                edges: [{ id: 'e1', source: 'trigger', target: 'mail' }],
            },
            { activate: false },
        )
        const executionId = await runManual(workflow.id, { email: 'ana@example.com', name: 'Ana' })
        const execution = await waitForExecution(auth, executionId)

        expect(execution).toMatchObject({ status: 'success', triggerType: 'manual' })
        expect(stepsOf(execution, 'mail')[0].output).toMatchObject({
            simulated: true,
            to: 'ana@example.com',
        })
        expect(email.sent).toContainEqual({
            to: 'ana@example.com',
            subject: 'Hi Ana',
            text: 'Welcome',
        })
    })
})

describe('Scenario E: schedule', () => {
    it('turns a schedule tick into an execution', async () => {
        const workflow = await createWorkflow(auth, {
            nodes: [
                {
                    id: 'trigger',
                    type: 'trigger',
                    position: at,
                    config: { type: 'schedule', cron: '0 3 * * *' },
                },
                {
                    id: 'beat',
                    type: 'create_record',
                    position: at,
                    config: { collection: 'heartbeats', data: { at: '{{event.scheduledAt}}' } },
                },
            ],
            edges: [{ id: 'e1', source: 'trigger', target: 'beat' }],
        })

        // Simulate the scheduler firing now instead of waiting for 03:00.
        await getQueue().add(JOB.scheduleTick, { workflowId: workflow.id })

        let executionId: number | undefined
        for (let i = 0; i < 100 && !executionId; i++) {
            const list = await api()
                .get(`/executions?workflowId=${workflow.id}`)
                .set(auth)
                .expect(200)
            executionId = list.body.items[0]?.id
            if (!executionId) await new Promise((resolve) => setTimeout(resolve, 50))
        }
        const execution = await waitForExecution(auth, executionId!)
        expect(execution).toMatchObject({ status: 'success', triggerType: 'schedule' })
        expect(execution.triggerData).toMatchObject({ scheduledAt: expect.any(String) })
    })
})

describe('Scenario F: failure and retries', () => {
    it('retries a 500 with backoff, records every attempt and fails with the reason', async () => {
        let calls = 0
        mock.setHandler((_req, res) => {
            calls++
            res.writeHead(500, { 'content-type': 'text/plain' }).end('boom')
        })
        const workflow = await createWorkflow(
            auth,
            httpGraph(`${mock.url}/flaky`, { maxAttempts: 3 }),
            { activate: false },
        )
        const execution = await waitForExecution(auth, await runManual(workflow.id))

        expect(calls).toBe(3)
        expect(execution.status).toBe('failed')
        expect(execution.error).toMatchObject({ code: 'http_status', nodeId: 'call' })
        expect(stepsOf(execution, 'call').map((s) => [s.attempt, s.status])).toEqual([
            [1, 'retrying'],
            [2, 'retrying'],
            [3, 'failed'],
        ])
        expect(stepsOf(execution, 'call')[2].error).toMatchObject({
            details: { status: 500, body: 'boom' },
        })
    })

    it('recovers when a later attempt succeeds', async () => {
        let calls = 0
        mock.setHandler((_req, res) => {
            calls++
            if (calls === 1) return res.writeHead(503).end()
            res.writeHead(200, { 'content-type': 'application/json' }).end('{"id":42}')
        })
        const workflow = await createWorkflow(auth, httpGraph(`${mock.url}/recovering`), {
            activate: false,
        })
        const execution = await waitForExecution(auth, await runManual(workflow.id))

        expect(execution.status).toBe('success')
        expect(stepsOf(execution, 'call').map((s) => s.status)).toEqual(['retrying', 'success'])
        expect(stepsOf(execution, 'call')[1].output).toMatchObject({
            status: 200,
            body: { id: 42 },
        })
    })

    it('does not retry a 4xx', async () => {
        mock.setHandler((_req, res) => res.writeHead(404).end('missing'))
        const workflow = await createWorkflow(auth, httpGraph(`${mock.url}/missing`), {
            activate: false,
        })
        const execution = await waitForExecution(auth, await runManual(workflow.id))
        expect(execution.status).toBe('failed')
        expect(stepsOf(execution, 'call')).toHaveLength(1)
    })

    it('times out slow endpoints', async () => {
        mock.setHandler(() => {
            // never answer
        })
        const workflow = await createWorkflow(
            auth,
            httpGraph(`${mock.url}/slow`, { timeoutMs: 500, maxAttempts: 1 }),
            {
                activate: false,
            },
        )
        const execution = await waitForExecution(auth, await runManual(workflow.id))
        expect(execution.error).toMatchObject({ code: 'http_timeout' })
    })

    it('fails on a missing template variable without retrying, and keeps the worker alive', async () => {
        mock.setHandler((_req, res) => res.writeHead(200).end('ok'))
        const workflow = await createWorkflow(auth, httpGraph(`${mock.url}/{{event.missing}}`), {
            activate: false,
        })
        const failed = await waitForExecution(auth, await runManual(workflow.id))
        expect(failed.error).toMatchObject({ code: 'template_error' })
        expect(failed.error?.message).toContain('{{event.missing}}')
        expect(stepsOf(failed, 'call')).toHaveLength(1)

        const ok = await createWorkflow(auth, httpGraph(`${mock.url}/fine`), { activate: false })
        expect((await waitForExecution(auth, await runManual(ok.id))).status).toBe('success')
    })

    it('uses step outputs in later nodes and sends real requests', async () => {
        mock.setHandler((req, res) => {
            res.writeHead(201, { 'content-type': 'application/json' }).end(
                JSON.stringify({ id: 99, path: req.url }),
            )
        })
        const definition = httpGraph(`${mock.url}/customers`, {
            method: 'POST',
            bodyType: 'json',
            body: { name: '{{event.name}}' },
            headers: [{ key: 'Authorization', value: 'Bearer {{event.token}}' }],
        })
        definition.nodes.push({
            id: 'follow',
            type: 'http_request',
            position: at,
            config: { method: 'GET', url: `${mock.url}/customers/{{steps.call.body.id}}` },
        })
        definition.edges.push({ id: 'e2', source: 'call', target: 'follow' })

        const workflow = await createWorkflow(auth, definition, { activate: false })
        mock.requests.length = 0
        const execution = await waitForExecution(
            auth,
            await runManual(workflow.id, { name: 'Rita', token: 'abc123' }),
        )

        expect(execution.status).toBe('success')
        expect(mock.requests.map((r) => `${r.method} ${r.url}`)).toEqual([
            'POST /customers',
            'GET /customers/99',
        ])
        expect(JSON.parse(mock.requests[0].body)).toEqual({ name: 'Rita' })
        expect(mock.requests[0].headers.authorization).toBe('Bearer abc123')
        // ...but the secret is not in the stored trace.
        expect(JSON.stringify(stepsOf(execution, 'call')[0].input)).not.toContain('abc123')
    })
})

describe('Delay', () => {
    it('waits through the queue and then resumes', async () => {
        const workflow = await createWorkflow(
            auth,
            {
                nodes: [
                    { id: 'trigger', type: 'trigger', position: at, config: { type: 'manual' } },
                    {
                        id: 'wait',
                        type: 'delay',
                        position: at,
                        config: { amount: 1, unit: 'seconds' },
                    },
                    {
                        id: 'after',
                        type: 'notification',
                        position: at,
                        config: { message: 'done' },
                    },
                ],
                edges: [
                    { id: 'e1', source: 'trigger', target: 'wait' },
                    { id: 'e2', source: 'wait', target: 'after' },
                ],
            },
            { activate: false },
        )
        const executionId = await runManual(workflow.id)

        const waiting = await waitForExecution(auth, executionId, ['waiting'])
        expect(waiting.currentNodeId).toBe('after')
        expect(stepsOf(waiting, 'wait')[0].status).toBe('waiting')

        const done = await waitForExecution(auth, executionId)
        expect(done.status).toBe('success')
        expect(stepsOf(done, 'wait')[0].durationMs).toBeGreaterThanOrEqual(900)
    })
})

describe('Scenario G: disabled workflow', () => {
    it('ignores events and webhooks while inactive', async () => {
        const eventFlow = await createWorkflow(auth, largeOrderGraph('order.g'))
        const hookFlow = await createWorkflow(auth, {
            nodes: [
                { id: 'trigger', type: 'trigger', position: at, config: { type: 'webhook' } },
                { id: 'note', type: 'notification', position: at, config: { message: 'x' } },
            ],
            edges: [{ id: 'e1', source: 'trigger', target: 'note' }],
        })
        await api().post(`/workflows/${eventFlow.id}/deactivate`).set(auth).expect(200)
        await api().post(`/workflows/${hookFlow.id}/deactivate`).set(auth).expect(200)

        const fired = await api()
            .post('/events')
            .set(auth)
            .send({ type: 'order.g', data: { total: 500 } })
            .expect(202)
        expect(fired.body.matched).toEqual([])
        await api().post(hookFlow.webhook.path).send({}).expect(404)

        const history = await api()
            .get(`/executions?workflowId=${eventFlow.id}`)
            .set(auth)
            .expect(200)
        expect(history.body.total).toBe(0)
    })
})

describe('Execution history', () => {
    it('filters and paginates', async () => {
        const { auth: own } = await registerUser('History')
        const workflow = await createWorkflow(own, largeOrderGraph('order.h'))
        const ids: number[] = []
        for (const total of [10, 20, 30]) {
            const res = await api()
                .post('/events')
                .set(own)
                .send({ type: 'order.h', data: { orderId: total, total } })
                .expect(202)
            ids.push(res.body.matched[0].executionId)
        }
        for (const id of ids) await waitForExecution(own, id)

        const page = await api().get('/executions?page=1&pageSize=2').set(own).expect(200)
        expect(page.body).toMatchObject({ total: 3, page: 1, pageSize: 2 })
        expect(page.body.items).toHaveLength(2)

        const filtered = await api()
            .get(`/executions?workflowId=${workflow.id}&status=failed`)
            .set(own)
            .expect(200)
        expect(filtered.body.total).toBe(0)
        const byTrigger = await api()
            .get('/executions?triggerType=event&status=success')
            .set(own)
            .expect(200)
        expect(byTrigger.body.total).toBe(3)

        await api().get('/executions?status=exploded').set(own).expect(400)

        const dashboard = await api().get('/dashboard').set(own).expect(200)
        expect(dashboard.body).toMatchObject({
            workflows: { total: 1, active: 1 },
            last24h: { total: 3, success: 3 },
            successRate: 1,
        })
        expect(dashboard.body.daily).toHaveLength(14)
    })
})
