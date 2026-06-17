create or replace function private.payment_effective_status(
  p_payment_status text,
  p_paid_gate_status text,
  p_review_reason text
)
returns text
language sql
immutable
set search_path = private, public, pg_temp
as $$
  select case
    when p_payment_status in ('paid', 'failed', 'cancelled', 'rejected', 'expired', 'review_required', 'partially_refunded', 'refunded')
    then p_payment_status
    when p_paid_gate_status = 'review_required' or nullif(btrim(coalesce(p_review_reason, '')), '') is not null
    then 'review_required'
    else coalesce(p_payment_status, 'verifying')
  end;
$$;

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
    when 'review_required' then 'review_required'
    when 'partially_refunded' then 'partially_refunded'
    when 'refunded' then 'refunded'
    else 'verifying_payment'
  end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'order_payment_statuses'
      and column_name = 'payment_intent'
  ) then
    execute $view$
      create or replace view public.order_payment_statuses
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
        effective.status as payment_status,
        private.payment_customer_status(effective.status) as customer_payment_status,
        case
          when effective.status in ('paid', 'partially_refunded', 'refunded') then 'eligible'
          when effective.status = 'review_required' then 'review_required'
          else 'locked'
        end as fulfillment_gate_status,
        p.digital_fulfillment_status,
        p.physical_fulfillment_status,
        p.refund_status,
        p.refunded_amount_minor,
        coalesce(p.review_reason, co.review_reason) as review_reason,
        p.created_at,
        p.updated_at
      from public.checkout_orders co
      join public.payments p on p.order_id = co.id
      cross join lateral (
        select private.payment_effective_status(p.status, co.paid_gate_status, coalesce(p.review_reason, co.review_reason)) as status
      ) effective
    $view$;
  else
    execute $view$
      create or replace view public.order_payment_statuses
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
        co.currency_code,
        co.total_minor,
        co.reservation_expires_at,
        p.id as payment_id,
        p.provider,
        effective.status as payment_status,
        private.payment_customer_status(effective.status) as customer_payment_status,
        case
          when effective.status in ('paid', 'partially_refunded', 'refunded') then 'eligible'
          when effective.status = 'review_required' then 'review_required'
          else 'locked'
        end as fulfillment_gate_status,
        p.digital_fulfillment_status,
        p.physical_fulfillment_status,
        p.refund_status,
        p.refunded_amount_minor,
        coalesce(p.review_reason, co.review_reason) as review_reason,
        p.created_at,
        p.updated_at
      from public.checkout_orders co
      join public.payments p on p.order_id = co.id
      cross join lateral (
        select private.payment_effective_status(p.status, co.paid_gate_status, coalesce(p.review_reason, co.review_reason)) as status
      ) effective
    $view$;
  end if;
end;
$$;
