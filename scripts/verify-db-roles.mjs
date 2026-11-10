/**
 * Stage 2 acceptance checks.
 *
 * Verifies, against the running container:
 *  - container health and loopback-only port binding
 *  - the persistent volume exists
 *  - role attributes (no superuser, no BYPASSRLS, no CREATEDB/CREATEROLE)
 *  - the runtime role owns nothing and cannot run DDL
 *  - migration and runtime credentials are distinct
 *  - the runtime cannot escalate to the owner role
 *  - RLS actually filters rows and cannot be switched off by the runtime
 *
 * Exit code 0 only when every check passes.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { Client } from "pg";

const ENV_PATH = ".env";
const CONTAINER = "careeros_postgres";
const PROBE_SCHEMA = "stage2_probe";

if (!existsSync(ENV_PATH)) {
  console.error("Missing .env. Run `pnpm pg:up` first.");
  process.exit(1);
}

const env = {};
for (const line of readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (match) env[match[1]] = match[2];
}

const port = Number(env.CAREEROS_PG_PORT ?? 5432);
const checks = [];

function record(name, pass, detail = "") {
  checks.push({ name, pass: Boolean(pass), detail });
}

function docker(args) {
  return execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

async function connect(user, password) {
  const client = new Client({
    host: "127.0.0.1",
    port,
    user,
    password,
    database: "careeros",
  });
  await client.connect();
  return client;
}

async function expectSqlState(fn, expected, name) {
  try {
    await fn();
    record(name, false, "unexpectedly succeeded");
  } catch (error) {
    const code = error?.code;
    record(name, code === expected, code ? `sqlstate ${code}` : String(error?.message ?? error));
  }
}

// ---------------------------------------------------------------- environment
try {
  const health = docker(["inspect", "--format", "{{.State.Health.Status}}", CONTAINER]);
  record("container health is 'healthy'", health === "healthy", health);
} catch {
  record("container health is 'healthy'", false, "container not inspectable");
}

try {
  const ports = JSON.parse(
    docker(["inspect", "--format", "{{json .NetworkSettings.Ports}}", CONTAINER]),
  );
  const binding = ports?.["5432/tcp"]?.[0];
  record(
    "postgres is bound to loopback only",
    binding?.HostIp === "127.0.0.1",
    `host=${binding?.HostIp} port=${binding?.HostPort}`,
  );
  record(
    "published port matches .env",
    Number(binding?.HostPort) === port,
    `binding=${binding?.HostPort} env=${port}`,
  );
} catch {
  record("postgres is bound to loopback only", false, "could not read port bindings");
}

try {
  const volumes = docker(["volume", "ls", "--format", "{{.Name}}"]).split(/\r?\n/);
  record("persistent volume careeros_pgdata exists", volumes.includes("careeros_pgdata"));
} catch {
  record("persistent volume careeros_pgdata exists", false, "docker unavailable");
}

// --------------------------------------------------------------------- roles
const admin = await connect("postgres", env.POSTGRES_ADMIN_PASSWORD);

const roles = await admin.query(
  `select rolname, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole, rolcanlogin, rolinherit
     from pg_roles where rolname like 'careeros_%' order by rolname`,
);
const byName = Object.fromEntries(roles.rows.map((row) => [row.rolname, row]));

record(
  "careeros_owner is not a superuser",
  byName.careeros_owner?.rolsuper === false,
  `rolsuper=${byName.careeros_owner?.rolsuper}`,
);
record(
  "careeros_owner cannot bypass RLS",
  byName.careeros_owner?.rolbypassrls === false,
  `rolbypassrls=${byName.careeros_owner?.rolbypassrls}`,
);
record(
  "careeros_app logs in",
  byName.careeros_app?.rolcanlogin === true,
  `rolcanlogin=${byName.careeros_app?.rolcanlogin}`,
);
record(
  "careeros_app is not a superuser",
  byName.careeros_app?.rolsuper === false,
  `rolsuper=${byName.careeros_app?.rolsuper}`,
);
record(
  "careeros_app cannot bypass RLS",
  byName.careeros_app?.rolbypassrls === false,
  `rolbypassrls=${byName.careeros_app?.rolbypassrls}`,
);
record(
  "careeros_app cannot create databases or roles",
  byName.careeros_app?.rolcreatedb === false && byName.careeros_app?.rolcreaterole === false,
  `createdb=${byName.careeros_app?.rolcreatedb} createrole=${byName.careeros_app?.rolcreaterole}`,
);
record(
  "careeros_app does not inherit privileges (SET ROLE required)",
  byName.careeros_app?.rolinherit === false,
  `rolinherit=${byName.careeros_app?.rolinherit}`,
);
record(
  "careeros_authenticated cannot log in",
  byName.careeros_authenticated?.rolcanlogin === false,
  `rolcanlogin=${byName.careeros_authenticated?.rolcanlogin}`,
);

const databaseOwner = await admin.query(
  "select pg_get_userbyid(datdba) as owner from pg_database where datname = 'careeros'",
);
record(
  "migration role owns the database",
  databaseOwner.rows[0]?.owner === "careeros_owner",
  `owner=${databaseOwner.rows[0]?.owner}`,
);

const ownership = await admin.query(
  `select count(*)::int as n from pg_class c
   join pg_roles r on r.oid = c.relowner
   where r.rolname = 'careeros_app'`,
);
record(
  "runtime role owns no relations",
  ownership.rows[0]?.n === 0,
  `relations=${ownership.rows[0]?.n}`,
);

const membership = await admin.query(
  `select pg_has_role('careeros_app', 'careeros_authenticated', 'member') as member,
          pg_has_role('careeros_app', 'careeros_owner', 'member') as owner_member`,
);
record(
  "runtime role is a member of the policy role only",
  membership.rows[0]?.member === true && membership.rows[0]?.owner_member === false,
  `authenticated=${membership.rows[0]?.member} owner=${membership.rows[0]?.owner_member}`,
);

// ------------------------------------------------------- runtime restrictions
const owner = await connect("careeros_owner", env.CAREEROS_OWNER_PASSWORD);
const app = await connect("careeros_app", env.CAREEROS_APP_PASSWORD);

record(
  "migration credentials can run DDL",
  await owner
    .query("create table if not exists public.stage2_owner_probe (id int)")
    .then(() => true)
    .catch(() => false),
);
await owner.query("drop table if exists public.stage2_owner_probe");

await expectSqlState(
  () => app.query("create table public.stage2_app_probe (id int)"),
  "42501",
  "runtime role cannot create tables",
);
await expectSqlState(
  () => app.query("create schema stage2_app_schema"),
  "42501",
  "runtime role cannot create schemas",
);
await expectSqlState(
  () => app.query("create role stage2_evil nologin"),
  "42501",
  "runtime role cannot create roles",
);
await expectSqlState(
  () => app.query("create database stage2_evil_db"),
  "42501",
  "runtime role cannot create databases",
);
await expectSqlState(
  () => app.query("alter database careeros set search_path = public"),
  "42501",
  "runtime role cannot alter the database",
);
await expectSqlState(
  () => app.query("set role careeros_owner"),
  "42501",
  "runtime role cannot escalate to the migration role",
);

const schemaCreate = await admin.query(
  "select has_schema_privilege('careeros_app', 'public', 'CREATE') as can_create",
);
record(
  "runtime role has no CREATE on schema public",
  schemaCreate.rows[0]?.can_create === false,
  `can_create=${schemaCreate.rows[0]?.can_create}`,
);

// ------------------------------------------------------------------- RLS probe
await owner.query(`drop schema if exists ${PROBE_SCHEMA} cascade`);
await owner.query(`create schema ${PROBE_SCHEMA}`);
await owner.query(`create table ${PROBE_SCHEMA}.rls_probe (id int primary key)`);
await owner.query(`insert into ${PROBE_SCHEMA}.rls_probe (id) values (1)`);
await owner.query(`alter table ${PROBE_SCHEMA}.rls_probe enable row level security`);
await owner.query(`grant usage on schema ${PROBE_SCHEMA} to careeros_authenticated`);
await owner.query(`grant select on ${PROBE_SCHEMA}.rls_probe to careeros_authenticated`);

const rlsClient = await connect("careeros_app", env.CAREEROS_APP_PASSWORD);
await rlsClient.query("begin");
await rlsClient.query("set local role careeros_authenticated");
const visible = await rlsClient.query(`select count(*)::int as n from ${PROBE_SCHEMA}.rls_probe`);
await rlsClient.query("commit");
record(
  "RLS hides rows from a policy-less table",
  visible.rows[0]?.n === 0,
  `rows_visible=${visible.rows[0]?.n} (row exists, owner sees it)`,
);

const directClient = await connect("careeros_app", env.CAREEROS_APP_PASSWORD);
await expectSqlState(
  () => directClient.query(`select count(*) from ${PROBE_SCHEMA}.rls_probe`),
  "42501",
  "runtime role cannot read tenant tables without SET ROLE",
);

const bypassClient = await connect("careeros_app", env.CAREEROS_APP_PASSWORD);
await bypassClient.query("begin");
await bypassClient.query("set local role careeros_authenticated");
await bypassClient.query("set local row_security = off");
await expectSqlState(
  () => bypassClient.query(`select count(*) from ${PROBE_SCHEMA}.rls_probe`),
  "42501",
  "runtime cannot switch row_security off",
);
await bypassClient.query("rollback").catch(() => undefined);

await owner.query(`drop schema if exists ${PROBE_SCHEMA} cascade`);

for (const client of [admin, owner, app, rlsClient, directClient, bypassClient]) {
  await client.end().catch(() => undefined);
}

// ---------------------------------------------------------------------- report
const failures = checks.filter((check) => !check.pass);
const width = Math.max(...checks.map((check) => check.name.length));
console.log("\nSTAGE 2 ACCEPTANCE CHECKS\n");
for (const check of checks) {
  console.log(`  ${check.pass ? "PASS" : "FAIL"}  ${check.name.padEnd(width)}  ${check.detail}`);
}
console.log(`\n  ${checks.length - failures.length}/${checks.length} passed\n`);

if (failures.length > 0) {
  process.exit(1);
}
