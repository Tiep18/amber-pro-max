-- Prepare guest-order and newsletter bearer capabilities in one database
-- round trip. The outbox row is the authority for capability type, subject,
-- and lifetime; the worker supplies only a deterministic hash.

create function public.issue_transactional_email_capability_for_outbox(
  p_source_email_outbox_id uuid,
  p_token_hash text
)
returns timestamp with time zone
language plpgsql
security definer
set search_path = ''
as $$
declare
  outbox_row public.transactional_email_outbox%rowtype;
  order_row public.checkout_orders%rowtype;
  existing_guest public.guest_order_access_tokens%rowtype;
  existing_newsletter public.newsletter_unsubscribe_tokens%rowtype;
  canonical_expiry timestamp with time zone;
  normalized_email_value text;
  guest_purpose_value text;
begin
  if p_source_email_outbox_id is null
    or p_token_hash is null
    or p_token_hash !~ '^[0-9a-f]{64}$' then
    return null;
  end if;

  -- Serializing on the immutable source intent makes retry and concurrent
  -- invocation idempotent without a select-insert-reread HTTP sequence.
  select outbox.*
  into outbox_row
  from public.transactional_email_outbox outbox
  where outbox.id = p_source_email_outbox_id
  for update;

  if not found then
    return null;
  end if;

  normalized_email_value := pg_catalog.lower(pg_catalog.btrim(outbox_row.recipient_email));
  if normalized_email_value = '' then
    return null;
  end if;

  if outbox_row.event_type = 'newsletter_subscribed' then
    canonical_expiry := outbox_row.created_at + interval '30 days';
    if canonical_expiry <= pg_catalog.now()
      or not exists (
        select 1
        from public.newsletter_subscribers subscriber
        where subscriber.normalized_email = normalized_email_value
      ) then
      return null;
    end if;

    select token.*
    into existing_newsletter
    from public.newsletter_unsubscribe_tokens token
    where token.source_email_outbox_id = p_source_email_outbox_id;

    if found then
      if existing_newsletter.normalized_email = normalized_email_value
        and existing_newsletter.token_hash = p_token_hash
        and existing_newsletter.expires_at = canonical_expiry
        and existing_newsletter.consumed_at is null then
        return existing_newsletter.expires_at;
      end if;
      return null;
    end if;

    insert into public.newsletter_unsubscribe_tokens (
      normalized_email,
      token_hash,
      expires_at,
      source_email_outbox_id
    ) values (
      normalized_email_value,
      p_token_hash,
      canonical_expiry,
      p_source_email_outbox_id
    );

    return canonical_expiry;
  end if;

  if outbox_row.event_type = 'guest_order_claim' then
    guest_purpose_value := 'claim_order';
  elsif outbox_row.event_type in (
    'guest_order_reopen',
    'order_created',
    'payment_received'
  ) then
    guest_purpose_value := 'reopen_order';
  else
    return null;
  end if;

  if outbox_row.order_id is null then
    return null;
  end if;

  select checkout.*
  into order_row
  from public.checkout_orders checkout
  where checkout.id = outbox_row.order_id
    and checkout.owner_user_id is null
    and pg_catalog.lower(pg_catalog.btrim(checkout.contact_email)) = normalized_email_value
  for key share;

  if not found then
    return null;
  end if;

  canonical_expiry := outbox_row.created_at + interval '24 hours';
  if canonical_expiry <= pg_catalog.now() then
    return null;
  end if;

  select token.*
  into existing_guest
  from public.guest_order_access_tokens token
  where token.source_email_outbox_id = p_source_email_outbox_id;

  if found then
    if existing_guest.order_id = order_row.id
      and existing_guest.contact_email = normalized_email_value
      and existing_guest.token_hash = p_token_hash
      and existing_guest.purpose = guest_purpose_value
      and existing_guest.status = 'active'
      and existing_guest.expires_at = canonical_expiry
      and existing_guest.consumed_at is null then
      return existing_guest.expires_at;
    end if;
    return null;
  end if;

  insert into public.guest_order_access_tokens (
    order_id,
    contact_email,
    token_hash,
    purpose,
    status,
    expires_at,
    source_email_outbox_id
  ) values (
    order_row.id,
    normalized_email_value,
    p_token_hash,
    guest_purpose_value,
    'active',
    canonical_expiry,
    p_source_email_outbox_id
  );

  return canonical_expiry;
end;
$$;

alter function public.issue_transactional_email_capability_for_outbox(uuid, text)
owner to postgres;

revoke all on function public.issue_transactional_email_capability_for_outbox(uuid, text)
from public, anon, authenticated, service_role;
grant execute on function public.issue_transactional_email_capability_for_outbox(uuid, text)
to service_role;
