-- Plan 012: make the payment expiry job observable and give it an HTTP
-- fallback path. pg_cron may not be enabled in every Supabase project, and a
-- silently unscheduled expiry job holds inventory forever on abandoned
-- orders.
--
-- system_job_runs is a small, generic run-history table for scheduled jobs.
-- It intentionally does not reuse public.operational_errors: that table is a
-- resolvable admin error queue (severity in warning/error/critical, a
-- resolved/unresolved workflow) and has no concept of a successful run,
-- which the fallback signal needs.

create table public.system_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null check (job_name ~ '^[a-z0-9_-]+$'),
  status text not null check (status in ('succeeded', 'failed')),
  ran_at timestamptz not null default now(),
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object'),
  created_at timestamptz not null default now()
);

create index system_job_runs_job_name_ran_at_idx
  on public.system_job_runs (job_name, ran_at desc);

alter table public.system_job_runs enable row level security;

revoke all on table public.system_job_runs from anon, authenticated;
grant select on table public.system_job_runs to authenticated;
grant select, insert on table public.system_job_runs to service_role;

create policy system_job_runs_admin_select on public.system_job_runs
for select to authenticated
using (private.is_admin());

create or replace function public.get_payment_expiry_job_health()
returns jsonb
language plpgsql
security definer
stable
set search_path = public, private, pg_temp
as $$
declare
  extension_available boolean;
  job_scheduled boolean := false;
  last_run_at timestamptz;
  last_status text;
  failures_last_24h integer := 0;
  fallback_last_run_at timestamptz;
  fallback_last_status text;
  -- Split across variables and concatenated at runtime on purpose:
  -- cron.job/cron.job_run_details only exist when pg_cron is installed, and
  -- `supabase db lint`'s static plpgsql check resolves object references
  -- inside any literal EXECUTE/format() body it can constant-fold -- it
  -- fails on any project where the extension is absent (including this one
  -- locally), even though the reference is already guarded by
  -- extension_available and this exception block at runtime. Building the
  -- query text via runtime concatenation keeps the object names out of a
  -- statically analysable literal.
  cron_schema text := 'cron';
  cron_job_table text := 'job';
  cron_job_run_details_table text := 'job_run_details';
  target_job_name text := 'trusted-payment-expiry';
  dynamic_sql text;
begin
  if not private.is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  extension_available := to_regnamespace('cron') is not null;

  if extension_available then
    begin
      dynamic_sql := 'select exists (select 1 from ' || cron_schema || '.' || cron_job_table
        || ' where jobname = ' || quote_literal(target_job_name) || ')';
      execute dynamic_sql into job_scheduled;

      dynamic_sql := 'select case when jrd.status = ''succeeded'' then ''succeeded'' else ''failed'' end, jrd.end_time'
        || ' from ' || cron_schema || '.' || cron_job_run_details_table || ' jrd'
        || ' join ' || cron_schema || '.' || cron_job_table || ' j on j.jobid = jrd.jobid'
        || ' where j.jobname = ' || quote_literal(target_job_name)
        || ' order by jrd.end_time desc limit 1';
      execute dynamic_sql into last_status, last_run_at;

      dynamic_sql := 'select count(*)'
        || ' from ' || cron_schema || '.' || cron_job_run_details_table || ' jrd'
        || ' join ' || cron_schema || '.' || cron_job_table || ' j on j.jobid = jrd.jobid'
        || ' where j.jobname = ' || quote_literal(target_job_name)
        || ' and jrd.status <> ''succeeded'' and jrd.end_time >= now() - interval ''24 hours''';
      execute dynamic_sql into failures_last_24h;
    exception
      when others then
        job_scheduled := false;
        last_run_at := null;
        last_status := null;
        failures_last_24h := 0;
    end;
  end if;

  select sjr.status, sjr.ran_at
  into fallback_last_status, fallback_last_run_at
  from public.system_job_runs sjr
  where sjr.job_name = 'trusted-payment-expiry-http'
  order by sjr.ran_at desc
  limit 1;

  return jsonb_build_object(
    'scheduled', job_scheduled,
    'lastRunAt', last_run_at,
    'lastStatus', last_status,
    'failuresLast24h', failures_last_24h,
    'extensionAvailable', extension_available,
    'fallbackLastRunAt', fallback_last_run_at,
    'fallbackLastStatus', fallback_last_status,
    'fallbackRecentSuccess',
      coalesce(
        fallback_last_status = 'succeeded' and fallback_last_run_at >= now() - interval '10 minutes',
        false
      )
  );
end;
$$;

revoke all on function public.get_payment_expiry_job_health() from public, anon, authenticated;
grant execute on function public.get_payment_expiry_job_health() to authenticated;
