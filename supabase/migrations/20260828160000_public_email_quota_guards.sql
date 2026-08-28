-- Bound public email requests inside PostgreSQL so abuse cannot consume the
-- transactional provider quota or race through a read-then-insert boundary.

create table private.public_email_rate_limits (
  scope text not null check (scope in ('ip', 'target')),
  action text not null check (
    action in (
      'all_public_email',
      'newsletter_subscribe',
      'guest_order_reopen',
      'guest_order_claim'
    )
  ),
  identity_hash text not null check (identity_hash ~ '^[a-f0-9]{64}$'),
  accepted_at timestamp with time zone[] not null default '{}'::timestamptz[],
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone not null default pg_catalog.now(),
  updated_at timestamp with time zone not null default pg_catalog.now(),
  primary key (scope, action, identity_hash),
  check (pg_catalog.cardinality(accepted_at) between 0 and 20),
  check (pg_catalog.array_position(accepted_at, null) is null)
);

create index public_email_rate_limits_expiry_idx
  on private.public_email_rate_limits (expires_at);

revoke all on table private.public_email_rate_limits
from public, anon, authenticated, service_role;

create function private.consume_public_email_rate_limit(
  p_action text,
  p_target_hash text,
  p_ip_hash text,
  p_target_cooldown_seconds integer,
  p_target_hour_limit integer,
  p_requested_at timestamp with time zone default pg_catalog.now()
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  ip_row private.public_email_rate_limits%rowtype;
  target_row private.public_email_rate_limits%rowtype;
  recent_ip timestamptz[];
  recent_target timestamptz[];
  last_target timestamptz;
begin
  if p_action not in ('newsletter_subscribe', 'guest_order_reopen', 'guest_order_claim')
     or p_target_hash !~ '^[a-f0-9]{64}$'
     or p_ip_hash !~ '^[a-f0-9]{64}$'
     or p_target_cooldown_seconds not between 1 and 3600
     or p_target_hour_limit not between 1 and 20
     or p_requested_at is null then
    raise exception 'invalid public email rate limit input' using errcode = '22023';
  end if;

  -- Every request removes only a bounded batch. Normal traffic therefore
  -- cleans expired identities without a cron job or unbounded request work.
  delete from private.public_email_rate_limits stale
  where stale.ctid in (
    select candidate.ctid
    from private.public_email_rate_limits candidate
    where candidate.expires_at <= p_requested_at
    order by candidate.expires_at
    limit 50
  );

  insert into private.public_email_rate_limits (
    scope, action, identity_hash, accepted_at, expires_at
  ) values (
    'ip', 'all_public_email', p_ip_hash, '{}'::timestamptz[],
    p_requested_at + interval '1 hour'
  )
  on conflict (scope, action, identity_hash) do nothing;

  select state.* into strict ip_row
  from private.public_email_rate_limits state
  where state.scope = 'ip'
    and state.action = 'all_public_email'
    and state.identity_hash = p_ip_hash
  for update;

  select coalesce(pg_catalog.array_agg(value order by value), '{}'::timestamptz[])
  into recent_ip
  from pg_catalog.unnest(ip_row.accepted_at) value
  where value > p_requested_at - interval '1 hour';

  if pg_catalog.cardinality(recent_ip) >= 20 then
    update private.public_email_rate_limits
    set accepted_at = recent_ip,
        expires_at = coalesce(recent_ip[pg_catalog.cardinality(recent_ip)], p_requested_at) + interval '1 hour',
        updated_at = p_requested_at
    where scope = 'ip' and action = 'all_public_email' and identity_hash = p_ip_hash;
    return false;
  end if;

  recent_ip := pg_catalog.array_append(recent_ip, p_requested_at);
  update private.public_email_rate_limits
  set accepted_at = recent_ip,
      expires_at = p_requested_at + interval '1 hour',
      updated_at = p_requested_at
  where scope = 'ip' and action = 'all_public_email' and identity_hash = p_ip_hash;

  insert into private.public_email_rate_limits (
    scope, action, identity_hash, accepted_at, expires_at
  ) values (
    'target', p_action, p_target_hash, '{}'::timestamptz[],
    p_requested_at + interval '1 hour'
  )
  on conflict (scope, action, identity_hash) do nothing;

  select state.* into strict target_row
  from private.public_email_rate_limits state
  where state.scope = 'target'
    and state.action = p_action
    and state.identity_hash = p_target_hash
  for update;

  select
    coalesce(pg_catalog.array_agg(value order by value), '{}'::timestamptz[]),
    pg_catalog.max(value)
  into recent_target, last_target
  from pg_catalog.unnest(target_row.accepted_at) value
  where value > p_requested_at - interval '1 hour';

  if pg_catalog.cardinality(recent_target) >= p_target_hour_limit
     or last_target > p_requested_at - pg_catalog.make_interval(secs => p_target_cooldown_seconds) then
    update private.public_email_rate_limits
    set accepted_at = recent_target,
        expires_at = coalesce(recent_target[pg_catalog.cardinality(recent_target)], p_requested_at) + interval '1 hour',
        updated_at = p_requested_at
    where scope = 'target' and action = p_action and identity_hash = p_target_hash;
    return false;
  end if;

  recent_target := pg_catalog.array_append(recent_target, p_requested_at);
  update private.public_email_rate_limits
  set accepted_at = recent_target,
      expires_at = p_requested_at + interval '1 hour',
      updated_at = p_requested_at
  where scope = 'target' and action = p_action and identity_hash = p_target_hash;

  return true;
end;
$$;

alter function private.consume_public_email_rate_limit(text, text, text, integer, integer, timestamptz)
owner to postgres;
revoke all on function private.consume_public_email_rate_limit(text, text, text, integer, integer, timestamptz)
from public, anon, authenticated, service_role;

drop function public.subscribe_newsletter(text, text, text, text, text, text);

create function public.subscribe_newsletter(
  p_email text,
  p_locale text,
  p_market text,
  p_source text,
  p_target_hash text,
  p_ip_hash text,
  p_user_agent_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_email, '')));
  previous_status text;
  consent_event_type text;
  allowed boolean;
