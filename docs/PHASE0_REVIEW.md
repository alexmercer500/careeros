# CareerOS — Phase 0 Review

**Status:** ⏸ Awaiting owner approval. No application code has been written.
**Date:** 2026-11-10
**Repository state:** greenfield — one spec file, no git repository, no dependencies installed
**Read this with:** `ENVIRONMENT_AUDIT.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`,
`AI_AGENTS.md`, `DEPENDENCIES.md`, `ROADMAP.md`

---

## 1. What I actually did

1. Read the entire master specification (1,159 lines, 13 parts).
2. Inspected the repository and confirmed it contains only the spec — no git repo, no config, no
   prior code.
3. Audited the machine: OS, CPU/RAM/disk, Node, pnpm, npm, git, Docker, Python, Playwright browsers,
   global packages, npm registry, git identity.
4. Checked every occupied port and the running Docker containers.
5. Enumerated environment variable **names** relevant to the stack (no secret values printed).
6. Probed **every external service the spec depends on** with real network requests, including an
   authenticated call against the AI gateway.
7. Cross-checked current published versions and peer-dependency ranges for every major dependency.
8. Wrote seven Phase 0 documents and a draft schema.

I did **not** install anything, create a database, initialise git, or write feature code.

---

## 2. Verified vs assumed

| Claim | Verified? | Evidence |
|---|---|---|
| Repo is empty apart from the spec | ✅ | Directory listing; `git status` → not a repository |
| Node 24 / pnpm 11 / Docker available | ✅ | Version probes |
| Playwright browsers present | ✅ | `chromium-1124`, `webkit-1992` in `%LOCALAPPDATA%\ms-playwright` |
| AI gateway authenticates | ✅ | `GET /v1/models` → 200, large catalog |
| AI gateway can generate | ❌ **Blocked** | `POST /chat/completions` → **402 Payment Required** |
| Native Anthropic route available | ❌ | `POST /v1/messages` → 404; gateway is OpenAI-compatible only |
| Supabase project exists | ❌ **No credential of any kind** | No URL/keys/CLI token |
| Gmail OAuth client exists | ❌ | No Google client ID/secret |
| Inngest reachable | ✅ (cloud API) | 405 on HEAD, auth-gated; no keys |
| Vercel deployable | ❌ | `vercel whoami` empty — not logged in |
| Job-board APIs available | ❌ | No authorised access exists; scraping prohibited by the spec |
| npm registry reachable | ✅ | 200 |
| TypeScript 7 breaks typed linting | ✅ | `typescript-eslint@8.72.2` peer: `typescript >=4.8.4 <6.1.0` |
| Windows is the dev host | ✅ | Windows 11, PowerShell 5.1 |

---

## 3. Deliverables index

| Document | Contents |
|---|---|
| `ENVIRONMENT_AUDIT.md` | Machine, toolchain, ports, credentials, 18-row integration verification matrix, agent capability limits |
| `ARCHITECTURE.md` | Topology, module boundaries, layering rules, folder structure, data access, auth flow, API surface, async workflows, 15 ADRs, deployment, risks |
| `DATABASE.md` | Conventions, 10 proposed table additions, 4 ER diagrams, state machine, full DDL, RLS policies, indexes, 12 invariants, migration workflow |
| `SECURITY.md` | 7 principles, 18-threat model, authn/authz, service-role containment, secret management, AI data-flow policy, Gmail OAuth, **approval integrity**, automation guardrails, AI safety, retention, 15-row test matrix |
| `AI_AGENTS.md` | Verified provider reality, adapter interface, model registry, 9 agent contracts, pipeline, prompt versioning, deterministic scoring spec, logging, failure modes, testing |
| `DEPENDENCIES.md` | Verified versions, pins, 6 compatibility conflicts, rejected dependencies, install order, risk register |
| `ROADMAP.md` | Phases 0–7 with ~110 identified tasks, dependencies, done-when criteria, milestone gates |

---

## 4. Hard blockers (need you)

| # | Blocker | Effect if unresolved | What I need |
|---|---|---|---|
| **B1** | No Supabase project or credentials | Phase 1 cannot start — no database, no auth, no RLS | Project URL + anon key + service-role key, **or** approval to use the local Supabase stack |
| **B2** | AI gateway returns 402 (no plan/balance) | No live AI: job extraction, matching, resume/cover-letter generation, email classification | Fund the gateway, or supply first-party provider keys, **or** approve developing against recorded fixtures until funded |
| **B3** | No real employment facts or metrics | Phase 2 profile would be empty; resume tests would have nothing to trace claims to | Your real employment history, project details, and which metrics have evidence |

