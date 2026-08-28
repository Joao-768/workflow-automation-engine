import 'dotenv/config';
import { Pool } from 'pg';

// Managed Postgres (Supabase, Render) requires SSL; local development does not.
const useSSL = process.env.DATABASE_SSL === 'true';

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ...(useSSL ? { ssl: { rejectUnauthorized: false } } : {}),
});
