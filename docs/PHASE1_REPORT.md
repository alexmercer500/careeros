# CareerOS — Phase 1 Completion Report

**Date:** 2026-11-10
**Status:** Phase 1 complete — stopped for review, Phase 2 not started
**Scope delivered:** Next.js app, strict TypeScript, Tailwind + UI primitives, local Supabase stack,
magic-link authentication, workspace/user architecture, Phase 1 migrations, RLS, dashboard shell,
career profile CRUD foundation, AI provider abstraction.

**Decisions applied:** local Docker Supabase (no cloud credentials), passwordless auth, no
TokenHarbor use, git baseline preserved, Phase 1 tables only.

---

## 1. Project folder structure

```
careeros/
├─ apps/
│  └─ web/                                  Next.js 16 App Router (deployable)
│     ├─ src/
│     │  ├─ app/
│     │  │  ├─ (app)/                       authenticated area
│     │  │  │  ├─ layout.tsx                session + workspace gate, app shell
│     │  │  │  ├─ overview/page.tsx         dashboard
│     │  │  │  ├─ career/page.tsx           profile CRUD
│     │  │  │  ├─ resume-studio/page.tsx    placeholder (Phase 4)
│     │  │  │  ├─ jobs/page.tsx             placeholder (Phase 3)
│     │  │  │  ├─ applications/page.tsx     placeholder (Phase 4)
│     │  │  │  ├─ analytics/page.tsx        placeholder (Phase 6)
│     │  │  │  ├─ integrations/page.tsx     placeholder (Phase 5)
│     │  │  │  └─ settings/page.tsx         read-only account facts
│     │  │  ├─ api/v1/profile/route.ts      GET + PATCH profile
│     │  │  ├─ auth/confirm/route.ts        server-side magic-link verification
│     │  │  ├─ auth/signout/route.ts        POST sign-out
│     │  │  ├─ login/page.tsx
│     │  │  ├─ layout.tsx, page.tsx, globals.css, icon.svg
│     │  ├─ components/                     app shell + shadcn-style primitives
│     │  ├─ features/                       auth/, career/
│     │  ├─ lib/                            env, supabase clients, api error mapping, cn
│     │  └─ proxy.ts                        session refresh + route gate
│     ├─ next.config.ts, postcss.config.mjs, tsconfig.json, package.json
│     └─ .env.local                         generated locally, git-ignored
├─ packages/
│  ├─ validation/                           Zod schemas (profile, email, field issues)
│  ├─ database/                             clients, generated types, repositories
│  ├─ core/                                 workspace context, profile service, errors, completeness
│  └─ ai/                                   provider contract, OpenAI-compatible, mock, fixture, registry
├─ supabase/
│  ├─ migrations/0001_phase1_foundation.sql
│  ├─ templates/magic_link.html
│  ├─ config.toml                           committed (portable to cloud)
│  └─ seed.sql                              intentionally no business data
├─ tests/integration/rls.test.ts
├─ scripts/                                 db-inspect.mjs, capture-screenshots.mjs
├─ docs/                                    Phase 0 docs + this report + screenshots
├─ eslint.config.mjs, vitest.config.ts, tsconfig.base.json, tsconfig.tests.json
├─ pnpm-workspace.yaml, package.json, pnpm-lock.yaml
└─ README.md
```

Deliberately **not** created yet: `apps/workers`, `packages/document-engine`,
`packages/shared-types`, `packages/config`. The roadmap's rule is to create a directory when its
first real file lands, not to mirror a tree.

---

## 2. Files created and modified

**Created: 51 source/config files** (excluding lockfile, generated types and ignored files).

