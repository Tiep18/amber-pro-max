-- Every order today produces no email until digital delivery or a shipping
-- update. Add two lifecycle events: `order_created` (so a VietQR customer who
-- closes the tab still has the transfer details, and every order gets a
-- receipt-in-waiting) and `payment_received` (a paid confirmation, including
-- physical-only orders that otherwise never get one).

alter table public.transactional_email_outbox
  drop constraint transactional_email_outbox_event_type_check;

alter table public.transactional_email_outbox
  add constraint transactional_email_outbox_event_type_check
  check (event_type in (
    'digital_access_granted', 'digital_access_revoked', 'digital_access_reissued',
    'physical_shipped', 'guest_order_reopen', 'guest_order_claim', 'newsletter_subscribed',
    'order_created', 'payment_received'
  ));

create or replace function private.enqueue_order_created_email() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.transactional_email_outbox (order_id, event_type, recipient_email, locale, payload)
  values (
    new.id,
    'order_created',
    new.contact_email,
    new.locale,
    jsonb_build_object(
      'orderNumber', new.order_number,
      'totalMinor', new.total_minor,
      'currencyCode', new.currency_code,
      'paymentIntent', new.payment_intent,
      'reservationExpiresAt', new.reservation_expires_at,
      'isGuest', new.owner_user_id is null
    )
  );
  return new;
end;
$$;

revoke all on function private.enqueue_order_created_email() from public, anon, authenticated;

create trigger checkout_orders_enqueue_order_created_email
after insert on public.checkout_orders
for each row execute function private.enqueue_order_created_email();

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

create trigger payment_transitions_enqueue_payment_received_email
after insert on public.payment_transitions
for each row execute function private.enqueue_payment_received_email();
