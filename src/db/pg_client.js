import pg from 'pg';
import { SUPABASE_DB_URL } from '../api/env_variables.js';

const { Pool } = pg;

let pool = null;

export function getPgPool() {
  if (!pool) {
    if (!SUPABASE_DB_URL) {
      throw new Error('SUPABASE_DB_URL is not configured');
    }
    pool = new Pool({
      connectionString: SUPABASE_DB_URL,
      max: 3,
      idleTimeoutMillis: 10_000, // close idle connections after 10s
      connectionTimeoutMillis: 5_000,
      ssl: { rejectUnauthorized: false },
    });

    pool.on('error', (err) => {
      console.error('pg pool background error:', err.message);
    });
  }
  return pool;
}
