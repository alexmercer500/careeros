# CareerOS — Dependency Recommendations

**Status:** Phase 0 proposal — awaiting owner approval
**Verification date:** 2026-11-10
**Registry:** `https://registry.npmjs.org/` (verified reachable)
**Rule:** every version below was read from the registry live. Anything not verified is marked
"resolve at install". Nothing here is applied yet — Phase 1 installs it.

---

## 1. Pinning policy

- **Exact versions** in `package.json` (no `^`) for the application's direct dependencies, plus a
  committed `pnpm-lock.yaml`. Rationale: the ecosystem is mid-major-transition (Next 16, React 19,
  Tailwind 4, Zod 4, AI SDK 7, TypeScript 7), and floating ranges across majors will break builds
  without warning.
- Upgrades happen deliberately, one at a time, with a green test run.
- `packageManager` field pinned to `pnpm@11.4.0` so CI and local agree.
- Node baseline: `>=22` in `engines`, developed on the installed v24.22.1.

---

## 2. Runtime dependencies

### 2.1 Web application (`apps/web`)

| Package | Verified latest | Proposed pin | Purpose | Risk |
|---|---|---|---|---|
| `next` | 16.4.6 | 16.4.6 | App Router, route handlers — spec requirement | Medium: v16 is new; `next lint` is gone, lint via ESLint CLI |
| `react` | 19.3.1 | 19.3.1 | UI | Low |
| `react-dom` | (match React) | 19.3.1 | UI | Low |
| `@supabase/supabase-js` | 2.119.0 | 2.119.0 | Database, Auth, Storage client | Low |
| `@supabase/ssr` | 0.12.7 | 0.12.7 | Cookie-based session handling in Next | Low; peer `supabase-js ^2.114` satisfied |
| `zod` | 4.6.7 | 4.6.7 | Validation at every boundary | Medium: v4 API differs from v3; AI SDK supports `^4.1.8` |
| `react-hook-form` | 7.91.0 | 7.91.0 | Form state — spec requirement | Low |
| `@hookform/resolvers` | not verified | resolve at install | Zod ↔ RHF bridge | Verify Zod 4 support |
| `@tanstack/react-table` | 9.3.1 | 9.3.1 | Tables — spec requirement | **High: v9 is a new major vs the commonly documented v8.** Verify API before building the applications table |
| `zustand` | 5.1.0 | 5.1.0 | Shared client state, used sparingly | Low |
| `tailwindcss` | 4.3.5 | 4.3.5 | Styling | Medium: v4 is CSS-first (no `tailwind.config.js` by default) |
| `@tailwindcss/postcss` | not verified | resolve at install | Tailwind 4 PostCSS plugin | Required by v4 |
| `shadcn` | 4.23.0 | 4.23.0 (dev) | Component generator — spec requirement | Medium: verify Next 16 + Tailwind 4 support in the Phase 1 spike |
| `lucide-react` | not verified | resolve at install | Icons — spec requirement | Low |
| `clsx` + `tailwind-merge` | not verified | resolve at install | shadcn's `cn()` helper | Low |
| `class-variance-authority` | not verified | resolve at install | shadcn variant API | Low |

### 2.2 AI layer (`packages/ai`)

| Package | Verified latest | Proposed pin | Purpose | Risk |
|---|---|---|---|---|
| `ai` | 7.0.166 | 7.0.166 | Vercel AI SDK — structured generation | Medium: v7; verify structured-output API |
| `@ai-sdk/openai` | 4.0.111 | 4.0.111 | **Default adapter**, supports custom `baseURL` for the gateway and any OpenAI-compatible endpoint | Low |
| `@ai-sdk/anthropic` | 4.0.99 | 4.0.99 | Optional native adapter | Low; unused until a first-party key exists |
| `@ai-sdk/openai-compatible` | not verified | resolve at install | Alternative dedicated compat provider | Prefer only if `@ai-sdk/openai` baseURL proves insufficient |

`ai@7` peers: `zod ^3.25.76 || ^4.1.8` → satisfied by zod 4.6.7.

### 2.3 Background processing

| Package | Verified latest | Proposed pin | Purpose | Risk |
|---|---|---|---|---|
| `inngest` | 4.26.2 | 4.26.2 | Durable steps, retries, schedules — spec requirement | Medium: needs a cloud account or the dev server; peers require `typescript >=5.8` (satisfied) |

Fallback if Inngest becomes unavailable: `pg-boss` (not verified) — Postgres-backed queue with no new
infrastructure. Recorded as ADR-011.

### 2.4 Documents (`packages/document-engine`)

