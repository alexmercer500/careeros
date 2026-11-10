# Migration Plan — Supabase → Local-First

**Status:** Proposed. **No code has been changed.** The working tree is clean apart from the new
documents in this change set.
**Companion:** `docs/MIGRATION_AUDIT.md` (what exists), `docs/LOCAL_FIRST_ARCHITECTURE.md` (target).

---

## 1. Objective and constraints

Replace Supabase as a runtime dependency without rebuilding Phase 1, without losing data, and without
weakening the tenant-isolation and approval guarantees.

Hard constraints from the brief:

- No Supabase at runtime; no Redis; no cloud backend; no mandatory external hosting.
- Do not recreate the project, overwrite files, or delete Supabase config/migrations immediately.
- Preserve the Next.js frontend, UI components, documentation, AI architecture, validation schemas,
  matching engine, and existing data.
- Never run destructive Docker volume commands.
- Back up and verify data before changing anything.
- Stop for approval before implementation.

---

## 2. Current state (from the audit)

| Fact | Value |
|---|---|
| Real data | 1 user, 1 workspace, 1 membership, 1 profile |
| Storage objects | 0 (Storage never used) |
| Supabase query sites | 4, all inside `packages/database` |
| Files importing Supabase | 13 |
| RLS policies | 12, all portable modulo `auth.uid()` |
| Existing tests | 34 (23 unaffected, 11 need rewriting) |
| Supabase containers / volumes | 12 / 3, all left untouched |

Because Storage is unused, the migration has **no binary data to move**. Because there are four
tables with four rows, the data move is small and fully verifiable.

---

## 3. Data safety plan (executed before any code change)

### 3.1 Backup

```powershell
# 1. Dump the live Supabase database in custom format
docker exec supabase_db_careeros pg_dump -U postgres -d postgres -Fc -f /tmp/careeros_pre.dump
docker cp supabase_db_careeros:/tmp/careeros_pre.dump backups/2026-11-10-pre-migration.dump

# 2. Record an integrity manifest
docker exec supabase_db_careeros pg_restore -l /tmp/careeros_pre.dump > backups/2026-11-10-pre-migration-manifest.txt
Get-FileHash backups/2026-11-10-pre-migration.dump -Algorithm SHA256
```

### 3.2 Verification (not just "the file exists")

1. `pg_restore -l` must list the expected tables (`public.users`, `public.workspaces`,
   `public.workspace_members`, `public.career_profiles`) and the four expected data blocks.
2. **Restore into a scratch database** inside the *new* Postgres container (never the Supabase volume):
   `create database careeros_backup_verify; pg_restore -d careeros_backup_verify …`
3. Compare row counts in the scratch restore against the source counts and record them in the plan
   log. Drop the scratch database afterwards.
4. Record the SHA-256 in `docs/MIGRATION_LOG.md`.

If any verification step fails, the migration stops there.

### 3.3 Retention

- `supabase_db_careeros` volume is **never** deleted during this migration.
- `supabase/` directory and all migrations remain in the repository untouched.
- The Supabase stack is left able to start until the new stack has passed every acceptance test.
- Decommissioning is Stage 11 and requires separate approval.

---

## 4. Data migration strategy

**Chosen approach: fresh database + verified copy (not in-place baselining).**

Why not baseline Drizzle onto the existing database: the Supabase database contains `auth`,
`storage`, `realtime`, `graphql` schemas and grants that we do not want to carry forward. Baselining
would require forging Drizzle's migration bookkeeping and then surgically dropping Supabase objects —
more risk, less clarity, and it would keep the 12 MB of system schemas.

### 4.1 Mapping

| Old | New | Notes |
|---|---|---|
| `auth.users` (Supabase-managed) | `auth.user` (Better Auth) | `id`, `email`, `emailVerified = true` (these users did verify by magic link), `name`, timestamps |
| `public.users` | `public.users` | Same columns; FK changes from `auth.users(id)` to `auth.user(id)` |
| `public.workspaces` | `public.workspaces` | Verbatim |
| `public.workspace_members` | `public.workspace_members` | Verbatim |
| `public.career_profiles` | `public.career_profiles` | Verbatim |
| Supabase Storage objects | — | None exist |
| `supabase_migrations` schema | — | Not carried; Drizzle owns migrations from `0000` |

### 4.2 Procedure

A one-off, idempotent script `scripts/migrate-supabase-data.ts`:

1. Connects to the old database (read-only) and the new database (owner role).
2. Verifies the source row counts match the backup manifest.
3. Inside a single transaction on the new database:
   - insert `auth.user` rows from `public.users` (preserving UUIDs),
   - insert `public.users` rows,
   - insert `workspaces`, `workspace_members`, `career_profiles`,
   - insert `auth.account` rows only if Better Auth requires them for magic-link sign-in
     (determined in Stage 0; if required, `providerId = 'credential'` is **wrong** for a
     passwordless user — we will confirm the correct representation rather than guess).
4. Asserts post-conditions: identical counts, no orphaned FKs, exactly one owner membership per
   workspace, exactly one profile per user, and `public.users.id` ⊂ `auth.user.id`.
5. Prints a verification table and exits non-zero on any mismatch.

### 4.3 Verification after copy

- Row-count equality table (source vs target) for all four tables.
- FK integrity queries (workspace has an owner; membership → workspace; profile → user).
- **A real sign-in** for the migrated email through the new magic-link flow.
- The profile page loads the migrated profile unchanged.
- `pnpm test` green, including the rewritten tenancy suite.

---

## 5. Staged implementation

Each stage is independently reviewable and leaves the repository in a working state.
No stage starts before the previous one's gate passes.

| Stage | Work | Complexity | Gate |
|---|---|---|---|
| **0** | **Better Auth compatibility spike.** Install `better-auth`, `@better-auth/drizzle-adapter`, `fastify`, `drizzle-orm`, `pg` in a throwaway branch. Boot Fastify, mount the auth handler, request a magic link via the file mailbox, verify the token, read the session back with `auth.api.getSession`. | S | A magic-link round trip works end to end on the exact pinned versions, with UUID IDs and the `auth` schema. **If it fails, we stop and re-plan before touching the app.** |
| **1** | **Backup + verification** per §3. | S | Manifest, hash, scratch-restore counts recorded. |
| **2** | **Postgres container + roles.** `docker-compose.yml`, named volume, port 5432 (with a preflight check and 55432 fallback), roles `careeros_owner` / `careeros_app` / `careeros_authenticated`. | S | Fresh DB reachable; app role cannot DDL or bypass RLS (verified by attempting both). |
| **3** | **Drizzle schema + migrations.** Re-express Phase 1 tables, enums, `current_user_id()`, membership helpers, RLS policies (retargeted), triggers except `handle_new_user`, grants. Generate `0000_init` + custom-SQL migration for triggers/policies. | L | `drizzle-kit migrate` on an empty DB produces a schema matching the design; `db-inspect` equivalent shows RLS on every table. |
| **4** | **Data copy + verification** per §4. | S | Counts match, FKs valid, backup retained. |
| **5** | **Fastify core.** `buildApp()`, env validation, pino with redaction, error mapping, helmet, rate limits, request IDs, `withTenantTx` plugin, `auth` plugin, `/api/auth/*` mount, `/api/v1/health`, `/api/v1/session`. | M | `app.inject()` tests: health 200; session 401 unauthenticated; 200 authenticated; errors shaped correctly. |
| **6** | **Port the profile API.** Repositories on Drizzle, `packages/core` service signatures take `Ctx`, `GET/PATCH /api/v1/profile`. | M | Existing profile behaviour preserved; invalid input → 400 with field issues; cross-tenant access impossible (tested). |
| **7** | **Rewire Next.js.** Delete `lib/supabase/*`; add `lib/api-client.ts`, `lib/auth-client.ts`, `lib/session.ts`; update `proxy.ts`; update the five auth/data pages; delete `apps/web/src/app/api/v1/profile/route.ts`; add rewrites; update lint rule. | M | Full browser flow works: login → email → verify → overview → edit → reload. No Supabase package remains in `apps/web/package.json`. |
| **8** | **Storage package + signed URL route.** Adapter, path safety, HMAC signing, `GET /api/v1/files/:key`. No data migration. | S | Traversal rejected; expired/tampered signature rejected; valid download streams. |
| **9** | **pg-boss scaffold.** Boss lifecycle, one smoke job (`system.heartbeat`), worker entrypoint, tenant context re-establishment. | S | Job enqueues once (singletonKey), executes, retries on failure, and cannot see another tenant's data. |
| **10** | **Tests, docs, cleanup.** Rewrite the RLS suite; add auth/HTTP/provisioning/storage/jobs tests; update the Playwright script to read the dev mailbox; update all docs; remove Supabase scripts. | M | `pnpm typecheck && pnpm lint && pnpm test && pnpm build` green; E2E green; screenshots regenerated. |
| **11** | **Decommission Supabase.** Requires separate approval. Stop the stack; leave volumes and files in place for a retention window. | S | App runs for a retention period with Supabase stopped. |