| Area | Files |
|---|---|
| Root config | `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `tsconfig.tests.json`, `vitest.config.ts`, `eslint.config.mjs`, `.env.example`, `.gitignore` (baseline), `README.md` |
| Web app | 24 files under `apps/web/src` + `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `package.json` |
| Packages | 20 files across `validation`, `database`, `core`, `ai` |
| Database | `supabase/migrations/0001_phase1_foundation.sql`, `supabase/seed.sql`, `supabase/templates/magic_link.html`, `supabase/config.toml` |
| Tests | `tests/integration/rls.test.ts` |
| Scripts | `scripts/db-inspect.mjs`, `scripts/capture-screenshots.mjs` |
| Docs | this report, `docs/screenshots/*` (7 images + capture log) |

**Modified existing files:** none. The Phase 0 documents and the master spec are byte-identical to
the baseline commit.

**Generated, not hand-written:** `packages/database/src/database.types.ts` (from
`supabase gen types`), `pnpm-lock.yaml`.

---

## 3. Installed dependencies and versions

All versions are exact pins; `pnpm-lock.yaml` is committed.

### Runtime — `apps/web`

| Package | Version |
|---|---|
| `next` | 16.4.6 |
| `react` | 19.3.1 |
| `react-dom` | 19.3.1 |
| `@supabase/supabase-js` | 2.119.0 |
| `@supabase/ssr` | 0.12.7 |
| `zod` | 4.6.7 |
| `react-hook-form` | 7.91.0 |
| `tailwindcss` | 4.3.5 |
| `@tailwindcss/postcss` | 4.3.5 |
| `lucide-react` | 1.71.0 |
| `class-variance-authority` | 0.7.1 |
| `clsx` | 2.1.1 |
| `tailwind-merge` | 3.7.0 |
| `@types/react` / `@types/react-dom` | 19.3.0 |

### Workspace packages

| Package | Dependencies |
|---|---|
| `@careeros/validation` | `zod` 4.6.7 |
| `@careeros/database` | `@supabase/supabase-js` 2.119.0, `@supabase/ssr` 0.12.7 |
| `@careeros/core` | workspace deps only |
| `@careeros/ai` | `zod` 4.6.7 |

### Root dev tooling

| Package | Version |
|---|---|
| `typescript` | **5.9.3** (the approved pin; `latest` is 7.0.2 but breaks typed linting) |
| `eslint` | 10.14.0 |
| `@eslint/js` | 10.0.1 |
| `typescript-eslint` | 8.72.2 |
| `vitest` | 5.1.0 |
| `pg` / `@types/pg` | 8.23.1 |
| `@types/node` | 26.6.6 |
| `playwright` | 1.65.0 |

### Deliberately not installed in Phase 1

`ai` / `@ai-sdk/openai` (the adapter is dependency-free `fetch`), `@tanstack/react-table`
(no tables yet), `zustand` (no shared client state yet), `shadcn` CLI (primitives authored
in-repo, which is how shadcn works), `turbo` (single deployable — see §12 D-3).

---

## 4. Supabase local startup verification

Command: `supabase start` (Supabase CLI 3.1.0, Docker Desktop 29.7.2).

| Service | Endpoint | Status |
|---|---|---|
| API (Kong) | `http://127.0.0.1:54321` | up |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` | up |
| Studio | `http://127.0.0.1:54323` | up |
| Mailpit (mail viewer) | `http://127.0.0.1:54324` | up |
| Auth (GoTrue) | `/auth/v1` on 54321 | up, health 200 |
| Storage, REST, Realtime, pg_meta, edge runtime, analytics, vector | internal | up |

Containers observed: `supabase_db_careeros`, `supabase_auth_careeros`, `supabase_kong_careeros`,
`supabase_rest_careeros`, `supabase_storage_careeros`, `supabase_inbucket_careeros`,
`supabase_realtime_careeros`, `supabase_studio_careeros`, `supabase_pg_meta_careeros`,
`supabase_edge_runtime_careeros`, `supabase_analytics_careeros`, `supabase_vector_careeros`.

Additional verification:

- `config.toml` is committed with `site_url = http://localhost:3001` and
  `additional_redirect_urls` for `/auth/confirm`, so the project remains portable to a cloud project.
