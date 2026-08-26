import jwt from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'

export default function requireAuth(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;

    try {
        if(!header)
            return res.status(401).json({ error: 'no token provided' });

        const token = header.split(' ')[1];

        const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number }

        (req as any).userId = payload.userId

        next();
    } catch (err) {
        res.status(401).json({error: "invalid token"})
    }
}