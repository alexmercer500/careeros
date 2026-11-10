/**
 * Prints the applied schema, RLS status, policy counts, and triggers.
 * Usage: node --env-file=.env.local scripts/db-inspect.mjs
 */
import { Client } from "pg";

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const tables = await client.query(`
  select c.relname as table_name, c.relrowsecurity as rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  order by c.relname
`);

const policies = await client.query(`
  select tablename, count(*)::int as policy_count
  from pg_policies
  where schemaname = 'public'
  group by tablename
  order by tablename
`);

const triggers = await client.query(`
  select event_object_table as table_name, trigger_name
  from information_schema.triggers
  where trigger_schema = 'public'
  order by event_object_table, trigger_name
`);

console.log("TABLES");
for (const row of tables.rows) {
  console.log(`  ${row.table_name.padEnd(22)} rls=${row.rls_enabled}`);
}
console.log("POLICIES");
for (const row of policies.rows) {
  console.log(`  ${row.tablename.padEnd(22)} ${row.policy_count}`);
}
console.log("TRIGGERS");
for (const row of triggers.rows) {
  console.log(`  ${row.table_name.padEnd(22)} ${row.trigger_name}`);
}

await client.end();
