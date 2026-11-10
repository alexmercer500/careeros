import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";

// Load the same local environment used by the app. Next.js reads it from the
// app directory, so that file is the canonical location.
const envCandidates = [
  resolve(process.cwd(), "apps/web/.env.local"),
  resolve(process.cwd(), ".env.local"),
];
for (const candidate of envCandidates) {
  if (existsSync(candidate)) {
    process.loadEnvFile(candidate);
    break;
  }
}

const databaseUrl = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

interface TestUser {
  id: string;
  email: string;
  workspaceId: string;
}

const users: TestUser[] = [];

function adminHeaders(): Record<string, string> {
  return {
    "content-type": "application/json",
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
  };
}

async function createUser(label: string): Promise<TestUser> {
  const email = `rls-${label}-${randomUUID()}@example.test`;

  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ email, email_confirm: true }),
  });

  if (!response.ok) {
    throw new Error(`Admin user creation failed: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as { id?: string; user?: { id?: string } };
  const id = payload.id ?? payload.user?.id;
  if (!id) throw new Error("Admin user creation returned no id");

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const workspace = await client.query<{ workspace_id: string }>(
      "select workspace_id from public.workspace_members where user_id = $1",
      [id],
    );
    const workspaceId = workspace.rows[0]?.workspace_id;
    if (!workspaceId) throw new Error("Signup trigger did not provision a workspace");
    return { id, email, workspaceId };
  } finally {
    await client.end();
  }
}

/**
 * Runs a query batch as the `authenticated` role with a JWT claim subject,
 * which is exactly how Postgres evaluates RLS for a real request.
 */
async function asUser<T>(userId: string, fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query("begin");
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: userId, role: "authenticated" }),
    ]);
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    return await fn(client);
  } finally {
    await client.query("rollback").catch(() => undefined);
    await client.end();
  }
}

beforeAll(async () => {
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for the RLS test");
  }

  const responder = await fetch(`${supabaseUrl}/auth/v1/health`).catch(() => null);
  if (!responder) {
    throw new Error(`Local Supabase is not reachable at ${supabaseUrl}. Run \`supabase start\`.`);
  }

  users.push(await createUser("alpha"), await createUser("beta"));
});

afterAll(async () => {
  if (users.length === 0) return;

  const ids = users.map((u) => u.id);
  const workspaceIds = users.map((u) => u.workspaceId);
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    // workspaces.owner_id is ON DELETE RESTRICT, so children go first.
    await client.query("delete from public.workspaces where id = any($1::uuid[])", [workspaceIds]);
    await client.query("delete from public.users where id = any($1::uuid[])", [ids]);
    await client.query("delete from auth.users where id = any($1::uuid[])", [ids]);
  } finally {
    await client.end();
  }
});

describe("schema shape", () => {
  it("enables RLS on every application table", async () => {
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      const result = await client.query<{ relname: string; relrowsecurity: boolean }>(`
        select c.relname, c.relrowsecurity
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false
      `);
      expect(result.rows).toEqual([]);
    } finally {
      await client.end();
    }
  });
});

describe("signup provisioning", () => {
  it("creates exactly one workspace, one owner membership and one profile per user", async () => {
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      for (const user of users) {
        const memberships = await client.query(
          "select role from public.workspace_members where user_id = $1",
          [user.id],
        );
        expect(memberships.rowCount).toBe(1);
        expect(memberships.rows[0].role).toBe("owner");

        const profiles = await client.query(
          "select workspace_id from public.career_profiles where user_id = $1",
          [user.id],
        );
        expect(profiles.rowCount).toBe(1);
        expect(profiles.rows[0].workspace_id).toBe(user.workspaceId);

        const appUsers = await client.query("select email from public.users where id = $1", [
          user.id,
        ]);
        expect(appUsers.rowCount).toBe(1);
        expect(appUsers.rows[0].email).toBe(user.email);
      }
    } finally {
      await client.end();
    }
  });
});

