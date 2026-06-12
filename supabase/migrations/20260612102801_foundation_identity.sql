create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  preferred_locale text not null default 'vi' check (preferred_locale in ('vi', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role = 'admin'),
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  note text
);

create index profiles_preferred_locale_idx on public.profiles (preferred_locale);
create index user_roles_role_idx on public.user_roles (role);

create or replace function private.is_admin()
returns boolean
language sql
security definer
stable
set search_path = private, public, pg_temp
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.user_roles from anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (email, preferred_locale, updated_at) on table public.profiles to authenticated;
grant select on table public.user_roles to authenticated;

create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id or private.is_admin());

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "user_roles_select_admin"
on public.user_roles
for select
to authenticated
using (private.is_admin());
