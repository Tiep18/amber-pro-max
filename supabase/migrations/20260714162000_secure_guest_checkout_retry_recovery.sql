-- Recover anonymous checkout after a lost submit response without ever
-- returning or persisting the raw recovery credentials.

create table private.checkout_guest_attempt_claims (
  attempt_id_hash text primary key check (attempt_id_hash ~ '^[a-f0-9]{64}$'),
  proof_hash text not null check (proof_hash ~ '^[a-f0-9]{64}$'),
  order_id uuid unique references public.checkout_orders(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index checkout_guest_attempt_claims_expires_at_idx
  on private.checkout_guest_attempt_claims (expires_at);

revoke all on table private.checkout_guest_attempt_claims from public, anon, authenticated;

-- Keep the complete authoritative verifier as an implementation detail and
-- put the zero-discount contract in a small, readable guard.
alter function private.checkout_commercial_quote_is_current(jsonb, uuid)
  rename to checkout_commercial_quote_is_current_v1;

create or replace function private.checkout_commercial_quote_is_current(
  p_payload jsonb,
  p_actor_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  expected_discount bigint;
begin
  if coalesce(p_payload #>> '{acceptedQuote,discount,amountMinor}', '') !~ '^[0-9]+$' then
    return false;
  end if;
  expected_discount := (p_payload #>> '{acceptedQuote,discount,amountMinor}')::bigint;

  if expected_discount = 0 then
    -- Do not rely on NULL discount-rule comparisons to imply this invariant.
    if exists (
      select 1
      from jsonb_array_elements(coalesce(p_payload #> '{acceptedQuote,lines}', '[]'::jsonb)) line
      where coalesce(line ->> 'discountAllocationMinor', '') !~ '^[0-9]+$'
         or (line ->> 'discountAllocationMinor')::bigint <> 0
    ) then
      return false;
    end if;
  elsif nullif(btrim(coalesce(p_payload ->> 'discountCode', '')), '') is null then
    return false;
  end if;

  return private.checkout_commercial_quote_is_current_v1(p_payload, p_actor_user_id);
exception when others then
  return false;
end;
$$;

alter function private.checkout_commercial_quote_is_current(jsonb, uuid) owner to postgres;
revoke all on function private.checkout_commercial_quote_is_current(jsonb, uuid) from public, anon, authenticated;
revoke all on function private.checkout_commercial_quote_is_current_v1(jsonb, uuid) from public, anon, authenticated;

-- Preserve the already-hardened catalog/shipping implementation behind a
-- non-browser boundary, then add proof-independent attempt claiming outside it.
alter function public.submit_checkout(jsonb) rename to submit_checkout_authority_v2;
alter function public.submit_checkout_authority_v2(jsonb) set schema private;
revoke all on function private.submit_checkout_authority_v2(jsonb) from public, anon, authenticated;
grant execute on function private.submit_checkout_authority_v2(jsonb) to service_role;

create or replace function public.submit_checkout(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_user_id uuid := auth.uid();
  recovery jsonb := p_payload -> 'guestRecovery';
  raw_attempt_id text;
  raw_proof text;
  attempt_hash text;
  proof_hash text;
  sanitized_idempotency_key text;
  expected_actor text;
  claim private.checkout_guest_attempt_claims%rowtype;
  internal_payload jsonb;
  result jsonb;
  order_row public.checkout_orders%rowtype;
begin
  if actor_user_id is not null then
    result := private.submit_checkout_authority_v2(p_payload - 'guestRecovery' - 'guestCartId');
    return result - 'guestAccessToken';
  end if;

  if jsonb_typeof(recovery) <> 'object' then
    return jsonb_build_object('status', 'invalid', 'code', 'invalid_checkout_submit');
  end if;
  raw_attempt_id := recovery ->> 'attemptId';
  raw_proof := recovery ->> 'proof';
  if coalesce(raw_attempt_id, '') !~ '^[A-Za-z0-9_-]{43}$'
    or coalesce(raw_proof, '') !~ '^[A-Za-z0-9_-]{43}$' then
    return jsonb_build_object('status', 'invalid', 'code', 'invalid_checkout_submit');
  end if;

  attempt_hash := encode(extensions.digest(raw_attempt_id, 'sha256'), 'hex');
  proof_hash := encode(extensions.digest(raw_proof, 'sha256'), 'hex');
  sanitized_idempotency_key := 'guest-attempt:' || attempt_hash;
  expected_actor := 'guest:' || encode(extensions.digest(proof_hash, 'sha256'), 'hex');

  insert into private.checkout_guest_attempt_claims (attempt_id_hash, proof_hash)
  values (attempt_hash, proof_hash)
  on conflict (attempt_id_hash) do nothing;

  select * into claim
  from private.checkout_guest_attempt_claims
  where attempt_id_hash = attempt_hash
  for update;

  if claim.proof_hash is distinct from proof_hash then
    return jsonb_build_object('status', 'conflict', 'code', 'guest_checkout_conflict');
  end if;

  if claim.order_id is not null then
    select * into order_row from public.checkout_orders where id = claim.order_id;
    if not found or order_row.guest_secret_hash is distinct from proof_hash then
      return jsonb_build_object('status', 'conflict', 'code', 'guest_checkout_conflict');
    end if;
    return jsonb_build_object(
      'status', 'success',
      'orderId', order_row.id,
      'orderNumber', order_row.order_number,
      'reservationExpiresAt', order_row.reservation_expires_at
    );
  end if;

  -- Raw credentials are removed before any legacy snapshot/persistence path.
  internal_payload := (p_payload - 'guestRecovery' - 'guestCartId' - 'idempotencyKey')
    || jsonb_build_object(
      'guestCartId', proof_hash,
      'idempotencyKey', sanitized_idempotency_key
    );
  result := private.submit_checkout_authority_v2(internal_payload);

  if result ->> 'status' <> 'success' then
    return result - 'guestAccessToken';
  end if;

  update public.checkout_orders
  set guest_secret_hash = proof_hash
  where id = (result ->> 'orderId')::uuid
    and owner_user_id is null
    and idempotency_actor = expected_actor
    and idempotency_key = sanitized_idempotency_key
  returning * into order_row;
  if not found then
    raise exception 'guest checkout ownership invariant failed' using errcode = 'P0001';
  end if;

  update private.checkout_guest_attempt_claims as attempt_claim
  set order_id = order_row.id, updated_at = now()
  where attempt_claim.attempt_id_hash = attempt_hash
    and attempt_claim.proof_hash = claim.proof_hash;

  return jsonb_build_object(
    'status', 'success',
    'orderId', order_row.id,
    'orderNumber', order_row.order_number,
    'reservationExpiresAt', order_row.reservation_expires_at
  );
end;
$$;

alter function public.submit_checkout(jsonb) owner to postgres;
revoke all on function public.submit_checkout(jsonb) from public, anon, authenticated;
grant execute on function public.submit_checkout(jsonb) to anon, authenticated, service_role;
