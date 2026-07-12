\if :{?phase8_disposable_non_production}
\else
  \echo '1..0 # SKIP Phase 8 rehearsal requires phase8_disposable_non_production=1 on a disposable non-production database'
  \quit
\endif

\if :phase8_disposable_non_production
\else
  \echo '1..0 # SKIP phase8_disposable_non_production must equal 1'
  \quit
\endif

-- This rehearsal is forward-only. It never deletes migration history and has no down migration.
create temporary table phase8_rehearsal_before as
select
  md5(coalesce(string_agg(row_to_json(r)::text, '|' order by r.id), '')) as exact_rows_checksum,
  md5(coalesce(string_agg(pg_get_constraintdef(c.oid), '|' order by c.conname), '')) as legacy_constraints_checksum,
  md5(coalesce(string_agg(pg_get_indexdef(i.indexrelid), '|' order by ci.relname), '')) as legacy_indexes_checksum
from public.shipping_rules r
cross join pg_constraint c
join pg_class ct on ct.oid = c.conrelid and ct.relname = 'shipping_rules'
join pg_namespace nt on nt.oid = ct.relnamespace and nt.nspname = 'public'
cross join pg_index i
join pg_class ti on ti.oid = i.indrelid and ti.relname = 'shipping_rules'
join pg_namespace ni on ni.oid = ti.relnamespace and ni.nspname = 'public'
join pg_class ci on ci.oid = i.indexrelid
where r.country_code is not null;

-- Run the canonical migration in one transaction in the disposable database, then force
-- SQLSTATE P0001. The caller must verify the transaction rollback preserves this checksum
-- and that no migration-history row was recorded before the clean canonical reapply.
\echo 'PHASE8_BEFORE_CHECKSUMS'
table phase8_rehearsal_before;
\echo 'Apply supabase/migrations/20260712080100_shipping_profile_fallbacks_regions.sql inside BEGIN here, then run: DO $$ BEGIN RAISE EXCEPTION ''phase8_forced_failure''; END $$;'

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
        (match_kind = 'exact_country' and country_code ~ '^[A-Z]{2}$')
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
  select md5(coalesce(string_agg(row_to_json(r)::text, '|' order by r.id), ''))
  into after_rows
  from public.shipping_rules r
  where r.match_kind = 'exact_country';

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