**Effort shape:** roughly 2,000–2,500 lines of new or changed code across ~45 files, with Stage 3 and
Stage 7 carrying most of the risk. I am deliberately not giving calendar estimates.

---

## 6. Files to modify

### 6.1 Delete

| File | Reason |
|---|---|
| `packages/database/src/server.ts` | Supabase server client |
| `packages/database/src/browser.ts` | Supabase browser client |
| `packages/database/src/database.types.ts` | Supabase-generated types |
| `apps/web/src/lib/supabase/server.ts` | Supabase server client |
| `apps/web/src/lib/supabase/client.ts` | Supabase browser client |
| `apps/web/src/lib/supabase/middleware.ts` | Supabase session refresh |
| `apps/web/src/app/api/v1/profile/route.ts` | Moves to Fastify |

### 6.2 Rewrite

| File | Change |
|---|---|
| `packages/database/src/index.ts`, `types.ts`, `repositories/*.ts` | Drizzle client, inferred types, `Ctx`-scoped repositories |
| `packages/core/src/auth/context.ts` | Takes `Ctx`/session instead of `ServerSupabaseClient` |
| `packages/core/src/profile/service.ts` | Repository injection, same rules |
| `packages/core/src/profile/completeness.ts` + test | `ProfileRow` type source changes only |
| `apps/web/src/lib/env.ts` | API URL instead of Supabase keys |
| `apps/web/src/proxy.ts` | Cookie-presence gate |
| `apps/web/src/app/login/page.tsx`, `features/auth/login-form.tsx` | Better Auth magic link |
| `apps/web/src/app/auth/confirm/route.ts` | Better Auth callback (or removed if verification is handled by the API) |
| `apps/web/src/app/auth/signout/route.ts` | Better Auth sign-out |
| `apps/web/src/app/(app)/layout.tsx`, `overview`, `career`, `settings` | API client |
| `apps/web/src/app/page.tsx` | Session check via API client |
| `apps/web/next.config.ts` | Rewrites to the API |
| `eslint.config.mjs` | Forbid `@careeros/database` and `pg` in `apps/web` |
| `tests/integration/rls.test.ts` | New provisioning, same assertions |
| `scripts/capture-screenshots.mjs` | Read `var/mail` instead of Mailpit |
| root `package.json`, `.env.example`, `.gitignore` | Scripts, env names, `var/` and `backups/` |
| `README.md`, `docs/{ARCHITECTURE,DATABASE,SECURITY,DEPENDENCIES,ROADMAP,IMPLEMENTATION_LOG}.md` | Align with the new runtime |

### 6.3 Keep unchanged

`apps/web/src/components/**`, `apps/web/src/features/career/**`, `apps/web/src/app/globals.css`,
all of `packages/validation`, all of `packages/ai`, `apps/web/src/app/icon.svg`,
`supabase/**` (archived), `docs/PHASE0_*`, `docs/PHASE1_REPORT.md`.

### 6.4 New

`apps/api/**` (~14 files), `packages/storage/**` (~4 files),
`packages/database/src/schema/**` (~7 files), `drizzle.config.ts`, `docker-compose.yml`,
`scripts/migrate-supabase-data.ts`, `scripts/check-port.mjs`,
`docs/{MIGRATION_AUDIT,LOCAL_FIRST_ARCHITECTURE,MIGRATION_PLAN,MIGRATION_LOG}.md`.

---

## 7. Dependencies

### Add

| Package | Version | Where | Purpose |
|---|---|---|---|
| `fastify` | 5.12.8 | api | HTTP server |
| `@fastify/cookie` | 11.1.5 | api | Better Auth cookies |
| `@fastify/helmet` | 13.2.0 | api | Security headers |
| `@fastify/rate-limit` | 11.2.2 | api | Abuse protection |
| `@fastify/cors` | 11.4.1 | api | Only if direct browser access is enabled (not needed with rewrites) |
| `better-auth` | 1.7.19 | api + web | Authentication |
| `@better-auth/drizzle-adapter` | 1.7.19 | api | Better Auth ↔ Drizzle |
| `drizzle-orm` | 0.45.4 | database, api | Queries |
| `drizzle-kit` | 0.31.11 | root (dev) | Migrations |
| `pg` | 8.23.1 | database, api | Driver (already a root dev dependency) |
| `pg-boss` | 12.38.1 | api | Background jobs |
| `pino` / `pino-pretty` | 10.4.0 / 13.2.0 | api | Structured logging |
| `tsx` | resolve at install | root (dev) | Run the API/worker in development |

