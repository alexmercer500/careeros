# CareerOS — Development Roadmap

**Status:** Phase 0 complete (pending approval); Phases 1–7 planned
**Rule:** no phase starts until the previous phase's exit gate is green. No time estimates — ordering
and dependencies only.

---

## Phase 0 — Environment and architecture

### Deliverables produced

| Deliverable | Location | Status |
|---|---|---|
| Repository inspection | `docs/ENVIRONMENT_AUDIT.md §1` | Done |
| Runtime and dependency audit | `docs/ENVIRONMENT_AUDIT.md §2, §4` | Done |
| Architecture proposal | `docs/ARCHITECTURE.md` | Done |
| Database ER diagram | `docs/DATABASE.md §3` | Done |
| Database schema | `docs/DATABASE.md §5–§8` | Done (draft, not applied) |
| Security architecture | `docs/SECURITY.md` | Done |
| AI provider strategy | `docs/AI_AGENTS.md` | Done |
| Dependency recommendations | `docs/DEPENDENCIES.md` | Done |
| Development task breakdown | this document | Done |
| Risks, conflicts, open decisions | `docs/PHASE0_REVIEW.md` | Done |
| Implementation log | `docs/IMPLEMENTATION_LOG.md` | Started |

### Phase 0 exit gate

- [ ] Owner approves `ARCHITECTURE.md` (topology, layering, folder structure, ADRs)
- [ ] Owner approves `DATABASE.md` (including the ten proposed additional tables)
- [ ] Owner approves `SECURITY.md` (especially §9 approval integrity and §7 data flow)
- [ ] Decisions **D1** (Supabase) and **D2** (AI access) are answered — these gate Phase 1 and Phase 3
- [ ] No blocking question remains unanswered

Nothing in Phase 1 starts before this gate passes.

---

## Phase 1 — Foundation

**Goal:** a running, authenticated, RLS-protected shell with a reproducible schema. No product
features. This phase exists so every later feature is built on tested foundations.

| ID | Task | Depends on | Done when |
|---|---|---|---|
| F1-01 | Initialise git, commit the untouched spec as the baseline commit | — | `git log` shows the spec; `.gitignore` covers `.env*`, `.next`, `node_modules`, artifacts |
| F1-02 | pnpm workspace + Turborepo skeleton, root `package.json`, `engines`, `packageManager` | F1-01 | `pnpm install` succeeds; workspace packages resolve |
| F1-03 | TypeScript strict base config (pinned 5.9.3), path aliases, project references | F1-02 | `pnpm typecheck` passes on empty packages |
| F1-04 | ESLint 10 flat config + `typescript-eslint` + import-boundary rules for layering (architecture §4) | F1-03 | `pnpm lint` passes; a deliberate `components/ → database/admin` import fails lint |
| F1-05 | Vitest harness + one real test per package | F1-03 | `pnpm test` runs and reports |
| F1-06 | `apps/web` Next 16 scaffold (src dir, Tailwind 4, app router) on port 3001 | F1-02 | `pnpm dev` serves on 3001; `pnpm build` succeeds |
| F1-07 | shadcn/ui init and verify against Next 16 + Tailwind 4 | F1-06 | One generated component renders in a page without console errors |
| F1-08 | `.env.example` with every variable name, no values; env validation module (Zod) that fails fast on boot | F1-03 | Missing `SUPABASE_URL` produces a clear startup error |
| F1-09 | Supabase project provisioning (cloud or local per **D1**) and `supabase link` | D1 | `supabase status` / project dashboard reachable; keys in `.env.local` |
| F1-10 | Migration `0001_init.sql` applied from `DATABASE.md`, plus `pg_trgm`/`pgcrypto` | F1-09 | Migration applies to an empty database with zero errors |
| F1-11 | Disposable-database replay test: drop, recreate, migrate, compare schema hash | F1-10 | CI proves the schema is reproducible from scratch |
| F1-12 | RLS helpers (`is_workspace_member`, `workspace_role_of`) + standard policy loop for all tenant tables | F1-10 | Policy count matches table count; no app table has `relrowsecurity = false` |
| F1-13 | RLS isolation test suite (two users, two workspaces, every table) | F1-12 | Every foreign read returns zero rows; every foreign write raises |
| F1-14 | `supabase gen types typescript` wired into `packages/database`, generated file committed | F1-10 | Types regenerate with one command; `pnpm typecheck` uses them |
| F1-15 | Signup trigger: create `users`, personal `workspace`, `owner` membership in one transaction | F1-10 | New auth user immediately has exactly one workspace and one owner row |
| F1-16 | Auth pages: signup, login, email confirmation, logout; middleware session refresh | F1-06, F1-09 | Full signup → confirm → login → logout cycle works manually |
| F1-17 | Server-side workspace resolution + authorization map in `packages/core` | F1-12, F1-16 | Client-supplied foreign `workspace_id` returns 403 |
| F1-18 | App shell: nav, sidebar, layout, loading/empty/error states | F1-16 | Shell renders for an authenticated user; unauthenticated redirect works |
| F1-19 | Dashboard placeholder with real counts (0 is fine) | F1-17 | No hardcoded/mock numbers anywhere |
| F1-20 | Service-role client isolation + static guard | F1-14 | Build fails if `admin.ts` is importable from a client module |
| F1-21 | Storage buckets + workspace-prefixed policies | F1-12 | Cross-workspace signed URL request fails |
| F1-22 | CI: install, typecheck, lint, unit, build, migration replay, `pnpm audit` | F1-04…F1-20 | Pipeline green on a clean checkout |
| F1-23 | `docs/ARCHITECTURE.md` and `DATABASE.md` updated with any implementation deviations | — | Docs match the code |

