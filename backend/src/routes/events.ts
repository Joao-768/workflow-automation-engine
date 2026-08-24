import { Router } from 'express'
import runWorkflows from '../engine/runner';

const router = Router();

router.post('/', async (req, res) => {
    const { type, data } = req.body;
    try {
        const results = await runWorkflows(type, data);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err });
    }
})

export default router;