| Package | Verified latest | Proposed pin | Purpose | Risk |
|---|---|---|---|---|
| `docx` | 9.15.3 | 9.15.3 | DOCX generation from the resume AST | Low |
| `@react-pdf/renderer` | 4.9.0 | 4.9.0 | PDF generation (independent path, not DOCX→PDF) | Medium: server-side rendering in a worker |
| `pdf-parse` | 2.4.5 | 2.4.5 | Text extraction from uploaded PDFs | Medium: v2 changed the API from v1 |
| `mammoth` | 1.13.0 | 1.13.0 | DOCX → text/HTML for resume parsing | Low |
| `pdf-lib` | 1.17.1 | not installed yet | Only if merging/annotating PDFs is needed | Deferred — not required for MVP |

**Deliberately no LibreOffice/`soffice` conversion**: it is a large external binary, works badly on
Windows, and is unnecessary when DOCX and PDF are rendered independently from the same AST.

### 2.5 Browser automation (`apps/workers`)

| Package | Verified latest | Proposed pin | Purpose | Risk |
|---|---|---|---|---|
| `playwright` | 1.65.0 | 1.65.0 | Browser control — spec requirement | Low; Chromium + WebKit already cached locally |
| `@playwright/test` | 1.65.0 | 1.65.0 (dev) | E2E tests | Low |

No stealth/anti-detection plugins, no CAPTCHA solvers — excluded by policy, not just by choice.

### 2.6 Shared

| Package | Verified latest | Proposed pin | Purpose |
|---|---|---|---|
| `typescript` | **7.0.2** (latest) | **5.9.3** | Language — see §4.1 |
| `date-fns` | not verified | resolve at install | Date maths (employment durations, deadlines) |

---

## 3. Development dependencies

| Package | Verified latest | Proposed pin | Purpose |
|---|---|---|---|
| `eslint` | 10.14.0 | 10.14.0 | Linting |
| `typescript-eslint` | 8.72.2 | 8.72.2 | Typed lint rules — **requires TS < 6.1** |
| `vitest` | 5.1.0 | 5.1.0 | Unit + integration runner |
| `@testing-library/react` | not verified | resolve at install | Component tests |
| `turbo` | not verified | resolve at install | Monorepo task graph — spec prefers Turborepo when multiple apps exist |
| `prettier` | not verified | resolve at install | Formatting (if not using Biome) |
| `supabase` (CLI) | 3.1.0 | 3.1.0 (dev) | Migrations, local stack, type generation |
| `@types/node`, `@types/react`, `@types/react-dom` | not verified | resolve at install | Types |
| `tsx` | not verified | resolve at install | Run the worker in dev on Node 24 |
| `dotenv` | not needed | — | Node 24 supports `--env-file` natively |

`vitest@5` and `@testing-library/*` majors are new; verify config shape in the Phase 1 spike before
writing the test harness.

---

## 4. Compatibility conflicts identified

### 4.1 TypeScript 7 vs typed linting — **hard conflict**

- `typescript` `latest` is **7.0.2** (the native compiler).
- `typescript-eslint@8.72.2` declares `typescript: ">=4.8.4 <6.1.0"`.

Installing "latest TypeScript" silently breaks typed lint rules. **Pin TypeScript 5.9.3.** Revisit
when `typescript-eslint` publishes TS 7 support. This is recorded as **C1** in `PHASE0_REVIEW.md`.

### 4.2 Tailwind 4 removes the JS config

Tailwind 4 is CSS-first (`@import "tailwindcss"` + `@theme`), with `@tailwindcss/postcss`. Any
shadcn setup instructions written for v3 (`tailwind.config.js` + `content` globs) do not apply
unchanged. The Phase 1 spike must confirm the current shadcn CLI output against Tailwind 4.3 before
any UI is built.

### 4.3 ESLint 10 + Next 16

`next lint` is removed in Next 16. Lint runs through the `eslint` CLI with a flat config
(`eslint.config.mjs`). Plan for flat config from day one; do not copy old `.eslintrc` patterns.

### 4.4 TanStack Table v9

v9 is a new major. Most tutorials and the spec's mental model ("TanStack Table") target v8. Confirm
the v9 API during the applications-table work; if v9 proves unstable, pin v8 (the previous major)
rather than mixing patterns. Recorded as **R9**.

### 4.5 `pdf-parse` v2

The v2 API differs from the widely documented v1 (`PDFParse` class instead of a default function).
Confirm the current export shape with a 5-line spike before writing the resume parser.

### 4.6 Supabase CLI + Docker on Windows

`supabase start` on Windows requires Docker Desktop with WSL2 integration. Docker is running, but the
local Supabase stack is 7+ containers competing with the existing `hikkari-*` stack for CPU/RAM on a
15.2 GB machine. Recommendation: **develop against a Supabase cloud project**, and use the local stack
only for migration verification in CI. See **D1**.