**Phase 1 exit gate:** new user can sign up, log in, see an empty dashboard, and be provably unable to
see any other workspace's data. All CI checks green. `IMPLEMENTATION_LOG.md` updated.

---

## Phase 2 — Career profile

**Goal:** one verified professional profile with no fabricated facts, plus guided onboarding.

| ID | Task | Depends on | Done when |
|---|---|---|---|
| F2-01 | Profile GET/PATCH with validation | Phase 1 | Round-trip persists; invalid payload returns field-level errors |
| F2-02 | Experiences CRUD (dates, ownership scope, verification) | F2-01 | Current role cannot have an end date; end < start rejected |
| F2-03 | Projects CRUD linked to experiences | F2-02 | Cross-profile project link rejected |
| F2-04 | Skills CRUD with dedupe on lower(name) | F2-01 | Duplicate skill rejected by the DB |
| F2-05 | Educations + certifications CRUD | F2-01 | Same verification workflow as experiences |
| F2-06 | Achievements CRUD with evidence, metric, verification states | F2-02, F2-03 | `resume_approved` blocked for `needs_evidence`; metric without evidence cannot be approved |
| F2-07 | Verification workflow UI (verified / user confirmed / needs evidence / excluded) | F2-06 | Status change is audited; AI cannot change it |
| F2-08 | Career positioning profiles + ordered skills/projects/achievements joins | F2-04…F2-06 | One default enforced; reorder persists |
| F2-09 | Job preferences | F2-01 | Compensation min ≤ max; currency and period stored |
| F2-10 | Resume upload to private storage | Phase 1 | 10 MB cap, magic-byte check, workspace-prefixed key |
| F2-11 | PDF + DOCX text extraction (`pdf-parse`, `mammoth`) | F2-10 | Both formats produce text; corrupt file fails gracefully |
| F2-12 | Resume parsing into *proposed* facts (no auto-write) | F2-11 | Parsed facts appear as proposals requiring explicit acceptance |
| F2-13 | Profile comparison: uploaded resume vs master profile, showing gaps and conflicts | F2-12 | Conflicts are listed, not silently resolved |
| F2-14 | Guided onboarding flow for initial profile verification | F2-01…F2-06 | User must confirm every imported fact before it is marked `user_confirmed` |
| F2-15 | Profile integrity tests | F2-02…F2-08 | No fabricated employment; dates correct; achievement associations valid; unsupported skills rejected |
| F2-16 | Profile section error/empty/loading states | F2-01…F2-08 | Every section has all three |

**Phase 2 exit gate:** the owner can enter their real employment history and every fact carries an
explicit verification state. Parsing never writes a fact without consent. Integrity tests green.

---

## Phase 3 — Job intelligence

**Goal:** jobs enter reliably, requirements are extracted, matches are scored reproducibly.
**Depends on decision D2 (AI access) for extraction and matching.**

