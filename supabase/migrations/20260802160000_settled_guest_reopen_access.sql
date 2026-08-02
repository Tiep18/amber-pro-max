-- Refunded orders remain durable customer records. Keep guest reopen links on
-- the same settled-status predicate as the authorized order surface so a
-- partial or full refund does not silently shorten guest access.

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

  select *
  into order_row
  from public.checkout_orders
  where order_number = upper(btrim(p_order_number))
  for update;

  if not found or order_row.owner_user_id is not null then
    return jsonb_build_object('status', 'denied');
  end if;

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
    'paid', coalesce(effective_payment_status, '') in ('paid', 'partially_refunded', 'refunded'),
    'reservationExpiresAt', order_row.reservation_expires_at
  );
end;
$$;

alter function public.redeem_guest_order_reopen_token(text, text, text) owner to postgres;
revoke all on function public.redeem_guest_order_reopen_token(text, text, text) from public, anon, authenticated;
grant execute on function public.redeem_guest_order_reopen_token(text, text, text) to service_role;
