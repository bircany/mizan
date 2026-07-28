import pg from "pg";

import { databaseConfig } from "./config.js";
import { logger } from "./logger.js";

const { Pool } = pg;
let pool;

export function getPool() {
  if (pool) return pool;
  const config = databaseConfig();
  pool = new Pool({
    connectionString: config.connectionString,
    max: config.max,
    idleTimeoutMillis: config.idleTimeoutMillis,
    connectionTimeoutMillis: config.connectionTimeoutMillis,
    statement_timeout: config.statementTimeoutMillis,
    application_name: process.env.SERVICE_NAME || "mizan-video-platform",
    ssl: config.sslMode === "disable" ? false : { rejectUnauthorized: config.sslMode === "verify-full" },
  });
  pool.on("error", (error) => logger.error("Idle PostgreSQL connection failed", { error: error.message }));
  return pool;
}

export function query(text, values = []) {
  return getPool().query(text, values);
}

export async function transaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function databaseHealth() {
  const result = await query("select now() as now");
  return Boolean(result.rows[0]?.now);
}

export async function closePool() {
  if (pool) await pool.end();
  pool = undefined;
}
