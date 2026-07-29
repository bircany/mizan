import { attachDatabasePool } from "@vercel/functions";
import pg, { Pool, type PoolConfig } from "pg";

const attachedPools = new WeakSet<Pool>();

function attachPoolToVercelLifecycle(pool: Pool) {
  if (process.env.VERCEL !== "1" || attachedPools.has(pool)) {
    return;
  }

  attachDatabasePool(pool);
  attachedPools.add(pool);
}

export class ManagedPostgresPool extends Pool {
  constructor(config?: PoolConfig) {
    super(config);
    attachPoolToVercelLifecycle(this);
  }
}

// Payload creates its own pool internally. Injecting this pg-compatible
// dependency makes that pool participate in Vercel Fluid Compute cleanup too.
export const managedPostgres = Object.create(pg) as typeof pg;
Object.defineProperty(managedPostgres, "Pool", {
  configurable: false,
  enumerable: true,
  value: ManagedPostgresPool,
  writable: false,
});

function configuredPoolMaximum(isServerless: boolean) {
  const configured = Number.parseInt(process.env.POSTGRES_POOL_MAX || "", 10);
  const minimum = isServerless ? 2 : 1;

  if (
    Number.isSafeInteger(configured) &&
    configured >= minimum &&
    configured <= 20
  ) {
    return configured;
  }

  // Payload keeps one client checked out to listen for connection errors.
  // A Vercel pool of one therefore leaves no client available for requests.
  return isServerless ? 2 : 10;
}

export function buildPostgresPoolConfig(databaseUrl: string): PoolConfig {
  const connectionUrl = new URL(databaseUrl);
  const sslMode = connectionUrl.searchParams.get("sslmode");
  const isVercel = process.env.VERCEL === "1";

  // node-postgres can overwrite the explicit ssl object when sslmode stays
  // inside the connection string, so we normalize it here.
  if (sslMode) {
    connectionUrl.searchParams.delete("sslmode");
  }

  return {
    connectionString: connectionUrl.toString(),
    max: configuredPoolMaximum(isVercel),
    // Payload's runtime uses the connection mode explicitly configured in the
    // environment. Keep serverless session pools short-lived so old function
    // instances cannot reserve scarce Supavisor sessions.
    idleTimeoutMillis: isVercel ? 1_000 : 30_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: isVercel,
    ssl:
      sslMode === "require" || sslMode === "verify-full"
        ? {
            rejectUnauthorized: false,
          }
        : undefined,
  };
}