### Remove

| Package | From |
|---|---|
| `@supabase/supabase-js` | `apps/web`, `packages/database` |
| `@supabase/ssr` | `apps/web`, `packages/database` |

### Keep as-is

`next`, `react`, `react-dom`, `zod`, `react-hook-form`, `tailwindcss`, `lucide-react`,
`class-variance-authority`, `clsx`, `tailwind-merge`, `typescript` (5.9.3), `eslint`,
`typescript-eslint`, `vitest`, `playwright`.

**Compatibility already checked:** Better Auth 1.7.19 peers are satisfied (`pg ^8`, `drizzle-orm
^0.45.2`, `next ^16`, `react ^19`, `vitest ^5`, `drizzle-kit >=0.31.4`). The adapter additionally
peers on `@better-auth/core` and `@better-auth/utils`; exact resolution is a Stage 0 output.

---

## 8. Security changes

| Area | Before | After |
|---|---|---|
| Browser secrets | Supabase anon key (public by design) | None — the browser holds only an opaque session cookie |
| Privileged credential | Service-role key (unused in web, reserved) | **Removed entirely** |
| DB exposure | PostgREST on `:54321` with RLS | No PostgREST; Postgres bound to `127.0.0.1:5432` |
| Authorization | RLS primary | Application layer primary + RLS defense-in-depth |
| Runtime DB role | `service_role` / `authenticated` (Supabase) | `careeros_app` (NOLOGIN-less, NOSUPERUSER, NOBYPASSRLS) |
| Migrations role | Supabase CLI (superuser) | `careeros_owner` |
| Document access | (none used) | HMAC-signed, 5-minute URLs; path-traversal hardened |
| Sessions | Supabase JWT cookie | Better Auth opaque session token, `HttpOnly`, `SameSite=Lax` |
| Rate limiting | Supabase Auth defaults only | `@fastify/rate-limit` global + stricter auth routes |
| Logging | Next/undici defaults | pino with redaction of cookies, tokens, magic-link URLs |
| CSRF | SameSite cookies | SameSite + `Origin` check on cookie-authenticated mutations |

**Net security assessment:** application authorization becomes *more* explicit and testable than
RLS alone, and no privileged key exists anywhere in the browser path. Two documented reductions:
`auth.*` and `pgboss.*` are not under RLS, and the Next layer gates on cookie presence rather than
validating the session (the API remains authoritative). Both are recorded as accepted trade-offs.

---

## 9. Testing strategy

### 9.1 Preserved

- `packages/ai` — 19 tests, untouched.
- `packages/core` completeness — 4 tests, one type change.

### 9.2 Rewritten

`tests/integration/rls.test.ts` → `tests/integration/tenancy.test.ts`:
creates users through the new provisioning path (no GoTrue admin API), then asserts:
own-workspace visibility, foreign rows invisible, foreign update affects 0 rows, foreign insert
raises `42501`, no-claim session sees nothing, and **RLS still blocks when the application filter is
deliberately removed** (proves defense-in-depth is real).

### 9.3 New

| Suite | Purpose |
|---|---|
| `tests/integration/auth.test.ts` | Magic-link request → token → verify → session cookie; single-use token; expiry |
| `tests/integration/provisioning.test.ts` | Exactly one workspace/membership/profile; concurrent signups safe; lazy fallback |
| `tests/integration/api-profile.test.ts` | 401/400/200/PATCH round trip; validation issues; cross-tenant 404 |
| `tests/integration/storage.test.ts` | Traversal, signature expiry, tamper, content type, size cap |
| `tests/integration/jobs.test.ts` | Singleton enqueue, retry, tenant context on execution |
| `tests/integration/migration.test.ts` | Post-copy counts, FK integrity, migrated user can sign in |
| `tests/e2e/phase1.spec.ts` | Playwright through the proxy: login → overview → edit → reload |

### 9.4 Definition of "migration complete"

1. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all green.
2. No `@supabase/*` package in any `package.json`; no Supabase import survives in code.
3. The app runs with the Supabase stack **stopped**.
4. Migrated user signs in and sees the migrated profile.
5. Tenancy suite green, including the "remove the app filter" proof.
6. Backup verified and retained; `MIGRATION_LOG.md` records counts and hashes.
7. Documentation updated; Supabase files archived but present.

