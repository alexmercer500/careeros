# Supabase Dependency & Migration Impact Audit

**Date:** 2026-11-10
**Scope:** the Phase 1 implementation as committed at `f00a2f5`
**Method:** direct inspection of the working tree, database metadata, Docker state, and the live
database — not recollection of the design documents.

> This is a read-only audit. Nothing was changed. No Docker volume was touched. The Supabase stack
> was left running and untouched.

---

## 0. Headline numbers

| Measure | Value |
|---|---|
| Tracked files | 110 |
| Source files importing a Supabase package or the Supabase-shaped `@careeros/database` API | **13** |
| Files calling `createClient(` (the Supabase client factory) | **13 call sites across 12 files** |
| Direct `.from(...)` query call sites | **4** (all inside `packages/database`) |
| Supabase Storage API call sites | **0** |
| Supabase-specific database objects | 12 RLS policies, 2 helper functions, 1 trigger on `auth.users`, 2 grants |
| Tables holding data | 4 (`users`, `workspaces`, `workspace_members`, `career_profiles`) |
| Rows of real data | 1 user, 1 workspace, 1 membership, 1 profile |
| Supabase Docker containers | 12 running |
| Supabase Docker volumes | 3 (`supabase_db_careeros`, `supabase_storage_careeros`, `supabase_edge_runtime_careeros`) |
| Existing migration files | 1 (`supabase/migrations/0001_phase1_foundation.sql`, 292 lines) |
| Tests | 34 (19 AI, 4 completeness, 11 RLS) |

The coupling is **narrow and shallow**. Supabase is concentrated in the auth/session layer, one
client factory package, and the RLS policies. There is no Storage usage and no Edge Function usage,
so the two hardest parts of a typical Supabase migration do not exist here.

---

## 1. All Supabase dependencies

### 1.1 Packages

| Package | Version | Declared in | Used by |
|---|---|---|---|
| `@supabase/supabase-js` | 2.119.0 | `apps/web/package.json`, `packages/database/package.json` | `packages/database` (types, client generics), `apps/web` (transitively + `EmailOtpType` import) |
| `@supabase/ssr` | 0.12.7 | `apps/web/package.json`, `packages/database/package.json` | `packages/database/src/{server,browser}.ts`, `apps/web/src/lib/supabase/middleware.ts` |

No other Supabase package is installed. There is no `supabase-js` usage in `packages/core`,
`packages/validation`, `packages/ai`, or `packages/core` tests beyond the repository interface types.

### 1.2 Local infrastructure

| Artefact | Detail |
|---|---|
| Supabase CLI | 3.1.0, installed globally via npm |
| Containers | `supabase_db_careeros`, `supabase_auth_careeros`, `supabase_kong_careeros`, `supabase_rest_careeros`, `supabase_storage_careeros`, `supabase_inbucket_careeros`, `supabase_realtime_careeros`, `supabase_studio_careeros`, `supabase_pg_meta_careeros`, `supabase_edge_runtime_careeros`, `supabase_analytics_careeros`, `supabase_vector_careeros` |
| Volumes | `supabase_db_careeros`, `supabase_storage_careeros`, `supabase_edge_runtime_careeros` |
| Config | `supabase/config.toml` (442 lines) — ports 54321/54322/54323/54324, `site_url`, redirect allow-list, magic-link template |
| Template | `supabase/templates/magic_link.html` (uses `{{ .TokenHash }}`) |

The database itself contains Supabase-owned schemas: `auth`, `storage`, `realtime`, `graphql`,
`graphql_public`, `extensions`. These are what make the current database 12 MB for four rows of data.

---

## 2. Imports of Supabase client libraries

Exact import sites (file:line):

