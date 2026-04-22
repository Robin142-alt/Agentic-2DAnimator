import pg from "pg";
import { env } from "@/lib/env";

const { Pool } = pg;

let _pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (_pool) return _pool;
  const connectionString = env().DATABASE_URL;
  const isProd = process.env.NODE_ENV === "production";
  _pool = new Pool({ connectionString, max: isProd ? 10 : 5, idleTimeoutMillis: 30_000 });
  return _pool;
}

export async function sql<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const pool = getPool();
  return pool.query<T>(text, params);
}
