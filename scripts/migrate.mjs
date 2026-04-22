import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sqlPath = path.join(process.cwd(), "scripts", "schema.sql");
const schemaSql = fs.readFileSync(sqlPath, "utf8");

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query("begin");
  await client.query(schemaSql);
  await client.query("commit");
  console.log("Migration complete.");
} catch (e) {
  await client.query("rollback").catch(() => {});
  console.error("Migration failed:", e?.message ?? e);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}