---

## 10. Rollback plan

| Point of failure | Rollback |
|---|---|
| Stage 0 spike fails | Delete the spike branch; nothing in `main` changed |
| New schema/provisioning is wrong | `supabase start`; point `apps/web/.env.local` back; old stack untouched |
| Data copy produces a mismatch | Drop and recreate the **new** database (never the Supabase volume); re-run from the verified dump |
| API/UI cutover is broken | Revert the Stage 7 commit; the old Supabase-backed frontend still works until Stage 11 |
| Post-cutover defect | Restore from `backups/2026-11-10-pre-migration.dump` into a fresh database |

The critical safety property: **the Supabase volume is read-only from our side and is never modified
or deleted**, so the old system remains a complete fallback until Stage 11 is separately approved.

---

## 11. Risks

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| M1 | Better Auth's runtime behaviour differs from the docs | High | Stage 0 gate before any app change |
| M2 | RLS context wrapper is forgotten somewhere | High | Repositories accept only a transaction-scoped handle; the tenancy test proves RLS blocks independently |
| M3 | `databaseHooks` provisioning gap (user committed, workspace missing) | Medium | Advisory-lock provisioning + lazy fallback + dedicated test |
| M4 | Drizzle cannot express a trigger/policy/CHECK | Medium | Hand-written SQL migration files alongside generated ones |
| M5 | Existing data lost during copy | High | Verified dump + scratch restore + transactional copy with assertions |
| M6 | Cookie/session behaviour breaks through the proxy | Medium | Same-origin rewrites chosen specifically to avoid this; E2E covers it |
| M7 | pg-boss needs DDL rights the app role lacks | Low | Separate owner-role pool for the boss |
| M8 | Windows path handling in local storage | Medium | Canonicalisation + traversal tests |
| M9 | Migration scope creep into Phase 2 | Medium | Stage list fixed; Phase 2 remains blocked until acceptance tests pass |
| M10 | Two dev stacks running concurrently confuses ports/data | Low | Distinct ports/volumes, preflight port check, explicit env switch |

---

## 12. Decisions required before implementation

| ID | Decision | Recommendation |
|---|---|---|
| **D1** | Browser → API: same-origin rewrites, or direct CORS with cross-origin cookies? | **Same-origin rewrites.** Removes CORS/CSRF/cookie-domain complexity and mirrors a self-hosted reverse proxy |
| **D2** | Keep RLS as defense-in-depth, or rely on application authorization only? | **Keep RLS**, enforced through `withTenantTx`. It is the only thing that catches a forgotten filter |
| **D3** | Better Auth tables in `auth` schema, with `public.users` kept as the app record? | **Yes.** Preserves UUIDs and the existing schema shape |
| **D4** | pg-boss inside the API process, or a separate worker process? | **Inside by default** (`RUN_JOBS=true`), with `worker.ts` available; split when load justifies it |
| **D5** | Magic-link email transport for local-first use? | **File mailbox** in `var/mail` (dev) with an optional SMTP transport later. No external service required |
| **D6** | PostgreSQL host port | **5432** (verified free) with a preflight check and a documented 55432 fallback |
| **D7** | Data migration approach | **Fresh database + verified copy.** Cleanest break from Supabase schemas |
| **D8** | When to archive/remove `supabase/` and its volumes | **Not before Phase 2 sign-off.** Files stay; volumes untouched until separately approved |
| **D9** | Should the migration also introduce the approval/immutability tables now? | **No.** They belong to Phase 4; migrating them early would create untested objects. The schema design is preserved |

---

## 13. Approval checklist

- [ ] Audit accepted (`docs/MIGRATION_AUDIT.md`)
- [ ] Target architecture accepted (`docs/LOCAL_FIRST_ARCHITECTURE.md`)
- [ ] D1–D9 answered
- [ ] Stage 0 spike approved as the first action (it creates a throwaway branch only)
- [ ] Backup-and-verify procedure approved
- [ ] Acceptance criteria in §9.4 accepted as the definition of "migration complete"
- [ ] Explicit confirmation that Phase 2 remains blocked until then

Once approved, I will execute Stage 0 first and report its result before proceeding to Stage 1.

---

## 14. Current repository state

No application code was changed while producing this plan. The only additions are this document and
its two companions. The Supabase stack is still running, the data is untouched, and the git working
tree contains no modifications to tracked source files.
