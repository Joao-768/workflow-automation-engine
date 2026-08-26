import { Router } from 'express'
import { pool } from '../db'

import requireAuth from '../middleware/auth'

const router = Router();

router.use(requireAuth)

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT e.*, w.name AS workflow_name FROM executions e JOIN workflows w ON w.id = e.workflow_id WHERE w.user_id = $1 ORDER BY e.executed_at DESC', [(req as any).userId])
        res.json(result.rows)
    } catch (err) {
        res.status(500).json({ error: err})
    }
})

router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('SELECT e.*, w.name AS workflow_name, w.trigger_type, w.action_type FROM executions e JOIN workflows w ON w.id = e.workflow_id WHERE e.id = $1 AND w.user_id = $2', [id, (req as any).userId])
        if (result.rows.length === 0) return res.status(404).json({ error: 'Execution not found' })
        res.json(result.rows[0])
    } catch (err) {
        res.status(500).json({ error: err })
    }
})

export default router;