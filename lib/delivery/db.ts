import { Pool, type PoolClient, type QueryResultRow } from "pg";

import { ensureLocalEnvLoaded, requiredEnv } from "@/lib/env";
import { buildPostgresPoolConfig } from "@/lib/postgres";

let pool: Pool | null = null;

export function getDeliveryDatabasePool() {
  ensureLocalEnvLoaded();
  pool ??= new Pool(
    buildPostgresPoolConfig(process.env.PAYLOAD_DATABASE_URI || requiredEnv("DATABASE_URL")),
  );
  return pool;
}

export function deliveryQuery<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  return getDeliveryDatabasePool().query<T>(text, values);
}

export async function withDeliveryTransaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await getDeliveryDatabasePool().connect();
  try {
    await client.query("begin");
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '30s'");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
