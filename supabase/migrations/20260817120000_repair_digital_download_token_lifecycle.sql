-- Repair digital download capability ownership. The email worker is the only
-- component that ever holds a deliverable raw download capability; Postgres
-- owns version fencing, revocation, and authorization.

update public.digital_access_tokens
set status = 'revoked',
    revoked_at = pg_catalog.now()
where status = 'active'
  and source_email_outbox_id is null;

create or replace function private.grant_paid_digital_entitlements(
  p_payment_id uuid,
  p_payment_transition_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.checkout_orders%rowtype;
  line_row public.checkout_order_lines%rowtype;
  entitlement_id uuid;
  entitlement_version integer;
  granted_count integer := 0;
begin
  select co.*
  into order_row
  from public.checkout_orders co
  join public.payments p on p.order_id = co.id
  where p.id = p_payment_id
    and p.status = 'paid'
    and co.paid_gate_status = 'open'
  for update of co;

  if not found then
    return 0;
  end if;

  for line_row in
    select line.*
    from public.checkout_order_lines line
    where line.order_id = order_row.id
      and line.fulfillment_type = 'digital'
    order by line.id
  loop
    entitlement_id := null;
    entitlement_version := null;

    insert into public.digital_entitlements(
      order_id,
      order_line_id,
      owner_user_id,
      contact_email,
      product_id,
      variant_id,
      status,
      granted_by_payment_transition_id
    ) values (
      order_row.id,
      line_row.id,
      order_row.owner_user_id,
      order_row.contact_email,
      line_row.product_id,
      line_row.variant_id,
      'active',
      p_payment_transition_id
    )
    on conflict do nothing
    returning id, version into entitlement_id, entitlement_version;

    if entitlement_id is not null then
      insert into public.transactional_email_outbox(
        order_id,
        entitlement_id,
        event_type,
        recipient_email,
        locale,
        payload
      ) values (
        order_row.id,
        entitlement_id,
        'digital_access_granted',
        order_row.contact_email,
        order_row.locale,
        pg_catalog.jsonb_build_object(
          'orderNumber', order_row.order_number,
          'entitlementVersion', entitlement_version,
          'expiresInHours', 24
        )
      );

      insert into public.fulfillment_audit_events(
        event_key,
        order_id,
        entitlement_id,
        event_type,
        actor_type,
        metadata
      ) values (
        'digital_entitlement_granted:' || entitlement_id::text,
        order_row.id,
        entitlement_id,
        'digital_entitlement_granted',
        'system',
        pg_catalog.jsonb_build_object('paymentTransitionId', p_payment_transition_id)
      )
      on conflict (event_key) do nothing;

      granted_count := granted_count + 1;
    end if;
  end loop;

  update public.checkout_orders
  set digital_fulfillment_status = case
        when granted_count > 0 then 'eligible'
        else digital_fulfillment_status
      end,
      updated_at = pg_catalog.now()
  where id = order_row.id;

  return granted_count;
end;
$$;

revoke all on function public.reissue_digital_access_token(uuid, integer, text)
from public, anon, authenticated, service_role;
drop function public.reissue_digital_access_token(uuid, integer, text);

create function public.reissue_digital_access_token(
  p_entitlement_id uuid,
  p_expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  entitlement_row public.digital_entitlements%rowtype;
  next_version integer;
begin
  if not private.is_admin() then
    return pg_catalog.jsonb_build_object('status', 'forbidden');
  end if;

  select entitlement.*
  into entitlement_row
  from public.digital_entitlements entitlement
  where entitlement.id = p_entitlement_id
  for update;

  if not found then
    return pg_catalog.jsonb_build_object('status', 'not_found');
  end if;

  if entitlement_row.status <> 'active'
    or entitlement_row.version is distinct from p_expected_version then
    return pg_catalog.jsonb_build_object(
      'status', 'stale',
      'version', entitlement_row.version
    );
  end if;

  update public.digital_access_tokens
  set status = 'revoked',
      revoked_at = pg_catalog.now()
  where entitlement_id = p_entitlement_id
    and status = 'active';

  update public.digital_entitlements
  set version = version + 1,
      updated_at = pg_catalog.now()
  where id = p_entitlement_id
  returning version into next_version;

  insert into public.transactional_email_outbox(
    order_id,
    entitlement_id,
    event_type,
    recipient_email,
    locale,
    payload
  )
  select
    entitlement.order_id,
    entitlement.id,
    'digital_access_reissued',
    entitlement.contact_email,
    checkout.locale,
    pg_catalog.jsonb_build_object(
      'orderNumber', checkout.order_number,
      'entitlementVersion', next_version,
      'expiresInHours', 24
    )
  from public.digital_entitlements entitlement
  join public.checkout_orders checkout on checkout.id = entitlement.order_id
  where entitlement.id = p_entitlement_id;

  insert into public.fulfillment_audit_events(
    event_key,
    order_id,
    entitlement_id,
    event_type,
    actor_type,
    actor_id,
    metadata
  ) values (
    'digital_access_reissued:' || p_entitlement_id::text || ':' || next_version::text,
    entitlement_row.order_id,
    p_entitlement_id,
    'digital_access_reissued',
    'admin',
    auth.uid(),
    pg_catalog.jsonb_build_object('expiresInHours', 24)
  );

  return pg_catalog.jsonb_build_object('status', 'reissued', 'version', next_version);
end;
$$;

create function public.issue_digital_access_token_for_outbox(
  p_source_email_outbox_id uuid,
  p_token_hash text,
  p_expires_at timestamp with time zone
)
returns timestamp with time zone
language plpgsql
security definer
set search_path = ''
as $$
declare
  entitlement_id_value uuid;
  outbox_created_at timestamp with time zone;
  existing_token public.digital_access_tokens%rowtype;
begin
  if p_source_email_outbox_id is null
    or p_token_hash is null
    or p_token_hash !~ '^[0-9a-f]{64}$'
    or p_expires_at is null then
    return null;
  end if;

  select entitlement.id, outbox.created_at
  into entitlement_id_value, outbox_created_at
  from public.transactional_email_outbox outbox
  join public.digital_entitlements entitlement
    on entitlement.id = outbox.entitlement_id
  join public.checkout_orders checkout
    on checkout.id = entitlement.order_id
  where outbox.id = p_source_email_outbox_id
    and outbox.event_type in ('digital_access_granted', 'digital_access_reissued')
    and outbox.order_id = entitlement.order_id
    and entitlement.status = 'active'
    and checkout.paid_gate_status = 'open'
    and pg_catalog.jsonb_typeof(outbox.payload -> 'entitlementVersion') = 'number'
    and (outbox.payload ->> 'entitlementVersion')::integer = entitlement.version
  for update of entitlement;

  if not found
    or p_expires_at <= pg_catalog.now()
    or pg_catalog.abs(
      extract(epoch from (p_expires_at - (outbox_created_at + interval '24 hours')))
    ) >= 0.001 then
    return null;
  end if;

  select token.*
  into existing_token
  from public.digital_access_tokens token
  where token.source_email_outbox_id = p_source_email_outbox_id;

  if found then
    if existing_token.entitlement_id = entitlement_id_value
      and existing_token.token_hash = p_token_hash
      and existing_token.expires_at = p_expires_at
      and existing_token.status = 'active' then
      return existing_token.expires_at;
    end if;
    return null;
  end if;

  insert into public.digital_access_tokens(
    entitlement_id,
    token_hash,
    purpose,
    status,
    expires_at,
    source_email_outbox_id
  ) values (
    entitlement_id_value,
    p_token_hash,
    'download',
    'active',
    p_expires_at,
    p_source_email_outbox_id
  );

  return p_expires_at;
end;
$$;

create function public.authorize_digital_download(
  p_order_number text,
  p_product_id uuid,
  p_owner_user_id uuid,
  p_download_token_hash text,
  p_guest_secret_hash text
)
returns table(
  entitlement_id uuid,
  product_id uuid,
  bucket_id text,
  object_path text,
  file_name text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_order_number is null
    or p_order_number = ''
    or p_order_number <> pg_catalog.btrim(p_order_number)
    or (p_download_token_hash is not null and p_download_token_hash !~ '^[0-9a-f]{64}$')
    or (p_guest_secret_hash is not null and p_guest_secret_hash !~ '^[0-9a-f]{64}$') then
    return;
  end if;

  return query
  with candidates as (
    select
      entitlement.id as candidate_entitlement_id,
      entitlement.product_id as candidate_product_id,
      asset.bucket_id as candidate_bucket_id,
      asset.object_path as candidate_object_path,
      asset.file_name as candidate_file_name,
      entitlement.order_line_id,
      (
        p_owner_user_id is not null
        and checkout.owner_user_id = p_owner_user_id
      ) as owner_proof,
      (
        p_guest_secret_hash is not null
        and checkout.guest_secret_hash = p_guest_secret_hash
      ) as guest_proof,
      exists (
        select 1
        from public.digital_access_tokens token
        where token.entitlement_id = entitlement.id
          and token.token_hash = p_download_token_hash
          and token.status = 'active'
          and token.expires_at > pg_catalog.now()
      ) as token_proof
    from public.checkout_orders checkout
    join public.digital_entitlements entitlement
      on entitlement.order_id = checkout.id
    join public.product_digital_assets asset
      on asset.product_id = entitlement.product_id
     and asset.is_private = true
    where checkout.order_number = p_order_number
      and checkout.paid_gate_status = 'open'
      and entitlement.status = 'active'
      and (p_product_id is null or entitlement.product_id = p_product_id)
  ),
  allowed as (
    select candidate.*
    from candidates candidate
    where
      (
        p_product_id is not null
        and (candidate.owner_proof or candidate.guest_proof or candidate.token_proof)
      )
      or (
        p_product_id is null
        and candidate.token_proof
      )
      or (
        p_product_id is null
        and not exists (select 1 from candidates token_candidate where token_candidate.token_proof)
        and (candidate.owner_proof or candidate.guest_proof)
        and (
          select pg_catalog.count(distinct proof_candidate.candidate_product_id)
          from candidates proof_candidate
          where proof_candidate.owner_proof or proof_candidate.guest_proof
        ) = 1
      )
  )
  select
    allowed.candidate_entitlement_id,
    allowed.candidate_product_id,
    allowed.candidate_bucket_id,
    allowed.candidate_object_path,
    allowed.candidate_file_name
  from allowed
  order by
    case when allowed.token_proof then 0 else 1 end,
    allowed.order_line_id,
    allowed.candidate_entitlement_id
  limit 1;
end;
$$;

revoke all on function private.grant_paid_digital_entitlements(uuid, uuid)
from public, anon, authenticated;

revoke all on function public.reissue_digital_access_token(uuid, integer)
from public, anon, authenticated, service_role;
grant execute on function public.reissue_digital_access_token(uuid, integer)
to authenticated;

revoke all on function public.issue_digital_access_token_for_outbox(uuid, text, timestamp with time zone)
from public, anon, authenticated, service_role;
grant execute on function public.issue_digital_access_token_for_outbox(uuid, text, timestamp with time zone)
to service_role;

revoke all on function public.authorize_digital_download(text, uuid, uuid, text, text)
from public, anon, authenticated, service_role;
grant execute on function public.authorize_digital_download(text, uuid, uuid, text, text)
to service_role;