- The unrelated `hikkari-*` Postgres/Redis/pgbouncer stack was **not** touched. All CareerOS services
  use their own volumes and the Supabase default ports.
- Local keys are generated by the stack into `apps/web/.env.local` (git-ignored). No credential was
  requested from any external source.

---

## 5. Database migration results

Applied with `supabase db reset` → `Applying migration 0001_phase1_foundation.sql` →
`Finished supabase db reset`.

`pnpm db:inspect` output:

```
TABLES
  career_profiles        rls=true
  users                  rls=true
  workspace_members      rls=true
  workspaces             rls=true

POLICIES
  career_profiles        4
  users                  2
  workspace_members      4
  workspaces             2

TRIGGERS
  career_profiles        career_profiles_updated_at
  users                  users_updated_at
  workspaces             workspaces_updated_at
```

Plus an `on_auth_user_created` trigger on `auth.users` (not listed because it lives in the `auth`
schema) and the two `security definer` helpers `is_workspace_member` / `workspace_role_of`.

What the migration contains:

- 4 tables only — `users`, `workspaces`, `workspace_members`, `career_profiles`. Later-phase tables
  were **not** created merely because they exist in the design.
- `unique (id, workspace_id)` on `career_profiles`, the target that later composite foreign keys will
  use to make cross-workspace references physically impossible.
- Signup trigger creating user → workspace → owner membership → empty profile in one transaction.
- RLS enabled on all four tables, with deny-by-default posture.
- Explicit grants for `authenticated` and `service_role`.
- `updated_at` triggers.
- `seed.sql` deliberately inserts no business data.

Full design reference remains `docs/DATABASE.md`; the scoring, approval and immutability objects are
documented there but intentionally absent from the database until their phases.

---

## 6. Authentication verification

Performed end-to-end by `pnpm screenshots` (Playwright, real browser, real email):

| Step | Observed |
|---|---|
| Unauthenticated `/` | redirects to `/login` |
| Login form submit | Supabase sends a magic-link email |
| Email received | yes (Mailpit), custom template with `token_hash` |
| Link opened | `/auth/confirm` verifies the token **server-side** |
| Post-verification | redirected to `/overview` with a session cookie |
| Signup provisioning | one workspace, one `owner` membership, one empty profile created by trigger |
| Profile save | `Profile saved.` |
| Reload | `Ratnesh Sahu` still present — persisted through Postgres under RLS |
| Console errors | 0 |

Evidence: `docs/screenshots/capture-log.txt`.

Implementation details:

- `@supabase/ssr` cookie sessions, refreshed in `apps/web/src/proxy.ts` (Next 16 renamed
  `middleware` → `proxy`).
