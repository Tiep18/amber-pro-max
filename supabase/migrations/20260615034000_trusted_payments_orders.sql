alter table public.checkout_orders
  drop constraint if exists checkout_orders_status_check;

alter table public.checkout_orders
  add column if not exists order_status text not null default 'pending_payment',
  add column if not exists payment_status text not null default 'awaiting_payment',
  add column if not exists paid_gate_status text not null default 'locked',
  add column if not exists paid_at timestamptz,
  add column if not exists payment_terminal_at timestamptz,
  add column if not exists digital_fulfillment_status text not null default 'blocked',
  add column if not exists physical_fulfillment_status text not null default 'blocked',
  add column if not exists refund_status text not null default 'not_refunded',
  add column if not exists refunded_amount_minor bigint not null default 0,
  add column if not exists review_reason text,
  add constraint checkout_orders_status_check
    check (status in ('pending_payment', 'verifying_payment', 'paid', 'failed', 'cancelled', 'rejected', 'expired', 'review_required', 'partially_refunded', 'refunded')),
  add constraint checkout_orders_order_status_check
    check (order_status in ('pending_payment', 'verifying_payment', 'paid', 'failed', 'cancelled', 'rejected', 'expired', 'review_required', 'partially_refunded', 'refunded')),
  add constraint checkout_orders_payment_status_check
    check (payment_status in ('awaiting_payment', 'verifying_payment', 'paid', 'failed', 'cancelled', 'rejected', 'expired', 'review_required', 'partially_refunded', 'refunded')),
  add constraint checkout_orders_paid_gate_status_check
    check (paid_gate_status in ('locked', 'open', 'review_required')),
  add constraint checkout_orders_digital_fulfillment_status_check
    check (digital_fulfillment_status in ('blocked', 'eligible', 'not_required')),
  add constraint checkout_orders_physical_fulfillment_status_check
    check (physical_fulfillment_status in ('blocked', 'awaiting_fulfillment', 'not_required')),
  add constraint checkout_orders_refund_status_check
    check (refund_status in ('not_refunded', 'partially_refunded', 'refunded')),
  add constraint checkout_orders_refunded_amount_check
    check (refunded_amount_minor >= 0 and refunded_amount_minor <= total_minor),
  add constraint checkout_orders_payment_method_market_currency_check
    check (
      (market = 'intl' and currency_code = 'USD' and payment_intent = 'paypal_intent')
      or (market = 'vn' and currency_code = 'VND' and payment_intent = 'vietqr_intent')
    );

alter table public.checkout_inventory_reservations
  drop constraint if exists checkout_inventory_reservations_status_check,
  drop constraint if exists checkout_inventory_reservations_check;

alter table public.checkout_inventory_reservations
  add column if not exists finalized_at timestamptz,
  add column if not exists release_reason text,
  add column if not exists payment_transition_id uuid,
  add constraint checkout_inventory_reservations_status_check
    check (status in ('active', 'consumed', 'released', 'expired')),
  add constraint checkout_inventory_reservations_outcome_check
    check (
      (status = 'active' and finalized_at is null and released_at is null and release_reason is null)
      or (status = 'consumed' and finalized_at is not null and released_at is null)
      or (status in ('released', 'expired') and released_at is not null and release_reason is not null)
    );

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.checkout_orders(id) on delete cascade,
  provider text not null check (provider in ('paypal', 'vietqr')),
  status text not null default 'pending' check (status in ('pending', 'verifying', 'paid', 'failed', 'cancelled', 'rejected', 'expired', 'review_required', 'partially_refunded', 'refunded')),
  amount_minor bigint not null check (amount_minor >= 0),
  currency_code text not null check (currency_code in ('VND', 'USD')),
  provider_order_id text,
  provider_capture_id text,
  provider_request_id text,
  provider_reference text,
  pending_deadline_at timestamptz not null,
  paid_gate_opened_at timestamptz,
  paid_at timestamptz,
  terminal_at timestamptz,
  digital_fulfillment_status text not null default 'blocked' check (digital_fulfillment_status in ('blocked', 'eligible', 'not_required')),
  physical_fulfillment_status text not null default 'blocked' check (physical_fulfillment_status in ('blocked', 'awaiting_fulfillment', 'not_required')),
  refund_status text not null default 'not_refunded' check (refund_status in ('not_refunded', 'partially_refunded', 'refunded')),
  refunded_amount_minor bigint not null default 0 check (refunded_amount_minor >= 0),
  review_reason text,
  request_id text,
  sanitized_evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(sanitized_evidence) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (refunded_amount_minor <= amount_minor),
  check (
    (status in ('paid', 'partially_refunded', 'refunded') and paid_gate_opened_at is not null)
    or status not in ('paid', 'partially_refunded', 'refunded')
  )
);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  provider text not null check (provider in ('paypal', 'vietqr')),
  provider_event_id text,
  event_type text not null,
  source text not null,
  verification_status text not null check (verification_status in ('pending', 'verified', 'rejected', 'admin_verified', 'system')),
  payload_digest text check (payload_digest is null or length(payload_digest) >= 32),
  sanitized_facts jsonb not null default '{}'::jsonb check (jsonb_typeof(sanitized_facts) = 'object'),
  received_at timestamptz not null default now()
);