---

## 5. Explicitly rejected dependencies

| Rejected | Why |
|---|---|
| Prisma | Second migration owner alongside Supabase CLI; RLS semantics are awkward; heavier than needed |
| Drizzle (for now) | Viable later, but it would duplicate the schema DDL and create two sources of truth. ADR-004 keeps the door open |
| NextAuth / Auth.js | Supabase Auth is specified and already covers sessions, MFA, and RLS-integrated JWTs |
| Clerk | Replaces the chosen auth provider; adds a vendor |
| Redux | Spec allows Zustand only where shared client state is needed |
| Any scraping library (`puppeteer-extra`, `cheerio` + job-board scrapers, captcha solvers) | Prohibited by the spec's access-rules constraint and by policy |
| `officegen` / `html-pdf` | Unmaintained or require external binaries; `docx` + `@react-pdf/renderer` cover both outputs |
| A separate API framework (tRPC, NestJS) | Next route handlers + `packages/core` already satisfy the versioned-REST requirement with less surface |
| `openai` / `@anthropic-ai/sdk` directly | The AI SDK adapters give one interface, schema validation, and provider swapping; raw SDKs would tie business code to vendors |
| LangChain | The spec mentions exposure, not a requirement; agent orchestration here is 9 narrow typed calls, which LangChain would not simplify |

---

## 6. Proposed install order (Phase 1)

```powershell
# 0. repo + workspace
git init
# pnpm-workspace.yaml, turbo.json, root package.json, tsconfig base, eslint flat config

# 1. tooling first, so everything after is linted and typechecked
pnpm add -Dw typescript@5.9.3 eslint@10.14.0 typescript-eslint@8.72.2 vitest@5.1.0 turbo prettier supabase@3.1.0

# 2. web app
pnpm create next-app@16.4.6 apps/web --ts --app --tailwind --eslint --src-dir --import-alias "@/*"

# 3. database + validation (must succeed before any feature work)
pnpm --filter web add @supabase/supabase-js@2.119.0 @supabase/ssr@0.12.7 zod@4.6.7

# 4. UI system — verify shadcn against Next 16 + Tailwind 4 before building screens
pnpm --filter web dlx shadcn@4.23.0 init
pnpm --filter web add react-hook-form@7.91.0 @hookform/resolvers @tanstack/react-table@9.3.1 zustand@5.1.0 lucide-react clsx tailwind-merge class-variance-authority

# 5. AI layer (installed in Phase 2, authored in Phase 3)
pnpm --filter @careeros/ai add ai@7.0.166 @ai-sdk/openai@4.0.111

# 6. workers
pnpm --filter workers add inngest@4.26.2 playwright@1.65.0 docx@9.15.3 @react-pdf/renderer@4.9.0 pdf-parse@2.4.5 mammoth@1.13.0
```

Each step ends with `pnpm typecheck && pnpm lint && pnpm test && pnpm build` before moving on.

---

## 7. Dependency risk register

| ID | Risk | Mitigation |
|---|---|---|
| R9 | TanStack Table v9 API churn | Spike before use; fall back to v8 |
| R10 | Next 16 / React 19 / Tailwind 4 immaturity | Pin exact; build the shell before features; keep a known-good lockfile |
| R11 | AI SDK 7 structured-output API differences | Verify with a 20-line fixture test in Phase 2; fall back to raw `fetch` + Zod if needed (the adapter interface hides either implementation) |
| R12 | Vitest 5 config/API changes | Smoke test the harness before writing real tests |
| R13 | `pdf-parse` v2 API | 5-line spike before the resume parser |
| R14 | Inngest dev server needs a binary download | Verified: `api.inngest.com` reachable; fallback `pg-boss` |
| R15 | Transitive postinstall scripts | Review `pnpm approve-builds`; do not blanket-allow scripts |

---

## 8. Verification checklist before Phase 1 sign-off

- [ ] `node -v` ≥ 22 and `pnpm -v` = 11.4.0 recorded in `engines` + `packageManager`
- [ ] TypeScript resolves to **5.9.3**, not 7.x (`pnpm why typescript`)
- [ ] `pnpm typecheck` passes across all workspaces
- [ ] `pnpm lint` passes with the flat config
- [ ] `pnpm test` runs at least one real test
- [ ] `pnpm build` produces a production build of `apps/web`
- [ ] shadcn component generation verified against Next 16 + Tailwind 4
- [ ] Supabase client connects and returns a single row under RLS
- [ ] Migrations apply from scratch to an empty database
- [ ] `pnpm audit` shows no high/critical advisories (or each is documented)
- [ ] No secret appears in the client bundle
