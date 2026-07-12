\if :{?phase8_disposable_non_production}
\else
  \echo '1..0 # SKIP Phase 8 rehearsal requires phase8_disposable_non_production=true on a disposable non-production database'
  \quit
\endif

\if :phase8_disposable_non_production
\else
  \echo '1..0 # SKIP phase8_disposable_non_production must equal true'
  \quit
\endif

-- This rehearsal is forward-only. It never deletes migration history and has no down migration.
create temporary table phase8_rehearsal_before as
select
  (
    select md5(coalesce(string_agg(
      jsonb_build_array(
        id, profile_id, country_code, currency_code,
        first_item_fee_minor, additional_item_fee_minor, active
      )::text,
      '|' order by id
    ), ''))
    from public.shipping_rules
    where country_code is not null
  ) as exact_rows_checksum,
  (
    select md5(coalesce(string_agg(pg_get_constraintdef(c.oid), '|' order by c.conname), ''))
    from pg_constraint c
    where c.conrelid = 'public.shipping_rules'::regclass
  ) as legacy_constraints_checksum,
  (
    select md5(coalesce(string_agg(pg_get_indexdef(i.indexrelid), '|' order by ci.relname), ''))
    from pg_index i
    join pg_class ci on ci.oid = i.indexrelid
    where i.indrelid = 'public.shipping_rules'::regclass
  ) as legacy_indexes_checksum;

-- Apply the canonical body inside a transaction and force SQLSTATE P0001.
\echo 'PHASE8_BEFORE_CHECKSUMS'
table phase8_rehearsal_before;

\set ON_ERROR_STOP off
begin;
\ir ../../migrations/20260712080100_shipping_profile_fallbacks_regions.sql
do $$ begin raise exception 'phase8_forced_failure' using errcode = 'P0001'; end $$;
rollback;
\set ON_ERROR_STOP on

do $$
declare
  before_record record;
  current_rows text;
  current_constraints text;
  current_indexes text;
begin
  select * into before_record from phase8_rehearsal_before;
  select md5(coalesce(string_agg(
    jsonb_build_array(
      id, profile_id, country_code, currency_code,
      first_item_fee_minor, additional_item_fee_minor, active
    )::text,
    '|' order by id
  ), ''))
  into current_rows
  from public.shipping_rules
  where country_code is not null;
  select md5(coalesce(string_agg(pg_get_constraintdef(c.oid), '|' order by c.conname), ''))
  into current_constraints
  from pg_constraint c
  where c.conrelid = 'public.shipping_rules'::regclass;
  select md5(coalesce(string_agg(pg_get_indexdef(i.indexrelid), '|' order by ci.relname), ''))
  into current_indexes
  from pg_index i
  join pg_class ci on ci.oid = i.indexrelid
  where i.indrelid = 'public.shipping_rules'::regclass;

  if before_record.exact_rows_checksum is distinct from current_rows
    or before_record.legacy_constraints_checksum is distinct from current_constraints
    or before_record.legacy_indexes_checksum is distinct from current_indexes then
    raise exception 'phase8 forced-failure rollback changed exact rows or legacy catalog';
  end if;

  if to_regclass('public.shipping_store_defaults') is not null
    or exists (
      select 1 from supabase_migrations.schema_migrations
      where version = '20260712080100'
    ) then
    raise exception 'phase8 forced-failure rollback left schema or migration-history state';
  end if;
end;
$$;

\echo 'PHASE8_FORCED_FAILURE_ROLLBACK_OK'

-- Clean canonical reapply in one transaction.
begin;
\ir ../../migrations/20260712080100_shipping_profile_fallbacks_regions.sql
commit;
\echo 'PHASE8_CLEAN_REAPPLY_OK'

-- Forward-only repair drill. Run after a clean canonical reapply and deliberate removal
-- of only the named Phase 8 check/index in this disposable database.
alter table public.shipping_rules
  drop constraint if exists shipping_rules_destination_shape_check;
drop index if exists public.shipping_rules_fallback_unique_idx;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.shipping_rules'::regclass
      and conname = 'shipping_rules_destination_shape_check'
  ) then
    alter table public.shipping_rules
      add constraint shipping_rules_destination_shape_check check (
        (match_kind = 'exact_country' and country_code is not null and country_code ~ '^[A-Z]{2}$')
        or (match_kind = 'fallback' and country_code is null)
      );
  end if;
end;
$$;

create unique index if not exists shipping_rules_fallback_unique_idx
on public.shipping_rules (profile_id, currency_code)
where match_kind = 'fallback';

do $$
declare
  before_rows text;
  after_rows text;
begin
  select exact_rows_checksum into before_rows from phase8_rehearsal_before;
  select md5(coalesce(string_agg(
    jsonb_build_array(
      id, profile_id, country_code, currency_code,
      first_item_fee_minor, additional_item_fee_minor, active
    )::text,
    '|' order by id
  ), ''))
  into after_rows
  from public.shipping_rules
  where match_kind = 'exact_country';

  if before_rows is distinct from after_rows then
    raise exception 'phase8 exact-row checksum changed during forward repair';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.shipping_rules'::regclass
      and conname = 'shipping_rules_destination_shape_check'
  ) or to_regclass('public.shipping_rules_fallback_unique_idx') is null then
    raise exception 'phase8 forward repair did not restore required catalog objects';
  end if;
end;
$$;

\echo 'PHASE8_FORWARD_REPAIR_OK'
