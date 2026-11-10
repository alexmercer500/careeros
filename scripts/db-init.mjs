/**
 * Idempotent creation of the three CareerOS database roles.
 *
 *   careeros_owner          migrations and schema ownership (DDL). Separate
 *                           credentials from the runtime.
 *   careeros_app            the only runtime login. No DDL, no ownership,
 *                           cannot bypass RLS, NOINHERIT.
 *   careeros_authenticated  NOLOGIN role assumed inside tenant transactions;
 *                           the target of every RLS policy.
 *
 * Safe to run repeatedly. Requires the admin (superuser) credentials created by
 * the container, which are used only for this bootstrap step.
 */
import { readFileSync, existsSync } from "node:fs";
import { Client } from "pg";

const ENV_PATH = ".env";

function loadEnv() {
  if (!existsSync(ENV_PATH)) {
    throw new Error("Missing .env. Run `pnpm pg:up` first (it generates one).");
  }
  const env = {};
  for (const line of readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) env[match[1]] = match[2];
  }
  return env;
}

const env = loadEnv();
const port = env.CAREEROS_PG_PORT ?? "5432";

for (const key of ["POSTGRES_ADMIN_PASSWORD", "CAREEROS_OWNER_PASSWORD", "CAREEROS_APP_PASSWORD"]) {
  if (!env[key]) throw new Error(`Missing ${key} in .env`);
}

const client = new Client({
  host: "127.0.0.1",
  port: Number(port),
  user: "postgres",
  password: env.POSTGRES_ADMIN_PASSWORD,
  database: "careeros",
});

await client.connect();
const lit = (value) => client.escapeLiteral(value);

async function roleExists(name) {
  const result = await client.query("select 1 from pg_roles where rolname = $1", [name]);
  return result.rowCount === 1;
}

async function ensureLoginRole(name, password, attributes) {
  if (await roleExists(name)) {
    await client.query(`alter role ${name} with login password ${lit(password)} ${attributes}`);
    return "updated";
  }
  await client.query(`create role ${name} with login password ${lit(password)} ${attributes}`);
  return "created";
}

async function ensureGroupRole(name) {
  if (await roleExists(name)) {
    await client.query(`alter role ${name} with nologin`);
    return "updated";
  }
  await client.query(`create role ${name} with nologin`);
  return "created";
}

const report = {};

report.careeros_owner = await ensureLoginRole(
  "careeros_owner",
  env.CAREEROS_OWNER_PASSWORD,
  "nosuperuser nocreatedb nocreaterole nobypassrls noreplication",
);

report.careeros_app = await ensureLoginRole(
  "careeros_app",
  env.CAREEROS_APP_PASSWORD,
  "nosuperuser nocreatedb nocreaterole nobypassrls noreplication noinherit connection limit 20",
);

report.careeros_authenticated = await ensureGroupRole("careeros_authenticated");

// Allow the runtime to assume the policy-target role inside a transaction.
await client.query("grant careeros_authenticated to careeros_app");

// Migration role owns the database, and therefore the public schema (PG15+).
await client.query("alter database careeros owner to careeros_owner");
await client.query("revoke create on database careeros from public");
await client.query("grant connect on database careeros to careeros_owner, careeros_app");
await client.query("grant usage on schema public to careeros_app, careeros_authenticated");

// Future objects created by migrations are automatically usable by tenant
// transactions, without granting anything to the runtime login directly.
await client.query(
  "alter default privileges for role careeros_owner in schema public " +
    "grant select, insert, update, delete on tables to careeros_authenticated",
);
await client.query(
  "alter default privileges for role careeros_owner in schema public " +
    "grant usage, select on sequences to careeros_authenticated",
);
await client.query(
  "alter default privileges for role careeros_owner in schema public " +
    "grant execute on functions to careeros_authenticated",
);

console.log(JSON.stringify({ roles: report, port }, null, 2));
await client.end();
