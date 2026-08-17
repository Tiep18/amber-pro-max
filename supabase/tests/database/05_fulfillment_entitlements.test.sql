begin;

select plan(80);

select has_table('public', 'digital_entitlements', 'paid digital entitlement table exists');
select has_table('public', 'digital_access_tokens', 'download token table exists');
select has_table('public', 'transactional_email_outbox', 'email outbox exists');
select has_table('public', 'fulfillment_audit_events', 'fulfillment audit table exists');
select has_function('private', 'grant_paid_digital_entitlements', array['uuid', 'uuid'], 'paid transition helper exists');
select has_function('public', 'revoke_digital_entitlement', array['uuid', 'integer', 'text'], 'admin revoke RPC exists');
select hasnt_function('public', 'reissue_digital_access_token', array['uuid', 'integer', 'text'], 'legacy hash-accepting reissue overload is removed');
select has_function('public', 'reissue_digital_access_token', array['uuid', 'integer'], 'versioned admin reissue RPC exists');
select has_function('public', 'issue_digital_access_token_for_outbox', array['uuid', 'text', 'timestamp with time zone'], 'guarded outbox issuance RPC exists');
select has_function('public', 'authorize_digital_download', array['text', 'uuid', 'uuid', 'text', 'text'], 'bounded download authorization RPC exists');

select col_is_fk('public', 'digital_entitlements', 'order_id', 'entitlements reference orders');
select col_is_fk('public', 'digital_entitlements', 'order_line_id', 'entitlements reference immutable order lines');
select col_type_is('public', 'digital_entitlements', 'status', 'text', 'entitlement status is explicit');
select col_type_is('public', 'digital_entitlements', 'version', 'integer', 'entitlement version supports stale-state checks');
select has_index('public', 'digital_entitlements', 'digital_entitlements_one_active_line_idx', 'one active entitlement per paid digital order line');
select col_is_fk('public', 'digital_access_tokens', 'entitlement_id', 'download tokens reference entitlement');
select col_type_is('public', 'digital_access_tokens', 'token_hash', 'text', 'download token stores a hash');
select col_type_is('public', 'digital_access_tokens', 'expires_at', 'timestamp with time zone', 'download token expiry is explicit');
select col_type_is('public', 'digital_access_tokens', 'revoked_at', 'timestamp with time zone', 'download token revocation timestamp is explicit');
select col_is_fk('public', 'digital_access_tokens', 'source_email_outbox_id', 'download token issuance references its source outbox row');
select has_index('public', 'digital_access_tokens', 'digital_access_tokens_source_email_outbox_idx', 'download token issuance is indexed by source outbox');
select results_eq(
  $$select i.indisunique and i.indpred is not null from pg_index i join pg_class c on c.oid=i.indexrelid where c.relname='digital_access_tokens_source_email_outbox_idx'$$,
  $$values (true)$$,
  'download token source index is unique only for linked email rows'
);
select col_type_is('public', 'transactional_email_outbox', 'event_type', 'text', 'outbox records typed fulfillment email intent');
select col_type_is('public', 'transactional_email_outbox', 'payload', 'jsonb', 'outbox payload is structured and sanitized');
select has_index('public', 'transactional_email_outbox', 'transactional_email_outbox_pending_idx', 'pending emails are indexed');
select has_trigger('public', 'payment_transitions', 'payment_transition_grants_digital_entitlements', 'paid payment transitions grant digital entitlements');
select has_trigger('public', 'transactional_email_outbox', 'transactional_email_outbox_safe_payload', 'email payload rejects unsafe token or signed URL data');
select has_trigger('public', 'fulfillment_audit_events', 'fulfillment_audit_events_append_only', 'fulfillment audit is append-only');
select throws_ok(
  $$insert into public.digital_access_tokens(entitlement_id,token_hash,expires_at) values(gen_random_uuid(),'raw-short',now()+interval '24 hours')$$,
  null, null, 'short raw-looking token material is rejected by token_hash length check'
);
select throws_ok(
  $$insert into public.transactional_email_outbox(event_type,recipient_email,locale,payload) values('digital_access_granted','buyer@example.test','en','{"signed_url":"https://example.test/private.pdf"}'::jsonb)$$,
  null, null, 'outbox rejects signed URLs and private object details'
);

