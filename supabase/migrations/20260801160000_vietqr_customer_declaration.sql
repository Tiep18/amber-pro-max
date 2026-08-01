-- VietQR is a one-way street today: the customer transfers money and has no
-- way to tell the shop, and the shop cannot prioritise its manual reconciliation
-- queue. Record an unverified customer declaration as a separate fact —
-- payment status, the fulfillment gate, and entitlements stay untouched.
-- `verifying` is intentionally not a valid apply_payment_transition target for
-- a customer-writable source, so this does not touch that state machine at all.

alter table public.checkout_orders
  add column customer_transfer_declared_at timestamptz;

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
  co.payment_intent,
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
  co.shipping_address,
  co.customer_transfer_declared_at
from public.checkout_orders co
join public.payments p on p.order_id = co.id
cross join lateral (
  select private.payment_effective_status(p.status, co.paid_gate_status, coalesce(p.review_reason, co.review_reason)) as status
) effective;

create or replace function public.get_order_payment_status(p_order_number text, p_guest_secret_hash text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  row_data public.order_payment_statuses%rowtype;
begin
  select *
  into row_data
  from public.order_payment_statuses ops
  where ops.order_number = p_order_number
    and (
      (auth.uid() is not null and ops.owner_user_id = auth.uid())
      or (
        p_guest_secret_hash is not null
        and ops.guest_secret_hash = p_guest_secret_hash
      )
      or private.is_admin()
    );

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  return jsonb_build_object(
    'status', 'found',
    'orderNumber', row_data.order_number,
    'market', row_data.market,
    'paymentIntent', row_data.payment_intent,
    'provider', row_data.provider,
    'paymentStatus', row_data.payment_status,
    'customerPaymentStatus', row_data.customer_payment_status,
    'fulfillmentGateStatus', row_data.fulfillment_gate_status,
    'amountMinor', row_data.total_minor,
    'currencyCode', row_data.currency_code,
    'reservationExpiresAt', row_data.reservation_expires_at,
    'customerTransferDeclaredAt', row_data.customer_transfer_declared_at,
    'shippingAddress', row_data.shipping_address
  );
end;
$$;

alter function public.get_order_payment_status(text, text) owner to postgres;
revoke all on function public.get_order_payment_status(text, text) from public;
grant execute on function public.get_order_payment_status(text, text) to anon, authenticated;

create or replace function public.declare_vietqr_transfer(
  p_order_number text,
  p_guest_secret_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  order_row public.checkout_orders%rowtype;
  payment_row public.payments%rowtype;
  already_declared boolean;
begin
  select * into order_row
  from public.checkout_orders co
  where co.order_number = p_order_number
    and (
      (auth.uid() is not null and co.owner_user_id = auth.uid())
      or (p_guest_secret_hash is not null and co.guest_secret_hash = p_guest_secret_hash)
    )
  for update;

  if not found then
    return jsonb_build_object('status', 'forbidden');
  end if;

  select * into payment_row from public.payments where order_id = order_row.id for update;
  if not found
    or payment_row.provider <> 'vietqr'
    or payment_row.status <> 'pending'
    or order_row.reservation_expires_at <= now() then
    return jsonb_build_object('status', 'not_eligible');
  end if;

  already_declared := order_row.customer_transfer_declared_at is not null;

  update public.checkout_orders
  set customer_transfer_declared_at = coalesce(customer_transfer_declared_at, now())
  where id = order_row.id;

  insert into public.fulfillment_audit_events (event_key, order_id, event_type, actor_type, metadata)
  values (
    'vietqr_transfer_declared:' || order_row.id::text,
    order_row.id,
    'vietqr_transfer_declared',
    'system',
    jsonb_build_object('orderNumber', order_row.order_number)
  )
  on conflict (event_key) do nothing;

  return jsonb_build_object('status', case when already_declared then 'unchanged' else 'recorded' end);
end;
$$;

alter function public.declare_vietqr_transfer(text, text) owner to postgres;
revoke all on function public.declare_vietqr_transfer(text, text) from public;
grant execute on function public.declare_vietqr_transfer(text, text) to anon, authenticated;
