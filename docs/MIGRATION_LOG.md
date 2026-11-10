# Migration Log

Evidence record for the Supabase → local-first migration. Every stage appends its acceptance
evidence here. Nothing in this file is a claim without a command output behind it.

---

## Stage 1 — Backup and verification

**Date:** 2026-11-10
**Status:** ✅ Complete — acceptance criteria met
**Scope:** create a verified backup of the live Supabase database before any migration work.

### Environment discovered

| Item | Value |
|---|---|
| Source container | `supabase_db_careeros` |
| Source image | `public.ecr.aws/supabase/postgres:17.11.0.018` |
| **Source PostgreSQL version** | **17.11** |
| `pg_dump` version in container | 17.11 |
| Database size | 12 MB |
| Storage objects | **0** (`storage.objects` count) |
| Storage volume size | 0 B |
| Docker data volume | `supabase_db_careeros` — 82.01 MB |

**Correction to the approved design:** the plan assumed PostgreSQL 16. The source is 17.11, and a
PG17 dump cannot be restored into PG16. The target image is therefore `postgres:17-alpine`
(verification container reported exactly 17.11). `docs/LOCAL_FIRST_ARCHITECTURE.md` was updated.

### 1. Backup artefacts

| Artefact | Value |
|---|---|
| File | `backups/2026-11-10-pre-migration.dump` |
| Format | PostgreSQL custom (`-Fc`) |
| Size | 452,772 bytes |
| SHA-256 | `3B5CF9317A6AF92DF8C9B5BAE3E31A2B00E352BD4633823CA16BEBB89EDB2998` |
| Manifest | `backups/2026-11-10-pre-migration-manifest.txt` (760 objects) |
| Manifest coverage | all 12 policies, 4 tables, enum, functions, triggers, indexes, constraints |

`backups/` and `var/` were added to `.gitignore`; dumps never enter version control.

### 2. Archive integrity

`pg_restore -l` parsed the archive and listed 760 objects, including:

```
POLICY public career_profiles career_profiles_select_member postgres
POLICY public users users_select_self postgres
POLICY public workspace_members workspace_members_select postgres
POLICY public workspaces workspaces_select_member postgres
… 12 in total
```

### 3. Restore verification

Performed in a **separate disposable PostgreSQL 17.11 container** (`careeros_verify_pg` on
`127.0.0.1:55434`). The Supabase container, its volume and its data were never targeted by a restore.

Two Supabase-provided objects are required for a faithful restore of the dump, so minimal stubs were
created in the scratch database: the `authenticated`/`anon`/`service_role` roles, and `auth.users`
containing the single source user id (`b5ec8754-a39f-46e1-a392-90def69debc1`) plus an `auth.uid()`
function. This mirrors the environment the dump was taken from; it does not modify the source.

```
$ pg_restore --no-owner --no-privileges --schema=public /tmp/backup.dump
restore exit: 0
error lines: 0
```

### 4. Object comparison (source vs restored)

| Item | Source | Restored |
|---|---|---|
| `public.users` rows | 1 | 1 |
| `public.workspaces` rows | 1 | 1 |
| `public.workspace_members` rows | 1 | 1 |
| `public.career_profiles` rows | 1 | 1 |
| Policies | 12 | 12 |
| Triggers | 3 | 3 |
| Functions (`public`) | 4 | 4 |
| Enums (`public`) | 1 | 1 |
| Tables with RLS enabled | 4 | 4 |

### 5. Content comparison (row-level checksums)

| Table | Source MD5 | Restored MD5 | Match |
|---|---|---|---|
| `users` | `c4c98866a6d2ff8db2b288a5de89b389` | same | ✅ |
| `workspaces` | `e91faaacbf9abbd9bd7a0c56229b5d4b` | same | ✅ |
| `workspace_members` | `a705a24f4e89b01fc4e3f91602d2e833` | same | ✅ |
| `career_profiles` | `504c706dd080e45acbc4147a293e60ea` | same | ✅ |

**Verdict: IDENTICAL.** The backup is complete and restorable, not merely present.

### 6. Notes for later stages

1. **PostgreSQL major version is 17**, not 16. All stages must target `postgres:17-alpine`.
2. The dump contains Supabase-internal schemas (`auth`, `storage`, `realtime`, `graphql`) and
   Supabase roles. The migration copies only `public` data; Better Auth creates its own `auth` schema.
   A full-database restore into a plain cluster is therefore *not* the cutover mechanism — the
   verified `public` restore is.
