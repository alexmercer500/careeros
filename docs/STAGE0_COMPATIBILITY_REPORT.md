# Stage 0 — Better Auth / Fastify Compatibility Report

**Branch:** `spike/stage0-better-auth` (throwaway)
**Status:** Complete — **passed**, with four findings that change the implementation plan
**Date:** 2026-11-10
**Scope:** prove the selected versions and integrations work before changing the main implementation.
No file on `main` was modified.

---

## 1. What was actually tested

A real, runnable Fastify + Better Auth + Drizzle + PostgreSQL 16 slice, against a real database:

- Fastify 5 mounts Better Auth as a catch-all `/api/auth/*` route using `auth.handler()` and `fromNodeHeaders`.
- Better Auth uses the Drizzle adapter, `auth` schema, UUID primary keys, magic-link-only sign-in.
- Drizzle Kit generates and applies the schema (8 tables: 4 auth, 4 application).
- Hand-written SQL adds the three-role split, `current_user_id()`, membership helpers and 12 RLS policies.
- A `/api/v1/session` route resolves tenant context **through RLS** using `withTenantTx`.
- Provisioning happens in `databaseHooks.user.create.after`, replacing the Supabase trigger.
- A local file mailbox captures magic links (0600 permissions, outside Git).

Environment: Node v24.22.1, PostgreSQL 16.15 (Alpine), isolated container on `127.0.0.1:55433`, throwaway branch, no changes to `main`, no Docker volume touched.

---

## 2. Compatibility matrix

| Integration | Tested | Result |
|---|---|---|
| Fastify catch-all → `auth.handler()` | POST sign-in, GET verify | ✅ works |
| Multiple `Set-Cookie` forwarding | session issuance | ✅ array forwarding required; verified |
| `fromNodeHeaders` + `auth.api.getSession` | authenticated route | ✅ works |
| Drizzle adapter, non-default schema | `schemaName: "auth"` | ✅ works |
| Better Auth runtime schema validation | startup + requests | ✅ passed with hand-written Drizzle schema |
| UUID primary keys | `generateId: "uuid"` + `defaultRandom()` | ✅ DB-generated UUIDs |
| Magic link request | `sendMagicLink` callback | ✅ captured, 200 |
| Magic link verify | redirect + session | ✅ 302 + `session_token` |
| Session read | `/api/v1/session` | ✅ 200, correct user + workspace |
| Logout | sign-out then session | ✅ 200/204, subsequent 401 |
| Single-use token | verify twice | ✅ second attempt yields no session |
| Token expiry | `expiresIn: 1` + 1.5 s wait | ✅ rejected |
| Cookie attributes | raw `Set-Cookie` | ✅ `HttpOnly`, `SameSite=Lax` |
| Provisioning hook | signup | ✅ exactly one workspace/membership/profile |
| Provisioning idempotency | repeat + 5 concurrent calls | ✅ still one each |
| Provisioning failure | forced throw | ⚠️ leaves orphaned `auth.user` (finding 1) |
| Recovery after failure | retry + lazy repair | ✅ repaired to exactly one workspace |
| RLS via transaction-scoped claims | `withTenantTx` | ✅ policy enforcement verified |
| Cross-tenant insert | A → B workspace | ✅ `42501` |
| Cross-tenant update | A → B profile | ✅ 0 rows, B unchanged |
| Unfiltered query | no `WHERE` | ✅ RLS returned only caller's row |
| Role outside tenant tx | app role, no `SET ROLE` | ✅ fail-closed, `42501` |
| Pool identity isolation | two concurrent txs | ✅ no leakage between checkouts |
| App role DDL | `CREATE TABLE` | ✅ denied (`42501`) |
| App role privileges | role attributes | ✅ no superuser, no bypassrls, no createdb/createrole, owns no tables |
| Untrusted origin on magic-link request | `Origin: evil.example` | ⚠️ **accepted** (finding 3) |

---

## 3. Actual resolved versions

