begin;

select plan(36);

select has_function('public', 'late_settlement_window', 'the late acceptance window is a named contract, not a literal');
select has_function('private', 'finalize_late_settlement_inventory', array['uuid'], 'late settlement re-checks stock through one owned function');
select has_function('public', 'extend_paypal_reservation', array['text', 'integer', 'integer'], 'the PayPal handoff can extend its own hold');
select function_privs_are('public', 'extend_paypal_reservation', array['text', 'integer', 'integer'], 'anon', array[]::text[], 'customers cannot extend their own reservation');

-- The seed gives variant ...0001 four units and variant ...0002 none, which is
-- exactly the in-stock / sold-out pair this needs.

-- Four VietQR orders whose 24h hold lapsed two days ago: what the expiry job
-- leaves behind when a customer transfers and the shop reconciles the next
-- morning.
insert into public.checkout_orders (
  id, order_number, guest_secret_hash, contact_email, locale, market, currency_code,
  status, order_status, payment_status, payment_intent, subtotal_minor, discount_minor,
  shipping_minor, total_minor, accepted_quote_hash, quote_snapshot, cart_snapshot,
  idempotency_actor, idempotency_key, reservation_expires_at
)
select
  ids.id, ids.order_number, 'late-settle-guest-hash', 'late-settle@example.test', 'vi', 'vn', 'VND',
  'pending_payment', 'pending_payment', 'awaiting_payment', 'vietqr_intent', 250000, 0,
  0, 250000, 'late-settle-hash', '{}'::jsonb, '[]'::jsonb,
  'guest', ids.id::text, ids.deadline
from (values
  ('00000000-0000-4000-8000-000000000911'::uuid, 'ATB-LATE-SETTLE-OK', now() - interval '2 days'),
  ('00000000-0000-4000-8000-000000000912'::uuid, 'ATB-LATE-SETTLE-GONE', now() - interval '2 days'),
  ('00000000-0000-4000-8000-000000000913'::uuid, 'ATB-LATE-SETTLE-STALE', now() - interval '10 days'),
  ('00000000-0000-4000-8000-000000000914'::uuid, 'ATB-LATE-SETTLE-NOEVIDENCE', now() - interval '2 days')
) as ids(id, order_number, deadline);

insert into public.checkout_order_lines (
  order_id, product_id, variant_id, line_id, product_title, fulfillment_type, market,
  currency_code, quantity, unit_price_minor, line_subtotal_minor, quote_line_snapshot
)
select
  lines.order_id, '50000000-0000-0000-0000-000000000003', lines.variant_id,
  lines.variant_id::text || '::variant', 'Late settlement fixture',
  'physical', 'vn', 'VND', lines.quantity, 125000, 125000 * lines.quantity, '{}'::jsonb
from (values
  ('00000000-0000-4000-8000-000000000911'::uuid, '54000000-0000-0000-0000-000000000001'::uuid, 2),
  ('00000000-0000-4000-8000-000000000912'::uuid, '54000000-0000-0000-0000-000000000002'::uuid, 2),
  ('00000000-0000-4000-8000-000000000913'::uuid, '54000000-0000-0000-0000-000000000001'::uuid, 1),
  ('00000000-0000-4000-8000-000000000914'::uuid, '54000000-0000-0000-0000-000000000001'::uuid, 1)
) as lines(order_id, variant_id, quantity);

-- The reservations are already terminal, so the normal reservation-backed
-- finalization path cannot apply: this is the state that used to be a dead end.
insert into public.checkout_inventory_reservations (
  order_id, order_line_id, inventory_record_id, quantity_reserved, status,
  expires_at, released_at, release_reason
)
select
  l.order_id, l.id, ir.id, l.quantity, 'expired',
  now() - interval '2 days', now() - interval '2 days', 'reservation_deadline_expired'
from public.checkout_order_lines l
join public.inventory_records ir
  on (l.variant_id is not null and ir.variant_id = l.variant_id)
  or (l.variant_id is null and ir.product_id = l.product_id)
