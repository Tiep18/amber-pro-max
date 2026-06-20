begin;

select plan(17);

select has_table('public', 'physical_fulfillments', 'physical fulfillment table exists');
select has_table('public', 'physical_fulfillment_events', 'physical fulfillment event table exists');
select col_is_fk('public', 'physical_fulfillments', 'order_id', 'physical fulfillment references order');
select col_type_is('public', 'physical_fulfillments', 'status', 'text', 'physical fulfillment status is explicit');
select col_type_is('public', 'physical_fulfillments', 'tracking_number', 'text', 'tracking number is stored manually');
select col_type_is('public', 'physical_fulfillments', 'tracking_url', 'text', 'tracking URL is stored manually');
select col_type_is('public', 'physical_fulfillments', 'shipped_at', 'timestamp with time zone', 'shipped timestamp is explicit');
select col_type_is('public', 'physical_fulfillments', 'version', 'integer', 'physical fulfillment version supports stale-state checks');
select col_is_fk('public', 'physical_fulfillment_events', 'physical_fulfillment_id', 'physical events reference fulfillment record');
select col_type_is('public', 'physical_fulfillment_events', 'metadata', 'jsonb', 'physical event metadata is structured');
select has_trigger('public', 'physical_fulfillment_events', 'physical_fulfillment_events_safe_metadata', 'physical event metadata rejects unsafe material');
select policies_are('public', 'physical_fulfillments', array['physical fulfillments are owner readable', 'physical fulfillments are admin managed'], 'physical fulfillment exposes owner read and admin management only');
select policies_are('public', 'physical_fulfillment_events', array['physical fulfillment events are admin managed'], 'physical events are admin managed only');
select table_privs_are('public', 'physical_fulfillments', 'anon', array[]::text[], 'anon cannot read physical fulfillment rows');
select table_privs_are('public', 'physical_fulfillment_events', 'authenticated', array[]::text[], 'customers cannot read physical fulfillment event internals');
select table_privs_are('public', 'physical_fulfillments', 'service_role', array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES', 'TRIGGER', 'TRUNCATE'], 'service role manages physical fulfillment rows');
select table_privs_are('public', 'physical_fulfillment_events', 'service_role', array['SELECT', 'INSERT', 'REFERENCES', 'TRIGGER', 'TRUNCATE'], 'service role appends physical fulfillment events');

select * from finish();

rollback;