| Package | Version |
|---|---|
| `better-auth` | **1.7.19** |
| `@better-auth/drizzle-adapter` | **1.7.19** |
| `@better-auth/core` | **1.7.19** (explicit peer) |
| `@better-auth/utils` | **0.5.1** (explicit peer) |
| `fastify` | **5.12.8** |
| `drizzle-orm` | **0.45.4** |
| `drizzle-kit` | **0.31.11** |
| `pg` | **8.23.1** |
| `vitest` | **5.1.0** |
| `typescript` | **5.9.3** |
| `zod` | **4.6.7** |
| Node.js | v24.22.1 |
| PostgreSQL | 16.15 (Alpine) |

> **Version correction (found in Stage 1):** the spike ran on PostgreSQL 16, but the live Supabase
> database is PostgreSQL **17.11**, and a PG17 dump cannot be restored into PG16. The target cluster
> must be 17. Stage 3 must re-run this suite against PostgreSQL 17 before the schema is accepted; the
> Stage 1 restore verification already confirmed the schema restores cleanly on 17.

No peer-dependency warnings that block installation. `@better-auth/core` and `@better-auth/utils` must be
declared explicitly — they are peers of the adapter and are not guaranteed to be installed transitively.

---

## 4. Test output

```
✓ src/test/provisioning-failure.test.ts  (1 test)
✓ src/test/auth.test.ts                  (7 tests)   2000ms
✓ src/test/provisioning.test.ts          (3 tests)    499ms
✓ src/test/rls.test.ts                   (8 tests)    473ms
✓ src/test/schema.test.ts                (7 tests)     83ms

Test Files  5 passed (5)
     Tests  26 passed (26)
  Duration  13.85s
```

`tsc --noEmit` (strict, `verbatimModuleSyntax`, `noUncheckedIndexedAccess`): **clean**.

The stderr noise in the run comes from the deliberate forced-failure test; Better Auth logs the
error before the request is rejected, which is expected.

Mapping to the requested checks:

| Requested | Suite |
|---|---|
| Registration / login / session / logout | `auth.test.ts` (7) |
| UUID generation | `schema.test.ts`, `auth.test.ts` |
| Adapter compatibility | `schema.test.ts` (8 tables, cross-schema FK) |
| Tenant isolation + RLS | `rls.test.ts` (8) |
| Database transactions | `rls.test.ts` (rollback on error, pool isolation) |
| Provisioning integrity | `provisioning.test.ts` (3), `provisioning-failure.test.ts` |

---

## 5. Findings that change the plan

### Finding 1 — the provisioning hook is **not** transactional with user creation (important)

The documentation says the `after` hook "runs after it commits". The spike proves the consequence:
when the hook throws, **`auth.user` persists with no workspace**, and the sign-in request returns 500.

Observed: `verify=500 auth.users=1 workspaces=0`.

**Resolution (implemented and proven):** provisioning is idempotent (advisory lock + `ON CONFLICT`),
and the session resolver repairs a missing workspace on the next request. The recovery test now
asserts the end state is exactly one user and one workspace after a failed first attempt.

**Plan impact:** the lazy repair path in `LOCAL_FIRST_ARCHITECTURE.md §5.3` is mandatory, not
optional. It moves from "nice fallback" to a required component with its own test.

### Finding 2 — Drizzle `char()` defaults to `char(1)`

`char("default_currency")` generated `character(1)`, so inserting `'INR'` failed with
`value too long for type character(1)`. The Supabase SQL used `char(3)`.

**Resolution:** `char("default_currency", { length: 3 })`.

**Plan impact:** Stage 3 must specify lengths for every `char(...)` column. This is a silent,
data-dependent failure — the schema needs a review pass for fixed-width columns.

### Finding 3 — Better Auth does not reject an untrusted Origin on `sign-in/magic-link`

`POST /api/auth/sign-in/magic-link` with `Origin: http://evil.example` returned **200** and sent the
email. `trustedOrigins` did not block it. This endpoint is unauthenticated and only triggers an email,
so the immediate risk is low, but it confirms that **the API must own CSRF protection** rather than
relying on Better Auth.

**Plan impact:** the Stage 5 `Origin` check on cookie-authenticated mutations is required. Add it as an
explicit acceptance test. Keep the spike test as a regression marker that documents the library's
behaviour.

### Finding 4 — `Set-Cookie` must be forwarded as an array

