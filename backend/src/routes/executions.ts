import { Router } from 'express'
import { pool } from '../db'

const router = Router();

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT e.*, w.name AS workflow_name FROM executions e JOIN workflows w ON w.id = e.workflow_id ORDER BY e.executed_at DESC')
        res.json(result.rows)
    } catch (err) {
        res.status(500).json({ error: err})
    }
})

export default router;