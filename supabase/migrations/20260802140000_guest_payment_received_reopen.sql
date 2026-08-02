-- Payment-received emails may offer a guest-order reopen link, but the
-- lifecycle trigger did not tell the worker whether the paid order was a
-- guest order. Keep that decision derived from the authoritative order owner.

create or replace function private.enqueue_payment_received_email() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  payment_row public.payments%rowtype;
  order_row public.checkout_orders%rowtype;
begin
  if new.result = 'applied' and new.to_status = 'paid' then
    select * into payment_row from public.payments where id = new.payment_id;
    if found then
      select * into order_row from public.checkout_orders where id = payment_row.order_id;
      if found then
        insert into public.transactional_email_outbox (order_id, event_type, recipient_email, locale, payload)
        values (
          order_row.id,
          'payment_received',
          order_row.contact_email,
          order_row.locale,
          jsonb_build_object(
            'orderNumber', order_row.order_number,
            'totalMinor', order_row.total_minor,
            'currencyCode', order_row.currency_code,
            'provider', payment_row.provider,
            'isGuest', order_row.owner_user_id is null,
            'hasDigitalLines', exists(
              select 1 from public.checkout_order_lines
              where order_id = order_row.id and fulfillment_type = 'digital'
            ),
            'hasPhysicalLines', exists(
              select 1 from public.checkout_order_lines
              where order_id = order_row.id and fulfillment_type = 'physical'
            )
          )
        );
      end if;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.enqueue_payment_received_email() from public, anon, authenticated;

-- Pending rows have not been delivered yet, so make them conform to the new
-- payload contract. Terminal and in-flight rows retain their original payload.
update public.transactional_email_outbox as outbox
set
  payload = outbox.payload || jsonb_build_object('isGuest', orders.owner_user_id is null),
  updated_at = now()
from public.checkout_orders as orders
where outbox.order_id = orders.id
  and outbox.event_type = 'payment_received'
  and outbox.status = 'pending'
  and not (outbox.payload ? 'isGuest');
