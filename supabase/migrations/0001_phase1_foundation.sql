-- ============================================================================
-- CareerOS — Phase 1 foundation
--
-- Scope: identity, tenancy, and the career profile shell only.
-- Tables from the approved 35-table design that belong to later phases are
-- intentionally NOT created here. Each later phase adds its own migration.
-- ============================================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------ enum types
create type public.workspace_role as enum ('owner', 'admin', 'member');

-- ---------------------------------------------------------------------- users
-- Mirrors auth.users. Identity is owned by Supabase Auth; this table holds only
-- application-level profile data.
create table public.users (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text,
  avatar_url text,
  timezone   text not null default 'Asia/Kolkata',
  locale     text not null default 'en-IN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index users_email_lower_key on public.users (lower(email));

-- ----------------------------------------------------------------- workspaces
create table public.workspaces (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null,
  owner_id         uuid not null references public.users (id) on delete restrict,
  default_currency char(3) not null default 'INR',
  is_personal      boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint workspaces_slug_key unique (slug)
);

-- ----------------------------------------------------------- workspace_members
create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid not null references public.users (id) on delete cascade,
  role         public.workspace_role not null default 'member',
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_idx on public.workspace_members (user_id);

-- ------------------------------------------------------------ career_profiles
create table public.career_profiles (
  id                      uuid primary key default gen_random_uuid(),
  workspace_id            uuid not null references public.workspaces (id) on delete cascade,
  user_id                 uuid not null references public.users (id) on delete cascade,
  full_name               text,
  phone                   text,
  city                    text,
  country                 text not null default 'India',
  headline                text,
  summary                 text,
  current_designation     text,
  current_company         text,
  total_experience_months int check (total_experience_months >= 0),
  notice_period_days      int check (notice_period_days >= 0),
  linkedin_url            text,
  github_url              text,
  portfolio_url           text,
  other_links             jsonb not null default '[]'::jsonb,
  is_primary              boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint career_profiles_workspace_user_key unique (workspace_id, user_id),
  -- Required as the target of composite foreign keys in later phases, and it
  -- makes cross-workspace references impossible once child tables exist.
  constraint career_profiles_id_workspace_key unique (id, workspace_id)
);

create index career_profiles_workspace_idx on public.career_profiles (workspace_id);

-- -------------------------------------------------------------- helper funcs
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

/**
 * True when the current session user belongs to the given workspace.
 * SECURITY DEFINER is required so the membership check can read
 * workspace_members without recursing into its own policy.
 */
create or replace function public.is_workspace_member(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = ws
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.workspace_role_of(ws uuid)
returns public.workspace_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.role
  from public.workspace_members m
  where m.workspace_id = ws
    and m.user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.workspace_role_of(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated, service_role;
grant execute on function public.workspace_role_of(uuid) to authenticated, service_role;

-- ----------------------------------------------------------- signup trigger
/**
 * Provisions a new account in a single transaction:
 *   application user row -> personal workspace -> owner membership -> empty profile.
 *
 * Runs as the function owner so it can write across tables that the new user
 * cannot yet access (they have no membership until this completes).
 */
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  display_name         text;
  new_workspace_id     uuid;
  new_workspace_slug   text;
begin
  display_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');

  insert into public.users (id, email, full_name)
  values (new.id, coalesce(new.email, ''), display_name)
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  select m.workspace_id
    into new_workspace_id
    from public.workspace_members m
   where m.user_id = new.id
   limit 1;

  if new_workspace_id is null then
    new_workspace_slug := 'ws-' || replace(new.id::text, '-', '');

    insert into public.workspaces (name, slug, owner_id)
    values (
      -- Prefer the name supplied at signup; otherwise a neutral label. The email
      -- local-part is deliberately not used, because it leaks the address into
      -- the workspace title shown on every page.
      coalesce(nullif(display_name, '') || '''s workspace', 'Personal workspace'),
      new_workspace_slug,
      new.id
    )
    returning id into new_workspace_id;

    insert into public.workspace_members (workspace_id, user_id, role)
    values (new_workspace_id, new.id, 'owner');

    -- An empty profile is created; no professional facts are ever inferred.
    insert into public.career_profiles (workspace_id, user_id, full_name, country)
    values (new_workspace_id, new.id, display_name, 'India');
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ------------------------------------------------------------ updated_at
do $$
declare
  t text;
begin
  foreach t in array array['users', 'workspaces', 'career_profiles'] loop
    execute format(
      'create trigger %I_updated_at before update on public.%I
         for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end
$$;

-- ------------------------------------------------------------------ grants
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete
  on public.users, public.workspaces, public.workspace_members, public.career_profiles
  to authenticated;

grant all
  on public.users, public.workspaces, public.workspace_members, public.career_profiles
  to service_role;

-- ============================================================================
-- Row Level Security
-- Default posture is deny: a table with no applicable policy returns no rows.
-- ============================================================================

alter table public.users enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.career_profiles enable row level security;

-- users: a session may only read and update its own row.
create policy users_select_self on public.users
  for select to authenticated
  using (id = auth.uid());

create policy users_update_self on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- workspaces: members can read; only owner/admin can modify.
create policy workspaces_select_member on public.workspaces
  for select to authenticated
  using (public.is_workspace_member(id));

create policy workspaces_update_admin on public.workspaces
  for update to authenticated
  using (public.workspace_role_of(id) in ('owner', 'admin'))
  with check (public.workspace_role_of(id) in ('owner', 'admin'));

-- workspace_members: a user can always read their own membership; other rows
-- require membership of the same workspace. Only owner/admin can write.
create policy workspace_members_select on public.workspace_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy workspace_members_insert_admin on public.workspace_members
  for insert to authenticated
  with check (public.workspace_role_of(workspace_id) in ('owner', 'admin'));

create policy workspace_members_update_admin on public.workspace_members
  for update to authenticated
  using (public.workspace_role_of(workspace_id) in ('owner', 'admin'))
  with check (public.workspace_role_of(workspace_id) in ('owner', 'admin'));

create policy workspace_members_delete_admin on public.workspace_members
  for delete to authenticated
  using (public.workspace_role_of(workspace_id) in ('owner', 'admin'));

-- career_profiles: standard tenant access for workspace members.
create policy career_profiles_select_member on public.career_profiles
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy career_profiles_insert_member on public.career_profiles
  for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy career_profiles_update_member on public.career_profiles
  for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy career_profiles_delete_member on public.career_profiles
  for delete to authenticated
  using (public.is_workspace_member(workspace_id));
