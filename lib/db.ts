import pg from "pg";
import { env } from "@/lib/env";

const { Pool } = pg;

let _pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (_pool) return _pool;
  const connectionString = env().DATABASE_URL;
  const isProd = process.env.NODE_ENV === "production";
  const enableChannelBinding = /(^|[?&])channel_binding=require(&|$)/i.test(connectionString);
  const max = isProd ? Number(process.env.PG_POOL_MAX ?? 3) || 3 : 5;
  _pool = new Pool({
    connectionString,
    max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    enableChannelBinding
  } as any);
  return _pool;
}

export async function sql<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const pool = getPool();
  return pool.query<T>(text, params);
}