- Two verification shapes accepted: `token_hash` + `type` (custom template, works cross-device) and
  `code` (PKCE exchange, Supabase's default redirect). Both are handled server-side.
- Passwordless by design; `enable_confirmations = false` because the magic link itself proves address
  ownership. The config comment records exactly what must change to add password auth later.
- Post-auth redirect targets are validated to same-origin paths, so `next=` cannot be used as an open
  redirect.

---

## 7. RLS test results

`pnpm test` → `tests/integration/rls.test.ts` — 11 tests, all passing, against the real database.

The suite creates two real auth users through the GoTrue admin API (so the signup trigger actually
runs), then evaluates every query as the `authenticated` role with a JWT claim subject — the same
path Postgres uses for a real request.

| Test | Result |
|---|---|
| RLS enabled on every application table | pass |
| Signup creates exactly one workspace / owner membership / profile | pass |
| User sees only their own workspace | pass |
| User sees only their own profile | pass |
| User sees only their own membership | pass |
| Update aimed at another workspace affects 0 rows | pass |
| Insert targeting another workspace raises `42501` | pass |
| Update to another user's account row affects 0 rows | pass |
| Non-owner cannot insert a membership (`42501`) | pass |
| User can update their own profile (1 row) | pass |
| No session subject → 0 rows | pass |

Cross-check: `get_diagnostics`-style assertion `select ... where relrowsecurity = false` returns no
rows, so no application table is unprotected.

---

## 8. TypeScript check results

`pnpm typecheck` → **pass**, 6 projects:

```
packages/validation  Done
packages/database    Done
packages/ai          Done
packages/core        Done
apps/web             Done
tests (tsconfig.tests.json)  Done
```

Configuration: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`,
`noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, `isolatedModules`, `moduleResolution: Bundler`.
TypeScript is pinned to **5.9.3** (not 7.0.2 — see `docs/DEPENDENCIES.md` §4.1).

---

## 9. Lint results

`pnpm lint` → **pass, 0 errors, 0 warnings** after the final config addition.

ESLint 10 flat config with `@eslint/js` + `typescript-eslint` recommended. Custom rules:

- `@typescript-eslint/consistent-type-imports` (type-only imports).
- `no-restricted-imports` forbidding any `@careeros/database/admin` import from the web app, so the
  service-role client can never reach the browser bundle.
- Node globals scoped to `.mjs` scripts only.

Three lint failures were found and fixed during the phase (missing Node globals in scripts, an unused
catch binding, an untyped mock). No rule was disabled to make lint pass.

---

## 10. Production build results

`pnpm build` → **success**.

```
▲ Next.js 16.4.6 (Turbopack)
✓ Compiled successfully in 3.5s
✓ Finished TypeScript in 2.7s
✓ Generating static pages (16/16)

Route (app)                    Type
ƒ /                            dynamic
○ /_not-found                  static
ƒ /analytics                   dynamic
ƒ /api/v1/profile              dynamic
ƒ /applications                dynamic
ƒ /auth/confirm                dynamic
ƒ /auth/signout                dynamic
ƒ /career                      dynamic
○ /icon.svg                    static
ƒ /integrations                dynamic
ƒ /jobs                        dynamic
ƒ /login                       dynamic
ƒ /overview                    dynamic
ƒ /resume-studio               dynamic
ƒ /settings                    dynamic
ƒ Proxy (Middleware)
```

No build warnings remain (the initial `middleware` deprecation was resolved by migrating to
`proxy.ts`).

---

## 11. Screenshots

In `docs/screenshots/` (1440×900 viewport, real data, no mock state):

| File | Shows |
|---|---|
| `01-login.png` | Passwordless sign-in screen |
| `02-login-link-sent.png` | "Check your inbox" state after requesting a link |
| `03-overview.png` | Dashboard: workspace, profile completeness 0%, module status |
| `04-career-empty.png` | My Career form before input |
| `05-career-saved.png` | Profile form after a successful save |
| `06-jobs-placeholder.png` | A clearly marked unimplemented module |
| `07-overview-after-profile.png` | Dashboard after save: 80% completeness, missing fields listed |

The screenshots were produced by driving the actual UI — including requesting the magic link and
opening the email — not by seeding the database or stubbing the session.

---

## 12. Design decisions made during implementation

Recorded here because they deviate from, or refine, the Phase 0 documents.

| ID | Decision | Reason |
|---|---|---|
| D-1 | Environment file lives at `apps/web/.env.local` | Next.js reads env files from the app directory, not the monorepo root. The first attempt failed with a 500 until this was fixed. Root `.env.example` documents it. |
| D-2 | `proxy.ts` instead of `middleware.ts` | Next.js 16 renamed the convention; the build emitted a deprecation warning otherwise. |
| D-3 | No Turborepo yet | The spec says to introduce Turborepo when multiple deployables exist. `pnpm -r` is sufficient for one app. |
| D-4 | AI adapter is dependency-free `fetch` | No Phase 1 AI calls are allowed, and the contract is provider-independent by design. `ai`/`@ai-sdk/openai` can be added behind the same interface in Phase 3 without touching callers. |
| D-5 | UI primitives authored in-repo instead of running the shadcn CLI | shadcn components are copied into the repo by design; this avoids CLI version drift against Next 16 / Tailwind 4 and keeps the dependency set pinned. |
| D-6 | React Hook Form without `@hookform/resolvers` | Zod validates on submit; avoids a resolver-version dependency on Zod 4 in the first phase. |
| D-7 | `enable_confirmations = false`, custom `token_hash` template | With confirmations on, Supabase sends the *signup confirmation* template (PKCE `code`) instead of the magic-link template. Passwordless sign-in verifies the address anyway; the config records what to change before adding passwords. |
| D-8 | Migration `0001` amended before release for workspace naming | The email local-part is no longer used as the workspace title (it leaked the address onto every page). Amending is safe here because nothing is deployed; from Phase 2 onward changes are additive migrations. |
| D-9 | No service-role client in the web app | Removes an entire class of leak risk. Provisioning happens in a `security definer` trigger instead. The lint rule is already in place for future admin code. |

---

## 13. Known issues and outstanding tasks

### Known issues

1. **Workspace cannot be renamed yet.** Every account gets "Personal workspace" (or "<name>'s
   workspace" if signup metadata includes a name). Renaming is Phase 7 admin work.
2. **Single workspace per user in the UI.** The schema, policies and trigger are multi-tenant;
   selecting between workspaces is deliberately not built.
3. **Profile completeness counts unverified fields.** The UI says so explicitly; verification states
   arrive in Phase 2, so completeness is not a proxy for trustworthiness.
4. **No rate limiting on `PATCH /api/v1/profile`.** Supabase Auth rate-limits sign-in; application
   routes need their own limiter in a later phase.
5. **No CI pipeline.** GitHub/mirror hosting was left open as decision D17 in Phase 0; all checks
   currently run locally via `pnpm check`.
6. **Playwright headless-shell binary incomplete.** `playwright install chromium` timed out; the
   screenshot script uses `channel: "chromium"` (the full build) instead. Purely a local tooling
   detail — no product impact.
7. **Dev server must run on port 3001.** Port 3000 is occupied by an unrelated process.
8. **One email template exists** (`magic_link`). Adding password auth requires a
   `[auth.email.template.confirmation]` block; noted in `supabase/config.toml`.
9. **URL fields accept any `http(s)` string.** No normalisation (e.g. adding a scheme) or
   reachability check — validation only rejects non-http(s) input.
10. **No error boundary pages** (`error.tsx` / `not-found.tsx`) beyond Next's defaults.

### Outstanding tasks (Phase 2)

Per `docs/ROADMAP.md`: experiences (with ownership scope), projects, skills, education,
certifications, achievements with evidence-based verification, career positioning profiles, job
preferences, resume upload and parsing into *proposed* facts, profile comparison, the guided
verification onboarding, and profile integrity tests.

Two inputs remain owner-provided before Phase 2 can produce a credible profile:

- Real employment facts (companies, designations, dates, projects).
- Which of the earlier performance metrics (27% / 25% / 30%) have evidence.

### Definition of Done check for Phase 1

| Criterion | Status |
|---|---|
| UI implemented for the phase scope | yes |
| Business logic outside components (`packages/core`) | yes |
| Database operations work against a real database | yes |
| Input validation (Zod) at the boundary | yes |
| Error, loading, empty states | yes (form feedback, placeholders, empty profile) |
| Authorization tested, including negative cases | yes (11 RLS tests) |
| Automated tests pass | yes (34) |
| Documentation updated | yes (this report, README, log) |
| `typecheck` / `lint` / `test` / `build` green | yes |
| Verified in the real dev environment | yes (screenshots, reload persistence) |

---

## 14. Recommendation

Phase 1 meets its exit gate: a new user can sign in, is provisioned a workspace and an empty profile,
can edit and persist profile data, and is provably unable to see another workspace's data.

Recommended next milestone: **Phase 2 — Career profile**, starting with the employment-record schema
and verification workflow, since every later document claim depends on it.

Awaiting review. No Phase 2 work has started.
