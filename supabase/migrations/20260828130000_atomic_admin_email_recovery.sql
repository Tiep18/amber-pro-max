-- Make every outbox state transition versioned so an admin form can never
-- revive a row that a worker has claimed or completed since the page loaded.

alter table public.transactional_email_outbox
  add column version integer not null default 1
  check (version > 0);

create or replace function public.claim_transactional_emails(
  p_limit integer default 10,
  p_lease_seconds integer default 300
)
returns setof public.transactional_email_outbox
language plpgsql
security definer
set search_path = ''
as $$
declare
  bounded_limit integer := least(greatest(coalesce(p_limit, 10), 1), 100);
  bounded_lease integer := least(greatest(coalesce(p_lease_seconds, 300), 30), 3600);
begin
  return query
  with claimable as (
    select outbox.id
    from public.transactional_email_outbox outbox
    where (outbox.status = 'pending' and outbox.available_at <= pg_catalog.now())
       or (
         outbox.status = 'sending'
         and outbox.claimed_at is not null
         and outbox.claimed_at <= pg_catalog.now() - pg_catalog.make_interval(secs => bounded_lease)
       )
    order by outbox.available_at
    limit bounded_limit
    for update skip locked
  )
  update public.transactional_email_outbox target
  set status = 'sending',
      claimed_at = pg_catalog.now(),
      claim_token = pg_catalog.gen_random_uuid(),
      attempt_count = target.attempt_count + 1,
      version = target.version + 1,
      updated_at = pg_catalog.now()
  from claimable
  where target.id = claimable.id
  returning target.*;
end;
$$;