select is((select prosecdef from pg_proc where oid=to_regprocedure('private.grant_paid_digital_entitlements(uuid,uuid)')),true,'paid grant is security definer');
select is((select prosecdef from pg_proc where oid=to_regprocedure('public.reissue_digital_access_token(uuid,integer)')),true,'reissue is security definer');
select is((select prosecdef from pg_proc where oid=to_regprocedure('public.issue_digital_access_token_for_outbox(uuid,text,timestamp with time zone)')),true,'issuance is security definer');
select is((select prosecdef from pg_proc where oid=to_regprocedure('public.authorize_digital_download(text,uuid,uuid,text,text)')),true,'authorization is security definer');
select is((select proconfig::text from pg_proc where oid=to_regprocedure('private.grant_paid_digital_entitlements(uuid,uuid)')),'{"search_path=\"\""}'::text,'paid grant fixes exactly an empty search path');
select is((select proconfig::text from pg_proc where oid=to_regprocedure('public.reissue_digital_access_token(uuid,integer)')),'{"search_path=\"\""}'::text,'reissue fixes exactly an empty search path');
select is((select proconfig::text from pg_proc where oid=to_regprocedure('public.issue_digital_access_token_for_outbox(uuid,text,timestamp with time zone)')),'{"search_path=\"\""}'::text,'issuance fixes exactly an empty search path');
select is((select proconfig::text from pg_proc where oid=to_regprocedure('public.authorize_digital_download(text,uuid,uuid,text,text)')),'{"search_path=\"\""}'::text,'authorization fixes exactly an empty search path');
select function_privs_are('public','reissue_digital_access_token',array['uuid','integer'],'anon',array[]::text[],'anon cannot reissue download tokens');
select function_privs_are('public','reissue_digital_access_token',array['uuid','integer'],'authenticated',array['EXECUTE'],'authenticated users may enter the admin-checked reissue boundary');
select function_privs_are('public','issue_digital_access_token_for_outbox',array['uuid','text','timestamp with time zone'],'anon',array[]::text[],'anon cannot issue download tokens');
select function_privs_are('public','issue_digital_access_token_for_outbox',array['uuid','text','timestamp with time zone'],'authenticated',array[]::text[],'authenticated users cannot issue download tokens');
select function_privs_are('public','issue_digital_access_token_for_outbox',array['uuid','text','timestamp with time zone'],'service_role',array['EXECUTE'],'service role alone issues download tokens');
select function_privs_are('public','authorize_digital_download',array['text','uuid','uuid','text','text'],'anon',array[]::text[],'anon cannot authorize private downloads');
select function_privs_are('public','authorize_digital_download',array['text','uuid','uuid','text','text'],'authenticated',array[]::text[],'authenticated users cannot authorize private downloads directly');
select function_privs_are('public','authorize_digital_download',array['text','uuid','uuid','text','text'],'service_role',array['EXECUTE'],'service role alone authorizes private downloads');
select table_privs_are('public','digital_access_tokens','authenticated',array[]::text[],'authenticated customers cannot read token hashes directly');
select table_privs_are('public','transactional_email_outbox','authenticated',array[]::text[],'customers cannot read email payloads directly');

-- Dynamic test wrappers make the pre-migration RED run load fully instead of aborting on missing functions.
create function pg_temp.test_reissue(p_id uuid,p_version integer) returns jsonb
language plpgsql set search_path='' as $$
declare result jsonb;
begin
  if pg_catalog.to_regprocedure('public.reissue_digital_access_token(uuid,integer)') is null then return pg_catalog.jsonb_build_object('status','missing'); end if;
  execute 'select public.reissue_digital_access_token($1,$2)' into result using p_id,p_version;
  return result;
