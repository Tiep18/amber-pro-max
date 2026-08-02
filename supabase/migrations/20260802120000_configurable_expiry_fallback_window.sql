-- `get_payment_expiry_job_health` hard-coded a 10 minute freshness window for
-- the HTTP fallback. That silently assumes the fallback runs at least every
-- 10 minutes, which is only true on hosting plans that allow minute-level
-- cron. A shop on a plan capped at one cron run per day would see the launch
-- gate report "blocked" forever even though the fallback is working exactly
-- as configured — the gate would be lying about a healthy system.
--
-- Take the expected interval as a parameter instead, defaulting to the
-- previous behaviour, and treat a run as fresh if it landed within two
-- intervals (one missed tick of slack).

create or replace function public.get_payment_expiry_job_health(
  p_fallback_interval_minutes integer default 5
)
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
  -- Two intervals of slack: one missed tick should not flip the gate.
  fallback_window_minutes integer := least(greatest(coalesce(p_fallback_interval_minutes, 5), 1), 1440) * 2;
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
    'fallbackWindowMinutes', fallback_window_minutes,
    'fallbackRecentSuccess',
      coalesce(
        fallback_last_status = 'succeeded'
          and fallback_last_run_at >= now() - make_interval(mins => fallback_window_minutes),
        false
      )
  );
end;
$$;

-- The old zero-argument signature would otherwise linger as an overload.
drop function if exists public.get_payment_expiry_job_health();

revoke all on function public.get_payment_expiry_job_health(integer) from public, anon, authenticated;
grant execute on function public.get_payment_expiry_job_health(integer) to authenticated;