Forwarding headers with `Headers.forEach` collapses multiple `Set-Cookie` values into one. The spike
uses `response.headers.getSetCookie()` and passes the array to `reply.header("set-cookie", list)`.

**Plan impact:** bake this into the Fastify auth plugin in Stage 5 and cover it with the cookie test.

### Additional confirmations worth recording

- **Better Auth validated the hand-written Drizzle schema at runtime** without complaint, which is
  strong evidence that `auth.user/session/account/verification` match what the library expects.
- **RLS works with Drizzle over a transaction-scoped client**: `set local role` + `set_config` then
  Drizzle queries on the same client behaves correctly, including `WITH CHECK` rejections (`42501`).
- **`noinherit` on the runtime role** makes `SET ROLE` mandatory and produces fail-closed behaviour
  outside a tenant transaction. Recommend keeping it.
- **Cookie flags** are `HttpOnly` and `SameSite=Lax` by default, matching the plan.

---

## 6. Remaining blockers / not yet verified

Nothing blocks Stage 1. These items are deliberately deferred to the stage that owns them:

| Item | Why not tested here | Owner stage |
|---|---|---|
| pg-boss boot, schema creation, job lifecycle | not part of the Better Auth question | Stage 9 |
| Next.js rewrite proxy + cookie behaviour across ports | needs the web app wired | Stage 7 |
| `drizzle-kit` against a database that already holds data | requires the real copy | Stage 4 |
| Better Auth CLI-generated schema parity with the hand-written schema | adapter validation passed, CLI output not diffed | Stage 3 (optional check) |
| File mailbox permissions on Windows | POSIX mode is advisory on NTFS; the `0600` assertion is skipped on win32 | Stage 5/7 (ACL hardening) |
| Session token storage format (hashed vs plain) | not audited | Stage 5 security review |
| Production secrets, HTTPS-only cookies, reverse proxy | out of scope for a local spike | Stage 7+ |

---

## 7. Recommended Stage 1 sequence

The spike produced reusable assets. Lift them rather than rewriting:

**Stage 1 — Backup and verify (as approved)**
1. `pg_dump -Fc` of `supabase_db_careeros`.
2. `pg_restore -l` manifest + SHA-256.
3. Restore into a scratch database and compare counts (1 user, 1 workspace, 1 membership, 1 profile).
4. Record the evidence in `docs/MIGRATION_LOG.md`.

**Stage 2 — Local PostgreSQL**
1. `docker-compose.yml` with the `careeros_pgdata` named volume and a preflight port check (5432, fallback 55432).
2. Create `careeros_owner`, `careeros_app`, `careeros_authenticated` (renamed from the spike's `spike_*`).
3. Assert the same role properties the spike asserted: no superuser, no bypassrls, no DDL, owns nothing.

**Stage 3 — Drizzle schema and RLS**
1. Port `spike/stage0/src/db/schema/*` with the `char(3)` fix.
2. Port `spike/stage0/sql/roles.sql` and `rls.sql` verbatim, renaming roles.
3. Add the approval/immutability objects now, per the D9 modification (payload-hash constraint,
   single-use partial unique index, expiry checks, document immutability triggers, submission
   idempotency) **without** the approval UI or automation.
4. Generate `0000_init`; apply to an empty database; prove reproducibility by dropping and re-applying.
5. Re-run the spike's RLS assertions against the real schema.

**Then** Stage 4 (verified data copy) before any application rewiring, exactly as planned.

---

## 8. Verdict

The stack is viable. Better Auth works with Fastify, Drizzle, PostgreSQL, the `auth` schema, UUIDs,
magic links, sessions and logout — verified with 26 integration tests rather than documentation.

The four findings are all addressable and are now folded into the plan:
provisioning repair is mandatory, `char` lengths must be explicit, the API must own CSRF checking,
and cookie forwarding must handle multiple values.

**Recommendation:** approve Stage 1.

---

## 9. Repository state

- Work performed on `spike/stage0-better-auth` only; `spike/stage0` is committed there.
- `main` is unchanged; the migration documents remain untracked in the working tree.
- The throwaway PostgreSQL container and its data are removed after the spike; it used no volume.
- The Supabase stack and its volumes were not touched.
