/** LOCAL ONLY: isolated PostgreSQL cluster. Never reads application connection URLs. */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import pg from "pg";

const root = resolve(".local/mizan-postgres");
mkdirSync(resolve(".local"), { recursive: true });
if (!existsSync(root)) execFileSync("initdb", ["-D", root, "-U", "postgres", "--auth-local=trust", "--auth-host=trust"], { stdio: "ignore" });
try { execFileSync("pg_ctl", ["-D", root, "status"], { stdio: "ignore" }); }
catch { execFileSync("pg_ctl", ["-D", root, "-l", resolve(".local/postgres.log"), "-o", "-p 55440 -h 127.0.0.1", "start"], { stdio: "inherit" }); }
const base = { host: "127.0.0.1", port: 55440, user: "postgres" };
const admin = new pg.Client({ ...base, database: "postgres" });
await admin.connect();
const directory = (await admin.query("show data_directory")).rows[0].data_directory;
if (resolve(directory) !== root) throw new Error("Port başka kümeye ait; durduruldu.");
if (!(await admin.query("select 1 from pg_database where datname='mizan_acceptance_local'")).rowCount) await admin.query("create database mizan_acceptance_local");
await admin.end();
const db = new pg.Client({ ...base, database: "mizan_acceptance_local" });
await db.connect();
try {
  await db.query(`create schema if not exists local_setup;
    create table if not exists local_setup.migrations (name text primary key, sha256 text not null, applied_at timestamptz default now());
    do $$ begin
      if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
      if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
      if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
    end $$;
    create schema if not exists storage;
    create table if not exists storage.buckets (id text primary key,name text,public boolean default false,file_size_limit bigint,allowed_mime_types text[]);
  `);
  const files = [
    ...readdirSync("supabase").filter(n => /^\d.*\.sql$/.test(n) && !n.startsWith("02_")).sort().map(n => `supabase/${n}`),
    ...readdirSync("supabase/migrations").filter(n => n.endsWith(".sql")).sort().map(n => `supabase/migrations/${n}`),
  ];
  for (const name of files) {
    const original = readFileSync(name, "utf8");
    const hash = createHash("sha256").update(original).digest("hex");
    const previous = (await db.query("select sha256 from local_setup.migrations where name=$1", [name])).rows[0];
    if (previous) {
      if (previous.sha256 !== hash) throw new Error(`Uygulanmış migration değişmiş: ${name}`);
      continue;
    }
    // Supabase metadata compatibility only: no storage HTTP service or pg_cron emulation.
    let sql = original.replace(/^\\(?:un)?restrict .*$/gm, "").replace("CREATE SCHEMA public;", "CREATE SCHEMA IF NOT EXISTS public;");
    if (name.includes("automate_payment_reservation_expiry")) sql = sql.replace(/create extension if not exists pg_cron;/i, "").split("select cron.schedule(")[0] + "\ncommit;";
    if (name.includes("reconcile_paid_donation_confirmation")) sql = sql.split("select cron.unschedule(jobid)")[0] + "\ncommit;";
    // Wrap migration and bookkeeping in the same transaction; enum additions commit per file.
    sql = sql.replace(/^\s*(begin|commit);\s*$/gim, "");
    await db.query("begin");
    try {
      await db.query(sql);
      await db.query("set search_path to public");
      await db.query("insert into local_setup.migrations(name,sha256) values($1,$2)", [name, hash]);
      await db.query("commit");
      console.log(`OK ${name}`);
    } catch (error) { await db.query("rollback"); console.error(`FAILED ${name}`); throw error; }
  }
  console.log("LOCAL migration tamamlandı: 127.0.0.1:55440/mizan_acceptance_local. Storage servisi ve cron kurulmadı.");
} finally { await db.end(); }
