import { Router } from 'express'
import { pool } from '../db'

const router = Router();

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM workflows')
        res.json(result.rows)
    } catch (err) {
        res.status(500).json({ error: err})
    }
})

router.post('/', async (req, res) => {
    const { name, description, trigger_type, action_type, action_config, conditions } = req.body;

    try {
        const result = await pool.query('INSERT INTO workflows (name, description, trigger_type, action_type, action_config, conditions) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [name, description, trigger_type, action_type, action_config, conditions])
        res.json(result.rows[0])
    } catch (err) {
        res.status(500).json({ error: err})
    }
})

router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('SELECT * FROM workflows WHERE id = $1', [id])
        if (result.rows.length === 0) return res.status(404).json({ error: 'Workflow not found' })
        res.json(result.rows[0])
    } catch (err) {
        res.status(500).json({ error: err});
    }
})

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, trigger_type, action_type, action_config, conditions } = req.body;
    
    try {
        const result = await pool.query('UPDATE workflows SET name = $1, description = $2, trigger_type = $3, action_type = $4, action_config = $5, conditions = $6 WHERE id = $7 RETURNING *', [name, description, trigger_type, action_type, action_config, conditions, id])
        if (result.rows.length === 0) return res.status(404).json({ error: 'Workflow not found' })
        res.json(result.rows[0])
    } catch (err) {
        res.status(500).json({ error: err});
    }
})

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query('DELETE FROM workflows WHERE id = $1 RETURNING *', [id])
        if (result.rows.length === 0) return res.status(404).json({ error: 'Workflow not found' })
        res.json(result.rows[0])
    } catch (err) {
        res.status(500).json({ error: err});
    }
})

router.patch('/:id/toggle', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('UPDATE workflows SET is_active = NOT is_active WHERE id = $1 RETURNING *', [id])
        if (result.rows.length === 0) return res.status(404).json({ error: 'Workflow not found' })
        res.json(result.rows[0])
    } catch (err) {
        res.status(500).json({ error: err });
    }
})

export default router;