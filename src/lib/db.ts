import { Pool } from "pg";

const globalForPg = globalThis as unknown as { pgPool?: Pool };

function createPool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return new Pool({
    connectionString: url,
    ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
    max: 5,
  });
}

export function getPool(): Pool {
  if (!globalForPg.pgPool) globalForPg.pgPool = createPool();
  return globalForPg.pgPool;
}

export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
  const res = await getPool().query(text, params);
  return res.rows as T[];
}
