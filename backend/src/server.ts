import 'dotenv/config';
import express from 'express';
import { pool } from './db';
import cors from 'cors';
import workflowsRouter from './routes/workflows';
import eventsRouter from './routes/events';
import executionsRouter from './routes/executions'

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

app.get('/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()')
        res.json(result.rows)
    } catch (err) {
        res.status(500).json({ error: err})
    }
})

app.use('/workflows', workflowsRouter);
app.use('/events', eventsRouter);
app.use('/executions', executionsRouter);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});