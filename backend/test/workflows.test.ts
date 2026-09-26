import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Worker } from 'bullmq'
import type { WorkflowDefinition } from '@wae/shared'
import { getQueue } from '../src/queue/queue'
import { api, at, createWorkflow, registerUser, startTestWorker, waitForExecution } from './helpers'

const notifyOnEvent = (eventName: string, message = 'hello'): WorkflowDefinition => ({
    nodes: [
        { id: 'trigger', type: 'trigger', position: at, config: { type: 'event', eventName } },
        { id: 'note', type: 'notification', position: at, config: { message } },
    ],
    edges: [{ id: 'e1', source: 'trigger', target: 'note' }],
})

let worker: Worker
beforeAll(() => {
    worker = startTestWorker().worker
})
afterAll(async () => {
    await worker.close()
})

describe('workflow management', () => {
    it('creates a draft with a manual trigger by default', async () => {
        const { auth } = await registerUser()
        const res = await api().post('/workflows').set(auth).send({ name: 'Draft' }).expect(201)
        expect(res.body).toMatchObject({
            name: 'Draft',
            isActive: false,
            version: 1,
            triggerType: 'manual',
        })
        expect(res.body.webhook.id).toMatch(/^[a-f0-9]{32}$/)
        // A lone trigger is saved but reported as not runnable yet.
        expect(res.body.issues[0].message).toMatch(/Connect the trigger/)
    })

    it('rejects malformed graphs and refuses to activate incomplete ones', async () => {
        const { auth } = await registerUser()
        const malformed = await api()
            .post('/workflows')
            .set(auth)
            .send({ name: 'Bad', definition: { nodes: [{ id: 'X Y', type: 'nope' }], edges: 'x' } })
            .expect(400)
        expect(malformed.body.error.code).toBe('validation_error')

        const incomplete = await api()
            .post('/workflows')
            .set(auth)
            .send({
                name: 'Incomplete',
                definition: {
                    nodes: [
                        {
                            id: 'trigger',
                            type: 'trigger',
                            position: at,
                            config: { type: 'schedule', cron: 'every day' },
                        },
                        { id: 'note', type: 'notification', position: at, config: {} },
                    ],
                    edges: [{ id: 'e1', source: 'trigger', target: 'note' }],
                },
            })
            .expect(201)
        const activate = await api()
            .post(`/workflows/${incomplete.body.id}/activate`)
            .set(auth)
            .expect(422)
        expect(activate.body.error.code).toBe('invalid_workflow')
        expect(activate.body.error.details.issues).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ nodeId: 'trigger', field: 'cron' }),
                expect.objectContaining({ nodeId: 'note', field: 'message' }),
            ]),
        )
    })

    it('versions the graph and keeps an active workflow runnable', async () => {
        const { auth } = await registerUser()
        const workflow = await createWorkflow(auth, notifyOnEvent('v.test'))
        expect(workflow.version).toBe(1)

        const renamed = await api()
            .put(`/workflows/${workflow.id}`)
            .set(auth)
            .send({ name: 'Renamed' })
            .expect(200)
        expect(renamed.body.version).toBe(1)

        const edited = await api()
            .put(`/workflows/${workflow.id}`)
            .set(auth)
            .send({ name: 'Renamed', definition: notifyOnEvent('v.test', 'changed') })
            .expect(200)
        expect(edited.body.version).toBe(2)

        // Breaking an active workflow is refused.
        const broken = notifyOnEvent('v.test')
        broken.edges = []
        await api()
            .put(`/workflows/${workflow.id}`)
            .set(auth)
            .send({ name: 'x', definition: broken })
            .expect(422)
    })

    it('runs executions against the version they started with', async () => {
        const { auth } = await registerUser()
        const workflow = await createWorkflow(auth, notifyOnEvent('snap.test', 'first'))
        const run = await api()
            .post(`/workflows/${workflow.id}/run`)
            .set(auth)
            .send({ payload: {} })
            .expect(202)
        await waitForExecution(auth, run.body.executionId)

        await api()
            .put(`/workflows/${workflow.id}`)
            .set(auth)
            .send({ name: 'x', definition: notifyOnEvent('snap.test', 'second') })
            .expect(200)

        const old = await api().get(`/executions/${run.body.executionId}`).set(auth).expect(200)
        expect(old.body.workflowVersion).toBe(1)
        expect(old.body.definition.nodes[1].config.message).toBe('first')
    })

    it('duplicates as an inactive copy and soft-deletes without losing history', async () => {
        const { auth } = await registerUser()
        const workflow = await createWorkflow(auth, notifyOnEvent('del.test'), { name: 'Original' })
        const run = await api()
            .post(`/workflows/${workflow.id}/run`)
            .set(auth)
            .send({ payload: {} })
            .expect(202)
        await waitForExecution(auth, run.body.executionId)

        const copy = await api().post(`/workflows/${workflow.id}/duplicate`).set(auth).expect(201)
        expect(copy.body).toMatchObject({ name: 'Copy of Original', isActive: false })
        expect(copy.body.webhook.id).not.toBe(workflow.webhook.id)

        const list = await api().get('/workflows').set(auth).expect(200)
        const original = list.body.find((w: { id: number }) => w.id === workflow.id)
        expect(original.lastExecution).toMatchObject({
            id: run.body.executionId,
            status: 'success',
        })

        await api().delete(`/workflows/${workflow.id}`).set(auth).expect(204)
        await api().get(`/workflows/${workflow.id}`).set(auth).expect(404)

        const history = await api().get(`/executions/${run.body.executionId}`).set(auth).expect(200)
        expect(history.body).toMatchObject({ workflowDeleted: true, status: 'success' })
    })

    it('keeps the schedule in Redis in step with the workflow', async () => {
        const { auth } = await registerUser()
        const scheduled = await createWorkflow(auth, {
            nodes: [
                {
                    id: 'trigger',
                    type: 'trigger',
                    position: at,
                    config: { type: 'schedule', cron: '*/5 * * * *' },
                },
                { id: 'note', type: 'notification', position: at, config: { message: 'tick' } },
            ],
            edges: [{ id: 'e1', source: 'trigger', target: 'note' }],
        })
        expect(scheduled.nextScheduledRun).toEqual(expect.any(String))

        const schedulerId = `workflow-${scheduled.id}`
        expect(await getQueue().getJobScheduler(schedulerId)).toMatchObject({
            pattern: '*/5 * * * *',
        })

        await api().post(`/workflows/${scheduled.id}/deactivate`).set(auth).expect(200)
        expect(await getQueue().getJobScheduler(schedulerId)).toBeFalsy()

        await api().post(`/workflows/${scheduled.id}/activate`).set(auth).expect(200)
        expect(await getQueue().getJobScheduler(schedulerId)).toBeTruthy()

        await api().delete(`/workflows/${scheduled.id}`).set(auth).expect(204)
        expect(await getQueue().getJobScheduler(schedulerId)).toBeFalsy()
    })

    it('returns webhook secrets once and never again', async () => {
        const { auth } = await registerUser()
        const workflow = await createWorkflow(auth, notifyOnEvent('s.test'))
        const created = await api()
            .post(`/workflows/${workflow.id}/webhook-secret`)
            .set(auth)
            .expect(201)
        expect(created.body.secret).toMatch(/^whsec_/)

        const detail = await api().get(`/workflows/${workflow.id}`).set(auth).expect(200)
        expect(detail.body.webhook.hasSecret).toBe(true)
        expect(JSON.stringify(detail.body)).not.toContain(created.body.secret)
    })
})
