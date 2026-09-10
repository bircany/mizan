/** Dedicated loopback DB and disposable accounts; external integrations disabled. */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
const allowedKeys = ["PATH", "HOME", "TMPDIR", "USER", "LOGNAME", "LANG", "TERM"];
const env: NodeJS.ProcessEnv = { NODE_ENV: "development", ...Object.fromEntries(allowedKeys.flatMap(key => process.env[key] ? [[key, process.env[key]!]] : [])) };
Object.assign(env, {
  MIZAN_LOCAL_ACCEPTANCE: "1",
  PAYLOAD_DATABASE_URI: "postgresql://postgres@127.0.0.1:55440/mizan_acceptance_local",
  DATABASE_URL: "postgresql://postgres@127.0.0.1:55440/mizan_acceptance_local",
  PAYLOAD_SECRET: randomBytes(48).toString("hex"),
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
  DELIVERY_VIDEO_API_URL: "",
  DELIVERY_VIDEO_API_INTERNAL_SECRET: "",
  RESEND_API_KEY: "",
});
const seed = process.argv.includes("--seed");
const build = process.argv.includes("--build");
if (build) Object.assign(env, { NODE_ENV: "production" });
const args = seed ? ["--conditions=react-server", "--import", "tsx", "scripts/local-seed.ts"] : ["node_modules/next/dist/bin/next", ...(build ? ["build"] : ["dev", "--hostname", "127.0.0.1"])];
const result = spawnSync(process.execPath, args, { env, stdio: "inherit" });
process.exit(result.status ?? 1);
