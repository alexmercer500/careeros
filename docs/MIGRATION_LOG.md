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