end;
$$;
create function pg_temp.test_issue(p_id uuid,p_hash text,p_expiry timestamptz) returns timestamptz
language plpgsql set search_path='' as $$
declare result timestamptz;
begin
  if pg_catalog.to_regprocedure('public.issue_digital_access_token_for_outbox(uuid,text,timestamp with time zone)') is null then return null; end if;
  execute 'select public.issue_digital_access_token_for_outbox($1,$2,$3)' into result using p_id,p_hash,p_expiry;
  return result;
end;
$$;
create function pg_temp.test_authorize(p_order text,p_product uuid,p_owner uuid,p_token text,p_guest text)
returns table(entitlement_id uuid,product_id uuid,bucket_id text,object_path text,file_name text)
language plpgsql set search_path='' as $$
begin
  if pg_catalog.to_regprocedure('public.authorize_digital_download(text,uuid,uuid,text,text)') is null then return; end if;
  return query execute 'select * from public.authorize_digital_download($1,$2,$3,$4,$5)' using p_order,p_product,p_owner,p_token,p_guest;
end;
$$;

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('05170000-0000-4000-8000-000000000001','authenticated','authenticated','download-owner@example.test','x',now(),'{}','{}',now(),now()),
('05170000-0000-4000-8000-000000000002','authenticated','authenticated','download-admin@example.test','x',now(),'{}','{}',now(),now());
insert into public.profiles(id,email,preferred_locale) values
('05170000-0000-4000-8000-000000000001','download-owner@example.test','en'),
('05170000-0000-4000-8000-000000000002','download-admin@example.test','en');
insert into public.user_roles(user_id,role,assigned_by,note) values
('05170000-0000-4000-8000-000000000002','admin','05170000-0000-4000-8000-000000000002','digital lifecycle test admin');
insert into public.products(id,product_type,status) values('05170000-0000-4000-8000-000000000010','pdf_pattern','draft');
insert into public.product_digital_assets(product_id,bucket_id,object_path,file_name,byte_size) values
('05170000-0000-4000-8000-000000000010','pattern-pdfs','tests/second-pattern.pdf','second-pattern.pdf',100);

insert into public.checkout_orders(id,order_number,owner_user_id,guest_secret_hash,contact_email,locale,market,currency_code,status,payment_intent,subtotal_minor,discount_minor,shipping_minor,total_minor,accepted_quote_hash,quote_snapshot,cart_snapshot,idempotency_actor,idempotency_key,reservation_expires_at) values
('05170000-0000-4000-8000-000000000020','ATB-DIGITAL-LIFECYCLE-PAID','05170000-0000-4000-8000-000000000001',repeat('f',64),'download-owner@example.test','en','intl','USD','pending_payment','paypal_intent',5000,0,0,5000,'digital-paid-quote','{}','[]','user:05170000','digital-paid-key',now()+interval '15 minutes'),
('05170000-0000-4000-8000-000000000021','ATB-DIGITAL-LIFECYCLE-UNPAID','05170000-0000-4000-8000-000000000001',repeat('u',64),'download-owner@example.test','en','intl','USD','pending_payment','paypal_intent',2500,0,0,2500,'digital-unpaid-quote','{}','[]','user:05170001','digital-unpaid-key',now()+interval '15 minutes'),
('05170000-0000-4000-8000-000000000022','ATB-DIGITAL-LIFECYCLE-REVIEW','05170000-0000-4000-8000-000000000001',repeat('r',64),'download-owner@example.test','en','intl','USD','pending_payment','paypal_intent',2500,0,0,2500,'digital-review-quote','{}','[]','user:05170002','digital-review-key',now()+interval '15 minutes');
insert into public.checkout_order_lines(id,order_id,product_id,line_id,product_title,fulfillment_type,market,currency_code,quantity,unit_price_minor,line_subtotal_minor,quote_line_snapshot) values
('05170000-0000-4000-8000-000000000030','05170000-0000-4000-8000-000000000020','50000000-0000-0000-0000-000000000001','paid-a','First pattern','digital','intl','USD',1,2500,2500,'{}'),
('05170000-0000-4000-8000-000000000031','05170000-0000-4000-8000-000000000020','05170000-0000-4000-8000-000000000010','paid-b','Second pattern','digital','intl','USD',1,2500,2500,'{}'),
('05170000-0000-4000-8000-000000000032','05170000-0000-4000-8000-000000000021','50000000-0000-0000-0000-000000000001','unpaid-a','Unpaid pattern','digital','intl','USD',1,2500,2500,'{}'),
('05170000-0000-4000-8000-000000000033','05170000-0000-4000-8000-000000000022','50000000-0000-0000-0000-000000000001','review-a','Review pattern','digital','intl','USD',1,2500,2500,'{}');

