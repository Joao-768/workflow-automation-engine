import './env'
import { Client } from 'pg'
import { runMigrations } from '../src/db/migrate'
import { pool } from '../src/db/pool'
import { closeQueue, getQueue } from '../src/queue/queue'

/**
 * Runs once before all test files: makes sure the test database exists,
 * wipes it, applies every migration from scratch and empties the test queue.
 * Unit-only runs (`npm run test:unit`) skip this when TEST_UNIT_ONLY is set.
 */
export default async function setup() {
    if (process.env.TEST_UNIT_ONLY) return

    const url = new URL(process.env.DATABASE_URL!)
    const database = url.pathname.slice(1)
    const admin = new Client({ connectionString: Object.assign(new URL(url), { pathname: '/postgres' }).toString() })
    await admin.connect()
    const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [database])
    if (exists.rowCount === 0) await admin.query(`CREATE DATABASE "${database}"`)
    await admin.end()

    const db = new Client({ connectionString: url.toString() })
    await db.connect()
    await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
    await db.end()

    await runMigrations()
    await pool.end()

    await getQueue().obliterate({ force: true })
    await closeQueue()
}