3. `storage.objects` is empty and the storage volume is 0 B, confirming there is no binary storage to
   migrate. The local filesystem adapter starts empty.
4. The backup depends on `auth.users` only through one foreign key (`users_id_fkey`). When copying
   data in Stage 4, the Better Auth `auth.user` row must exist first — the copy order is already
   planned that way.
5. **Stage 0 caveat:** the compatibility suite ran on PostgreSQL 16. Stage 3 must re-run it against 17
   before the schema is accepted.

### Acceptance criteria

| Criterion | Result |
|---|---|
| Backup exists and is non-trivial | ✅ 452,772 bytes |
| Archive parses completely | ✅ 760 objects listed |
| Restore succeeds with no errors | ✅ exit 0, 0 errors |
| Row counts match | ✅ 4/4 tables |
| Content matches | ✅ all four content hashes identical |
| Schema objects match | ✅ policies, triggers, functions, enum, RLS |
| Source data untouched | ✅ no write to the Supabase database |
| Rollback available | ✅ archive retained in `backups/` (gitignored) |

### Cleanup

The verification container `careeros_verify_pg` was removed after the checks. No Docker volume was
created for it. `supabase_db_careeros` and its volumes remain untouched and running.

---

## Stage 2 — Local PostgreSQL and role model

**Date:** 2026-11-10
**Status:** ✅ Complete — 26/26 acceptance checks pass
**Scope:** local PostgreSQL 17 container, persistent volume, port preflight, three-role separation,
permission assertions, persistence across container recreation.

### 1. Compose configuration

`docker-compose.yml` (project `careeros`):

- image `postgres:17-alpine` → server reports **17.11**, matching the source major version
- container `careeros_postgres`, `restart: unless-stopped`, `no-new-privileges`, 256 MB `shm`
- `POSTGRES_DB=careeros`, `POSTGRES_USER=postgres` (bootstrap superuser only)
- `PGDATA=/var/lib/postgresql/data/pgdata` (subdirectory inside the mount)
- port binding `127.0.0.1:${CAREEROS_PG_PORT:-5432}:5432` — **loopback only**
- named volume `careeros_pgdata`, explicitly named so it cannot be confused with the existing
  Supabase, `hikkari-*`, `docker_postgres_data` or `my-turborepo_*` volumes
- healthcheck `pg_isready`, 5 s interval, 12 retries, 15 s start period
- log rotation 10 MB × 3

### 2. Port preflight

`scripts/db-env.mjs` runs before compose:

1. If `careeros_postgres` is already running, reuse its published port (restart-safe).
2. Otherwise try to bind `127.0.0.1:5432`; if taken, try `127.0.0.1:55432`.
3. Persist the choice as `CAREEROS_PG_PORT` in `.env`.
4. Fail with a clear message if neither port is free.

Result on this host:

```json
{ "envFile": "created", "generatedSecrets": [3], "port": 5432, "fallbackUsed": false }
```

Ports 54321/54322 (Supabase) and 15432/6379/6432 (unrelated stacks) are unaffected.

### 3. Role model

Created idempotently by `scripts/db-init.mjs` using the bootstrap superuser, then never used again.

| Role | Login | Attributes | Purpose |
|---|---|---|---|
| `careeros_owner` | yes | `NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION` | owns the database and schema; migrations/DDL only |
| `careeros_app` | yes | same, plus `NOINHERIT`, `CONNECTION LIMIT 20` | the only runtime login; must `SET ROLE` for tenant queries |
| `careeros_authenticated` | no | `NOLOGIN` | policy target assumed inside tenant transactions |

Supporting grants:

- `grant careeros_authenticated to careeros_app`
- `alter database careeros owner to careeros_owner`
- `revoke create on database careeros from public`
- `grant usage on schema public to careeros_app, careeros_authenticated`
- default privileges for `careeros_owner` in `public`: DML on future tables, usage/select on
  sequences, execute on functions → granted to `careeros_authenticated`

The runtime role receives **no** direct table privileges; everything flows through the policy role.

### 4. Permission and security verification

`scripts/verify-db-roles.mjs` → **26/26 passed**:

```
PASS  container health is 'healthy'                                 healthy
PASS  postgres is bound to loopback only                            host=127.0.0.1 port=5432
PASS  published port matches .env                                   binding=5432 env=5432
PASS  persistent volume careeros_pgdata exists
PASS  careeros_owner is not a superuser                             rolsuper=false
PASS  careeros_owner cannot bypass RLS                              rolbypassrls=false
PASS  careeros_app logs in                                          rolcanlogin=true
PASS  careeros_app is not a superuser                               rolsuper=false
PASS  careeros_app cannot bypass RLS                                rolbypassrls=false
PASS  careeros_app cannot create databases or roles                 createdb=false createrole=false
PASS  careeros_app does not inherit privileges (SET ROLE required)  rolinherit=false
PASS  careeros_authenticated cannot log in                          rolcanlogin=false
PASS  migration role owns the database                              owner=careeros_owner
PASS  runtime role owns no relations                                relations=0
PASS  runtime role is a member of the policy role only              authenticated=true owner=false
PASS  migration credentials can run DDL
PASS  runtime role cannot create tables                             sqlstate 42501
PASS  runtime role cannot create schemas                            sqlstate 42501
PASS  runtime role cannot create roles                              sqlstate 42501
PASS  runtime role cannot create databases                          sqlstate 42501
PASS  runtime role cannot alter the database                        sqlstate 42501
PASS  runtime role cannot escalate to the migration role            sqlstate 42501
PASS  runtime role has no CREATE on schema public                   can_create=false
PASS  RLS hides rows from a policy-less table                       rows_visible=0
PASS  runtime role cannot read tenant tables without SET ROLE       sqlstate 42501
PASS  runtime cannot switch row_security off                        sqlstate 42501
```

The RLS probes use a temporary policy-less table: the owner inserts and can see the row, the runtime
sees **0 rows** through the policy role, and `set row_security = off` is rejected with `42501`. The
probe schema was dropped afterwards.

### 5. Persistence test

| Step | Result |
|---|---|
| Write marker row as `careeros_owner` | 1 row |
| `docker compose restart postgres` → read | **1 row**, same timestamp |
| `docker compose down` (**no `-v`**) | container removed, volume `careeros_pgdata` still present |
| `docker compose up -d --wait` | new container id (`740ee7324002` → `36e44d85b9f7`) |
| Read after recreation | **1 row**, same timestamp `2026-11-10 19:04:31.521+00` |
| Re-run `pnpm pg:verify` after recreation | **26/26 passed** (roles survived) |

`docker compose down -v` was never executed. The probe table was dropped after the test.

### 6. Container health

```
status=running health=healthy restarts=0 image=postgres:17-alpine server=17.11
```

### 7. Credential handling

- `.env` is created by the preflight script with 3 generated 32-character secrets.
- `git check-ignore .env` → ignored by `.gitignore:14`.
- No `.env` or `.env.local` file is tracked (`git ls-files` → 0).
- Every generated password value was searched across tracked files with `git grep -F` → **0 leaks**.
- `.env.example` contains placeholders only.

### 8. Files

| File | Change |
|---|---|
| `docker-compose.yml` | new |
| `scripts/db-env.mjs` | new — port preflight + env bootstrap |
| `scripts/db-init.mjs` | new — idempotent role creation |
| `scripts/verify-db-roles.mjs` | new — 26 acceptance checks |
| `scripts/db-persistence.mjs` | new — persistence probe |
| `package.json` | `pg:up`, `pg:down`, `pg:init`, `pg:verify`, `pg:status` |
| `.env.example` | documents the infrastructure secrets and script behaviour |
| `.env` | generated locally, **git-ignored, not committed** |

### Acceptance criteria

| Criterion | Result |
|---|---|
| PostgreSQL 17 in use | ✅ 17.11 |
| Dedicated named volume | ✅ `careeros_pgdata` |
| Loopback-only binding | ✅ `127.0.0.1:5432` |
| Port preflight with fallback | ✅ 5432 chosen, 55432 implemented |
| Runtime role has no DDL/ownership | ✅ assertions pass |
| Runtime role cannot bypass RLS | ✅ attribute + behavioural probes |
| Migration and runtime credentials separate | ✅ distinct roles and passwords |
| Data survives restart and recreation | ✅ identical row and timestamp |
| Supabase untouched | ✅ data intact, volumes untouched |
| No credentials in Git | ✅ 0 leaks |

