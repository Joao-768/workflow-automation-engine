import { Router } from 'express'
import { pool } from '../db'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const router = Router();

router.post('/register', async (req, res) => {
    const {name, email, password} = req.body;

    try {
        const result = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
        if (result.rows.length > 0) {
            return res.status(409).json({ error: 'email already registered' })
        }

        const hash = await bcrypt.hash(password, 10)

        const newUser = await pool.query("INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email", [name, email, hash])

        const user = newUser.rows[0]
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!)

        res.status(201).json({ token, user })
    } catch (err) {
        res.status(500).json({ error: err})
    }
})

router.post('/login', async (req, res) => {
    const {email, password} = req.body;

    try {
        const found = await pool.query("SELECT * FROM users WHERE email = $1", [email])

        const user = found.rows[0]

        if (!user) {
            return res.status(401).json({ error: 'invalid credentials' })
        }

        const result = await bcrypt.compare(password, user.password_hash);

        if (!result) {
            return res.status(401).json({ error: 'invalid credentials' })
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!)

        res.json({ token, user: { id: user.id, name: user.name, email: user.email } })
    } catch (err) {
        res.status(500).json({ error: err})
    }
})

export default router;