| File | Line | Import |
|---|---|---|
| `apps/web/src/app/auth/confirm/route.ts` | 2 | `import type { EmailOtpType } from "@supabase/supabase-js"` |
| `apps/web/src/lib/supabase/client.ts` | 1 | `import { createBrowserSupabaseClient } from "@careeros/database"` |
| `apps/web/src/lib/supabase/server.ts` | 2 | `import { createServerSupabaseClient } from "@careeros/database"` |
| `apps/web/src/lib/supabase/middleware.ts` | 1 | `import { createServerClient } from "@supabase/ssr"` |
| `packages/core/src/auth/context.ts` | 1 | `import { listMemberships, type ServerSupabaseClient, type WorkspaceRole } from "@careeros/database"` |
| `packages/core/src/profile/service.ts` | 7 | repository functions + `ServerSupabaseClient` from `@careeros/database` |
| `packages/core/src/profile/completeness.ts` | 1 | `import type { ProfileRow } from "@careeros/database"` |
| `packages/core/src/profile/completeness.test.ts` | 2 | `import type { ProfileRow } from "@careeros/database"` |
| `packages/database/src/browser.ts` | 1 | `import { createBrowserClient } from "@supabase/ssr"` |
| `packages/database/src/server.ts` | 1–2 | `import { createServerClient } from "@supabase/ssr"`, `type { CookieOptions }` |
| `apps/web/src/lib/env.ts` | — | reads `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `apps/web/src/proxy.ts` | 2 | delegates to `updateSession` (Supabase middleware helper) |
| `tests/integration/rls.test.ts` | — | calls GoTrue admin API `/auth/v1/admin/users` |

**Structural observation:** the only real coupling to Supabase inside `packages/core` is through the
`ServerSupabaseClient` type and repository function signatures. The domain rules themselves
(completeness, validation, error mapping) have no Supabase knowledge. That is why the domain layer
survives the migration nearly unchanged.

---

## 3. Supabase authentication references

| Concern | Location | Behaviour today |
|---|---|---|
| Magic-link request | `apps/web/src/features/auth/login-form.tsx` | `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })` |
| Token verification | `apps/web/src/app/auth/confirm/route.ts` | `verifyOtp({ type, token_hash })` **or** `exchangeCodeForSession(code)` |
| Session read | `apps/web/src/app/(app)/layout.tsx`, `page.tsx`, `login/page.tsx`, `auth/signout/route.ts`, `packages/core/src/auth/context.ts` | `supabase.auth.getUser()` |
| Session refresh | `apps/web/src/lib/supabase/middleware.ts` + `proxy.ts` | `createServerClient` cookie `getAll`/`setAll`, `getUser()` per request |
| Sign-out | `apps/web/src/app/auth/signout/route.ts` | `supabase.auth.signOut()` |
| Browser client | `apps/web/src/lib/supabase/client.ts` | `createBrowserClient` singleton |
| Server client | `apps/web/src/lib/supabase/server.ts` | `createServerSupabaseClient` with a Next `cookies()` adapter |
| Provisioning | DB trigger `handle_new_user()` on `auth.users` | Creates `public.users` → workspace → owner membership → empty profile |
| Type coupling | `auth/confirm/route.ts` | `EmailOtpType` union from the Supabase SDK |

**Critical auth-specific coupling to remove:** the signup trigger lives on `auth.users`, a table that
exists only because Supabase owns the `auth` schema. Removing Supabase removes that table and
therefore the trigger, so provisioning must move into application code.

---

## 4. All database access code

### 4.1 Query sites (only 4)

| File | Operation |
|---|---|
| `packages/database/src/repositories/profiles.ts` | `career_profiles.select(*).eq(workspace_id).maybeSingle()` |
| `packages/database/src/repositories/profiles.ts` | `career_profiles.update(patch).eq(workspace_id).select(*).single()` |
| `packages/database/src/repositories/workspaces.ts` | `workspace_members.select(workspace_id, role).order(created_at)` |
| `packages/database/src/repositories/workspaces.ts` | `workspaces.select(id, name).eq(id).single()` |

Every query filters by `workspace_id` **and** relies on RLS as the second layer.

### 4.2 Query callers

`packages/core/src/profile/service.ts` (`loadProfile`, `saveProfile`) and
`packages/core/src/auth/context.ts` (`resolveWorkspaceContext`). These are the only two services that
touch data today. Pages and route handlers call those services; **no React component contains a SQL
or Supabase query**.

### 4.3 Generated types

`packages/database/src/database.types.ts` (11 KB) is produced by `supabase gen types typescript`.
It is Supabase-CLI-generated and must be replaced by Drizzle-inferred types.

---

## 5. Supabase Storage usage

**None.** A full-tree search for `.storage.` and `from('storage')` returns **zero** matches.

- No buckets are defined in `config.toml`.
- No upload, download, signed-URL, or object-policy code exists.
- Phase 1 deliberately did not create storage buckets.

**Impact:** the storage migration is a *greenfield design task* (local filesystem adapter), not a data
migration. No objects need copying. This is the single biggest scope reduction in the whole effort.

---

## 6. RLS policies and their dependencies

All policies live in `supabase/migrations/0001_phase1_foundation.sql`.

| Table | Policies | Names |
|---|---|---|
| `users` | 2 | `users_select_self`, `users_update_self` |
| `workspaces` | 2 | `workspaces_select_member`, `workspaces_update_admin` |
| `workspace_members` | 4 | `..._select`, `..._insert_admin`, `..._update_admin`, `..._delete_admin` |
| `career_profiles` | 4 | `..._select_member`, `..._insert_member`, `..._update_member`, `..._delete_member` |

Supporting objects:

| Object | Kind | Supabase dependency |
|---|---|---|
| `public.is_workspace_member(uuid)` | `security definer` SQL function | Calls `auth.uid()` |
| `public.workspace_role_of(uuid)` | `security definer` SQL function | Calls `auth.uid()` |
| `public.set_updated_at()` | trigger function | none |
| `public.handle_new_user()` | trigger function | Reads `new.raw_user_meta_data`; attached to `auth.users` |
| `grants` | privileges | `authenticated`, `service_role` roles are Supabase-managed |
| `auth.uid()` | Supabase built-in | **The one unavoidable substitution** — reads the JWT claim that PostgREST injects |

**Assessment:** the policy *logic* is portable. Only `auth.uid()` and the `authenticated` /
`service_role` role names are Supabase-specific. A local replacement (`current_user_id()` reading
`request.jwt.claims`) preserves every policy almost verbatim. The `handle_new_user` trigger cannot be
ported because its parent table disappears — hence application-level provisioning.

**Important:** no `match_assessments`, `approvals`, `document_versions`, `application_documents`, or
`audit_logs` tables exist yet. The approval/immutability invariants are *documented* in
`docs/DATABASE.md` but **not implemented in the database**. So there is no approval-related RLS or
trigger to migrate — but the design must be preserved for Phase 4.

---

## 7. API routes coupled to Supabase

| Route | Coupling |
|---|---|
| `GET /api/v1/profile` | builds a server Supabase client → `loadProfile` |
| `PATCH /api/v1/profile` | same → `saveProfile` |
| `GET /auth/confirm` | `verifyOtp` / `exchangeCodeForSession` |
| `POST /auth/signout` | `signOut` |
| Everything else (`/overview`, `/career`, `/settings`, `/login`, `/`) | Server Components calling `createClient()` directly |

There are **no other API routes**. The `/api/v1` surface is one endpoint today.

---

## 8. Existing database migrations

| File | Lines | Contents |
|---|---|---|
| `supabase/migrations/0001_phase1_foundation.sql` | 292 | enum `workspace_role`; 4 tables; 3 `updated_at` triggers; 2 security-definer helpers; `handle_new_user()` + trigger on `auth.users`; grants; RLS enablement; 12 policies |
| `supabase/seed.sql` | 6 | comment only — deliberately no business data |
| `supabase/config.toml` | 442 | local stack configuration |

Applied and verified: `supabase migration list` shows `0001` in both Local and Local DB.

**Migration impact:** the SQL is *mostly* reusable, but it is not a Drizzle migration and must not be
applied as-is to the new database because it references `auth.users` and Supabase roles. It will be
preserved untouched as the historical record and re-expressed as a Drizzle schema + initial
migration.

---

## 9. Existing environment variables

From `.env.example` and `apps/web/.env.local` (values never printed):

| Variable | Used by | Fate after migration |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | web, middleware, env validation | **Remove** → replaced by `NEXT_PUBLIC_API_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web, middleware | **Remove** |
| `SUPABASE_SERVICE_ROLE_KEY` | unused in Phase 1 code (reserved for workers) | **Remove** — no service-role concept remains |
| `NEXT_PUBLIC_SITE_URL` | auth redirects | Keep (rename to `APP_URL` optionally) |
| `DATABASE_URL` | integration tests | **Keep**, pointed at the new Postgres |
| `AI_PROVIDER`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL_MAP` | AI package config | Keep unchanged |

New variables required: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `API_PORT`, `CLIENT_ORIGIN`,
`CAREEROS_STORAGE_ROOT`, `STORAGE_SIGNING_SECRET`, `DATABASE_URL_APP` (least-privileged runtime role),
`DATABASE_URL_MIGRATE` (owner role), `RUN_JOBS`.

---

## 10. Existing tests and coverage

| Suite | Tests | Supabase dependency | Fate |
|---|---|---|---|
| `packages/ai/src/providers.test.ts` | 19 | none | **Unchanged** — no Supabase, no DB |
| `packages/core/src/profile/completeness.test.ts` | 4 | type-only (`ProfileRow`) | Small type update; assertions unchanged |
| `tests/integration/rls.test.ts` | 11 | **heavy** — GoTrue admin API to create users, direct SQL for claims | **Rewrite**; the RLS assertions themselves survive |

Coverage summary: domain helpers and the AI adapter are well covered; auth, HTTP contracts, and
provisioning are covered only indirectly through the browser script. The RLS suite is the only test
that exercises tenancy, and it depends on Supabase's admin API in `beforeAll`.

The Playwright script (`scripts/capture-screenshots.mjs`) also depends on Supabase: it reads the
magic-link email from Mailpit at `127.0.0.1:54324` and expects the `token_hash` URL shape.

---

## 11. Impact matrix

| Area | Files affected | Change type | Risk |
|---|---|---|---|
| Supabase client plumbing | 3 (`apps/web/src/lib/supabase/*`) | delete + replace | Low |
| Auth UI + routes | 5 (`login-form`, `login/page`, `auth/confirm`, `auth/signout`, `page.tsx`) | rewrite | Medium — cookie/session semantics change |
| Data-bearing pages | 4 (`(app)/layout`, `overview`, `career`, `settings`) | switch to API client | Low |
| Web API route | 1 (`api/v1/profile/route.ts`) | delete (moves to Fastify) | Low |
| Database package | 6 files + generated types | full rewrite on Drizzle | Medium |
| Core domain | 3 (`auth/context`, `profile/service`, `completeness` types) | signature changes | Low — rules unchanged |
| Validation | 0 | none | None |
| AI package | 0 | none | None |
| UI components | 0 | none | None |
| Shell/middleware | `proxy.ts`, `next.config.ts`, `eslint.config.mjs` | update | Medium — route gating |
| Infra | root `package.json`, `.env.example`, `.gitignore`, new `docker-compose.yml` | update | Low |
| Database objects | migration + RLS policies | re-express | Medium — must not weaken |
| Tests | 1 rewrite, 1 type tweak, rest unchanged | update | Medium |
| Docs | 9 files | update after approval | Low |

---

## 12. What makes this migration smaller than it looks

1. **Zero Storage usage** — no objects, no buckets, no signed URLs.
2. **Four tables, four rows** — the data copy is trivial and fully verifiable.
3. **Only 4 query sites** — repositories are a thin layer by design.
4. **No direct DB access in UI** — the Phase 1 layering rule already isolates the change.
5. **AI, validation, UI components, and domain rules are Supabase-free.**
6. **No workers, no queues, no document engine yet** — pg-boss and storage can be introduced cleanly
   rather than retrofitted.

## 13. What is genuinely load-bearing and must not be lost

1. **Tenant scoping is currently enforced twice** (application filter + RLS). The migration must not
   silently drop to one layer.
2. **The signup provisioning transaction** guarantees every user has exactly one workspace and one
   profile. Moving it into an `after` hook introduces a failure window that must be covered.
3. **Server-side magic-link verification** works cross-device. Better Auth's magic link must keep that
   property (no PKCE-only flow).
4. **`auth.uid()` semantics** are the basis of all 12 policies.
5. **The approval invariants** are not implemented yet — they carry forward as design requirements,
   and the local architecture must leave room for them (transactional approval consumption,
   `SECURITY DEFINER` helpers, immutability triggers).