B2 does not block Phases 1–2. B1 blocks Phase 1. B3 blocks a credible Phase 2.

---

## 5. Decision register

Recommendations are mine; you can override any of them.

| ID | Decision | Recommendation | Blocks |
|---|---|---|---|
| **D1** | Where does the database live during development? | **Supabase cloud project** (free tier) for daily work; local Docker stack only for migration replay in CI. Reason: the local stack is 7+ containers competing with an existing unrelated Docker stack on 15.2 GB RAM | Phase 1 |
| **D2** | AI access and trust boundary | **Two-part:** (a) use first-party OpenAI/Anthropic/DeepSeek keys for agents that touch personal data; (b) develop Phases 3–4 against recorded fixtures now so the AI layer is built and tested without a funded account | Phases 3–4 |
| **D3** | Query layer | `@supabase/supabase-js` with generated types + SQL views. **No ORM.** One migration owner, RLS-native | Phase 1 |
| **D4** | Authentication method | Email + password with mandatory email confirmation. Magic link can be added without schema change | Phase 1 |
| **D5** | Which model handles which role | Defaults in `AI_AGENTS.md §3.1` (flash for bulk extraction, `deepseek-v4-pro` for reasoning, `claude-sonnet-4.6` for writing). Data-driven, tunable | Phase 3 |
| **D6** | Where do workers run? | Docker container on a VPS/Railway/Fly. **Not Vercel** — Playwright and multi-minute renders need a persistent process | Phase 5 |
| **D7** | Gmail scopes and verification path | `gmail.readonly` only, no send. Develop with OAuth "Testing" + test users; begin Google verification early because refresh tokens expire in 7 days in test mode | Phase 5 |
| **D8** | Inngest hosting | Dev server locally; Inngest cloud for the deployed worker. Fallback `pg-boss` if the account is not wanted | Phase 5 |
| **D9** | Analytics implementation | SQL views first; materialised views only if measured as slow. No separate analytics store | Phase 6 |
| **D10** | Do email bodies leave the network / get stored? | **No by default.** Subject + snippet only for classification; full body stored only with explicit opt-in | Phase 5 |
| **D11** | OAuth token encryption | Supabase Vault if the plan includes it; otherwise AES-256-GCM with `key_version` for rotation | Phase 5 |
| **D12** | One workspace or many in the UI? | **One personal workspace** in the UI; schema and RLS fully multi-tenant so it can expand later | Phase 1 |
| **D13** | Compensation defaults | `INR`, `annual`, both user-configurable. Never hard-code salary expectations into matching | Phase 2 |
| **D14** | Multi-user workspace UI in the MVP | **No.** Workspace admin UI is Phase 7 | Phase 7 |
| **D15** | Local embeddings for semantic matching | **No** for MVP. Skills matching + trigram dedupe is sufficient and cheaper | Phase 3 |
| **D16** | Initial profile data | You provide real employment dates, companies, designations, projects, and which of the three performance metrics (27%, 25%, 30%) have evidence. I must not invent them | Phase 2 |
| **D17** | Git remote and CI host | GitHub + GitHub Actions (recommended). Local-only CI is possible but weaker | Phase 1 |

---

## 6. Risk register

Severity combines likelihood and impact.

| ID | Risk | Sev | Mitigation |
|---|---|---|---|
| R1 | AI gateway unfunded (402) | **High** | Fixture-based development; adapter interface; resolve before Phase 3 exit |
| R2 | No Supabase credentials | **High** | D1 must be answered before Phase 1 |
| R3 | All AI traffic transits an unvetted reseller, including PII | **High** | Data-classification policy; first-party keys for PII agents; base URL is config; `DATA_FLOW.md` review |
| R4 | Gmail restricted scopes need Google verification; test-mode tokens expire in 7 days | **High** | Read-only scope; plan verification before Phase 5; accept manual email entry as fallback |
| R5 | No authorised job-board access; scraping is prohibited | **High** (by design) | Manual / URL / file / alert import only; no scraping code, ever |
| R6 | Playwright automation is brittle and cannot run on serverless | Medium | Separate worker; per-ATS adapters; hard stops; manual fallback; local-only until Phase 5 gate |
| R7 | TypeScript 7 is `latest` but unsupported by typed linting | Medium | Pin 5.9.3; revisit when `typescript-eslint` supports TS 7 |
| R8 | Next 16 / React 19 / Tailwind 4 / shadcn churn | Medium | Exact pins; UI spike before feature work; committed lockfile |
| R9 | TanStack Table v9 is a new major with a different API | Medium | Spike before the applications table; fall back to v8 if unstable |
| R10 | Windows dev vs Linux deployment drift | Medium | Cross-platform scripts; Docker for workers; CI on Linux |
| R11 | 15.2 GB RAM with an existing Docker stack | Medium | Cloud DB for dev; one browser at a time; do not touch `hikkari-*` |
| R12 | No ORM means hand-written SQL for analytics | Low | Acceptable; views are simpler to verify than ORM query builders |
| R13 | Inngest dependency (network + account) | Medium | `pg-boss` fallback documented as ADR-011 |
| R14 | PDF/DOCX fidelity and ATS readability | Medium | Canonical AST; separate renderers; text-extraction test on every generated PDF |
| R15 | Approval hash must cover ATS-specific payloads that don't exist yet | Medium | Phased: hash covers job + documents + answers + target URL now, extended per adapter in Phase 5 |
| R16 | Building multi-tenant infrastructure for a single user | Low | Deliberate: retrofitting `workspace_id` + RLS later is far riskier |
| R17 | Schema churn after real usage | Medium | Forward-only migrations; no dashboard edits; preview-before-production |
| R18 | AI cost runaway | Medium | Per-task token caps, per-workspace daily budget, `ai_runs` cost aggregation, alerting |
| R19 | Orphaned dev servers / occupied ports (3000 already taken) | Low | Standardise on 3001; kill background tasks at the end of every session |

