import { Client } from "pg";

import { ensureLocalEnvLoaded, requiredEnv } from "../lib/env";
import { buildPostgresPoolConfig } from "../lib/postgres";

async function run() {
  ensureLocalEnvLoaded();

  const databaseUrl = requiredEnv("PAYLOAD_DATABASE_URI");
  const client = new Client(buildPostgresPoolConfig(databaseUrl));

  await client.connect();

  const versionResult = await client.query("select version();");
  const tablesResult = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
    order by table_name;
  `);

  console.log("Postgres baglantisi basarili.");
  console.log("Version:", versionResult.rows[0]?.version);
  console.log(
    "Public schema tablolar:",
    tablesResult.rows.map((row) => row.table_name),
  );

  await client.end();
}

run().catch((error) => {
  console.error("DB check failed:", error);
  process.exit(1);
});
