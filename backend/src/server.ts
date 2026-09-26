import { env } from './config/env'
import { pool } from './db/pool'
import { createApp } from './http/app'
import { logger } from './lib/logger'
import { closeQueue } from './queue/queue'

/**
 * API process: receives triggers, records executions and enqueues them.
 * It never runs workflow steps itself; that is the worker's job (worker.ts).
 */
const server = createApp().listen(env.PORT, '0.0.0.0', () => {
    logger.info({ port: env.PORT }, 'API listening')
})

let stopping = false

async function shutdown(signal: string) {
    if (stopping) return
    stopping = true
    logger.info({ signal }, 'Shutting down API')

    // Stop accepting connections, let in-flight requests finish, then close
    // the clients they were using.
    server.close(async () => {
        await closeQueue().catch((err) => logger.error({ err }, 'Queue close failed'))
        await pool.end().catch((err) => logger.error({ err }, 'Postgres close failed'))
        process.exit(0)
    })
    setTimeout(() => process.exit(1), 10_000).unref()
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
