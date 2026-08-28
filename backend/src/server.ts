import 'dotenv/config';
import express from 'express';
import { pool } from './db';
import cors from 'cors';
import workflowsRouter from './routes/workflows';
import eventsRouter from './routes/events';
import executionsRouter from './routes/executions';
import authRouter from './routes/auth';

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set');
    process.exit(1);
}

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
app.use('/auth', authRouter);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});