begin
  if normalized !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    or pg_catalog.char_length(normalized) > 320
    or p_locale not in ('vi', 'en')
    or p_market not in ('vn', 'intl')
    or p_source <> 'footer'
    or p_target_hash !~ '^[a-f0-9]{64}$'
    or p_ip_hash !~ '^[a-f0-9]{64}$'
    or (p_user_agent_hash is not null and p_user_agent_hash !~ '^[a-f0-9]{64}$')
  then
    return pg_catalog.jsonb_build_object('status', 'invalid', 'emailQueued', false);
  end if;

  select subscriber.status into previous_status
  from public.newsletter_subscribers subscriber
  where subscriber.normalized_email = normalized
  for update;

  if previous_status = 'subscribed' then
    return pg_catalog.jsonb_build_object('status', 'subscribed', 'emailQueued', false);
  end if;

  allowed := private.consume_public_email_rate_limit(
    'newsletter_subscribe', p_target_hash, p_ip_hash, 900, 3, pg_catalog.now()
  );
  if not allowed then
    return pg_catalog.jsonb_build_object('status', 'subscribed', 'emailQueued', false);
  end if;

  consent_event_type := case when previous_status = 'unsubscribed' then 'resubscribe' else 'subscribe' end;

  insert into public.newsletter_subscribers (
    normalized_email, status, latest_locale, latest_market,
    subscribed_at, unsubscribed_at, updated_at
  ) values (
    normalized, 'subscribed', p_locale, p_market,
    pg_catalog.now(), null, pg_catalog.now()
  )
  on conflict (normalized_email) do update
  set status = 'subscribed',
      latest_locale = excluded.latest_locale,
      latest_market = excluded.latest_market,
      subscribed_at = pg_catalog.now(),
      unsubscribed_at = null,
      updated_at = pg_catalog.now();

  insert into public.newsletter_consent_events (
    normalized_email, event_type, consent_source, locale, market,
    ip_hash, user_agent_hash, occurred_at
  ) values (
    normalized, consent_event_type, p_source, p_locale, p_market,
    p_ip_hash, p_user_agent_hash, pg_catalog.now()
  );

  insert into public.transactional_email_outbox (
    event_type, recipient_email, locale, payload
  ) values (
    'newsletter_subscribed', normalized, p_locale,
    pg_catalog.jsonb_build_object('consentSource', p_source)
  );

  return pg_catalog.jsonb_build_object(
    'status', case when consent_event_type = 'resubscribe' then 'resubscribed' else 'subscribed' end,
    'emailQueued', true
  );