update public.payments
set status='paid',paid_gate_opened_at=now(),paid_at=now()
where order_id='05170000-0000-4000-8000-000000000020';
update public.checkout_orders
set paid_gate_status='open'
where id='05170000-0000-4000-8000-000000000020';
insert into public.payment_transitions(
  id,payment_id,transition_key,source,from_status,to_status,result,actor_type
)
select '05170000-0000-4000-8000-000000000040',p.id,'digital-lifecycle-paid','paypal_webhook','pending','paid','applied','provider'
from public.payments p where p.order_id='05170000-0000-4000-8000-000000000020';
update public.checkout_orders set paid_gate_status='review_required' where id='05170000-0000-4000-8000-000000000022';
update public.payments set status='review_required',review_reason='manual_review' where order_id='05170000-0000-4000-8000-000000000022';

select is((select count(*)::integer from public.digital_entitlements where order_id='05170000-0000-4000-8000-000000000020'),2,'paid open order grants one entitlement per digital line');
select is((select count(*)::integer from public.transactional_email_outbox where order_id='05170000-0000-4000-8000-000000000020' and event_type='digital_access_granted'),2,'paid open order creates one versioned email intent per entitlement');
select is((select count(*)::integer from public.fulfillment_audit_events where order_id='05170000-0000-4000-8000-000000000020' and event_type='digital_entitlement_granted'),2,'paid open order audits each digital grant');
select is((select count(*)::integer from public.digital_access_tokens t join public.digital_entitlements e on e.id=t.entitlement_id where e.order_id='05170000-0000-4000-8000-000000000020'),0,'paid grant never creates an orphan token hash');
select ok((select bool_and(payload=jsonb_build_object('orderNumber','ATB-DIGITAL-LIFECYCLE-PAID','entitlementVersion',1,'expiresInHours',24)) from public.transactional_email_outbox where order_id='05170000-0000-4000-8000-000000000020' and event_type='digital_access_granted'),'grant email payload contains only safe versioned delivery facts');
select is(private.grant_paid_digital_entitlements((select id from public.payments where order_id='05170000-0000-4000-8000-000000000021'),gen_random_uuid()),0,'unpaid order cannot grant digital access');
select is(private.grant_paid_digital_entitlements((select id from public.payments where order_id='05170000-0000-4000-8000-000000000022'),gen_random_uuid()),0,'review-required order cannot grant digital access');
select is((select count(*)::integer from public.digital_entitlements where order_id in('05170000-0000-4000-8000-000000000021','05170000-0000-4000-8000-000000000022')),0,'closed gates leave no entitlements');
select is((select count(*)::integer from public.digital_access_tokens where status='active' and source_email_outbox_id is null),0,'forward cleanup leaves no active source-less legacy token');

