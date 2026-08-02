-- Guest reopen-link redemption was a read-then-write sequence across four
-- separate round trips (read order -> read token -> check usable -> update
-- token -> update order). Two concurrent clicks on the same emailed link could
-- both pass the usability check before either consumed the token, so both were
-- granted access and the second secret rotation silently invalidated the
-- cookie the first request had just issued. The token update also matched on
-- `id` alone and only inspected the error channel, so an update that matched
-- zero rows (already consumed, revoked, or expired) still reported success.
--
-- Collapse the whole thing into one transactional function. The conditional
-- UPDATE ... RETURNING is the concurrency control: exactly one caller can move
-- the row out of 'active', and everybody else gets NOT FOUND.
--
-- The raw guest secret is still minted in the application and only its hash is
-- passed in, so no recoverable secret ever reaches the database — matching how
-- checkout submit establishes the guest secret in the first place.

create or replace function public.redeem_guest_order_reopen_token(
  p_order_number text,
  p_token_hash text,
  p_new_guest_secret_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  order_row public.checkout_orders%rowtype;
  consumed_token_id uuid;
  effective_payment_status text;
begin
  if coalesce(btrim(p_order_number), '') = ''
    or coalesce(btrim(p_token_hash), '') = ''
    or p_new_guest_secret_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('status', 'denied');
  end if;

  -- Lock the order first so the secret rotation below cannot interleave with
  -- another redemption of the same order.
  select *
  into order_row
  from public.checkout_orders
  where order_number = upper(btrim(p_order_number))
  for update;

  if not found or order_row.owner_user_id is not null then
    -- Claimed orders are recovered through the signed-in claim flow instead.
    return jsonb_build_object('status', 'denied');
  end if;

  -- Single-shot consume: only an active, unexpired token for THIS order and
  -- purpose can be moved to 'consumed', and only once.
  update public.guest_order_access_tokens
  set status = 'consumed',
      consumed_at = now()
  where order_id = order_row.id
    and purpose = 'reopen_order'
    and token_hash = p_token_hash
    and status = 'active'
    and expires_at > now()
  returning id into consumed_token_id;

  if consumed_token_id is null then
    return jsonb_build_object('status', 'denied');
  end if;

  update public.checkout_orders
  set guest_secret_hash = p_new_guest_secret_hash,
      updated_at = now()
  where id = order_row.id;

  select ops.payment_status
  into effective_payment_status
  from public.order_payment_statuses ops
  where ops.order_id = order_row.id;

  return jsonb_build_object(
    'status', 'granted',
    'orderNumber', order_row.order_number,
    'paid', coalesce(effective_payment_status, '') = 'paid',
    'reservationExpiresAt', order_row.reservation_expires_at
  );
end;
$$;

alter function public.redeem_guest_order_reopen_token(text, text, text) owner to postgres;
revoke all on function public.redeem_guest_order_reopen_token(text, text, text) from public, anon, authenticated;
grant execute on function public.redeem_guest_order_reopen_token(text, text, text) to service_role;
