begin;

select plan(38);

select has_table('public', 'checkout_orders', 'existing checkout order shell remains the order aggregate');
select has_table('public', 'checkout_order_lines', 'immutable order line snapshots remain the commercial record');
select has_table('public', 'checkout_inventory_reservations', 'reservation records remain the stock hold record');

select has_table('public', 'payments', 'payment records exist');
select has_table('public', 'payment_events', 'provider and admin payment event inbox exists');
select has_table('public', 'payment_transitions', 'idempotent payment transition ledger exists');
select has_table('public', 'commerce_audit_events', 'append-only commerce audit event table exists');

select col_is_fk('public', 'payments', 'order_id', 'payments reference checkout orders');
select col_type_is('public', 'payments', 'provider', 'text', 'payment provider is explicit');
select col_type_is('public', 'payments', 'status', 'text', 'payment status is separate from order status');
select col_type_is('public', 'payments', 'amount_minor', 'bigint', 'payment amount uses integer minor units');
select col_type_is('public', 'payments', 'currency_code', 'text', 'payment currency is explicit');
select col_type_is('public', 'payments', 'paid_gate_opened_at', 'timestamp with time zone', 'paid gate timestamp is stored separately');
select col_type_is('public', 'payments', 'digital_fulfillment_status', 'text', 'digital fulfillment state is separate');
select col_type_is('public', 'payments', 'physical_fulfillment_status', 'text', 'physical fulfillment state is separate');
select col_type_is('public', 'payments', 'refunded_amount_minor', 'bigint', 'refund visibility is modeled without initiation workflow');

select col_is_fk('public', 'payment_events', 'payment_id', 'events reference payments');
select col_type_is('public', 'payment_events', 'provider_event_id', 'text', 'provider event id is stored for dedupe');
select col_type_is('public', 'payment_events', 'event_type', 'text', 'provider event type is stored');
select col_type_is('public', 'payment_events', 'verification_status', 'text', 'signature and reconciliation outcome is stored');
select col_type_is('public', 'payment_events', 'payload_digest', 'text', 'raw payload is represented by a digest, not dumped to app tables');
select has_index('public', 'payment_events', 'payment_events_provider_event_unique_idx', 'provider event ids are unique for idempotency');

select col_is_fk('public', 'payment_transitions', 'payment_id', 'transitions reference payments');
select col_type_is('public', 'payment_transitions', 'transition_key', 'text', 'transition key supports webhook/recheck/admin idempotency');
select col_type_is('public', 'payment_transitions', 'source', 'text', 'transition source is recorded');
select col_type_is('public', 'payment_transitions', 'from_status', 'text', 'transition records previous payment status');
select col_type_is('public', 'payment_transitions', 'to_status', 'text', 'transition records target payment status');
select col_type_is('public', 'payment_transitions', 'result', 'text', 'transition result records applied duplicate stale or review outcomes');
select has_index('public', 'payment_transitions', 'payment_transitions_transition_key_unique_idx', 'transition keys are unique');

select col_type_is('public', 'checkout_inventory_reservations', 'finalized_at', 'timestamp with time zone', 'reservation finalization timestamp is retained');
select col_type_is('public', 'checkout_inventory_reservations', 'released_at', 'timestamp with time zone', 'reservation release timestamp is retained');
select col_type_is('public', 'checkout_inventory_reservations', 'release_reason', 'text', 'reservation release reason is retained');
select col_is_fk('public', 'checkout_inventory_reservations', 'payment_transition_id', 'reservation outcome references payment transition');

select col_type_is('public', 'commerce_audit_events', 'event_type', 'text', 'audit event type is explicit');
select col_type_is('public', 'commerce_audit_events', 'actor_type', 'text', 'audit actor type is explicit');
select col_type_is('public', 'commerce_audit_events', 'metadata', 'jsonb', 'audit metadata is structured');
select has_trigger('public', 'commerce_audit_events', 'commerce_audit_events_append_only', 'audit events are append-only');

select has_function('public', 'apply_payment_transition', array['jsonb'], 'one payment transition RPC exists');

select * from finish();

rollback;