insert into public.digital_access_tokens(entitlement_id,token_hash,status,expires_at)
select id,repeat('a',64),'active',now()+interval '12 hours' from public.digital_entitlements where order_line_id='05170000-0000-4000-8000-000000000030';
insert into public.digital_access_tokens(entitlement_id,token_hash,status,expires_at)
select id,repeat('b',64),'active',now()+interval '12 hours' from public.digital_entitlements where order_line_id='05170000-0000-4000-8000-000000000030';
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','05170000-0000-4000-8000-000000000002',true);
create temporary table lifecycle_reissue_result as select pg_temp.test_reissue((select id from public.digital_entitlements where order_line_id='05170000-0000-4000-8000-000000000030'),1) result;
reset role;
select is((select result->>'status' from lifecycle_reissue_result),'reissued','current-version admin reissue succeeds');
select is((select version from public.digital_entitlements where order_line_id='05170000-0000-4000-8000-000000000030'),2,'successful reissue increments entitlement version exactly once');
select is((select count(*)::integer from public.digital_access_tokens t join public.digital_entitlements e on e.id=t.entitlement_id where e.order_line_id='05170000-0000-4000-8000-000000000030' and t.status='active'),0,'successful reissue immediately revokes every active token');
select is((select count(*)::integer from public.transactional_email_outbox o join public.digital_entitlements e on e.id=o.entitlement_id where e.order_line_id='05170000-0000-4000-8000-000000000030' and o.event_type='digital_access_reissued'),1,'successful reissue creates exactly one replacement email intent');
select is((select count(*)::integer from public.fulfillment_audit_events a join public.digital_entitlements e on e.id=a.entitlement_id where e.order_line_id='05170000-0000-4000-8000-000000000030' and a.event_type='digital_access_reissued'),1,'successful reissue creates exactly one audit event');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','05170000-0000-4000-8000-000000000002',true);
create temporary table lifecycle_stale_result as select pg_temp.test_reissue((select id from public.digital_entitlements where order_line_id='05170000-0000-4000-8000-000000000030'),1) result;
reset role;
select is((select result->>'status' from lifecycle_stale_result),'stale','stale expected version is rejected');
select is((select count(*)::integer from public.transactional_email_outbox o join public.digital_entitlements e on e.id=o.entitlement_id where e.order_line_id='05170000-0000-4000-8000-000000000030' and o.event_type='digital_access_reissued'),1,'stale reissue creates no second intent');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','05170000-0000-4000-8000-000000000002',true);
create temporary table lifecycle_null_version_result as select pg_temp.test_reissue((select id from public.digital_entitlements where order_line_id='05170000-0000-4000-8000-000000000030'),null) result;
reset role;
select is((select result->>'status' from lifecycle_null_version_result),'stale','null expected version is rejected');
select is((select version from public.digital_entitlements where order_line_id='05170000-0000-4000-8000-000000000030'),2,'null expected version does not increment entitlement version');
select is((select count(*)::integer from public.transactional_email_outbox o join public.digital_entitlements e on e.id=o.entitlement_id where e.order_line_id='05170000-0000-4000-8000-000000000030' and o.event_type='digital_access_reissued'),1,'null expected version creates no replacement intent');

