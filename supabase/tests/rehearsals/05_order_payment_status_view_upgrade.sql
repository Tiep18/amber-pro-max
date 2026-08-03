\set ON_ERROR_STOP on

-- This is an upgrade-boundary rehearsal, not a steady-state schema test. Run it
-- with `node scripts/run-db-rehearsal.mjs <this file>` after resetting the
-- disposable local database through 20260801150000. A full reset has already
-- applied the migration under test and therefore skips it.
select (
  exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '20260801150000'
  )
  and not exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '20260801160000'
  )
  and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'checkout_orders'
      and column_name = 'customer_transfer_declared_at'
  )
) as at_vietqr_declaration_boundary
\gset

\if :at_vietqr_declaration_boundary
\else
  \echo '1..0 # SKIP VietQR view upgrade rehearsal requires a disposable local reset through 20260801150000'
  \quit
\endif

begin;

-- Reconstruct the linked project's historical projection order. The applied
-- remote migration had currency_code at ordinal 8; later compatibility SQL
-- appended payment_intent immediately before shipping_address.
drop function public.get_order_payment_status(text, text);
drop view public.order_payment_statuses;

create view public.order_payment_statuses
with (security_invoker = true)
as
select
  co.id as order_id,
  co.order_number,
  co.owner_user_id,
  co.guest_secret_hash,
  co.contact_email,
  co.locale,
  co.market,
  co.currency_code,
  co.total_minor,
  co.reservation_expires_at,
  p.id as payment_id,
  p.provider,
  effective.status as payment_status,
  private.payment_customer_status(effective.status) as customer_payment_status,
  case
    when effective.status in ('paid', 'partially_refunded', 'refunded') then 'eligible'
    when effective.status = 'review_required' then 'review_required'
    else 'locked'
  end as fulfillment_gate_status,
  p.digital_fulfillment_status,
  p.physical_fulfillment_status,
  p.refund_status,
  p.refunded_amount_minor,
  coalesce(p.review_reason, co.review_reason) as review_reason,
  p.created_at,
  p.updated_at,
  co.payment_intent,
  co.shipping_address
from public.checkout_orders co
join public.payments p on p.order_id = co.id
cross join lateral (
  select private.payment_effective_status(
    p.status,
    co.paid_gate_status,
    coalesce(p.review_reason, co.review_reason)
  ) as status
) effective;

grant select on table public.order_payment_statuses to service_role;

-- Execute the production artifact. Before the regression fix this must fail
-- with SQLSTATE 42P16 at its CREATE OR REPLACE VIEW statement.
\ir ../../migrations/20260801160000_vietqr_customer_declaration.sql

do $$
declare
  actual_columns text[];
  expected_columns constant text[] := array[
    'order_id',
    'order_number',
    'owner_user_id',
    'guest_secret_hash',
    'contact_email',
    'locale',
    'market',
    'currency_code',
    'total_minor',
    'reservation_expires_at',
    'payment_id',
    'provider',
    'payment_status',
    'customer_payment_status',
    'fulfillment_gate_status',
    'digital_fulfillment_status',
    'physical_fulfillment_status',
    'refund_status',
    'refunded_amount_minor',
    'review_reason',
    'created_at',
    'updated_at',
    'payment_intent',
    'shipping_address',
    'customer_transfer_declared_at'
  ]::text[];
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'checkout_orders'
      and column_name = 'customer_transfer_declared_at'
  ) then
    raise exception 'VietQR declaration migration did not add customer_transfer_declared_at';
  end if;

  if to_regprocedure('public.get_order_payment_status(text,text)') is null then
    raise exception 'VietQR declaration migration did not recreate get_order_payment_status';
  end if;

  if to_regprocedure('public.declare_vietqr_transfer(text,text)') is null then
    raise exception 'VietQR declaration migration did not create declare_vietqr_transfer';
  end if;

  select array_agg(column_name::text order by ordinal_position)
  into actual_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'order_payment_statuses';

  if actual_columns is distinct from expected_columns then
    raise exception 'VietQR declaration migration changed the historical view prefix';
  end if;
end;
$$;

\echo 'VIETQR_VIEW_UPGRADE_REHEARSAL_OK'

rollback;
