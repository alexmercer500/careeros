/**
 * Persistence probe for Stage 2.
 *
 * Writes a marker row as the migration role, then reads it back after a
 * container restart and after a full container recreation (down/up). The volume
 * is never removed.
 *
 * Usage:
 *   node scripts/db-persistence.mjs --write
 *   node scripts/db-persistence.mjs --read
 */
import { existsSync, readFileSync } from "node:fs";
import { Client } from "pg";

const mode = process.argv.includes("--write") ? "write" : "read";

if (!existsSync(".env")) {
  console.error("Missing .env");
  process.exit(1);
}

const env = {};
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (match) env[match[1]] = match[2];
}

const client = new Client({
  host: "127.0.0.1",
  port: Number(env.CAREEROS_PG_PORT ?? 5432),
  user: "careeros_owner",
  password: env.CAREEROS_OWNER_PASSWORD,
  database: "careeros",
});

await client.connect();

if (mode === "write") {
  await client.query(`
    create table if not exists public.stage2_persistence (
      id          serial primary key,
      marker      text not null,
      written_at  timestamptz not null default now()
    )
  `);
  const marker = `stage2-${Date.now()}`;
  await client.query("insert into public.stage2_persistence (marker) values ($1)", [marker]);
  const count = await client.query("select count(*)::int as n from public.stage2_persistence");
  console.log(JSON.stringify({ mode, marker, rows: count.rows[0].n }));
} else {
  try {
    const result = await client.query(
      "select count(*)::int as n, max(written_at)::text as latest from public.stage2_persistence",
    );
    console.log(
      JSON.stringify({
        mode,
        rows: result.rows[0]?.n ?? 0,
        latest: result.rows[0]?.latest ?? null,
      }),
    );
  } catch (error) {
    console.log(JSON.stringify({ mode, rows: 0, error: String(error?.message ?? error) }));
    process.exitCode = 2;
  }
}

await client.end();
