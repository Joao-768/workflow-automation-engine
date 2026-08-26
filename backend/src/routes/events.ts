import { Router } from 'express'
import runWorkflows from '../engine/runner';
import requireAuth from '../middleware/auth'

const router = Router();

router.use(requireAuth)

router.post('/', async (req, res) => {
    const { type, data } = req.body;
    try {
        const results = await runWorkflows(type, data, (req as any).userId)
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err });
    }
})

export default router;