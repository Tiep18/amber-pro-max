-- Keep production-critical scheduled work inside Supabase so Vercel Hobby
-- deployments do not depend on minute-level Vercel Cron. All extension
-- references are dynamic because local Supabase projects may not have Cron,
-- pg_net, or Vault enabled when migrations are reset or linted.

create or replace function private.invoke_transactional_email_outbox()
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  vault_schema text := 'vault';
  vault_view text := 'decrypted_' || 'secrets';
  net_schema text := 'net';
  site_url_secret_name constant text := 'transactional_email_site_url';
  worker_secret_name constant text := 'transactional_email_worker_secret';
  site_url text;
  worker_secret text;
  request_id bigint;
  dynamic_sql text;
begin
  if to_regclass(vault_schema || '.' || vault_view) is null
    or to_regnamespace(net_schema) is null then
    return null;
  end if;

  dynamic_sql := 'select'
    || ' max(case when name = $1 then decrypted_secret end),'
    || ' max(case when name = $2 then decrypted_secret end)'
    || ' from ' || vault_schema || '.' || vault_view
    || ' where name in ($1, $2)';
  execute dynamic_sql
    into site_url, worker_secret
    using site_url_secret_name, worker_secret_name;

  site_url := nullif(btrim(site_url), '');
  worker_secret := nullif(btrim(worker_secret), '');
  if site_url is null or worker_secret is null then
    return null;
  end if;

  dynamic_sql := 'select ' || net_schema || '.http_post('
    || 'url := $1, headers := $2, body := $3)';
  execute dynamic_sql
    into request_id
    using
      rtrim(site_url, '/') || '/api/fulfillment/email-outbox',
      jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || worker_secret
      ),
      jsonb_build_object();

  return request_id;
exception
  when invalid_schema_name or undefined_table or undefined_function then
    -- An extension may have been disabled after the job was installed.
    return null;
end;
$$;

revoke all on function private.invoke_transactional_email_outbox()
  from public, anon, authenticated;

create or replace function private.repair_scheduled_jobs()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  cron_schema text := 'cron';
  cron_job_table text := 'job';
  cron_schedule_function text := 'schedule';
  cron_unschedule_function text := 'unschedule';
  expiry_job_name constant text := 'trusted-payment-expiry';
  email_job_name constant text := 'transactional-email-outbox';
  expiry_job_id bigint;
  email_job_id bigint;
  existing_job_ids bigint[];
  existing_job_id bigint;
  dynamic_sql text;
  email_dependencies_available boolean;
begin
  if to_regnamespace(cron_schema) is null then
    return jsonb_build_object(
      'cronAvailable', false,
      'paymentExpiryScheduled', false,
      'transactionalEmailOutboxScheduled', false
    );
  end if;

  -- Replace every job with this name so rerunning the repair cannot leave
  -- duplicate or stale schedules behind.
  dynamic_sql := 'select array_agg(jobid) from '
    || cron_schema || '.' || cron_job_table || ' where jobname = $1';
  execute dynamic_sql into existing_job_ids using expiry_job_name;
  foreach existing_job_id in array coalesce(existing_job_ids, array[]::bigint[])
  loop
    dynamic_sql := 'select ' || cron_schema || '.' || cron_unschedule_function || '($1)';
    execute dynamic_sql using existing_job_id;
  end loop;

  dynamic_sql := 'select ' || cron_schema || '.' || cron_schedule_function
    || '($1, $2, $3)';
  execute dynamic_sql
    into expiry_job_id
    using
      expiry_job_name,
      '* * * * *',
      'select public.expire_due_payments(100);';

  email_dependencies_available :=
    to_regnamespace('net') is not null
    and to_regclass('vault.' || ('decrypted_' || 'secrets')) is not null;

  dynamic_sql := 'select array_agg(jobid) from '
    || cron_schema || '.' || cron_job_table || ' where jobname = $1';
  execute dynamic_sql into existing_job_ids using email_job_name;
  foreach existing_job_id in array coalesce(existing_job_ids, array[]::bigint[])
  loop
    dynamic_sql := 'select ' || cron_schema || '.' || cron_unschedule_function || '($1)';
    execute dynamic_sql using existing_job_id;
  end loop;

  if email_dependencies_available then
    dynamic_sql := 'select ' || cron_schema || '.' || cron_schedule_function
      || '($1, $2, $3)';
    execute dynamic_sql
      into email_job_id
      using
        email_job_name,
        '*/5 * * * *',
        'select private.invoke_transactional_email_outbox();';
  end if;

  return jsonb_build_object(
    'cronAvailable', true,
    'paymentExpiryScheduled', expiry_job_id is not null,
    'transactionalEmailOutboxScheduled', email_job_id is not null
  );
end;
$$;

revoke all on function private.repair_scheduled_jobs()
  from public, anon, authenticated;

-- Run once during migration and allow operators to rerun the same function
-- from the Supabase SQL editor after enabling or repairing extensions.
select private.repair_scheduled_jobs();