end;
$$;

alter function public.subscribe_newsletter(text, text, text, text, text, text, text)
owner to postgres;
revoke all on function public.subscribe_newsletter(text, text, text, text, text, text, text)
from public, anon, authenticated, service_role;
grant execute on function public.subscribe_newsletter(text, text, text, text, text, text, text)
to service_role;

create function public.request_guest_order_email(
  p_order_number text,
  p_email text,
  p_locale text,
  p_purpose text,
  p_target_hash text,
  p_ip_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_order_number text := pg_catalog.upper(pg_catalog.btrim(coalesce(p_order_number, '')));
  normalized_email text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_email, '')));
  order_row public.checkout_orders%rowtype;
  action_name text;
  event_name text;
  allowed boolean;
begin
  if normalized_order_number = ''
    or pg_catalog.char_length(normalized_order_number) > 80
    or normalized_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    or pg_catalog.char_length(normalized_email) > 320
    or p_locale not in ('vi', 'en')
    or p_purpose not in ('reopen_order', 'claim_order')
    or p_target_hash !~ '^[a-f0-9]{64}$'
    or p_ip_hash !~ '^[a-f0-9]{64}$'
  then
    return pg_catalog.jsonb_build_object('status', 'sent', 'emailQueued', false);
  end if;

  action_name := case when p_purpose = 'claim_order' then 'guest_order_claim' else 'guest_order_reopen' end;
  event_name := action_name;
  allowed := private.consume_public_email_rate_limit(
    action_name, p_target_hash, p_ip_hash, 600, 5, pg_catalog.now()
  );
  if not allowed then
    return pg_catalog.jsonb_build_object('status', 'sent', 'emailQueued', false);
  end if;

  select orders.* into order_row
  from public.checkout_orders orders
  where orders.order_number = normalized_order_number
    and orders.contact_email = normalized_email
  for update;

  if not found or (p_purpose = 'claim_order' and order_row.owner_user_id is not null) then
    return pg_catalog.jsonb_build_object('status', 'sent', 'emailQueued', false);
  end if;

  insert into public.transactional_email_outbox (
    order_id, event_type, recipient_email, locale, payload
  ) values (
    order_row.id, event_name, order_row.contact_email, order_row.locale,
    pg_catalog.jsonb_build_object(
      'orderNumber', order_row.order_number,
      'expiresInHours', 24
    )
  );

  return pg_catalog.jsonb_build_object('status', 'sent', 'emailQueued', true);
end;
$$;

alter function public.request_guest_order_email(text, text, text, text, text, text)
owner to postgres;
revoke all on function public.request_guest_order_email(text, text, text, text, text, text)
from public, anon, authenticated, service_role;
grant execute on function public.request_guest_order_email(text, text, text, text, text, text)
to service_role;

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
    order by
      case
        when outbox.event_type = 'payment_received' then 0
        when outbox.event_type in ('digital_access_granted', 'digital_access_reissued') then 1
        when outbox.event_type = 'newsletter_subscribed' then 3
        else 2
      end,
      outbox.available_at,
      outbox.created_at,
      outbox.id
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

alter function public.claim_transactional_emails(integer, integer) owner to postgres;
revoke all on function public.claim_transactional_emails(integer, integer)
from public, anon, authenticated, service_role;
grant execute on function public.claim_transactional_emails(integer, integer)
to service_role;