describe("row level security", () => {
  it("shows a user only their own workspace", async () => {
    const [alpha, beta] = users as [TestUser, TestUser];

    const rows = await asUser(alpha.id, async (client) => {
      const result = await client.query<{ id: string }>("select id from public.workspaces");
      return result.rows.map((row) => row.id);
    });

    expect(rows).toEqual([alpha.workspaceId]);
    expect(rows).not.toContain(beta.workspaceId);
  });

  it("shows a user only their own profile", async () => {
    const [alpha, beta] = users as [TestUser, TestUser];

    const rows = await asUser(alpha.id, async (client) => {
      const result = await client.query<{ workspace_id: string }>(
        "select workspace_id from public.career_profiles",
      );
      return result.rows.map((row) => row.workspace_id);
    });

    expect(rows).toEqual([alpha.workspaceId]);
    expect(rows).not.toContain(beta.workspaceId);
  });

  it("hides other users' memberships", async () => {
    const [alpha, beta] = users as [TestUser, TestUser];

    const userIds = await asUser(alpha.id, async (client) => {
      const result = await client.query<{ user_id: string }>(
        "select user_id from public.workspace_members",
      );
      return result.rows.map((row) => row.user_id);
    });

    expect(userIds).toEqual([alpha.id]);
    expect(userIds).not.toContain(beta.id);
  });

  it("ignores an update aimed at another workspace", async () => {
    const [alpha, beta] = users as [TestUser, TestUser];

    const affected = await asUser(alpha.id, async (client) => {
      const result = await client.query(
        "update public.career_profiles set headline = 'compromised' where workspace_id = $1",
        [beta.workspaceId],
      );
      return result.rowCount;
    });

    expect(affected).toBe(0);

    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      const check = await client.query<{ headline: string | null }>(
        "select headline from public.career_profiles where workspace_id = $1",
        [beta.workspaceId],
      );
      expect(check.rows[0]?.headline).toBeNull();
    } finally {
      await client.end();
    }
  });

  it("rejects an insert that targets another workspace", async () => {
    const [alpha, beta] = users as [TestUser, TestUser];

    const attempt = asUser(alpha.id, async (client) => {
      await client.query(
        `insert into public.career_profiles (workspace_id, user_id, full_name)
         values ($1, $2, 'intruder')`,
        [beta.workspaceId, alpha.id],
      );
    });

    await expect(attempt).rejects.toMatchObject({ code: "42501" });
  });

  it("rejects an update to another user's account row", async () => {
    const [alpha, beta] = users as [TestUser, TestUser];

    const affected = await asUser(alpha.id, async (client) => {
      const result = await client.query("update public.users set full_name = 'x' where id = $1", [
        beta.id,
      ]);
      return result.rowCount;
    });

    expect(affected).toBe(0);
  });

  it("prevents a non-owner from inserting a membership", async () => {
    const [alpha, beta] = users as [TestUser, TestUser];

    const attempt = asUser(alpha.id, async (client) => {
      await client.query(
        `insert into public.workspace_members (workspace_id, user_id, role)
         values ($1, $2, 'admin')`,
        [beta.workspaceId, alpha.id],
      );
    });

    await expect(attempt).rejects.toMatchObject({ code: "42501" });
  });

  it("allows a user to update their own profile", async () => {
    const [alpha] = users as [TestUser, TestUser];

    const affected = await asUser(alpha.id, async (client) => {
      const result = await client.query(
        "update public.career_profiles set headline = 'Product-minded engineer' where workspace_id = $1",
        [alpha.workspaceId],
      );
      return result.rowCount;
    });

    expect(affected).toBe(1);
  });

  it("denies access when there is no session subject", async () => {
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      await client.query("begin");
      await client.query("set local role authenticated");
      const result = await client.query("select id from public.workspaces");
      expect(result.rowCount).toBe(0);
    } finally {
      await client.query("rollback").catch(() => undefined);
      await client.end();
    }
  });
});