create table public.payment_transitions (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  payment_event_id uuid references public.payment_events(id) on delete set null,
  transition_key text not null,
  source text not null,
  from_status text not null,
  to_status text not null,
  result text not null check (result in ('applied', 'duplicate', 'stale', 'review_required', 'invalid')),
  reason text,
  actor_type text not null default 'system' check (actor_type in ('system', 'provider', 'admin', 'cron')),
  actor_id uuid references auth.users(id) on delete set null,
  inventory_effect text not null default 'none' check (inventory_effect in ('finalized', 'released', 'expired', 'none')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create table public.commerce_audit_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  order_id uuid references public.checkout_orders(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete cascade,
  payment_transition_id uuid references public.payment_transitions(id) on delete set null,
  event_type text not null,
  actor_type text not null check (actor_type in ('system', 'provider', 'admin', 'cron')),
  actor_id uuid references auth.users(id) on delete set null,
  source text not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create unique index payments_order_id_unique_idx
on public.payments (order_id);

create index payments_pending_deadline_idx
on public.payments (status, pending_deadline_at)
where status in ('pending', 'verifying');

create unique index payment_events_provider_event_unique_idx
on public.payment_events (provider, provider_event_id)
where provider_event_id is not null;

create index payment_events_payment_received_idx
on public.payment_events (payment_id, received_at);

create unique index payment_transitions_transition_key_unique_idx
on public.payment_transitions (transition_key);

create index payment_transitions_payment_created_idx
on public.payment_transitions (payment_id, created_at);

create index commerce_audit_events_order_timeline_idx
on public.commerce_audit_events (order_id, created_at);

alter table public.checkout_inventory_reservations
  add constraint checkout_inventory_reservations_payment_transition_id_fkey
  foreign key (payment_transition_id)
  references public.payment_transitions(id)
  on delete set null;

create or replace function private.payment_safe_json(p_value jsonb)
returns boolean
language sql
immutable
set search_path = private, public, pg_temp
as $$
  select not (
    lower(coalesce(p_value::text, '')) ~
    '(client_secret|authorization|paypal_client_secret|webhook_id|signed_url|raw_payload|access_token|refresh_token)'
  );
$$;

create or replace function private.reject_unsafe_payment_event()
returns trigger
language plpgsql
set search_path = private, public, pg_temp
as $$
begin
  if not private.payment_safe_json(new.sanitized_facts) then
    raise exception 'payment event facts contain unsafe raw secret material'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function private.reject_unsafe_audit_metadata()
returns trigger
language plpgsql
set search_path = private, public, pg_temp
as $$
begin
  if not private.payment_safe_json(new.metadata) then
    raise exception 'audit metadata contains unsafe raw secret material'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function private.prevent_payment_transition_mutation()
returns trigger
language plpgsql
set search_path = private, public, pg_temp
as $$
begin
  raise exception 'payment transitions are append only'
    using errcode = '23514';
end;
$$;

create or replace function private.prevent_commerce_audit_mutation()
returns trigger
language plpgsql
set search_path = private, public, pg_temp
as $$
begin
  raise exception 'commerce audit events are append only'
    using errcode = '23514';
end;
$$;

create or replace function private.enforce_checkout_reservation_single_outcome()
returns trigger
language plpgsql
set search_path = private, public, pg_temp
as $$
begin
  if old.status <> 'active'
    and (
      new.status is distinct from old.status
      or new.finalized_at is distinct from old.finalized_at
      or new.released_at is distinct from old.released_at
      or new.release_reason is distinct from old.release_reason
      or new.payment_transition_id is distinct from old.payment_transition_id
    ) then
    raise exception 'checkout reservation already has a terminal outcome'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger payment_events_no_raw_secret_payload
before insert or update on public.payment_events
for each row execute function private.reject_unsafe_payment_event();

create trigger payment_transitions_monotonic_status
before update or delete on public.payment_transitions
for each row execute function private.prevent_payment_transition_mutation();

create trigger checkout_reservations_single_outcome
before update on public.checkout_inventory_reservations
for each row execute function private.enforce_checkout_reservation_single_outcome();

create trigger commerce_audit_events_append_only
before update or delete on public.commerce_audit_events
for each row execute function private.prevent_commerce_audit_mutation();

create trigger commerce_audit_events_no_secret_metadata
before insert or update on public.commerce_audit_events
for each row execute function private.reject_unsafe_audit_metadata();

create or replace function private.create_payment_for_checkout_order()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  created_payment_id uuid;
  provider_name text;
begin
  provider_name := case new.payment_intent
    when 'paypal_intent' then 'paypal'
    when 'vietqr_intent' then 'vietqr'
    else null
  end;

  if provider_name is null then
    raise exception 'unsupported payment intent' using errcode = '23514';
  end if;

  insert into public.payments (
    order_id,
    provider,
    status,
    amount_minor,
    currency_code,
    pending_deadline_at,
    digital_fulfillment_status,
    physical_fulfillment_status,
    request_id,
    sanitized_evidence
  )
  values (
    new.id,
    provider_name,
    'pending',
    new.total_minor,
    new.currency_code,
    new.reservation_expires_at,
    case
      when exists (
        select 1 from public.checkout_order_lines
        where order_id = new.id and fulfillment_type = 'digital'
      ) then 'blocked'
      else 'not_required'
    end,
    case
      when exists (
        select 1 from public.checkout_order_lines
        where order_id = new.id and fulfillment_type = 'physical'
      ) then 'blocked'
      else 'not_required'
    end,
    new.idempotency_key,
    jsonb_build_object('createdBy', 'submit_checkout', 'paymentIntent', new.payment_intent)
  )
  on conflict (order_id) do update
  set updated_at = excluded.updated_at
  returning id into created_payment_id;

  insert into public.commerce_audit_events (
    event_key,
    order_id,
    payment_id,
    event_type,
    actor_type,
    source,
    metadata
  )
  values (
    'order_created:' || new.id::text,
    new.id,
    created_payment_id,
    'order_created',
    'system',
    'submit_checkout',
    jsonb_build_object(
      'orderNumber', new.order_number,
      'paymentIntent', new.payment_intent,
      'amountMinor', new.total_minor,
      'currencyCode', new.currency_code
    )
  )
  on conflict (event_key) do nothing;

  return new;
end;
$$;

create trigger checkout_orders_create_payment
after insert on public.checkout_orders
for each row execute function private.create_payment_for_checkout_order();

create or replace function private.payment_customer_status(p_status text)
returns text
language sql
immutable
set search_path = private, public, pg_temp
as $$
  select case p_status
    when 'pending' then 'awaiting_payment'
    when 'verifying' then 'verifying_payment'
    when 'paid' then 'paid'
    when 'failed' then 'payment_failed'
    when 'cancelled' then 'payment_cancelled'
    when 'rejected' then 'payment_failed'
    when 'expired' then 'expired'
    when 'review_required' then 'verifying_payment'
    when 'partially_refunded' then 'partially_refunded'
    when 'refunded' then 'refunded'
    else 'verifying_payment'
  end;
$$;

create view public.order_payment_statuses
with (security_invoker = true)
as
select
  co.id as order_id,
  co.order_number,
  co.owner_user_id,
  co.guest_secret_hash,
  co.contact_email,
  co.locale,
  co.market,
  co.payment_intent,
  co.currency_code,
  co.total_minor,
  co.reservation_expires_at,
  p.id as payment_id,
  p.provider,
  p.status as payment_status,
  private.payment_customer_status(p.status) as customer_payment_status,
  case
    when p.status in ('paid', 'partially_refunded', 'refunded') then 'eligible'
    when p.status = 'review_required' then 'review_required'
    else 'locked'
  end as fulfillment_gate_status,
  p.digital_fulfillment_status,
  p.physical_fulfillment_status,
  p.refund_status,
  p.refunded_amount_minor,
  p.review_reason,
  p.created_at,
  p.updated_at
from public.checkout_orders co
join public.payments p on p.order_id = co.id;

create view public.admin_order_timelines
with (security_invoker = true)
as
select
  cae.order_id,
  cae.payment_id,
  cae.payment_transition_id,
  cae.event_type,
  cae.actor_type,
  cae.actor_id,
  cae.source,
  cae.metadata as sanitized_facts,
  cae.created_at
from public.commerce_audit_events cae;

create or replace function public.get_order_payment_status(p_order_number text, p_guest_secret_hash text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  row_data public.order_payment_statuses%rowtype;
begin
  select *
  into row_data
  from public.order_payment_statuses ops
  where ops.order_number = p_order_number
    and (
      (auth.uid() is not null and ops.owner_user_id = auth.uid())
      or (
        p_guest_secret_hash is not null
        and ops.guest_secret_hash = p_guest_secret_hash
      )
      or private.is_admin()
    );

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  return jsonb_build_object(
    'status', 'found',
    'orderId', row_data.order_id,
    'paymentId', row_data.payment_id,
    'orderNumber', row_data.order_number,
    'market', row_data.market,
    'paymentIntent', row_data.payment_intent,
    'provider', row_data.provider,
    'paymentStatus', row_data.payment_status,
    'customerPaymentStatus', row_data.customer_payment_status,
    'fulfillmentGateStatus', row_data.fulfillment_gate_status,
    'amountMinor', row_data.total_minor,
    'currencyCode', row_data.currency_code,
    'reservationExpiresAt', row_data.reservation_expires_at
  );
end;
$$;

create or replace function public.get_admin_order_timeline(p_order_id uuid)
returns setof public.admin_order_timelines
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not private.is_admin() then
    return;
  end if;

  return query
  select *
  from public.admin_order_timelines aot
  where aot.order_id = p_order_id
  order by aot.created_at;
end;
$$;

create or replace function public.apply_payment_transition(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  transition_key_value text := btrim(coalesce(p_payload->>'transitionKey', ''));
  source_name text := btrim(coalesce(p_payload->>'source', ''));
  target_status text := btrim(coalesce(p_payload->>'targetStatus', ''));
  order_number_value text := nullif(btrim(coalesce(p_payload->>'orderNumber', '')), '');
  payment_id_input uuid := nullif(p_payload->>'paymentId', '')::uuid;
  provider_event_id_value text := nullif(btrim(coalesce(p_payload->>'providerEventId', '')), '');
  event_type text := coalesce(nullif(btrim(coalesce(p_payload->>'eventType', '')), ''), target_status);
  verification_status text := coalesce(nullif(btrim(coalesce(p_payload->>'verificationStatus', '')), ''), 'verified');
  payload_digest text := nullif(btrim(coalesce(p_payload->>'payloadDigest', '')), '');
  release_reason_value text := nullif(btrim(coalesce(p_payload->>'releaseReason', '')), '');
  review_reason_value text := coalesce(nullif(btrim(coalesce(p_payload->>'reviewReason', '')), ''), 'late_payment_detected');
  amount_minor_value bigint := nullif(p_payload->>'amountMinor', '')::bigint;
  currency_code_value text := nullif(btrim(coalesce(p_payload->>'CurrencyCode', p_payload->>'currencyCode', '')), '');
  actor_type text := case
    when source_name = 'vietqr_admin' then 'admin'
    when source_name = 'reservation_expiry_job' then 'cron'
    when source_name in ('paypal_webhook', 'paypal_recheck') then 'provider'
    else 'system'
  end;
  actor_id uuid := auth.uid();
  order_row public.checkout_orders%rowtype;
  payment_row public.payments%rowtype;
  existing_transition public.payment_transitions%rowtype;
  existing_event_id uuid;
  event_id uuid;
  transition_id uuid;
  result_status text := 'applied';
  effective_status text;
  inventory_effect text := 'none';
  audit_event_type text;
  reservation_row record;
  now_ts timestamptz := now();
  sanitized_facts jsonb := coalesce(p_payload->'sanitizedFacts', '{}'::jsonb)
    || jsonb_strip_nulls(jsonb_build_object(
      'providerEventId', provider_event_id_value,
      'bankReference', nullif(p_payload->>'bankReference', ''),
      'receivedAmountMinor', nullif(p_payload->>'receivedAmountMinor', ''),
      'receivedAt', nullif(p_payload->>'receivedAt', ''),
      'releaseReason', release_reason_value,
      'reviewReason', review_reason_value
    ));
begin
  if jsonb_typeof(p_payload) <> 'object'
    or length(transition_key_value) < 8
    or source_name not in ('paypal_webhook', 'paypal_recheck', 'vietqr_instruction', 'vietqr_admin', 'reservation_expiry_job', 'system')
    or target_status not in ('pending', 'paid', 'failed', 'cancelled', 'rejected', 'expired', 'review_required')
    or (order_number_value is null and payment_id_input is null)
    or not private.payment_safe_json(sanitized_facts) then
    return jsonb_build_object('status', 'invalid', 'code', 'invalid_payment_transition');
  end if;

  select *
  into existing_transition
  from public.payment_transitions
  where payment_transitions.transition_key = transition_key_value
  for update;

  if found then
    return jsonb_build_object(
      'status', 'duplicate',
      'code', 'duplicate_payment_transition',
      'transitionId', existing_transition.id
    );
  end if;

  if order_number_value is not null then
    select *
    into order_row
    from public.checkout_orders
    where checkout_orders.order_number = order_number_value
    for update;
  else
    select co.*
    into order_row
    from public.checkout_orders co
    join public.payments p on p.order_id = co.id
    where p.id = payment_id_input
    for update of co;
  end if;

  if not found then
    return jsonb_build_object('status', 'invalid', 'code', 'payment_order_not_found');
  end if;

  select *
  into payment_row
  from public.payments
  where order_id = order_row.id
  for update;

  if not found then
    return jsonb_build_object('status', 'invalid', 'code', 'payment_not_found');
  end if;

  if amount_minor_value is not null and amount_minor_value <> payment_row.amount_minor then
    return jsonb_build_object('status', 'invalid', 'code', 'payment_amount_mismatch');
  end if;

  if currency_code_value is not null and currency_code_value <> payment_row.currency_code then
    return jsonb_build_object('status', 'invalid', 'code', 'payment_currency_mismatch');
  end if;

  if source_name = 'vietqr_instruction' and target_status <> 'pending' then
    return jsonb_build_object('status', 'invalid', 'code', 'invalid_vietqr_instruction_transition');
  end if;

  if source_name = 'vietqr_admin' and target_status = 'paid' then
    if nullif(btrim(coalesce(p_payload->>'bankReference', '')), '') is null
      or btrim(coalesce(p_payload->>'bankReference', '')) <> order_row.order_number
      or nullif(p_payload->>'receivedAmountMinor', '')::bigint <> payment_row.amount_minor
      or nullif(p_payload->>'receivedAt', '') is null then
      return jsonb_build_object('status', 'invalid', 'code', 'invalid_vietqr_evidence');
    end if;
  end if;

  if provider_event_id_value is not null then
    select id
    into existing_event_id
    from public.payment_events
    where provider = payment_row.provider
      and payment_events.provider_event_id = provider_event_id_value
    for update;

    if found then
      insert into public.payment_transitions (
        payment_id,
        payment_event_id,
        transition_key,
        source,
        from_status,
        to_status,
        result,
        reason,
        actor_type,
        actor_id,
        inventory_effect,
        metadata
      )
      values (
        payment_row.id,
        existing_event_id,
        transition_key_value,
        source_name,
        payment_row.status,
        target_status,
        'duplicate',
        'duplicate_provider_event',
        actor_type,
        actor_id,
        'none',
        sanitized_facts
      )
      returning id into transition_id;

      return jsonb_build_object('status', 'duplicate', 'code', 'duplicate_payment_event', 'transitionId', transition_id);
    end if;
  end if;

  insert into public.payment_events (
    payment_id,
    provider,
    provider_event_id,
    event_type,
    source,
    verification_status,
    payload_digest,
    sanitized_facts
  )
  values (
    payment_row.id,
    payment_row.provider,
    provider_event_id_value,
    event_type,
    source_name,
    verification_status,
    payload_digest,
    sanitized_facts
  )
  returning id into event_id;

  insert into public.commerce_audit_events (
    event_key,
    order_id,
    payment_id,
    event_type,
    actor_type,
    actor_id,
    source,
    metadata
  )
  values (
    'payment_event_received:' || event_id::text,
    order_row.id,
    payment_row.id,
    'payment_event_received',
    actor_type,
    actor_id,
    source_name,
    sanitized_facts
  )
  on conflict (event_key) do nothing;

  if payment_row.status in ('paid', 'partially_refunded', 'refunded') then
    result_status := 'stale';
    effective_status := payment_row.status;
  elsif payment_row.status in ('failed', 'cancelled', 'rejected', 'expired') and target_status = 'paid' then
    result_status := 'review_required';
    effective_status := 'review_required';
    review_reason_value := 'late_payment_detected';
  elsif target_status = 'paid' and payment_row.pending_deadline_at <= now_ts then
    result_status := 'review_required';
    effective_status := 'review_required';
    review_reason_value := 'late_payment_detected';
  elsif payment_row.status in ('failed', 'cancelled', 'rejected', 'expired', 'review_required') then
    result_status := 'stale';
    effective_status := payment_row.status;
  else
    effective_status := target_status;
  end if;

  if result_status in ('applied', 'review_required') and effective_status = 'paid' then
    for reservation_row in
      select cir.id, cir.inventory_record_id, cir.quantity_reserved
      from public.checkout_inventory_reservations cir
      where cir.order_id = order_row.id
        and cir.status = 'active'
      order by cir.inventory_record_id, cir.id
      for update
    loop
      update public.inventory_records
      set quantity_on_hand = quantity_on_hand - reservation_row.quantity_reserved
      where id = reservation_row.inventory_record_id
        and quantity_on_hand >= reservation_row.quantity_reserved;

      if not found then
        raise exception 'inventory finalization failed' using errcode = '40001';
      end if;
    end loop;
    inventory_effect := 'finalized';
  elsif result_status in ('applied', 'review_required')
    and effective_status in ('failed', 'cancelled', 'rejected') then
    inventory_effect := 'released';
  elsif result_status in ('applied', 'review_required')
    and effective_status in ('expired', 'review_required') then
    inventory_effect := 'expired';
  end if;

  insert into public.payment_transitions (
    payment_id,
    payment_event_id,
    transition_key,
    source,
    from_status,
    to_status,
    result,
    reason,
    actor_type,
    actor_id,
    inventory_effect,
    metadata
  )
  values (
    payment_row.id,
    event_id,
    transition_key_value,
    source_name,
    payment_row.status,
    effective_status,
    result_status,
    coalesce(release_reason_value, review_reason_value),
    actor_type,
    actor_id,
    inventory_effect,
    sanitized_facts
  )
  returning id into transition_id;

  if inventory_effect = 'finalized' then
    update public.checkout_inventory_reservations
    set status = 'consumed',
      finalized_at = now_ts,
      payment_transition_id = transition_id
    where order_id = order_row.id
      and status = 'active';
  elsif inventory_effect in ('released', 'expired') then
    update public.checkout_inventory_reservations
    set status = case when inventory_effect = 'expired' then 'expired' else 'released' end,
      released_at = now_ts,
      release_reason = coalesce(release_reason_value, case when inventory_effect = 'expired' then 'reservation_deadline_expired' else 'payment_terminal' end),
      payment_transition_id = transition_id
    where order_id = order_row.id
      and status = 'active';
  end if;

  if result_status = 'stale' then
    return jsonb_build_object('status', 'stale', 'code', 'stale_payment_transition', 'transitionId', transition_id);
  end if;

  update public.payments
  set status = effective_status,
    paid_gate_opened_at = case when effective_status = 'paid' then coalesce(paid_gate_opened_at, now_ts) else paid_gate_opened_at end,
    paid_at = case when effective_status = 'paid' then coalesce(paid_at, now_ts) else paid_at end,
    terminal_at = case when effective_status in ('failed', 'cancelled', 'rejected', 'expired', 'review_required') then coalesce(terminal_at, now_ts) else terminal_at end,
    digital_fulfillment_status = case
      when effective_status = 'paid'
        and exists (select 1 from public.checkout_order_lines where order_id = order_row.id and fulfillment_type = 'digital')
      then 'eligible'
      when not exists (select 1 from public.checkout_order_lines where order_id = order_row.id and fulfillment_type = 'digital')
      then 'not_required'
      else 'blocked'
    end,
    physical_fulfillment_status = case
      when effective_status = 'paid'
        and exists (select 1 from public.checkout_order_lines where order_id = order_row.id and fulfillment_type = 'physical')
      then 'awaiting_fulfillment'
      when not exists (select 1 from public.checkout_order_lines where order_id = order_row.id and fulfillment_type = 'physical')
      then 'not_required'
      else 'blocked'
    end,
    review_reason = case when effective_status = 'review_required' then review_reason_value else payments.review_reason end,
    updated_at = now_ts
  where id = payment_row.id;

  update public.checkout_orders
  set status = case
      when effective_status = 'pending' then 'pending_payment'
      when effective_status = 'verifying' then 'verifying_payment'
      else effective_status
    end,
    order_status = case
      when effective_status = 'pending' then 'pending_payment'
      when effective_status = 'verifying' then 'verifying_payment'
      else effective_status
    end,
    payment_status = case
      when effective_status = 'pending' then 'awaiting_payment'
      when effective_status = 'verifying' then 'verifying_payment'
      else effective_status
    end,
    paid_gate_status = case
      when effective_status = 'paid' then 'open'
      when effective_status = 'review_required' then 'review_required'
      else 'locked'
    end,
    paid_at = case when effective_status = 'paid' then coalesce(paid_at, now_ts) else paid_at end,
    payment_terminal_at = case when effective_status in ('failed', 'cancelled', 'rejected', 'expired', 'review_required') then coalesce(payment_terminal_at, now_ts) else payment_terminal_at end,
    digital_fulfillment_status = (
      select p.digital_fulfillment_status from public.payments p where p.id = payment_row.id
    ),
    physical_fulfillment_status = (
      select p.physical_fulfillment_status from public.payments p where p.id = payment_row.id
    ),
    review_reason = case when effective_status = 'review_required' then review_reason_value else checkout_orders.review_reason end,
    updated_at = now_ts
  where id = order_row.id;

  audit_event_type := case
    when result_status = 'review_required' then 'late_payment_detected'
    when effective_status = 'pending' and source_name = 'vietqr_instruction' then 'vietqr_instruction_recorded'
    when effective_status = 'paid' and source_name = 'vietqr_admin' then 'admin_vietqr_confirmed'
    when effective_status = 'rejected' and source_name = 'vietqr_admin' then 'admin_vietqr_rejected'
    when effective_status = 'paid' then 'payment_verified_paid'
    when effective_status = 'failed' then 'payment_failed'
    when effective_status = 'cancelled' then 'payment_cancelled'
    when effective_status = 'rejected' then 'payment_rejected'
    when effective_status = 'expired' then 'payment_expired'
    else 'payment_transition_recorded'
  end;

  insert into public.commerce_audit_events (
    event_key,
    order_id,
    payment_id,
    payment_transition_id,
    event_type,
    actor_type,
    actor_id,
    source,
    metadata
  )
  values (
    audit_event_type || ':' || transition_id::text,
    order_row.id,
    payment_row.id,
    transition_id,
    audit_event_type,
    actor_type,
    actor_id,
    source_name,
    sanitized_facts || jsonb_build_object('inventoryEffect', inventory_effect)
  )
  on conflict (event_key) do nothing;

  if inventory_effect = 'finalized' then
    insert into public.commerce_audit_events (
      event_key,
      order_id,
      payment_id,
      payment_transition_id,
      event_type,
      actor_type,
      actor_id,
      source,
      metadata
    )
    values (
      'inventory_finalized:' || transition_id::text,
      order_row.id,
      payment_row.id,
      transition_id,
      'inventory_finalized',
      actor_type,
      actor_id,
      source_name,
      sanitized_facts
    )
    on conflict (event_key) do nothing;
  elsif inventory_effect in ('released', 'expired') then
    insert into public.commerce_audit_events (
      event_key,
      order_id,
      payment_id,
      payment_transition_id,
      event_type,
      actor_type,
      actor_id,
      source,
      metadata
    )
    values (
      'inventory_released:' || transition_id::text,
      order_row.id,
      payment_row.id,
      transition_id,
      case when inventory_effect = 'expired' then 'inventory_expired' else 'inventory_released' end,
      actor_type,
      actor_id,
      source_name,
      sanitized_facts
    )
    on conflict (event_key) do nothing;
  end if;

  return jsonb_build_object(
    'status', result_status,
    'code', case when result_status = 'review_required' then 'late_payment_detected' else 'payment_transition_applied' end,
    'transitionId', transition_id,
    'paymentStatus', effective_status,
    'inventoryEffect', inventory_effect
  );
exception
  when invalid_text_representation or check_violation or not_null_violation then
    return jsonb_build_object('status', 'invalid', 'code', 'invalid_payment_transition');
  when unique_violation then
    return jsonb_build_object('status', 'duplicate', 'code', 'duplicate_payment_transition');
  when serialization_failure or deadlock_detected then
    return jsonb_build_object('status', 'stale', 'code', 'retryable_payment_transition_conflict');
end;
$$;

create or replace function public.expire_due_payments(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  payment_row record;
  applied_count integer := 0;
  bounded_limit integer := least(greatest(coalesce(p_limit, 100), 1), 500);
  transition_result jsonb;
begin
  for payment_row in
    select p.id, co.order_number
    from public.payments p
    join public.checkout_orders co on co.id = p.order_id
    where p.status in ('pending', 'verifying')
      and p.pending_deadline_at <= now()
    order by p.pending_deadline_at, p.id
    limit bounded_limit
    for update of p skip locked
  loop
    transition_result := public.apply_payment_transition(jsonb_build_object(
      'transitionKey', 'expiry:' || payment_row.id::text,
      'source', 'reservation_expiry_job',
      'targetStatus', 'expired',
      'orderNumber', payment_row.order_number,
      'releaseReason', 'reservation_deadline_expired'
    ));

    if transition_result->>'status' in ('applied', 'duplicate') then
      applied_count := applied_count + 1;
    end if;
  end loop;

  return jsonb_build_object('status', 'ok', 'processed', applied_count);
end;
$$;

do $$
begin
  if to_regnamespace('cron') is not null then
    begin
      execute $cron$
        select cron.schedule(
          'trusted-payment-expiry',
          '* * * * *',
          'select public.expire_due_payments(100)'
        )
      $cron$;
    exception
      when duplicate_object or unique_violation then
        null;
      when others then
        raise notice 'trusted-payment-expiry cron schedule skipped: %', sqlerrm;
    end;
  end if;
end;
$$;

alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.payment_transitions enable row level security;
alter table public.commerce_audit_events enable row level security;

revoke all on table public.payments from public, anon, authenticated;
revoke all on table public.payment_events from public, anon, authenticated;
revoke all on table public.payment_transitions from public, anon, authenticated;
revoke all on table public.commerce_audit_events from public, anon, authenticated;
revoke all on table public.payments from service_role;
revoke all on table public.payment_events from service_role;
revoke all on table public.payment_transitions from service_role;
revoke all on table public.commerce_audit_events from service_role;

grant select on table public.payments to authenticated;
grant select, insert, update, delete on table public.payments to service_role;
grant select, insert on table public.payment_events to service_role;
grant select, insert on table public.payment_transitions to service_role;
grant select, insert on table public.commerce_audit_events to service_role;

create policy "payments are owner readable"
on public.payments
for select to authenticated
using (
  exists (
    select 1
    from public.checkout_orders co
    where co.id = payments.order_id
      and co.owner_user_id = (select auth.uid())
  )
);

create policy "payments are admin managed"
on public.payments
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "payment events are admin managed"
on public.payment_events
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "payment transitions are admin managed"
on public.payment_transitions
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "commerce audit events are admin readable"
on public.commerce_audit_events
for select to authenticated
using (private.is_admin());

revoke all on function private.payment_safe_json(jsonb) from public, anon, authenticated;
revoke all on function private.reject_unsafe_payment_event() from public, anon, authenticated;
revoke all on function private.reject_unsafe_audit_metadata() from public, anon, authenticated;
revoke all on function private.prevent_payment_transition_mutation() from public, anon, authenticated;
revoke all on function private.prevent_commerce_audit_mutation() from public, anon, authenticated;
revoke all on function private.enforce_checkout_reservation_single_outcome() from public, anon, authenticated;
revoke all on function private.create_payment_for_checkout_order() from public, anon, authenticated;
revoke all on function private.payment_customer_status(text) from public, anon, authenticated;

revoke all on function public.apply_payment_transition(jsonb) from public, anon, authenticated;
revoke all on function public.expire_due_payments(integer) from public, anon, authenticated;
revoke all on function public.get_order_payment_status(text, text) from public, anon, authenticated;
revoke all on function public.get_admin_order_timeline(uuid) from public, anon, authenticated;

grant execute on function public.apply_payment_transition(jsonb) to service_role;
grant execute on function public.expire_due_payments(integer) to service_role;
grant execute on function public.get_order_payment_status(text, text) to anon, authenticated;
grant execute on function public.get_admin_order_timeline(uuid) to authenticated;