where l.order_id in (
  '00000000-0000-4000-8000-000000000911',
  '00000000-0000-4000-8000-000000000912',
  '00000000-0000-4000-8000-000000000913',
  '00000000-0000-4000-8000-000000000914'
);

update public.payments set status = 'expired', terminal_at = now()
where order_id in (
  '00000000-0000-4000-8000-000000000911',
  '00000000-0000-4000-8000-000000000912',
  '00000000-0000-4000-8000-000000000913',
  '00000000-0000-4000-8000-000000000914'
);

-- A transfer reconciled two days late, with stock still on the shelf.
create temporary table late_settle_ok as
select public.apply_payment_transition(jsonb_build_object(
  'transitionKey', 'late-settle-ok-confirm',
  'source', 'vietqr_admin',
  'targetStatus', 'paid',
  'orderNumber', 'ATB-LATE-SETTLE-OK',
  'bankReference', 'ATB-LATE-SETTLE-OK',
  'receivedAmountMinor', 250000,
  'receivedAt', '2026-08-02T04:00:00Z'
)) as result;

select results_eq(
  $$select result->>'status' from late_settle_ok$$,
  $$values ('applied'::text)$$,
  'a transfer reconciled after the hold lapsed can still be settled'
);

select results_eq(
  $$select (result->>'lateSettlement')::boolean from late_settle_ok$$,
  $$values (true)$$,
  'the result says plainly that this settled late money'
);

select results_eq(
  $$select status, review_reason is null from public.payments
    where order_id = '00000000-0000-4000-8000-000000000911'$$,
  $$values ('paid'::text, true)$$,
  'settling late clears the review flag instead of leaving the order parked'
);

select results_eq(
  $$select quantity_on_hand from public.inventory_records
    where variant_id = '54000000-0000-0000-0000-000000000001'$$,
  $$values (2)$$,
  'late settlement decrements stock even though the reservation is long gone'
);

select results_eq(
  $$select paid_gate_status, digital_fulfillment_status, physical_fulfillment_status
    from public.checkout_orders where id = '00000000-0000-4000-8000-000000000911'$$,
  $$values ('open'::text, 'not_required'::text, 'awaiting_fulfillment'::text)$$,
  'a late-settled order opens the same fulfillment gate as an on-time one'
);

-- The same transfer, but the stock it held has since been sold.
create temporary table late_settle_gone as
select public.apply_payment_transition(jsonb_build_object(
  'transitionKey', 'late-settle-gone-confirm',
  'source', 'vietqr_admin',
  'targetStatus', 'paid',
  'orderNumber', 'ATB-LATE-SETTLE-GONE',
  'bankReference', 'ATB-LATE-SETTLE-GONE',
  'receivedAmountMinor', 250000,
  'receivedAt', '2026-08-02T04:00:00Z'
)) as result;

select results_eq(
  $$select result->>'status', result->>'code' from late_settle_gone$$,
  $$values ('review_required'::text, 'late_payment_out_of_stock'::text)$$,
  'a late payment whose stock is gone is parked for a refund, not settled'
);

select results_eq(
  $$select status, review_reason from public.payments
    where order_id = '00000000-0000-4000-8000-000000000912'$$,
  $$values ('review_required'::text, 'late_payment_out_of_stock'::text)$$,
  'the shop can see why the order could not be settled'
);

select results_eq(
  $$select quantity_on_hand from public.inventory_records
    where variant_id = '54000000-0000-0000-0000-000000000002'$$,
  $$values (0)$$,
  'a blocked late settlement never drives stock negative'
);

select results_eq(
  $$select paid_gate_status from public.checkout_orders
    where id = '00000000-0000-4000-8000-000000000912'$$,
  $$values ('review_required'::text)$$,
  'the fulfillment gate stays shut while the order is under review'
);

-- review_required used to be terminal: every paid attempt from it fell through
-- to the deadline branch and produced review_required again, forever.
update public.inventory_records set quantity_on_hand = 3
where variant_id = '54000000-0000-0000-0000-000000000002';

