# CareerOS — Phase 0 Environment Audit

**Audit date:** 2026-11-10
**Repository:** `d:\Ratnesh\Projects\careeros`
**Auditor:** implementation agent
**Method:** direct inspection of the filesystem, installed runtimes, listening ports, environment
variables (names only), Docker state, and live network probes against every external service the
specification depends on.

> This document records **only what was verified**. Anything that could not be verified is marked
> UNVERIFIED or BLOCKED. No integration is assumed to work.

---

## 1. Repository assessment

| Item | Finding |
|---|---|
| Working tree contents | Exactly one file: `CAREEROS_MASTER_SPEC.md` (25,181 bytes, 1,159 lines) |
| Git repository | **Not a git repository.** `git status` reports "not a repository (or any of the parent directories)". No `.git`, no remotes, no commit history |
| Existing application code | None |
| Existing configuration | None (no `package.json`, `tsconfig.json`, `.env`, lockfiles, CI config) |
| Hidden files | None |
| Existing documentation | None beyond the master spec |
| `.gitignore` | Absent |

**Conclusion:** this is a greenfield project. Nothing will be overwritten. The spec's warning
"never assume the repository is empty" was checked and does not apply — the repository is empty
except for the specification.

The master spec is also **not yet under version control**. Creating the git repository and making
an initial commit of the untouched spec is the first Phase 1 action, so that every subsequent
change is reviewable as a diff.

---

## 2. Machine and runtime inventory

### Host

| Item | Verified value |
|---|---|
| OS | Windows 11 Home Single Language, build 26200 |
| Architecture | AMD64 (x64) |
| CPUs | 16 logical processors |
| RAM | 15.2 GB |
| Free disk on `D:` | ~195 GB (209,793,359,872 bytes free of ~375 GB) |
| Shell available to agent | Windows PowerShell 5.1 (`-NoProfile -NonInteractive`) |
| Timezone / locale assumptions | Not configured yet; host is India-based (spec targets India first) |

### Toolchain

| Tool | Installed | Version | Notes |
|---|---|---|---|
| Node.js | Yes | **v24.22.1** | Satisfies Next.js 16 `engines.node >=20.9.0` |
| npm | Yes | 12.2.1 | |
| pnpm | Yes | **11.4.0** (CLI), global npm copy 11.3.0 | Spec prefers pnpm — satisfied |
| Yarn | Yes | 1.22.22 | Not needed |
| Git | Yes | 2.54.0.windows.1 | |
| Docker | Yes | 29.7.2, Docker Desktop | Daemon confirmed running |
| Python | Yes | 3.10.0 | Not required |
| Vercel CLI | Yes | 59.23.2 (global) | **Not authenticated** (`vercel whoami` returned empty) |
| PostgreSQL client (`psql`) | **No** | — | Must use Supabase CLI / Docker exec / SQL editor instead |
| Supabase CLI | **No** | — | Available as npm package `supabase@3.1.0`; install via `pnpm dlx supabase` |
| Playwright browsers | Yes | chromium-1124, webkit-1992, ffmpeg-1009 cached in `%LOCALAPPDATA%\ms-playwright` | No download needed for Chromium/WebKit |
| Global npm packages | `agent-browser`, `clixad`, `command-code`, `live-server`, `localtunnel`, `nodemon`, `openclaw`, `pnpm`, `vercel`, `yarn` | | Nothing conflicts with the planned stack |
| npm registry | `https://registry.npmjs.org/` | Reachable (HTTP 200) | No private registry / proxy configured |

### Occupied ports (important for local development)

| Port | Owner | Implication |
|---|---|---|
| 3000 | `node.exe` (PID 72008), path `C:\Program Files\nodejs\node.exe` | **Next.js default dev port is taken.** CareerOS must use `3001` (or the owner must be identified and stopped) |
| 15432 | `hikkari-postgres` container | Unrelated project. Do **not** reuse — different schema, different data ownership |
| 6379 | `hikkari-redis` container | Unrelated project |
| 6432 | `hikkari-pgbouncer` container | Unrelated project |
| 5432 | Free | Free for a dedicated CareerOS Postgres container if needed |
| 8288 | Free | Inngest dev server default port is available |
| 54321 / 54322 | Free | Supabase local defaults available |

Docker images already pulled: `grafana/grafana`, `prom/prometheus`, `hikkari-postgres:16-pgvector`,
`redis:7-alpine`, `edoburu/pgbouncer`, `ghcr.io/github/github-mcp-server`. None are CareerOS images.

**Do not touch the running `hikkari-*` stack.** It belongs to another project and appears to hold
live data. CareerOS must use its own containers, volumes, and ports.

---

## 3. Secret and credential inventory (names only — no values read)