---

## 7. Technical conflicts found in the spec vs the environment

| ID | Conflict | Resolution |
|---|---|---|
| **C1** | Spec requires TypeScript strict mode; npm `latest` is TS 7.0.2, but `typescript-eslint@8.72.2` supports only `<6.1.0` | **Pin 5.9.3.** Strict mode is unaffected; only the compiler generation changes |
| **C2** | Spec's 25 core tables omit `educations` and `certifications`, yet Module 1 requires both | Add two tables (A1) |
| **C3** | Spec assumes three first-party AI providers; verified environment has one OpenAI-compatible aggregator, and native Anthropic routing returns 404 | Default to an OpenAI-compatible adapter with a configurable base URL + model registry; native adapters become optional plugins |
| **C4** | Spec demands business logic separate from UI and not duplicated, but its folder tree has no domain layer | Add `packages/core` (architecture §4) |
| **C5** | Spec says "versioned REST APIs" and also "Next.js route handlers"; Server Actions would create a second mutation surface | `/api/v1` route handlers are the only mutation surface (ADR-002) |
| **C6** | Spec requires migrations but names no tool; pairing drizzle-kit with the Supabase CLI would give two owners | Supabase CLI owns migrations; no ORM in MVP (ADR-004/005) |
| **C7** | Spec lists four separate worker apps; Inngest registers functions from one serve endpoint | One `apps/workers` with four function groups (architecture §5) |
| **C8** | Spec wants "persistent user-authorized browser sessions" while also forbidding security bypass | Encrypted storage state, short-lived, local-only MVP, no stealth plugins, hard stops on CAPTCHA |
| **C9** | Spec wants Gmail monitoring; the required scope is restricted and gated by Google verification | D7: read-only scope, test users in dev, verification planned early |
| **C10** | Spec lists LinkedIn/Naukri/Wellfound/Instahyre/Foundit/Indeed as sources, and separately forbids unauthorised scraping; no authorised feeds are available | MVP supports manual, URL, file, and alert import only. Named platforms are recorded as the *origin* of a job, not as crawled sources |
| **C11** | Deployment target is Linux while development is Windows (PowerShell 5.1, no `psql`, port 3000 occupied, unrelated Docker stack) | Cross-platform scripts; CLI/Docker for DB access; port 3001; isolated containers |
| **C12** | Spec says "use resolved applications for rejection-rate calculations" but never defines *resolved* | Propose: terminal = `rejected`, `offer`, `withdrawn`, `closed`, `no_response`; exclude open applications from the denominator and show the sample size |
| **C13** | Spec requires flexible compensation **and** gives compensation 10% of the match score | Scoring treats unknown compensation as `unknown` with an explicit neutral score and a stated confidence penalty — never as zero and never as full marks |

---

## 8. Spec gaps I closed (for your approval)

