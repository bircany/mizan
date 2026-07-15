import type { PoolConfig } from "pg";

export function buildPostgresPoolConfig(databaseUrl: string): PoolConfig {
  const connectionUrl = new URL(databaseUrl);
  const sslMode = connectionUrl.searchParams.get("sslmode");

  // node-postgres can overwrite the explicit ssl object when sslmode stays
  // inside the connection string, so we normalize it here.
  if (sslMode) {
    connectionUrl.searchParams.delete("sslmode");
  }

  return {
    connectionString: connectionUrl.toString(),
    ssl:
      sslMode === "require" || sslMode === "verify-full"
        ? {
            rejectUnauthorized: false,
          }
        : undefined,
  };
}