create temporary table late_settle_recovered as
select public.apply_payment_transition(jsonb_build_object(
  'transitionKey', 'late-settle-gone-confirm-retry',
  'source', 'vietqr_admin',
  'targetStatus', 'paid',
  'orderNumber', 'ATB-LATE-SETTLE-GONE',
  'bankReference', 'ATB-LATE-SETTLE-GONE',
  'receivedAmountMinor', 250000,
  'receivedAt', '2026-08-02T05:00:00Z'
)) as result;

select results_eq(
  $$select result->>'status', (result->>'lateSettlement')::boolean from late_settle_recovered$$,
  $$values ('applied'::text, true)$$,
  'review_required is no longer terminal once the blocker is resolved'
);

select results_eq(
  $$select status from public.payments where order_id = '00000000-0000-4000-8000-000000000912'$$,
  $$values ('paid'::text)$$,
  'an order rescued out of review reaches paid like any other'
);

select results_eq(
  $$select quantity_on_hand from public.inventory_records
    where variant_id = '54000000-0000-0000-0000-000000000002'$$,
  $$values (1)$$,
  'the rescued order takes its stock exactly once'
);

-- Ten days late is past the shop owner's 7-day acceptance window.
create temporary table late_settle_stale as
select public.apply_payment_transition(jsonb_build_object(
  'transitionKey', 'late-settle-stale-confirm',
  'source', 'vietqr_admin',
  'targetStatus', 'paid',
  'orderNumber', 'ATB-LATE-SETTLE-STALE',
  'bankReference', 'ATB-LATE-SETTLE-STALE',
  'receivedAmountMinor', 250000,
  'receivedAt', '2026-08-02T04:00:00Z'
)) as result;

select results_eq(
  $$select result->>'status', result->>'code' from late_settle_stale$$,
  $$values ('review_required'::text, 'late_payment_window_elapsed'::text)$$,
  'past the acceptance window the shop must refund rather than settle'
);

select results_eq(
  $$select status from public.payments where order_id = '00000000-0000-4000-8000-000000000913'$$,
  $$values ('review_required'::text)$$,
  'an out-of-window payment never reaches paid'
);

select results_eq(
  $$select quantity_on_hand from public.inventory_records
    where variant_id = '54000000-0000-0000-0000-000000000001'$$,
  $$values (2)$$,
  'an out-of-window payment does not touch stock'
);

-- Only a source carrying evidence of money received may settle late. The
-- expiry cron and generic system callers must not be able to.
create temporary table late_settle_no_evidence as
select public.apply_payment_transition(jsonb_build_object(
  'transitionKey', 'late-settle-no-evidence',
  'source', 'system',
  'targetStatus', 'paid',
  'orderNumber', 'ATB-LATE-SETTLE-NOEVIDENCE'
)) as result;

select results_eq(
  $$select result->>'status', result->>'code' from late_settle_no_evidence$$,
  $$values ('review_required'::text, 'late_payment_detected'::text)$$,
  'a source without money evidence cannot settle a lapsed order'
);

select results_eq(
  $$select status from public.payments where order_id = '00000000-0000-4000-8000-000000000914'$$,
  $$values ('review_required'::text)$$,
  'the unevidenced attempt parks the order instead of paying it'
);

-- The PayPal handoff extends the hold from the moment the buyer starts paying.
insert into public.checkout_orders (
  id, order_number, guest_secret_hash, contact_email, locale, market, currency_code,
  status, payment_intent, subtotal_minor, discount_minor, shipping_minor, total_minor,
  accepted_quote_hash, quote_snapshot, cart_snapshot, idempotency_actor, idempotency_key,
  reservation_expires_at
)
values (
  '00000000-0000-4000-8000-000000000915', 'ATB-PAYPAL-EXTEND', 'paypal-extend-hash',
  'paypal-extend@example.test', 'en', 'intl', 'USD', 'pending_payment', 'paypal_intent',
  4250, 0, 0, 4250, 'paypal-extend-hash', '{}'::jsonb, '[]'::jsonb,
  'guest', 'paypal-extend-key', now() + interval '2 minutes'
);

