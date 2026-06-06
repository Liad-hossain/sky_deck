import pg from 'pg';
import { SUPABASE_DB_URL } from '../api/env_variables.js';

const { Pool } = pg;

let pool = null;

export function getPgPool() {
  console.log(`SUPABASE_DB_URL is ${SUPABASE_DB_URL ? 'set' : 'not set'}`);
  if (!pool) {
    if (!SUPABASE_DB_URL) {
      throw new Error(
        '[pg_client] SUPABASE_DB_URL is not set. ' +
          'Add it to Netlify → Site settings → Environment variables.'
      );
    }

    const connStr = SUPABASE_DB_URL.replace(/[?&]sslmode=[^&]*/g, '');

    pool = new Pool({
      connectionString: connStr,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
      ssl: { rejectUnauthorized: false },
    });

    pool.on('error', (err) => {
      console.error('[pg_client] pool background error:', err.message);
      pool = null;
    });
  }
  return pool;
}