| ID | Task | Depends on | Done when |
|---|---|---|---|
| F3-01 | Jobs CRUD + list/filter/sort/search UI | Phase 2 | Filters combine correctly; pagination cursor-based |
| F3-02 | Import by pasted description | F3-01 | Job saved with `source='manual'`, hash computed |
| F3-03 | Import by URL with SSRF guard (https only, private-range block, redirect re-check) | F3-01 | `169.254.169.254`, `file://`, and localhost redirects rejected; 15 s / 5 MB caps |
| F3-04 | Import by file upload | F3-01 | PDF/DOCX/TXT accepted; oversized rejected |
| F3-05 | Import from a pasted job-alert email body | F3-02 | Multiple jobs in one alert create separate records |
| F3-06 | Duplicate detection: exact hash + trigram similarity + `duplicate_of_job_id` | F3-02, F3-03 | Re-importing the same job does not create a second active record |
| F3-07 | `JobExtractionAgent` + `job_requirements` persistence, idempotent on `input_hash` | F3-01, D2 | Re-running produces no duplicate requirements |
| F3-08 | Requirement classification incl. `is_hard` | F3-07 | Hard requirements distinguishable in the UI |
| F3-09 | Deterministic weighted scorer + `weights_version` | Phase 2 skills, F3-07 | Weights sum to 1; score matches a hand-computed fixture to one decimal |
| F3-10 | Hard-requirement gate | F3-09 | A hard mismatch caps the band at `possible`, enforced in code and by DB constraint |
| F3-11 | `JobMatchingAgent` qualitative layer + explanation | F3-07, D2 | Output includes matching/missing skills, gaps, seniority concerns, reasons for/against, confidence |
| F3-12 | Immutable assessment snapshots | F3-09, F3-11 | Update/delete raises; a re-assessment creates a new row |
| F3-13 | Discovery dashboard: ranked list, band chips, hard-failure badges | F3-09, F3-11 | Hard failures are visible, never hidden behind a good score |
| F3-14 | Configurable weights (admin-level setting) | F3-09 | Changing weights requires a new `weights_version`; old assessments keep theirs |
| F3-15 | Matching test suite | F3-09…F3-12 | Correct score, hard-mismatch detection, missing skills, reproducibility |
| F3-16 | `docs/DATA_FLOW.md`: every agent and the fields it transmits | F3-07, F3-11 | Reviewed and approved alongside the gateway decision |

**Phase 3 exit gate:** a job pasted from LinkedIn can be extracted, scored, and explained; the same
job never duplicates; a hard requirement mismatch is impossible to hide.

---

## Phase 4 — Application studio and tracker

**Goal:** tailored documents with traceable claims, a working tracker, and a real approval workflow.

| ID | Task | Depends on | Done when |
|---|---|---|---|
| F4-01 | Resume AST schema + JSON storage in `document_versions` | Phase 2 | AST round-trips losslessly |
| F4-02 | `document_templates` registry + two ATS-safe templates | F4-01 | Both render valid output |
| F4-03 | `ResumeAgent` generation from verified facts only | F4-01, D2 | Unverified facts never selected; every bullet has a `document_claim` |
| F4-04 | Claim validation: unknown/unverified `factId` fails the run | F4-03 | A fixture with a fabricated claim is rejected |
| F4-05 | Resume editor (section-level edit, reorder, save as new version) | F4-01, F4-03 | Editing never mutates an existing version |
| F4-06 | DOCX render from AST | F4-02 | Opens in Word; single column; real headings; no text boxes |
| F4-07 | PDF render from AST (independent path) | F4-02 | Text extractable (ATS-readable), fonts embedded, selectable text |
| F4-08 | Version history UI + diff | F4-05 | Every version listed with author, source job, and timestamp |
| F4-09 | `CoverLetterAgent` with the same claim traceability | F4-04 | Fabricated claim rejected |
| F4-10 | Recruiter outreach draft + skills checklist + prep brief | F4-03 | Generated content is editable and versioned |
| F4-11 | Application creation + status machine with a transition map | Phase 3 | Illegal transitions rejected server-side and covered by tests |
| F4-12 | `application_events` appended on every change | F4-11 | History is complete and immutable |
| F4-13 | Kanban board | F4-11 | Drag → optimistic update → persisted; illegal drop reverts with a message |
| F4-14 | Table view with filters, sorting, search | F4-11 | Same data as the board, no duplicated query logic |
| F4-15 | Attach document versions to an application with content hashes | F4-06, F4-07 | Attachment records the hash at attach time |
| F4-16 | Application answers incl. sensitive-flag review state | F4-11 | Sensitive answers cannot be auto-approved |
| F4-17 | Approval creation API: payload hash, expiry, approved version IDs | F4-15, F4-16 | Hash covers the canonical payload; expiry default 72 h |
| F4-18 | Approval consumption API with row lock + idempotency key | F4-17 | Double-submit yields exactly one attempt |
| F4-19 | Approval UI: preview of exact payload, per-application confirm, expiry display | F4-17 | No "approve all"; approval is per application |
| F4-20 | Submission record (manual submission path, no automation yet) | F4-18 | Status → `submitted` only with a valid consumed approval |
| F4-21 | Approval/immutability test suite | F4-17…F4-20 | Submission impossible without approval; changed docs invalidate; expired rejected; duplicate prevented |
| F4-22 | Document/submission audit trail | F4-20 | Every submitted file is preserved byte-for-byte with its hash |