| Variable | Present | Assessment |
|---|---|---|
| `OPENAI_API_KEY` | **Yes** | Not an OpenAI key — paired with the gateway base URL below |
| `OPENAI_BASE_URL` | Yes → `https://tokenharbor.ai/v1` | Third-party OpenAI-compatible **aggregator/gateway** |
| `OPENAI_API_BASE` | Yes → `https://tokenharbor.ai/v1` | Duplicate of above |
| `ANTHROPIC_AUTH_TOKEN` | **Yes** | Token for the same gateway |
| `ANTHROPIC_BASE_URL` | Yes → `https://tokenharbor.ai` | Gateway root, **not** `api.anthropic.com` |
| `SUPABASE_*` | **None** | No URL, anon key, service-role key, or project ref |
| `DEEPSEEK_*` | **None** | No direct DeepSeek credential |
| `GEMINI_*` / `GOOGLE_*` | **None** | No Google/Gmail OAuth client |
| `INNGEST_*` | **None** | No event key / signing key |
| `DATABASE_URL` / `POSTGRES_*` | **None** | No application database configured |
| `GMAIL_*` / `RESEND_*` / `STRIPE_*` | **None** | Not applicable yet |
| Supabase CLI access token | Absent (`~\.config\supabase\access-token` does not exist) | Cannot link/create projects non-interactively |
| `.pgpass` / `pgpass.conf` | Absent | No stored DB credentials |

No `.env` file exists anywhere in the project or the user profile.

---

## 4. Live integration verification

Each service was probed over the network. Results are factual outcomes of real requests.

| # | Integration | Probe | Result | Status |
|---|---|---|---|---|
| 1 | **AI gateway (tokenharbor.ai)** — auth | `GET /v1/models` with `OPENAI_API_KEY` | **200 OK**; returns a large model catalog including `deepseek-v4-pro`, `deepseek-v4-flash`, `claude-sonnet-4.6`, `claude-opus-5.5`, `gpt-6-luna`, `gemini-3.8-flash`, `qwen3.8-max`, `glm-5.3`, `mistral-large-2512` | **AUTHENTICATED** |
| 2 | **AI gateway** — completions | `POST /chat/completions` (deepseek-v4-flash, deepseek-v4-pro, claude-sonnet-4.6) | **HTTP 402 Payment Required** — "No active plan was found on this account … the wallet balance can't cover this model" | **BLOCKED** |
| 3 | **AI gateway** — native Anthropic route | `POST {ANTHROPIC_BASE_URL}/v1/messages` | **HTTP 404 Not Found** | **NOT OFFERED** — the gateway only exposes the OpenAI-compatible surface |
| 4 | DeepSeek (direct) | No credential | — | **UNAVAILABLE** |
| 5 | Anthropic (direct) | No credential; env points at gateway | — | **UNAVAILABLE** |
| 6 | OpenAI (direct) | No credential; env points at gateway | — | **UNAVAILABLE** |
| 7 | **Supabase platform API** | `HEAD https://api.supabase.com/platform` | 401 (reachable, auth-gated) | **REACHABLE, NO CREDENTIALS** |
| 8 | Supabase database access | No project ref / keys / CLI token | — | **UNVERIFIED — BLOCKING** |
| 9 | **Supabase local stack** | Docker running; ports 54321/54322 free; CLI not installed | Installable via `pnpm dlx supabase` | **VIABLE (not yet installed)** |
| 10 | **Inngest cloud** | `HEAD https://api.inngest.com` | 405 (reachable, auth-gated); no keys | **REACHABLE, NO CREDENTIALS** |
| 11 | Inngest dev server | port 8288 | Closed | **NOT RUNNING** |
| 12 | **Google OAuth** | `HEAD https://oauth2.googleapis.com/token` | 404 on HEAD (endpoint exists, method rejected) → reachable | **REACHABLE, NO OAUTH CLIENT** |
| 13 | **Gmail API** | No OAuth client ID/secret, no consent screen | — | **UNAVAILABLE** |
| 14 | **Vercel** | `vercel whoami` | Empty output | **NOT AUTHENTICATED** |
| 15 | **Playwright browser engine** | `%LOCALAPPDATA%\ms-playwright` | Chromium 1124 + WebKit 1992 present | **AVAILABLE** |
| 16 | npm registry | `HEAD registry.npmjs.org/next` | 200 | **AVAILABLE** |
| 17 | LinkedIn / Naukri / Wellfound / Instahyre / Foundit / Indeed | Not probed for scraping | No API access exists for these; automated collection is not authorised by this project | **NOT AVAILABLE — see §6** |
| 18 | DOCX/PDF generation | Local libraries, no external service | — | **AVAILABLE (library-dependent)** |

### 4.1 What this means for the AI architecture