set local role service_role;
create temporary table lifecycle_issue_result as select pg_temp.test_issue(o.id,repeat('c',64),o.created_at+interval '24 hours') expiry from public.transactional_email_outbox o join public.digital_entitlements e on e.id=o.entitlement_id where e.order_line_id='05170000-0000-4000-8000-000000000030' and o.event_type='digital_access_reissued';
reset role;
select ok((select expiry is not null from lifecycle_issue_result),'current versioned outbox issues a hashed capability');
select results_eq(
  $$select t.token_hash,t.expires_at from public.digital_access_tokens t join public.transactional_email_outbox o on o.id=t.source_email_outbox_id join public.digital_entitlements e on e.id=t.entitlement_id where e.order_line_id='05170000-0000-4000-8000-000000000030' and o.event_type='digital_access_reissued'$$,
  $$select repeat('c',64),o.created_at+interval '24 hours' from public.transactional_email_outbox o join public.digital_entitlements e on e.id=o.entitlement_id where e.order_line_id='05170000-0000-4000-8000-000000000030' and o.event_type='digital_access_reissued'$$,
  'issuance persists only the supplied hash and fixed deterministic expiry'
);
set local role service_role;
select is(pg_temp.test_issue((select o.id from public.transactional_email_outbox o join public.digital_entitlements e on e.id=o.entitlement_id where e.order_line_id='05170000-0000-4000-8000-000000000030' and o.event_type='digital_access_reissued'),repeat('c',64),(select o.created_at+interval '24 hours' from public.transactional_email_outbox o join public.digital_entitlements e on e.id=o.entitlement_id where e.order_line_id='05170000-0000-4000-8000-000000000030' and o.event_type='digital_access_reissued')),(select expiry from lifecycle_issue_result),'same current outbox/hash/expiry issuance is idempotent');
select is(pg_temp.test_issue((select o.id from public.transactional_email_outbox o join public.digital_entitlements e on e.id=o.entitlement_id where e.order_line_id='05170000-0000-4000-8000-000000000030' and o.event_type='digital_access_granted'),repeat('d',64),(select o.created_at+interval '24 hours' from public.transactional_email_outbox o join public.digital_entitlements e on e.id=o.entitlement_id where e.order_line_id='05170000-0000-4000-8000-000000000030' and o.event_type='digital_access_granted')),null,'superseded outbox cannot issue or reactivate a token');
select is(pg_temp.test_issue((select o.id from public.transactional_email_outbox o join public.digital_entitlements e on e.id=o.entitlement_id where e.order_line_id='05170000-0000-4000-8000-000000000030' and o.event_type='digital_access_reissued'),'bad-hash',(select o.created_at+interval '24 hours' from public.transactional_email_outbox o join public.digital_entitlements e on e.id=o.entitlement_id where e.order_line_id='05170000-0000-4000-8000-000000000030' and o.event_type='digital_access_reissued')),null,'invalid hash is rejected');
reset role;

set local role service_role;
select is((select product_id from pg_temp.test_authorize('ATB-DIGITAL-LIFECYCLE-PAID','50000000-0000-0000-0000-000000000001','05170000-0000-4000-8000-000000000001',null,null)),'50000000-0000-0000-0000-000000000001'::uuid,'verified owner authorizes a product-scoped private asset');
select is((select product_id from pg_temp.test_authorize('ATB-DIGITAL-LIFECYCLE-PAID',null,null,repeat('c',64),null)),'50000000-0000-0000-0000-000000000001'::uuid,'valid email token self-scopes a no-product request');
select is((select product_id from pg_temp.test_authorize('ATB-DIGITAL-LIFECYCLE-PAID','05170000-0000-4000-8000-000000000010',null,null,repeat('f',64))),'05170000-0000-4000-8000-000000000010'::uuid,'valid guest order cookie authorizes a product-scoped private asset');
select is((select count(*)::integer from pg_temp.test_authorize('ATB-DIGITAL-LIFECYCLE-PAID',null,'05170000-0000-4000-8000-000000000001',null,null)),0,'owner no-product request is denied when distinct products are ambiguous');
select is((select count(*)::integer from pg_temp.test_authorize('ATB-DIGITAL-LIFECYCLE-PAID',null,null,null,repeat('f',64))),0,'guest-cookie no-product request is denied when distinct products are ambiguous');
select is((select count(*)::integer from pg_temp.test_authorize('ATB-DIGITAL-LIFECYCLE-PAID','05170000-0000-4000-8000-000000000010',null,repeat('c',64),null)),0,'token cannot authorize a different product');
select is((select count(*)::integer from pg_temp.test_authorize('ATB-DIGITAL-LIFECYCLE-PAID','50000000-0000-0000-0000-000000000001',null,repeat('e',64),null)),0,'unmatched token as sole proof is denied');
select is((select concat_ws('|',bucket_id,object_path,file_name) from pg_temp.test_authorize('ATB-DIGITAL-LIFECYCLE-PAID','50000000-0000-0000-0000-000000000001','05170000-0000-4000-8000-000000000001',repeat('e',64),null)),'pattern-pdfs|seed/private/vn-pattern.pdf|vn-pattern.pdf','valid owner proof remains sufficient when email token is invalid');
reset role;

select * from finish();
rollback;
