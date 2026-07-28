import type { PoolConfig } from "pg";

function configuredPoolMaximum(isServerless: boolean) {
  const configured = Number.parseInt(process.env.POSTGRES_POOL_MAX || "", 10);
  if (Number.isSafeInteger(configured) && configured >= 1 && configured <= 20) {
    return configured;
  }
  return isServerless ? 1 : 10;
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

  // Supabase session mode is capped by the database pool size. Vercel
  // functions must use the transaction pooler to avoid exhausting sessions.
  if (
    isVercel &&
    connectionUrl.hostname.endsWith(".pooler.supabase.com") &&
    connectionUrl.port === "5432"
  ) {
    connectionUrl.port = "6543";
  }

  return {
    connectionString: connectionUrl.toString(),
    max: configuredPoolMaximum(isVercel),
    idleTimeoutMillis: isVercel ? 5_000 : 30_000,
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
