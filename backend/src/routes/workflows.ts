import { Router, type Request, type Response, type NextFunction } from 'express'
import { pool } from '../db'
import requireAuth from '../middleware/auth'

const router = Router();

router.use(requireAuth)

const TRIGGERS = ['order.created', 'user.created', 'payment.completed', 'form.submitted']
const ACTIONS = ['send_notification', 'send_email', 'create_record']

function validateWorkflow(req: Request, res: Response, next: NextFunction) {
    const { name, description, trigger_type, action_type, action_config, conditions } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'name is required' })
    }

    if (!trigger_type) {
        return res.status(400).json({ error: 'trigger_type is required' })
    }

    if (!TRIGGERS.includes(trigger_type)) {
        return res.status(400).json({ error: `invalid trigger_type, must be one of: ${TRIGGERS.join(', ')}` })
    }

    if (!action_type) {
        return res.status(400).json({ error: 'action_type is required' })
    }

    if (!ACTIONS.includes(action_type)) {
        return res.status(400).json({ error: `invalid action_type, must be one of: ${ACTIONS.join(', ')}` })
    }

    next()
}

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM workflows WHERE user_id = $1', [(req as any).userId])
        res.json(result.rows)
    } catch (err) {
        res.status(500).json({ error: err})
    }
})

router.post('/', validateWorkflow, async (req, res) => {
    const { name, description, trigger_type, action_type, action_config, conditions } = req.body;

    try {
        const result = await pool.query('INSERT INTO workflows (name, description, trigger_type, action_type, action_config, conditions, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [name, description, trigger_type, action_type, action_config ?? {}, conditions, (req as any).userId])
        res.json(result.rows[0])
    } catch (err) {
        res.status(500).json({ error: err})
    }
})

router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('SELECT * FROM workflows WHERE id = $1 AND user_id = $2', [id, (req as any).userId])
        if (result.rows.length === 0) return res.status(404).json({ error: 'Workflow not found' })
        res.json(result.rows[0])
    } catch (err) {
        res.status(500).json({ error: err});
    }
})

router.put('/:id', validateWorkflow, async (req, res) => {
    const { id } = req.params;
    const { name, description, trigger_type, action_type, action_config, conditions } = req.body;
    
    try {
        const result = await pool.query('UPDATE workflows SET name = $1, description = $2, trigger_type = $3, action_type = $4, action_config = $5, conditions = $6 WHERE id = $7 AND user_id = $8 RETURNING *', [name, description, trigger_type, action_type, action_config, conditions, id, (req as any).userId])
        if (result.rows.length === 0) return res.status(404).json({ error: 'Workflow not found' })
        res.json(result.rows[0])
    } catch (err) {
        res.status(500).json({ error: err});
    }
})

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query('DELETE FROM workflows WHERE id = $1 AND user_id = $2 RETURNING *', [id, (req as any).userId])
        if (result.rows.length === 0) return res.status(404).json({ error: 'Workflow not found' })
        res.json(result.rows[0])
    } catch (err) {
        res.status(500).json({ error: err});
    }
})

router.patch('/:id/toggle', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('UPDATE workflows SET is_active = NOT is_active WHERE id = $1 AND user_id = $2 RETURNING *',  [id, (req as any).userId])
        if (result.rows.length === 0) return res.status(404).json({ error: 'Workflow not found' })
        res.json(result.rows[0])
    } catch (err) {
        res.status(500).json({ error: err });
    }
})

export default router;