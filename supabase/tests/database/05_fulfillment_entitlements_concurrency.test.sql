create extension if not exists pgtap with schema extensions;
create extension if not exists dblink with schema extensions;
select plan(6);

begin;
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values('05170100-0000-4000-8000-000000000001','authenticated','authenticated','reissue-race-admin@example.test','x',now(),'{}','{}',now(),now());
insert into public.profiles(id,email,preferred_locale)
values('05170100-0000-4000-8000-000000000001','reissue-race-admin@example.test','en');
insert into public.user_roles(user_id,role,assigned_by,note)
values('05170100-0000-4000-8000-000000000001','admin','05170100-0000-4000-8000-000000000001','reissue race test');
insert into public.checkout_orders(id,order_number,guest_secret_hash,contact_email,locale,market,currency_code,status,payment_intent,subtotal_minor,discount_minor,shipping_minor,total_minor,accepted_quote_hash,quote_snapshot,cart_snapshot,idempotency_actor,idempotency_key,reservation_expires_at,paid_gate_status)
values('05170100-0000-4000-8000-000000000010','ATB-REISSUE-RACE',repeat('q',64),'reissue-race@example.test','en','intl','USD','pending_payment','paypal_intent',2500,0,0,2500,'race-quote','{}','[]','guest','reissue-race-key',now()+interval '15 minutes','open');
update public.payments set status='paid',paid_gate_opened_at=now(),paid_at=now() where order_id='05170100-0000-4000-8000-000000000010';
insert into public.checkout_order_lines(id,order_id,product_id,line_id,product_title,fulfillment_type,market,currency_code,quantity,unit_price_minor,line_subtotal_minor,quote_line_snapshot)
values('05170100-0000-4000-8000-000000000011','05170100-0000-4000-8000-000000000010','50000000-0000-0000-0000-000000000001','race-line','Race pattern','digital','intl','USD',1,2500,2500,'{}');
insert into public.digital_entitlements(id,order_id,order_line_id,contact_email,product_id,status,version)
values('05170100-0000-4000-8000-000000000020','05170100-0000-4000-8000-000000000010','05170100-0000-4000-8000-000000000011','reissue-race@example.test','50000000-0000-0000-0000-000000000001','active',1);
create or replace function public.test_reissue_race_call(p_entitlement_id uuid,p_expected_version integer)
returns jsonb language plpgsql set search_path='' as $$
declare result jsonb;
begin
  perform pg_catalog.set_config('request.jwt.claim.role','authenticated',true);
  perform pg_catalog.set_config('request.jwt.claim.sub','05170100-0000-4000-8000-000000000001',true);
  if pg_catalog.to_regprocedure('public.reissue_digital_access_token(uuid,integer)') is null then
    return pg_catalog.jsonb_build_object('status','missing');
  end if;
  execute 'select public.reissue_digital_access_token($1,$2)' into result using p_entitlement_id,p_expected_version;
  return result;
end;
$$;
commit;

select extensions.dblink_connect('reissue_race_a','host=db port=5432 dbname=postgres user=postgres password=postgres');
select extensions.dblink_connect('reissue_race_b','host=db port=5432 dbname=postgres user=postgres password=postgres');
select extensions.dblink_send_query('reissue_race_a',$$select public.test_reissue_race_call('05170100-0000-4000-8000-000000000020',1)$$);
select extensions.dblink_send_query('reissue_race_b',$$select public.test_reissue_race_call('05170100-0000-4000-8000-000000000020',1)$$);

create temporary table reissue_race_results(result jsonb);
insert into reissue_race_results select result from extensions.dblink_get_result('reissue_race_a') as response(result jsonb);
insert into reissue_race_results select result from extensions.dblink_get_result('reissue_race_b') as response(result jsonb);
select extensions.dblink_disconnect('reissue_race_a');
select extensions.dblink_disconnect('reissue_race_b');

select is((select count(*)::integer from reissue_race_results where result->>'status'='reissued'),1,'one concurrent reissue wins');
select is((select count(*)::integer from reissue_race_results where result->>'status'='stale'),1,'one concurrent reissue observes stale version');
select is((select version from public.digital_entitlements where id='05170100-0000-4000-8000-000000000020'),2,'concurrent reissue increments version once');
select is((select count(*)::integer from public.transactional_email_outbox where entitlement_id='05170100-0000-4000-8000-000000000020' and event_type='digital_access_reissued'),1,'concurrent reissue creates one replacement intent');
select is((select count(*)::integer from public.fulfillment_audit_events where entitlement_id='05170100-0000-4000-8000-000000000020' and event_type='digital_access_reissued'),1,'concurrent reissue creates one audit event');
select is((select count(*)::integer from public.digital_access_tokens where entitlement_id='05170100-0000-4000-8000-000000000020'),0,'concurrent reissue creates no token without a deliverable raw capability');

select * from finish();
