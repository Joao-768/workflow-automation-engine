import { env } from './config/env'
import { pool } from './db/pool'
import { logger } from './lib/logger'
import { closeQueue } from './queue/queue'
import { createWorker } from './queue/worker'
import { reconcileSchedules } from './services/schedules'

/**
 * Worker process: consumes BullMQ jobs and runs the workflow engine.
 * Run as many as you like; WORKER_CONCURRENCY sets jobs per process.
 */
const RECONCILE_EVERY_MS = 5 * 60_000

const worker = createWorker()
logger.info({ concurrency: env.WORKER_CONCURRENCY }, 'Worker started')

async function reconcile() {
    try {
        const result = await reconcileSchedules()
        logger.info(result, 'Schedules reconciled')
    } catch (err) {
        logger.error({ err }, 'Schedule reconciliation failed')
    }
}

void reconcile()
const reconcileTimer = setInterval(reconcile, RECONCILE_EVERY_MS)

let stopping = false

async function shutdown(signal: string) {
    if (stopping) return
    stopping = true
    logger.info({ signal }, 'Shutting down worker')
    clearInterval(reconcileTimer)
    setTimeout(() => process.exit(1), 30_000).unref()

    // worker.close() waits for the jobs currently running to finish, so a
    // deploy does not cut a step in half.
    await worker.close().catch((err) => logger.error({ err }, 'Worker close failed'))
    await closeQueue().catch((err) => logger.error({ err }, 'Queue close failed'))
    await pool.end().catch((err) => logger.error({ err }, 'Postgres close failed'))
    process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
