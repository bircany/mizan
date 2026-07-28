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
