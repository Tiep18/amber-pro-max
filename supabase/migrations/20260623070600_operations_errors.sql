create table public.operational_errors (
  id uuid primary key default gen_random_uuid(),
  area text not null check (area in ('application', 'payment', 'email', 'fulfillment', 'checkout', 'admin')),
  severity text not null default 'error' check (severity in ('warning', 'error', 'critical')),
  status text not null default 'unresolved' check (status in ('unresolved', 'resolved')),
  error_code text not null check (error_code ~ '^[a-z0-9_:-]+$'),
  summary text not null check (length(btrim(summary)) > 0 and length(summary) <= 300),
  sanitized_facts jsonb not null default '{}'::jsonb check (jsonb_typeof(sanitized_facts) = 'object'),
  occurrence_count integer not null default 1 check (occurrence_count > 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'resolved' and resolved_at is not null)
    or (status = 'unresolved' and resolved_at is null and resolved_by is null)
  )
);

create index operational_errors_status_last_seen_idx
on public.operational_errors (status, last_seen_at desc);

create or replace function private.operational_error_safe_json(value jsonb)
returns boolean
language plpgsql
immutable
security definer
set search_path = public, private, pg_temp
as $$
declare
  serialized text;
begin
  if value is null or jsonb_typeof(value) <> 'object' then
    return false;
  end if;

  serialized := lower(value::text);
  return serialized !~ '(authorization|bearer|cookie|password|secret|signature|token|signed[ _-]?url|raw[ _-]?payload|stack|trace|address|phone)'
    and serialized !~ '[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}'
    and serialized !~ 'eyj[a-z0-9_-]{10,}';
end;
$$;

create or replace function private.enforce_operational_error_safety()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if lower(new.summary) ~ '(authorization|bearer|cookie|password|secret|signature|token|signed[ _-]?url|raw[ _-]?payload|stack|trace|address|phone)'
    or lower(new.summary) ~ '[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}'
    or lower(new.summary) ~ 'eyj[a-z0-9_-]{10,}' then
    new.summary = 'Operational error details redacted';
  end if;

  if not private.operational_error_safe_json(new.sanitized_facts) then
    raise exception 'unsafe operational error facts';
  end if;

  new.updated_at = now();
  if new.status = 'resolved' and new.resolved_at is null then
    new.resolved_at = now();
  end if;
  if new.status = 'unresolved' then
    new.resolved_at = null;
    new.resolved_by = null;
  end if;

  return new;
end;
$$;

create trigger operational_errors_safe_before_write
before insert or update on public.operational_errors
for each row execute function private.enforce_operational_error_safety();

alter table public.operational_errors enable row level security;

revoke all on table public.operational_errors from anon, authenticated;
grant select, insert, update, delete on table public.operational_errors to authenticated;
grant select, insert, update, delete on table public.operational_errors to service_role;

create policy operational_errors_admin_all on public.operational_errors
for all to authenticated
using (private.is_admin())
with check (private.is_admin());