The specification assumes three interchangeable first-party providers (DeepSeek, Claude, OpenAI).
The **verified** reality is different:

- One third-party **aggregator** credential covers all of them through an **OpenAI-compatible**
  API. There is no native Anthropic or DeepSeek endpoint reachable with the available credentials.
- Model identifiers on the gateway (`deepseek-v4-pro`, `claude-sonnet-4.6`, `gpt-6-luna`, …) are
  **gateway-specific aliases**, not the vendors' canonical model IDs. Hard-coding them would tie the
  product to this reseller.
- The account currently **cannot execute any completion (402)**. No AI feature can be built or
  tested until billing is resolved or a first-party key is supplied.

This is a material architectural constraint, captured as **D2** in `PHASE0_REVIEW.md` and in
`AI_AGENTS.md §2`. The provider-abstraction requirement survives — the adapter interface is still
the right design — but the *default* adapter must be an OpenAI-compatible one with a configurable
base URL, model-alias map, and optional native adapters behind flags.

### 4.2 What this means for data protection

Routinely sending resumes, employment history, recruiter emails, and job applications through a
reseller that was not vetted for data retention creates a PII/confidentiality exposure that the spec
does not address. Recommendation in `SECURITY.md §7`: treat the relay as untrusted, prefer
first-party provider accounts for anything containing personal data, and make the base URL a
deployment decision rather than a hard-coded constant.

---

## 5. Agent capability matrix

| Capability | Available | Notes |
|---|---|---|
| Read/write project files | Yes | Scoped to `d:\Ratnesh\Projects\careeros` plus a session scratchpad |
| Run shell commands | Yes | PowerShell 5.1 semantics; `&&`/ternary/`??` are **not** available |
| Long-running background processes | Yes | Dev servers, watchers, Inngest dev server |
| Docker | Yes | Daemon running; can start isolated Postgres/Supabase containers |
| Network egress | Yes | npm, API endpoints reachable |
| Install packages | Yes | pnpm via registry |
| Headless browser automation | Yes | Playwright browsers cached |
| Create cloud accounts / projects | **No** | Requires the owner (Supabase project, Google Cloud OAuth client, Inngest account, Vercel login) |
| Complete OAuth consent flow | **No** | Requires the owner at a browser |
| Fund an AI account | **No** | Requires the owner |
| Authenticate a job board | **No** | Also prohibited by the spec where it violates access rules |

Implication: all work requiring account creation, billing, or interactive OAuth is **owner-blocking**.
Those items are isolated in the decision register so development is not stalled by them.

---

## 6. Constraints that must shape implementation

1. **No scraping.** No authorised API access exists for LinkedIn, Naukri, Wellfound, Instahyre,
   Foundit, or Indeed, and the spec forbids bypassing access controls. MVP job intake is therefore
   manual: paste text, import a URL the user supplies, upload a file, or forward an alert.
2. **Windows is the development host, Linux is the deployment target.** All scripts must be
   cross-platform. No POSIX-only shell assumptions, no Windows-only paths in committed code, no
   `NUL`/`/dev/null` divergence in npm scripts.
3. **Node 24 is newer than most tooling expects.** Fine for Next.js 16; watch for packages with
   `engines` upper bounds.
4. **TypeScript 7.0.2 is now `latest`, but `typescript-eslint@8.72.2` declares
   `typescript >=4.8.4 <6.1.0`.** Installing TS 7 breaks typed linting. Pin TypeScript **5.9.3**.
5. **Port 3000 is occupied.** Web dev must run on 3001 (configurable via `PORT`).
6. **15.2 GB RAM shared with an active Docker stack.** Running Supabase local (7+ containers),
   Next.js, a worker, and Chromium simultaneously is feasible but leaves limited headroom.
   Recommend Supabase cloud for day-to-day development, local stack only for migration testing.
7. **The gateway 402 must be resolved before Phase 3.** Profile CRUD, job storage, and document
   templating do not need AI; matching, extraction, and generation do.

---

## 7. Audit verdict

| Question | Answer |
|---|---|
| Is the environment capable of running the target stack? | **Yes** — Node 24, pnpm 11, Docker, Playwright browsers, and network access are all present |
| Does any part of the target stack need to change? | **Yes** — the AI provider layer (gateway-only, currently unpaid) and the database workflow (no Supabase project/credentials) |
| Are there hard blockers before feature work? | **Yes, two:** no Supabase project/credentials, and the AI gateway is unfunded (402) |
| Can Phase 1 (foundation, DB, auth shell) start immediately? | **Almost** — it needs a Supabase project URL/keys, or explicit approval to use the local Supabase stack |
| Is the repository safe to initialise? | **Yes** — greenfield, no risk of clobbering existing work |
