# CareerOS

Personal-first, SaaS-ready AI career management platform.

**Current state: Phase 1 complete** — authenticated, multi-tenant foundation with a career profile
CRUD shell. Every other module is a clearly marked placeholder. No AI provider is called and no
professional facts are pre-filled.

See `docs/PHASE1_REPORT.md` for the completion report and `docs/ARCHITECTURE.md` for the design.

---

## Prerequisites

| Tool | Version used | Notes |
|---|---|---|
| Node.js | 24.22.1 | `engines.node >= 22` |
| pnpm | 11.4.0 | pinned via `packageManager` |
| Docker Desktop | 29.7.2 | required by the local Supabase stack |
| Supabase CLI | 3.1.0 | `npm install -g supabase` (supported Windows method) |

## First run

```powershell
pnpm install

# 1. Start the local database/auth/storage stack (Docker)
supabase start

# 2. Create the app environment file from the local keys
#    Copy .env.example to apps/web/.env.local and fill in the values printed by:
supabase status

# 3. Apply migrations and seed
supabase db reset

# 4. Generate typed database definitions (after any migration change)
pnpm db:types

# 5. Run the app on http://localhost:3001
pnpm dev
```

Port 3001 is deliberate: port 3000 is occupied on this machine, and the Supabase project is
configured with `site_url = http://localhost:3001`.

### Signing in

Sign-in is passwordless. Enter an email address; the link is captured by the local mail server:

- Mail viewer: <http://127.0.0.1:54324>
- Supabase Studio: <http://127.0.0.1:54323>

Opening the emailed link verifies the token server-side at `/auth/confirm`. A personal workspace and
an empty career profile are provisioned automatically by a database trigger on first sign-in.

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Next.js dev server on port 3001 |
| `pnpm build` | Production build |
| `pnpm typecheck` | Strict TypeScript across all packages, apps and tests |
| `pnpm lint` | ESLint (flat config) |
| `pnpm test` | Unit tests + RLS integration tests |
| `pnpm check` | typecheck → lint → test → build |
| `pnpm db:start` / `db:stop` | Local Supabase stack |
| `pnpm db:reset` | Recreate the database and re-apply migrations |
| `pnpm db:types` | Regenerate `packages/database/src/database.types.ts` |
| `pnpm db:inspect` | Print tables, RLS flags, policy counts, triggers |
| `pnpm screenshots` | Drive the real sign-in flow and capture `docs/screenshots` |

## Layout

```
apps/web                 Next.js 16 App Router (the only deployable today)
packages/validation      Zod schemas shared by API and forms
packages/database        Supabase clients, generated types, repositories
packages/core            Domain logic (framework-free), workspace resolution, errors
packages/ai              Provider-agnostic adapter: OpenAI-compatible, mock, fixture
supabase/migrations      SQL — the single owner of the schema
tests/integration        RLS and cross-tenant tests against a real database
docs                     Architecture, database, security, plans, reports
```

Law of the codebase:

- UI never contains business rules.
- `packages/core` never imports Next.js or Supabase clients directly.
- Only `packages/database` constructs a client.
- No service-role client exists in the web app at all, so it cannot leak to the browser.

## Environment

`.env.example` documents every variable. Real values live in `apps/web/.env.local`, which is
git-ignored. Nothing in this repository contains a secret.

## Not built yet

Everything in `docs/ROADMAP.md` after Phase 1: employment records, resume parsing, job import and
matching, document generation, tracker, Gmail, automation, analytics. Those tables are not created
yet — each phase adds its own migration.