| ID | Addition | Why it was needed |
|---|---|---|
| A1 | `educations`, `certifications` | Module 1 requires them; no table existed |
| A2 | `document_templates` | Module 2 requires multiple templates with versions |
| A3 | `career_position_skills` / `_projects` / `_achievements` | "Priority skills / relevant projects / relevant achievements" need ordered, referentially valid joins |
| A4 | `document_claims` | "Every generated claim must be traceable" is untestable without a claim→fact link |
| A5 | `submission_attempts` | Part 8 requires idempotency; Part 11 requires duplicate-prevention and confirmation evidence |
| A6 | `reminders` | Modules 6 and 8 require follow-up reminders |
| A7 | `integration_tokens` | OAuth secrets must not live in a table readable by `authenticated` |
| A8 | Composite foreign keys `(id, workspace_id)` | Makes cross-tenant references physically impossible, not merely policy-forbidden |
| A9 | Hard-gate check constraint on `match_assessments` | "Hard requirement mismatches must never be hidden" becomes a database guarantee |
| A10 | Immutability triggers | "Store immutable assessment snapshots" and "never silently overwrite a submitted document" become enforced, not documented |

**Gaps still open (not blocking, but noted):** data-retention policy is proposed in `SECURITY.md §13`
rather than specified; there is no defined notification channel (email vs in-app) for reminders; there
is no resume visual-design direction beyond "ATS-readable".

---

## 9. What I deliberately did not do

- Did not scaffold the app, install packages, or create a database.
- Did not initialise git (so you can review the baseline first).
- Did not touch the running `hikkari-*` Docker stack or the process on port 3000.
- Did not implement scraping, captcha handling, or anything that would breach a third party's terms.
- Did not fabricate employment facts, dates, or metrics anywhere in the docs.
- Did not assume any integration works — each is marked verified, unverified, or blocked.

---

## 10. If you approve, this is what happens next

Phase 1, in this order: git baseline → workspace + strict TS + lint + test harness → Next 16 shell on
port 3001 → env validation → migration `0001_init.sql` applied to a real database → RLS helpers and
policies → isolation test suite proving two workspaces cannot see each other → auth pages + signup
trigger → workspace resolution + authorization map → app shell → CI.

Phase 1 produces no product features beyond a login and an empty dashboard. That is intentional: it
is the phase that makes every later "done" claim credible.

---

## 11. Approval checklist

- [ ] **Architecture** (`ARCHITECTURE.md`) — topology, `packages/core`, `/api/v1`-only mutations, folder structure, ADRs
- [ ] **Database** (`DATABASE.md`) — 35 tables including A1–A10, RLS model, invariants
- [ ] **Security** (`SECURITY.md`) — threat model, approval integrity, AI data-flow policy, automation guardrails
- [ ] **AI** (`AI_AGENTS.md`) — OpenAI-compatible default adapter, model registry, deterministic scoring
- [ ] **Dependencies** (`DEPENDENCIES.md`) — exact pins, TypeScript 5.9.3, rejected libraries
- [ ] **Roadmap** (`ROADMAP.md`) — task breakdown and phase gates
- [ ] **D1 answered** — Supabase cloud project or local stack
- [ ] **D2 answered** — fund gateway / first-party keys / fixtures-only for now
- [ ] **D16 supplied** — real employment facts and which metrics have evidence (can come during Phase 2)

---

## 12. Questions that genuinely block implementation

Only four, and none are answered by the spec:

1. **D1 — Supabase:** will you create a cloud project and give me the URL + anon key + service-role
   key, or should I run the local Supabase stack in Docker? *(blocks Phase 1)*
2. **D2 — AI access:** fund the existing gateway, provide first-party OpenAI/Anthropic/DeepSeek keys,
   or have me build the AI layer against recorded fixtures until one of those is true? *(blocks live AI
   in Phases 3–4)*
3. **D4 — Auth:** email + password with confirmation, or magic link? *(blocks the Phase 1 auth pages)*
4. **D6 — Worker hosting:** local-only until Phase 5, or do you have a VPS/Railway/Fly target now?
   *(blocks Phase 5 only, but affects how the worker is packaged)*

If you would rather not decide yet, I will proceed with my recommendations (D1 cloud, D2 fixtures +
first-party later, D4 email/password, D6 local-only) and record each as an assumption in the
implementation log — but that means Phase 1 cannot start until the Supabase credentials exist.

**No application code will be written until you approve.**

---

## 13. Phase 0 self-assessment

**Strong:** the environment is fully characterised rather than assumed; the two real blockers
(credentials, AI billing) surfaced before any code was written; the schema closes ten gaps in the
spec's table list and converts several of the spec's "must never" statements into database
constraints; approval integrity is designed as a hash-bound, expiring, single-use artifact rather
than a flag.

**Weak points you should push back on if you disagree:** the ten additional tables expand the schema
beyond the spec's 25; `packages/core` is a structural addition; composite foreign keys add indexes and
complexity for a single-user product; and the deterministic scorer deliberately refuses to let the
model own the number, which may produce less nuanced scores than a pure-LLM ranking.
