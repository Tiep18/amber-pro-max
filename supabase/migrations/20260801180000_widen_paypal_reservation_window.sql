-- Plan 013: 15 minutes was too tight for a first-time PayPal buyer who has
-- to log in, pass 2FA, add a card, and re-authenticate. Widen the PayPal
-- hold to 25 minutes (shop owner approved 2026-08-01); VietQR is unchanged.
-- Keep this value in sync with PAYPAL_RESERVATION_WINDOW_MINUTES in
-- src/payments/reservation.ts.
--
-- This only changes the deadline computed for orders created after this
-- migration runs — existing orders keep their original deadline, since
-- checkout_reservation_expires_at is only consulted at insert time.

create or replace function public.checkout_reservation_expires_at(p_payment_intent text, p_now timestamptz default now())
returns timestamptz
language plpgsql
stable
set search_path = public, pg_temp
as $$
begin
  if p_payment_intent = 'paypal_intent' then
    return p_now + interval '25 minutes';
  end if;

  if p_payment_intent = 'vietqr_intent' then
    return p_now + interval '24 hours';
  end if;

  raise exception 'unsupported payment intent' using errcode = '23514';
end;
$$;
