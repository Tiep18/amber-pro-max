-- Give the PayPal buyer a window that starts when they actually start paying.
--
-- The 25-minute hold is counted from order creation, so a customer who reads
-- the payment page for twenty minutes and then opens PayPal can be cut off
-- mid-flow: `/api/paypal/orders/[id]/capture` refuses any order whose
-- reservation deadline has passed, and `apply_payment_transition` treats a
-- capture that lands after it as late money needing review. Both are correct
-- given the deadline — the deadline itself was measured from the wrong moment.
--
-- Shop owner decision (2026-08-02): when the buyer hands off to PayPal, push
-- the hold out to at least PAYPAL_HANDOFF_MIN_WINDOW_MINUTES from that moment.
-- A hard ceiling of PAYPAL_MAX_HOLD_MINUTES from order creation keeps this
-- from becoming an unbounded inventory hold for anyone who reopens the PayPal
-- button in a loop.
--
-- Keep both numbers in sync with src/payments/reservation.ts.

create or replace function public.extend_paypal_reservation(
  p_order_number text,
  p_minimum_minutes integer default 10,
  p_max_hold_minutes integer default 120
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  order_row public.checkout_orders%rowtype;
  payment_row public.payments%rowtype;
  now_ts timestamptz := now();
  requested timestamptz;
  ceiling timestamptz;
  next_deadline timestamptz;
begin
  if coalesce(btrim(p_order_number), '') = '' then
    return jsonb_build_object('status', 'invalid', 'code', 'invalid_reservation_extension');
  end if;

  requested := now_ts + make_interval(mins => least(greatest(coalesce(p_minimum_minutes, 10), 1), 120));
  ceiling := now_ts + make_interval(mins => least(greatest(coalesce(p_max_hold_minutes, 120), 1), 1440));

  select * into order_row
  from public.checkout_orders
  where order_number = btrim(p_order_number)
  for update;
  if not found then
    return jsonb_build_object('status', 'not_found', 'code', 'order_not_found');
  end if;

  select * into payment_row
  from public.payments
  where order_id = order_row.id
  for update;
  if not found then
    return jsonb_build_object('status', 'not_found', 'code', 'payment_not_found');
  end if;

  -- Only an open PayPal payment can be extended. A paid, expired, cancelled or
  -- under-review order must never have its deadline moved: the expiry job, the
  -- capture route and the late-settlement window all read this column.
  if payment_row.provider <> 'paypal'
    or payment_row.status not in ('pending', 'verifying')
    or payment_row.pending_deadline_at <= now_ts then
    return jsonb_build_object(
      'status', 'skipped',
      'code', 'reservation_not_extendable',
      'reservationExpiresAt', order_row.reservation_expires_at
    );
  end if;

  ceiling := least(ceiling, order_row.created_at + make_interval(mins => least(greatest(coalesce(p_max_hold_minutes, 120), 1), 1440)));
  next_deadline := least(requested, ceiling);

  if next_deadline <= payment_row.pending_deadline_at then
    return jsonb_build_object(
      'status', 'unchanged',
      'code', 'reservation_already_sufficient',
      'reservationExpiresAt', order_row.reservation_expires_at
    );
  end if;

  update public.checkout_orders
  set reservation_expires_at = next_deadline,
    updated_at = now_ts
  where id = order_row.id;

  update public.payments
  set pending_deadline_at = next_deadline,
    updated_at = now_ts
  where id = payment_row.id;

  -- The held units must outlive the new deadline too: availability is computed
  -- from `expires_at > now()`, not from the order's deadline.
  update public.checkout_inventory_reservations
  set expires_at = next_deadline
  where order_id = order_row.id
    and status = 'active'
    and expires_at < next_deadline;

  insert into public.commerce_audit_events (
    event_key,
    order_id,
    payment_id,
    event_type,
    actor_type,
    source,
    metadata
  )
  values (
    'reservation_extended:' || order_row.id::text || ':' || extract(epoch from next_deadline)::bigint::text,
    order_row.id,
    payment_row.id,
    'reservation_extended',
    'system',
    'paypal_handoff',
    jsonb_build_object(
      'previousDeadlineAt', payment_row.pending_deadline_at,
      'reservationExpiresAt', next_deadline
    )
  )
  on conflict (event_key) do nothing;

  return jsonb_build_object(
    'status', 'extended',
    'code', 'reservation_extended',
    'reservationExpiresAt', next_deadline
  );
exception
  when others then
    return jsonb_build_object('status', 'error', 'code', 'reservation_extension_failed');
end;
$$;

alter function public.extend_paypal_reservation(text, integer, integer) owner to postgres;
revoke all on function public.extend_paypal_reservation(text, integer, integer) from public, anon, authenticated;
grant execute on function public.extend_paypal_reservation(text, integer, integer) to service_role;