insert into public.checkout_order_lines (
  order_id, product_id, line_id, product_title, fulfillment_type, market, currency_code,
  quantity, unit_price_minor, line_subtotal_minor, quote_line_snapshot
)
values (
  '00000000-0000-4000-8000-000000000915', '50000000-0000-0000-0000-000000000002',
  '50000000-0000-0000-0000-000000000002::product', 'PayPal extend fixture',
  'physical', 'intl', 'USD', 1, 4250, 4250, '{}'::jsonb
);

insert into public.checkout_inventory_reservations (
  order_id, order_line_id, inventory_record_id, quantity_reserved, status, expires_at
)
select
  l.order_id, l.id, ir.id, l.quantity, 'active', now() + interval '2 minutes'
from public.checkout_order_lines l
join public.inventory_records ir
  on (l.variant_id is not null and ir.variant_id = l.variant_id)
  or (l.variant_id is null and ir.product_id = l.product_id)
where l.order_id = '00000000-0000-4000-8000-000000000915';

create temporary table paypal_extend as
select public.extend_paypal_reservation('ATB-PAYPAL-EXTEND', 10, 120) as result;

select results_eq(
  $$select result->>'status' from paypal_extend$$,
  $$values ('extended'::text)$$,
  'opening PayPal restarts the hold from the moment the buyer starts paying'
);

select results_eq(
  $$select reservation_expires_at > now() + interval '9 minutes'
    from public.checkout_orders where order_number = 'ATB-PAYPAL-EXTEND'$$,
  $$values (true)$$,
  'the order deadline moves out to the handoff window'
);

select results_eq(
  $$select p.pending_deadline_at = co.reservation_expires_at
    from public.payments p
    join public.checkout_orders co on co.id = p.order_id
    where co.order_number = 'ATB-PAYPAL-EXTEND'$$,
  $$values (true)$$,
  'the expiry job and the order agree on one deadline'
);

select results_eq(
  $$select bool_and(cir.expires_at = co.reservation_expires_at)
    from public.checkout_inventory_reservations cir
    join public.checkout_orders co on co.id = cir.order_id
    where co.order_number = 'ATB-PAYPAL-EXTEND' and cir.status = 'active'$$,
  $$values (true)$$,
  'the held units outlive the new deadline, since availability reads expires_at'
);

select results_eq(
  $$select public.extend_paypal_reservation('ATB-LATE-SETTLE-STALE', 10, 120)->>'status'$$,
  $$values ('skipped'::text)$$,
  'a lapsed or settled order can never have its deadline pushed forward'
);

-- An `active` reservation is not automatically a live hold. The expiry job runs
-- once a minute and can be down for far longer, so between the deadline and
-- that run the units are already being offered to other buyers while the row
-- still says `active`. Trusting the status alone let a late settlement skip the
-- availability check and take stock a newer order had bought.
insert into public.checkout_orders (
  id, order_number, guest_secret_hash, contact_email, locale, market, currency_code,
  status, payment_intent, subtotal_minor, discount_minor, shipping_minor, total_minor,
  accepted_quote_hash, quote_snapshot, cart_snapshot, idempotency_actor, idempotency_key,
  reservation_expires_at
)
select
  ids.id, ids.order_number, 'stale-active-hash', 'stale-active@example.test', 'vi', 'vn', 'VND',
  'pending_payment', 'vietqr_intent', 250000, 0, 0, 250000, 'h', '{}'::jsonb, '[]'::jsonb,
  'guest', ids.id::text, ids.deadline
from (values
  ('00000000-0000-4000-8000-000000000916'::uuid, 'ATB-STALE-ACTIVE', now() - interval '30 seconds'),
  ('00000000-0000-4000-8000-000000000917'::uuid, 'ATB-NEWER-BUYER', now() + interval '20 hours')
) as ids(id, order_number, deadline);