**Phase 4 exit gate:** a tailored resume for a real job is generated, every claim traces to a verified
fact, PDF and DOCX are valid and ATS-readable, and submitting is impossible without a specific,
unexpired, hash-matched approval.

---

## Phase 5 — Integrations and automation

**Goal:** Gmail signals and assisted browser submission, both approval-gated.
**Depends on D7 (Google OAuth) and D6 (worker hosting).**

| ID | Task | Depends on | Done when |
|---|---|---|---|
| F5-01 | Deploy `apps/workers` as a container; health endpoint; Inngest serve | D6 | Worker starts, registers functions, survives a restart |
| F5-02 | Inngest dev server wired locally; functions reachable in dev | F5-01 | An event from the web app executes a worker function |
| F5-03 | Gmail OAuth: consent start, signed `state`, callback, token encryption | D7 | Token stored encrypted; never returned over HTTP |
| F5-04 | Minimum-scope request + scope-change handling | F5-03 | Stored scopes match what was granted |
| F5-05 | Gmail sync worker (incremental, idempotent) | F5-03 | Re-running does not duplicate `email_events` |
| F5-06 | `EmailMonitoringAgent` classification | F5-05, D2 | Every message gets a classification + confidence; low confidence → `needs_review` |
| F5-07 | Email → application matching with confidence + review queue | F5-06 | Uncertain matches are queued, never auto-linked |
| F5-08 | Communication timeline UI | F5-07 | Messages appear in order with classification and link state |
| F5-09 | Follow-up reminders + scheduled sweep | F5-07 | Due reminders surface; dismissal persists |
| F5-10 | Token refresh + failure handling | F5-03 | Expired token marks the integration `expired` and stops syncing |
| F5-11 | Playwright worker skeleton + browser context lifecycle | F5-01 | Launches Chromium, closes cleanly, leaves no orphan process |
| F5-12 | ATS adapter framework (Greenhouse, Lever, Workday first) + signature detection | F5-11 | An unsupported page aborts with a clear reason |
| F5-13 | Prepare: field discovery, mapping to verified profile values, unknowns + sensitive fields flagged | F5-12 | Unknown fields are listed, never guessed |
| F5-14 | Preview: rendered application payload + screenshots | F5-13 | Preview matches the approved payload exactly |
| F5-15 | Execute: submit only with a live approval; re-validate hash immediately before submit | F5-14, F4-18 | Any drift aborts; CAPTCHA aborts; no retry after a failed submit |
| F5-16 | Evidence capture: confirmation reference, final URL, screenshot, response | F5-15 | Linked to `submission_attempts`; immutable |
| F5-17 | Manual-assistance fallback for unsupported sites | F5-12 | User gets a guided checklist instead of a dead end |
| F5-18 | Automation guardrail test suite | F5-12…F5-16 | Stops on CAPTCHA, unknown legal declarations, unsupported sites; never submits pre-approval |
| F5-19 | Global `AUTOMATION_ENABLED` kill switch | F5-15 | Disabling it fails closed |

**Phase 5 exit gate:** an email from a real application is classified and linked with confirmation
required when uncertain; one application is submitted through automation with an approval, and the
confirmation evidence is stored. CAPTCHA and unknown declarations demonstrably stop the run.

---

## Phase 6 — Analytics