create or replace function public.transition_transactional_email_claim(
  p_id uuid,
  p_claim_token uuid,
  p_status text,
  p_provider_message_id text default null,
  p_error_code text default null,
  p_available_at timestamp with time zone default null,
  p_transitioned_at timestamp with time zone default pg_catalog.now()
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_rows integer;
begin
  if p_id is null or p_claim_token is null or p_transitioned_at is null then
    raise exception 'invalid email claim transition' using errcode = '22023';
  end if;

  if p_status = 'sent' then
    if nullif(pg_catalog.btrim(p_provider_message_id), '') is null
       or p_error_code is not null
       or p_available_at is not null then
      raise exception 'invalid sent email claim transition' using errcode = '22023';
    end if;
  elsif p_status = 'pending' then
    if nullif(pg_catalog.btrim(p_error_code), '') is null
       or p_available_at is null
       or p_provider_message_id is not null then
      raise exception 'invalid retry email claim transition' using errcode = '22023';
    end if;
  elsif p_status = 'failed' then
    if nullif(pg_catalog.btrim(p_error_code), '') is null
       or p_provider_message_id is not null
       or p_available_at is not null then
      raise exception 'invalid failed email claim transition' using errcode = '22023';
    end if;
  else
    raise exception 'invalid email claim transition status' using errcode = '22023';
  end if;

  update public.transactional_email_outbox target
  set status = p_status,
      sent_at = case when p_status = 'sent' then p_transitioned_at else target.sent_at end,
      provider_message_id = case when p_status = 'sent' then pg_catalog.btrim(p_provider_message_id) else null end,
      last_error_code = case when p_status in ('pending', 'failed') then pg_catalog.btrim(p_error_code) else null end,
      available_at = case when p_status = 'pending' then p_available_at else target.available_at end,
      claimed_at = null,
      claim_token = null,
      version = target.version + 1,
      updated_at = p_transitioned_at
  where target.id = p_id
    and target.status = 'sending'
    and target.claim_token = p_claim_token;

  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

alter function public.claim_transactional_emails(integer, integer) owner to postgres;
revoke all on function public.claim_transactional_emails(integer, integer)
from public, anon, authenticated, service_role;
grant execute on function public.claim_transactional_emails(integer, integer)
to service_role;

alter function public.transition_transactional_email_claim(uuid, uuid, text, text, text, timestamp with time zone, timestamp with time zone)
owner to postgres;
revoke all on function public.transition_transactional_email_claim(uuid, uuid, text, text, text, timestamp with time zone, timestamp with time zone)
from public, anon, authenticated, service_role;
grant execute on function public.transition_transactional_email_claim(uuid, uuid, text, text, text, timestamp with time zone, timestamp with time zone)
to service_role;

create function public.admin_retry_transactional_email(
  p_outbox_id uuid,
  p_expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  outbox_row public.transactional_email_outbox%rowtype;
  order_row public.checkout_orders%rowtype;
  entitlement_row public.digital_entitlements%rowtype;
  next_version integer;
  normalized_recipient text;
  requires_guest_capability boolean := false;
begin
  if not private.is_admin() then
    return pg_catalog.jsonb_build_object('status', 'forbidden');
  end if;

  if p_outbox_id is null or p_expected_version is null or p_expected_version < 1 then
    return pg_catalog.jsonb_build_object('status', 'invalid');
  end if;

  select outbox.*
  into outbox_row
  from public.transactional_email_outbox outbox
  where outbox.id = p_outbox_id
  for update;

  if not found then
    return pg_catalog.jsonb_build_object('status', 'not_found');
  end if;

  if outbox_row.version is distinct from p_expected_version then
    return pg_catalog.jsonb_build_object('status', 'stale', 'version', outbox_row.version);
  end if;

  if outbox_row.status in ('sent', 'cancelled')
    or (outbox_row.status = 'pending' and outbox_row.available_at > pg_catalog.now())
    or (
      outbox_row.status = 'sending'
      and outbox_row.claimed_at > pg_catalog.now() - interval '5 minutes'
    )
    or outbox_row.status not in ('failed', 'pending', 'sending') then
    return pg_catalog.jsonb_build_object('status', 'stale', 'version', outbox_row.version);
  end if;

  normalized_recipient := pg_catalog.lower(pg_catalog.btrim(outbox_row.recipient_email));
  if normalized_recipient = '' then
    return pg_catalog.jsonb_build_object('status', 'stale', 'version', outbox_row.version);
  end if;

  if outbox_row.order_id is not null then
    select checkout.*
    into order_row
    from public.checkout_orders checkout
    where checkout.id = outbox_row.order_id
      and pg_catalog.lower(pg_catalog.btrim(checkout.contact_email)) = normalized_recipient
      and checkout.locale = outbox_row.locale
      and checkout.order_number = outbox_row.payload ->> 'orderNumber'
    for key share;

    if not found then
      return pg_catalog.jsonb_build_object('status', 'stale', 'version', outbox_row.version);
    end if;
  end if;

  if outbox_row.entitlement_id is not null then
    select entitlement.*
    into entitlement_row
    from public.digital_entitlements entitlement
    where entitlement.id = outbox_row.entitlement_id
      and entitlement.order_id = outbox_row.order_id
      and pg_catalog.lower(pg_catalog.btrim(entitlement.contact_email)) = normalized_recipient
    for key share;

    if not found then
      return pg_catalog.jsonb_build_object('status', 'stale', 'version', outbox_row.version);
    end if;
  end if;

  if outbox_row.event_type in ('digital_access_granted', 'digital_access_reissued') then
    if entitlement_row.status <> 'active'
      or order_row.paid_gate_status <> 'open'
      or pg_catalog.jsonb_typeof(outbox_row.payload -> 'entitlementVersion') <> 'number'
      or (outbox_row.payload ->> 'entitlementVersion')::integer <> entitlement_row.version
      or not exists (
        select 1
        from public.digital_access_tokens token
        where token.source_email_outbox_id = outbox_row.id
          and token.entitlement_id = entitlement_row.id
          and token.status = 'active'
          and token.revoked_at is null
          and token.expires_at > pg_catalog.now()
      ) then
      return pg_catalog.jsonb_build_object('status', 'stale', 'version', outbox_row.version);
    end if;
  elsif outbox_row.event_type in ('guest_order_reopen', 'guest_order_claim') then
    requires_guest_capability := true;
  elsif outbox_row.event_type in ('order_created', 'payment_received') then
    requires_guest_capability := outbox_row.payload ->> 'isGuest' = 'true';
  elsif outbox_row.event_type = 'newsletter_subscribed' then
    if outbox_row.order_id is not null
      or not exists (
        select 1
        from public.newsletter_subscribers subscriber
        join public.newsletter_unsubscribe_tokens token
          on token.normalized_email = subscriber.normalized_email
        where subscriber.normalized_email = normalized_recipient
          and token.source_email_outbox_id = outbox_row.id
          and token.consumed_at is null
          and token.expires_at > pg_catalog.now()
      ) then
      return pg_catalog.jsonb_build_object('status', 'stale', 'version', outbox_row.version);
    end if;
  end if;

  if requires_guest_capability and not exists (
    select 1
    from public.guest_order_access_tokens token
    where token.source_email_outbox_id = outbox_row.id
      and token.order_id = outbox_row.order_id
      and pg_catalog.lower(pg_catalog.btrim(token.contact_email)) = normalized_recipient
      and token.status = 'active'
      and token.consumed_at is null
      and token.expires_at > pg_catalog.now()
  ) then
    return pg_catalog.jsonb_build_object('status', 'stale', 'version', outbox_row.version);
  end if;

  update public.transactional_email_outbox
  set status = 'pending',
      available_at = pg_catalog.now(),
      claimed_at = null,
      claim_token = null,
      version = version + 1,
      updated_at = pg_catalog.now()
  where id = outbox_row.id
  returning version into next_version;

  insert into public.fulfillment_audit_events(
    event_key,
    order_id,
    entitlement_id,
    event_type,
    actor_type,
    actor_id,
    metadata
  ) values (
    'transactional_email_retry_queued:' || outbox_row.id::text || ':' || next_version::text,
    outbox_row.order_id,
    outbox_row.entitlement_id,
    'transactional_email_retry_queued',
    'admin',
    auth.uid(),
    pg_catalog.jsonb_build_object(
      'emailType', outbox_row.event_type,
      'attemptCount', outbox_row.attempt_count
    )
  );

  return pg_catalog.jsonb_build_object('status', 'queued', 'version', next_version);
end;
$$;

alter function public.admin_retry_transactional_email(uuid, integer) owner to postgres;
revoke all on function public.admin_retry_transactional_email(uuid, integer)
from public, anon, authenticated, service_role;
grant execute on function public.admin_retry_transactional_email(uuid, integer)
to authenticated;

create or replace function public.reissue_digital_access_token(
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
  order_row public.checkout_orders%rowtype;
  next_version integer;
begin
  if not private.is_admin() then
    return pg_catalog.jsonb_build_object('status', 'forbidden');
  end if;

  if p_entitlement_id is null or p_expected_version < 1 then
    return pg_catalog.jsonb_build_object('status', 'invalid');
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
    return pg_catalog.jsonb_build_object('status', 'stale', 'version', entitlement_row.version);
  end if;

  select checkout.*
  into order_row
  from public.checkout_orders checkout
  where checkout.id = entitlement_row.order_id
    and checkout.paid_gate_status = 'open'
    and pg_catalog.lower(pg_catalog.btrim(checkout.contact_email)) =
        pg_catalog.lower(pg_catalog.btrim(entitlement_row.contact_email))
  for update;

  if not found then
    return pg_catalog.jsonb_build_object('status', 'stale', 'version', entitlement_row.version);
  end if;

  update public.digital_access_tokens
  set status = 'revoked',
      revoked_at = pg_catalog.now()
  where entitlement_id = entitlement_row.id
    and status = 'active';

  update public.digital_entitlements
  set version = version + 1,
      updated_at = pg_catalog.now()
  where id = entitlement_row.id
  returning version into next_version;

  insert into public.transactional_email_outbox(
    order_id,
    entitlement_id,
    event_type,
    recipient_email,
    locale,
    payload
  ) values (
    order_row.id,
    entitlement_row.id,
    'digital_access_reissued',
    order_row.contact_email,
    order_row.locale,
    pg_catalog.jsonb_build_object(
      'orderNumber', order_row.order_number,
      'entitlementVersion', next_version,
      'expiresInHours', 24
    )
  );

  insert into public.fulfillment_audit_events(
    event_key,
    order_id,
    entitlement_id,
    event_type,
    actor_type,
    actor_id,
    metadata
  ) values (
    'digital_access_reissued:' || entitlement_row.id::text || ':' || next_version::text,
    order_row.id,
    entitlement_row.id,
    'digital_access_reissued',
    'admin',
    auth.uid(),
    pg_catalog.jsonb_build_object('expiresInHours', 24)
  );

  return pg_catalog.jsonb_build_object('status', 'reissued', 'version', next_version);
end;
$$;

alter function public.reissue_digital_access_token(uuid, integer) owner to postgres;
revoke all on function public.reissue_digital_access_token(uuid, integer)
from public, anon, authenticated, service_role;
grant execute on function public.reissue_digital_access_token(uuid, integer)
to authenticated;