insert into public.checkout_order_lines (
  order_id, product_id, variant_id, line_id, product_title, fulfillment_type, market,
  currency_code, quantity, unit_price_minor, line_subtotal_minor, quote_line_snapshot
)
select
  ids.order_id, '50000000-0000-0000-0000-000000000003', '54000000-0000-0000-0000-000000000001',
  '54000000-0000-0000-0000-000000000001::variant', 'Stale active fixture',
  'physical', 'vn', 'VND', 2, 125000, 250000, '{}'::jsonb
from (values
  ('00000000-0000-4000-8000-000000000916'::uuid),
  ('00000000-0000-4000-8000-000000000917'::uuid)
) as ids(order_id);

-- Order 916's hold lapsed 30 seconds ago but the cron has not run, so its row
-- is still `active`. Order 917 legitimately bought the freed units.
insert into public.checkout_inventory_reservations (
  order_id, order_line_id, inventory_record_id, quantity_reserved, status, expires_at
)
select l.order_id, l.id, ir.id, 2, 'active',
  case when l.order_id = '00000000-0000-4000-8000-000000000916'
    then now() - interval '30 seconds' else now() + interval '20 hours' end
from public.checkout_order_lines l
join public.inventory_records ir on ir.variant_id = l.variant_id
where l.order_id in (
  '00000000-0000-4000-8000-000000000916',
  '00000000-0000-4000-8000-000000000917'
);

update public.payments set status = 'expired', terminal_at = now()
where order_id = '00000000-0000-4000-8000-000000000916';

select results_eq(
  $$select private.finalize_late_settlement_inventory('00000000-0000-4000-8000-000000000916')$$,
  $$values ('insufficient'::text)$$,
  'a lapsed-but-still-active reservation does not count as a live hold'
);

create temporary table stale_active_settle as
select public.apply_payment_transition(jsonb_build_object(
  'transitionKey', 'stale-active-confirm',
  'source', 'vietqr_admin',
  'targetStatus', 'paid',
  'orderNumber', 'ATB-STALE-ACTIVE',
  'bankReference', 'ATB-STALE-ACTIVE',
  'receivedAmountMinor', 250000,
  'receivedAt', '2026-08-02T04:00:00Z'
)) as result;

select results_eq(
  $$select result->>'status', result->>'code' from stale_active_settle$$,
  $$values ('review_required'::text, 'late_payment_out_of_stock'::text)$$,
  'settling late cannot take stock a newer order bought while the row said active'
);

select results_eq(
  $$select quantity_on_hand from public.inventory_records
    where variant_id = '54000000-0000-0000-0000-000000000001'$$,
  $$values (2)$$,
  'the newer buyer keeps the units it reserved'
);

-- PayPal reuses one capture id for both the transition key and the provider
-- event id, so replaying it to rescue a stock-blocked order always
-- short-circuits as a duplicate. `admin_review_resolution` re-runs the stock
-- check alone, against money the shop already accepted evidence for.
insert into public.checkout_orders (
  id, order_number, guest_secret_hash, contact_email, locale, market, currency_code,
  status, payment_intent, subtotal_minor, discount_minor, shipping_minor, total_minor,
  accepted_quote_hash, quote_snapshot, cart_snapshot, idempotency_actor, idempotency_key,
  reservation_expires_at
)
values (
  '00000000-0000-4000-8000-000000000918', 'ATB-PAYPAL-REVIEW', 'paypal-review-hash',
  'paypal-review@example.test', 'en', 'intl', 'USD', 'pending_payment', 'paypal_intent',
  4250, 0, 0, 4250, 'h', '{}'::jsonb, '[]'::jsonb,
  'guest', 'paypal-review-key', now() - interval '2 days'
);

