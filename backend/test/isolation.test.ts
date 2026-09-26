import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Worker } from 'bullmq'
import type { WorkflowDefinition } from '@wae/shared'
import { api, at, createWorkflow, registerUser, startTestWorker, waitForExecution } from './helpers'

/** Scenario H: user A's resources are invisible to user B, whatever ids B guesses. */

const definition: WorkflowDefinition = {
    nodes: [
        { id: 'trigger', type: 'trigger', position: at, config: { type: 'event', eventName: 'isolation.test' } },
        { id: 'note', type: 'notification', position: at, config: { message: 'hi' } },
    ],
    edges: [{ id: 'e1', source: 'trigger', target: 'note' }],
}

let worker: Worker

beforeAll(() => {
    worker = startTestWorker().worker
})
afterAll(async () => {
    await worker.close()
})

describe('per-user isolation', () => {
    it('keeps workflows, executions and events private', async () => {
        const alice = await registerUser('Alice')
        const bob = await registerUser('Bob')

        const workflow = await createWorkflow(alice.auth, definition)
        const fired = await api().post('/events').set(alice.auth).send({ type: 'isolation.test', data: {} }).expect(202)
        const executionId = fired.body.matched[0].executionId
        await waitForExecution(alice.auth, executionId)

        // Bob cannot read, change, run or delete Alice's workflow.
        await api().get(`/workflows/${workflow.id}`).set(bob.auth).expect(404)
        await api().put(`/workflows/${workflow.id}`).set(bob.auth).send({ name: 'mine', definition }).expect(404)
        await api().post(`/workflows/${workflow.id}/run`).set(bob.auth).send({ payload: {} }).expect(404)
        await api().post(`/workflows/${workflow.id}/deactivate`).set(bob.auth).expect(404)
        await api().post(`/workflows/${workflow.id}/duplicate`).set(bob.auth).expect(404)
        await api().post(`/workflows/${workflow.id}/webhook-secret`).set(bob.auth).expect(404)
        await api().delete(`/workflows/${workflow.id}`).set(bob.auth).expect(404)

        // ...nor see her executions, in detail or in lists.
        await api().get(`/executions/${executionId}`).set(bob.auth).expect(404)
        const bobList = await api().get('/executions').set(bob.auth).expect(200)
        expect(bobList.body.total).toBe(0)
        const bobFiltered = await api().get(`/executions?workflowId=${workflow.id}`).set(bob.auth).expect(200)
        expect(bobFiltered.body.items).toEqual([])
        const bobWorkflows = await api().get('/workflows').set(bob.auth).expect(200)
        expect(bobWorkflows.body).toEqual([])

        // Bob firing the same event name does not run Alice's workflow.
        const bobEvent = await api().post('/events').set(bob.auth).send({ type: 'isolation.test', data: {} }).expect(202)
        expect(bobEvent.body.matched).toEqual([])

        // Alice still sees everything.
        await api().get(`/workflows/${workflow.id}`).set(alice.auth).expect(200)
        await api().get(`/executions/${executionId}`).set(alice.auth).expect(200)
    })
})