| ID | Task | Depends on | Done when |
|---|---|---|---|
| F6-01 | Funnel view + counts (discovered → applied → screening → interview → offer) | Phase 4 | Counts match the underlying rows exactly |
| F6-02 | Rejection and no-response rates using **resolved** applications only | F6-01 | Unresolved applications are excluded from the denominator, and the UI says so |
| F6-03 | Average response time | F6-01 | Computed from `applied_at` to first response event |
| F6-04 | Resume-version performance comparison | F6-01, F4-08 | Groups by `document_version`, not by document |
| F6-05 | Source-wise and role-wise conversion | F6-01 | Positioning profiles and `job_source` both supported |
| F6-06 | Match score vs interview conversion | F6-01, Phase 3 | Scatter/bucket view with sample sizes shown |
| F6-07 | `CareerAnalyticsAgent` evidence-based recommendations | F6-01…F6-06, D2 | Recommendations cite the metric and sample size; low-sample claims are labelled inconclusive |
| F6-08 | Sample-size guardrails | F6-07 | Below the threshold, causal language is blocked, not just discouraged |
| F6-09 | Analytics correctness fixtures | F6-01…F6-06 | A seeded dataset produces hand-verified numbers |

**Phase 6 exit gate:** every reported number is reproducible from a fixture, and the UI never makes a
causal claim the sample size cannot support.

---

## Phase 7 — SaaS readiness

Explicitly deferred by the spec until the personal product proves value. Listed so the schema does not
foreclose it.

| ID | Task | Done when |
|---|---|---|
| F7-01 | Multi-tenant verification audit (every query, every policy) | Two real users cannot see each other's data |
| F7-02 | Workspace administration UI (invite, role change, remove) | Role changes take effect immediately and are audited |
| F7-03 | Usage quotas (AI cost, storage, applications) | Exceeding a quota degrades gracefully, never corrupts data |
| F7-04 | Model usage limits and per-workspace budgets | Enforced server-side, not in the UI |
| F7-05 | Billing architecture (no billing implementation yet) | Documented, reviewable, not built |
| F7-06 | Full data export | Export is complete and importable |
| F7-07 | Account deletion with cascade + storage cleanup | Auth user, tenant rows, and objects all removed; deletion receipt logged |
| F7-08 | MFA and session policy | Optional MFA available |

---

## Cross-cutting tracks (run continuously)

| Track | Cadence | Requirement |
|---|---|---|
| Tests | Every task | No task is "done" without tests for its business rules (spec Part 11) |
| Lint + typecheck + build | Every task | Green before commit; CI enforces |
| Migrations | Every schema change | Migration file, never a dashboard edit |
| `docs/IMPLEMENTATION_LOG.md` | Every phase and every notable change | Files created/modified, decisions, tests run, known issues |
| Architecture decision records | Whenever a decision changes | New ADR row, old one marked superseded |
| Dependency audit | Each phase | `pnpm audit`, no unreviewed postinstall scripts |
| Security tests | Each phase | The relevant rows of `SECURITY.md §14` |

---

## Milestone gates summary

| Gate | Requirement |
|---|---|
| G0 → Phase 1 | This plan approved; D1 and D2 answered |
| G1 → Phase 2 | Auth + RLS proven by tests; schema reproducible |
| G2 → Phase 3 | Profile facts all carry verification state; integrity tests green |
| G3 → Phase 4 | Scoring reproducible; hard gate enforced; no duplicate jobs |
| G4 → Phase 5 | Approval workflow enforced by tests; documents immutable after submission |
| G5 → Phase 6 | Email linking + one real automated submission with evidence |
| G6 → Phase 7 | Analytics reproducible from fixtures |
| G7 | Definition of Done met for every P0 feature (spec Part 12) |

---

## Definition of Done — applied per task

A task is complete only when all of the following hold (spec Part 12, made concrete):

1. UI implemented and reachable.
2. Business logic in `packages/core`, not in the component.
3. Database operations work against a real database.
4. Input validated with Zod at the boundary.
5. Error, loading, and empty states handled.
6. Authorization tested — including the negative case.
7. Automated tests written and passing.
8. Documentation and `IMPLEMENTATION_LOG.md` updated.
9. `pnpm typecheck && pnpm lint && pnpm test && pnpm build` pass.
10. Verified by running it in the real dev environment, not by inspecting code.