insert into public.checkout_order_lines (
  order_id, product_id, variant_id, line_id, product_title, fulfillment_type, market,
  currency_code, quantity, unit_price_minor, line_subtotal_minor, quote_line_snapshot
)
values (
  '00000000-0000-4000-8000-000000000918', '50000000-0000-0000-0000-000000000003',
  '54000000-0000-0000-0000-000000000002', '54000000-0000-0000-0000-000000000002::variant',
  'PayPal review fixture', 'physical', 'intl', 'USD', 1, 4250, 4250, '{}'::jsonb
);

update public.payments set status = 'expired', terminal_at = now()
where order_id = '00000000-0000-4000-8000-000000000918';

update public.inventory_records set quantity_on_hand = 0
where variant_id = '54000000-0000-0000-0000-000000000002';

create temporary table paypal_review_capture as
select public.apply_payment_transition(jsonb_build_object(
  'transitionKey', 'paypal-recheck:CAP-REVIEW-1',
  'source', 'paypal_webhook',
  'targetStatus', 'paid',
  'providerEventId', 'CAP-REVIEW-1',
  'orderNumber', 'ATB-PAYPAL-REVIEW',
  'amountMinor', 4250,
  'currencyCode', 'USD'
)) as result;

select results_eq(
  $$select result->>'code' from paypal_review_capture$$,
  $$values ('late_payment_out_of_stock'::text)$$,
  'a late PayPal capture with no stock left parks the order'
);

update public.inventory_records set quantity_on_hand = 4
where variant_id = '54000000-0000-0000-0000-000000000002';

select results_eq(
  $$select public.apply_payment_transition(jsonb_build_object(
    'transitionKey', 'paypal-recheck:CAP-REVIEW-1-retry',
    'source', 'paypal_webhook',
    'targetStatus', 'paid',
    'providerEventId', 'CAP-REVIEW-1',
    'orderNumber', 'ATB-PAYPAL-REVIEW',
    'amountMinor', 4250,
    'currencyCode', 'USD'
  ))->>'code'$$,
  $$values ('duplicate_payment_event'::text)$$,
  'replaying the same capture cannot rescue it — this is why a separate source exists'
);

create temporary table paypal_review_resolved as
select public.apply_payment_transition(jsonb_build_object(
  'transitionKey', 'review-resolution:admin-key-0001',
  'source', 'admin_review_resolution',
  'targetStatus', 'paid',
  'orderNumber', 'ATB-PAYPAL-REVIEW'
)) as result;

select results_eq(
  $$select result->>'status', (result->>'lateSettlement')::boolean from paypal_review_resolved$$,
  $$values ('applied'::text, true)$$,
  'rechecking stock settles a PayPal order that was only ever blocked on stock'
);

select results_eq(
  $$select status, review_reason is null from public.payments
    where order_id = '00000000-0000-4000-8000-000000000918'$$,
  $$values ('paid'::text, true)$$,
  'the rescued PayPal order leaves review for good'
);

select results_eq(
  $$select quantity_on_hand from public.inventory_records
    where variant_id = '54000000-0000-0000-0000-000000000002'$$,
  $$values (3)$$,
  'the rescued PayPal order takes its stock exactly once'
);

select results_eq(
  $$select public.apply_payment_transition(jsonb_build_object(
    'transitionKey', 'review-resolution:admin-key-0002',
    'source', 'admin_review_resolution',
    'targetStatus', 'paid',
    'orderNumber', 'ATB-PAYPAL-REVIEW'
  ))->>'code'$$,
  $$values ('invalid_review_resolution'::text)$$,
  'the recheck source cannot pay an order that is not parked on stock'
);

select results_eq(
  $$select public.apply_payment_transition(jsonb_build_object(
    'transitionKey', 'review-resolution:admin-key-0003',
    'source', 'admin_review_resolution',
    'targetStatus', 'paid',
    'orderNumber', 'ATB-LATE-SETTLE-STALE',
    'providerEventId', 'FORGED-CAPTURE-0001'
  ))->>'code'$$,
  $$values ('invalid_review_resolution'::text)$$,
  'the recheck source can never assert that a payment arrived'
);

select * from finish();

rollback;
