-- Keep the customer projection security-invoker and inline its two pure status
-- mappings so authenticated callers never need USAGE on the private schema.
revoke all on function private.payment_effective_status(text, text, text)
  from public, anon, authenticated;
revoke all on function private.payment_customer_status(text)
  from public, anon, authenticated;

grant execute on function private.payment_effective_status(text, text, text)
  to service_role;
grant execute on function private.payment_customer_status(text)
  to service_role;

-- The linked project preserves payment_intent near the end of the historical
-- view, while fresh databases place it beside market. CREATE OR REPLACE must
-- keep the existing ordinal layout, so substitute it at the matching position.
do $$
declare
  existing_columns text[];
  payment_intent_before_currency text;
  payment_intent_after_updated_at text;
begin
  select array_agg(column_name::text order by ordinal_position)
  into existing_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'order_payment_statuses';

  if existing_columns = array[
    'order_id', 'order_number', 'owner_user_id', 'guest_secret_hash',
    'contact_email', 'locale', 'market', 'payment_intent', 'currency_code',
    'total_minor', 'reservation_expires_at', 'payment_id', 'provider',
    'payment_status', 'customer_payment_status', 'fulfillment_gate_status',
    'digital_fulfillment_status', 'physical_fulfillment_status',
    'refund_status', 'refunded_amount_minor', 'review_reason', 'created_at',
    'updated_at', 'shipping_address', 'customer_transfer_declared_at'
  ]::text[] then
    payment_intent_before_currency := 'co.payment_intent,';
    payment_intent_after_updated_at := '';
  elsif existing_columns = array[
    'order_id', 'order_number', 'owner_user_id', 'guest_secret_hash',
    'contact_email', 'locale', 'market', 'currency_code', 'total_minor',
    'reservation_expires_at', 'payment_id', 'provider', 'payment_status',
    'customer_payment_status', 'fulfillment_gate_status',
    'digital_fulfillment_status', 'physical_fulfillment_status',
    'refund_status', 'refunded_amount_minor', 'review_reason', 'created_at',
    'updated_at', 'payment_intent', 'shipping_address',
    'customer_transfer_declared_at'
  ]::text[] then
    payment_intent_before_currency := '';
    payment_intent_after_updated_at := 'co.payment_intent,';
  else
    raise exception 'unsupported order_payment_statuses column layout'
      using errcode = '55000';
  end if;

  execute format($view$
    create or replace view public.order_payment_statuses
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
      %s
      co.currency_code,
      co.total_minor,
      co.reservation_expires_at,
      p.id as payment_id,
      p.provider,
      effective.status as payment_status,
      case effective.status
        when 'pending' then 'awaiting_payment'
        when 'verifying' then 'verifying_payment'
        when 'paid' then 'paid'
        when 'failed' then 'payment_failed'
        when 'cancelled' then 'payment_cancelled'
        when 'rejected' then 'payment_failed'
        when 'expired' then 'expired'
        when 'review_required' then 'review_required'
        when 'partially_refunded' then 'partially_refunded'
        when 'refunded' then 'refunded'
        else 'verifying_payment'
      end as customer_payment_status,
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
      %s
      co.shipping_address,
      co.customer_transfer_declared_at
    from public.checkout_orders co
    join public.payments p on p.order_id = co.id
    cross join lateral (
      select case
        when p.status in (
          'paid', 'failed', 'cancelled', 'rejected', 'expired',
          'review_required', 'partially_refunded', 'refunded'
        ) then p.status
        when co.paid_gate_status = 'review_required'
          or nullif(btrim(coalesce(p.review_reason, co.review_reason, '')), '') is not null
          then 'review_required'
        else coalesce(p.status, 'verifying')
      end as status
    ) effective
  $view$, payment_intent_before_currency, payment_intent_after_updated_at);
end;
$$;

grant select on table public.order_payment_statuses to authenticated;
