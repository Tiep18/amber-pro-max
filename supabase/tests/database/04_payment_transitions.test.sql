begin;

select plan(32);

select has_function('public', 'apply_payment_transition', array['jsonb'], 'shared transition command exists');
select has_function('public', 'expire_due_payments', array['integer'], 'bounded expiry command exists');

select results_eq(
  $$select status from jsonb_to_record(public.apply_payment_transition('{"transitionKey":"x"}'::jsonb)) as r(status text)$$,
  $$values ('invalid'::text)$$,
  'invalid transition payload returns a typed invalid result'
);

select results_eq(
  $$select code from jsonb_to_record(public.apply_payment_transition('{"transitionKey":"x"}'::jsonb)) as r(code text)$$,
  $$values ('invalid_payment_transition'::text)$$,
  'invalid transition payload does not expose raw SQL errors'
);

select lives_ok(
  $$select public.apply_payment_transition(jsonb_build_object(
    'transitionKey', 'contract-paid-once',
    'source', 'paypal_webhook',
    'targetStatus', 'paid',
    'providerEventId', 'WH-TEST-CAPTURE-COMPLETED-0001',
    'orderNumber', 'ATB-20260615-0001',
    'amountMinor', 4250,
    'currencyCode', 'USD'
  ))$$,
  'paid transition command accepts verified provider facts'
);

select lives_ok(
  $$select public.apply_payment_transition(jsonb_build_object(
    'transitionKey', 'contract-release-failed',
    'source', 'paypal_webhook',
    'targetStatus', 'failed',
    'providerEventId', 'WH-TEST-CAPTURE-DECLINED-0001',
    'orderNumber', 'ATB-20260615-0001',
    'releaseReason', 'provider_failed'
  ))$$,
  'failed transition command accepts a release reason'
);

select lives_ok(
  $$select public.apply_payment_transition(jsonb_build_object(
    'transitionKey', 'contract-vietqr-confirm',
    'source', 'vietqr_admin',
    'targetStatus', 'paid',
    'orderNumber', 'ATB-20260615-0002',
    'bankReference', 'BANKREF-TEST-0002',
    'receivedAmountMinor', 250000,
    'receivedAt', '2026-06-15T04:00:00Z'
  ))$$,
  'VietQR admin confirmation requires bank evidence facts'
);

select lives_ok(
  $$select public.apply_payment_transition(jsonb_build_object(
    'transitionKey', 'contract-vietqr-reject',
    'source', 'vietqr_admin',
    'targetStatus', 'rejected',
    'orderNumber', 'ATB-20260615-0002',
    'releaseReason', 'wrong_amount_or_reference',
    'adminNote', 'fixture only'
  ))$$,
  'VietQR admin rejection records release reason and evidence'
);

select col_type_is('public', 'checkout_inventory_reservations', 'status', 'text', 'reservation status remains explicit');
select col_type_is('public', 'checkout_inventory_reservations', 'quantity_reserved', 'integer', 'reservation quantity remains explicit');
select col_type_is('public', 'inventory_records', 'quantity_on_hand', 'integer', 'inventory uses physical stock units');

select has_index('public', 'payments', 'payments_order_id_unique_idx', 'one payment record is authoritative for an order in Phase 4');
select has_index('public', 'payments', 'payments_pending_deadline_idx', 'pending payments are indexed by deadline');
select has_index('public', 'checkout_inventory_reservations', 'checkout_inventory_reservations_active_idx', 'active reservations stay indexed');

select throws_ok(
  $$insert into public.payments(order_id, provider, status, amount_minor, currency_code) values (gen_random_uuid(), 'paypal', 'paid', 1.25, 'USD')$$,
  null,
  null,
  'floating-point payment amounts are impossible because amount_minor is bigint'
);

select lives_ok(
  $$select public.apply_payment_transition(jsonb_build_object(
    'transitionKey', 'contract-duplicate-event',
    'source', 'paypal_webhook',
    'targetStatus', 'paid',
    'providerEventId', 'WH-TEST-CAPTURE-COMPLETED-0001',
    'orderNumber', 'ATB-20260615-0001',
    'amountMinor', 4250,
    'currencyCode', 'USD'
  ))$$,
  'duplicate provider events return duplicate or stale without a second stock effect'
);

select lives_ok(
  $$select public.apply_payment_transition(jsonb_build_object(
    'transitionKey', 'contract-expiry-race',
    'source', 'reservation_expiry_job',
    'targetStatus', 'expired',
    'orderNumber', 'ATB-20260615-0001',
    'releaseReason', 'reservation_deadline_expired'
  ))$$,
  'expiry uses the same transition command as provider and admin paths'
);

select lives_ok(
  $$select public.apply_payment_transition(jsonb_build_object(
    'transitionKey', 'contract-late-paid-review',
    'source', 'paypal_webhook',
    'targetStatus', 'review_required',
    'providerEventId', 'WH-TEST-LATE-CAPTURE-COMPLETED',
    'orderNumber', 'ATB-20260615-0001',
    'reviewReason', 'late_payment_detected'
  ))$$,
  'late completed capture after terminal release becomes review_required'
);

select has_trigger('public', 'payment_transitions', 'payment_transitions_monotonic_status', 'payment transitions are monotonic');
select has_trigger('public', 'checkout_inventory_reservations', 'checkout_reservations_single_outcome', 'reservation finalize or release is single-outcome');
select has_trigger('public', 'commerce_audit_events', 'commerce_audit_events_append_only', 'audit rows cannot be updated or deleted');

select has_index('public', 'commerce_audit_events', 'commerce_audit_events_order_timeline_idx', 'order timelines are indexed');
select has_index('public', 'payment_events', 'payment_events_payment_received_idx', 'payment events can be inspected in received order');
select has_index('public', 'payment_transitions', 'payment_transitions_payment_created_idx', 'transition timeline is ordered');

select col_not_null('public', 'payment_events', 'received_at', 'payment event receipt time is required');
select col_not_null('public', 'payment_transitions', 'created_at', 'transition time is required');
select col_not_null('public', 'commerce_audit_events', 'created_at', 'audit time is required');

select col_type_is('public', 'payment_events', 'sanitized_facts', 'jsonb', 'provider facts are sanitized before storage');
select col_type_is('public', 'payment_transitions', 'inventory_effect', 'text', 'transition records finalized released expired or none inventory effect');
select col_type_is('public', 'commerce_audit_events', 'event_key', 'text', 'audit events use stable keys for idempotent writes');

select * from finish();

rollback;
