import type { PoolClient, QueryResultRow } from "pg";

import { ensureLocalEnvLoaded, requiredEnv } from "@/lib/env";
import {
  buildPostgresPoolConfig,
  ManagedPostgresPool,
} from "@/lib/postgres";

let applicationPool: ManagedPostgresPool | null = null;

export function getDatabasePool() {
  ensureLocalEnvLoaded();
  applicationPool ??= new ManagedPostgresPool(
    buildPostgresPoolConfig(
      process.env.PAYLOAD_DATABASE_URI || requiredEnv("DATABASE_URL"),
    ),
  );
  return applicationPool;
}

export async function databaseQuery<T extends QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  return getDatabasePool().query<T>(text, values);
}

export async function withDatabaseTransaction<T>(
  work: (client: PoolClient) => Promise<T>,
) {
  const client = await getDatabasePool().connect();
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
