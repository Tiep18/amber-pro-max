-- Plan 016: the payment page shows only an order number, total and deadline
-- today. Embed the immutable line snapshot and the money breakdown in the
-- existing guest-safe get_order_payment_status() result rather than reading
-- checkout_order_lines directly from the client: that table has no anon
-- grant at all (`revoke all ... from public, anon, authenticated; grant
-- select ... to authenticated;`), so a second client-side query would either
-- fail for guest orders or require relaxing RLS/grants for anon. This
-- function already re-checks ownership (owner_user_id / guest_secret_hash /
-- admin) itself, so extending its output keeps the same authorization
-- boundary instead of adding a new one.

create or replace function public.get_order_payment_status(p_order_number text, p_guest_secret_hash text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  row_data public.order_payment_statuses%rowtype;
  order_row public.checkout_orders%rowtype;
  lines_json jsonb;
  discount_code_text text;
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

  select * into order_row from public.checkout_orders where id = row_data.order_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'lineId', col.line_id,
        'title', col.product_title,
        'variantLabel', col.variant_label,
        'sku', col.sku,
        'fulfillmentType', col.fulfillment_type,
        'quantity', col.quantity,
        'unitPriceMinor', col.unit_price_minor,
        'lineSubtotalMinor', col.line_subtotal_minor,
        'discountAllocationMinor', col.discount_allocation_minor
      )
      order by col.created_at
    ),
    '[]'::jsonb
  )
  into lines_json
  from public.checkout_order_lines col
  where col.order_id = row_data.order_id;

  select dc.code
  into discount_code_text
  from public.discount_redemptions dr
  join public.discount_codes dc on dc.id = dr.discount_code_id
  where dr.order_id = row_data.order_id
    and dr.status = 'committed'
  limit 1;

  return jsonb_build_object(
    'status', 'found',
    'orderNumber', row_data.order_number,
    'market', row_data.market,
    'paymentIntent', row_data.payment_intent,
    'provider', row_data.provider,
    'paymentStatus', row_data.payment_status,
    'customerPaymentStatus', row_data.customer_payment_status,
    'fulfillmentGateStatus', row_data.fulfillment_gate_status,
    'amountMinor', row_data.total_minor,
    'subtotalMinor', order_row.subtotal_minor,
    'discountMinor', order_row.discount_minor,
    'shippingMinor', order_row.shipping_minor,
    'discountCode', discount_code_text,
    'currencyCode', row_data.currency_code,
    'reservationExpiresAt', row_data.reservation_expires_at,
    'customerTransferDeclaredAt', row_data.customer_transfer_declared_at,
    'shippingAddress', row_data.shipping_address,
    'contactEmail', row_data.contact_email,
    'lines', lines_json
  );
end;
$$;

alter function public.get_order_payment_status(text, text) owner to postgres;
revoke all on function public.get_order_payment_status(text, text) from public;
grant execute on function public.get_order_payment_status(text, text) to anon, authenticated;
