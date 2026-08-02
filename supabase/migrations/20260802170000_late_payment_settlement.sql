-- Late payment settlement.
--
-- Before this migration the money state machine had no way back from a
-- payment that arrived after the reservation deadline:
--
--   * `review_required` was terminal. Every `paid` attempt from that status
--     fell through to the `pending_deadline_at <= now` branch and produced
--     `review_required` again, so a PayPal capture that landed late left the
--     customer's money with the shop and the order permanently unfulfillable.
--   * A VietQR transfer the shop reconciled the morning after a 24h hold had
--     already been flipped to `expired` by the expiry job, and `expired`
--     could only ever reach `review_required` — the same dead end.
--
-- Shop owner decision (2026-08-02): accept late payments for 7 days after the
-- hold expires, and refuse to settle when the stock has since been sold to
-- someone else (the shop refunds instead of promising goods it does not have).
--
-- Only sources that carry actual evidence of money received may settle late:
-- a human admin holding a bank statement (`vietqr_admin`, which still has to
-- pass the reference/amount evidence check above), or PayPal itself
-- (`paypal_webhook`, `paypal_recheck`). The expiry cron and `system` cannot.

-- Keep in sync with LATE_SETTLEMENT_WINDOW_DAYS in src/payments/reservation.ts.
create or replace function public.late_settlement_window()
returns interval
language sql
immutable
set search_path = public, pg_temp
as $$
  select interval '7 days';
$$;

revoke all on function public.late_settlement_window() from public, anon, authenticated;
grant execute on function public.late_settlement_window() to service_role;

-- Finalize inventory for an order whose reservations are no longer holding
-- anything. Returns:
--   'reserved'     - the order still holds live stock, so the normal
--                    reservation-backed path in apply_payment_transition owns
--                    this and must run instead.
--   'finalized'    - stock was decremented (or the order has no physical lines).
--   'insufficient' - at least one line can no longer be covered; nothing was
--                    written, and the caller must not mark the order paid.
create or replace function private.finalize_late_settlement_inventory(p_order_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rec record;
  unmatched_lines integer;
begin
  -- `status = 'active'` alone is not a live hold. The expiry job only runs
  -- every minute (and can be down for much longer), so between the deadline
  -- and that run a reservation sits `active` while `checkout_available_inventory`
  -- — which filters on `expires_at > now()` — already offers those units to
  -- other buyers. Trusting the status alone would let a late settlement skip
  -- the availability check and decrement stock a newer order has since taken.
  --
  -- Reservations for one order always share a deadline (they are written
  -- together, and `extend_paypal_reservation` moves them together), so "all
  -- active reservations are still live" is the normal on-time case. If any has
  -- lapsed, fall through to the checked path — which is conservative, because
  -- availability still subtracts this order's own live holds.
  if exists (
    select 1 from public.checkout_inventory_reservations
    where order_id = p_order_id and status = 'active'
  ) and not exists (
    select 1 from public.checkout_inventory_reservations
    where order_id = p_order_id and status = 'active' and expires_at <= now()
  ) then
    return 'reserved';
  end if;

  if not exists (
    select 1 from public.checkout_order_lines
    where order_id = p_order_id and fulfillment_type = 'physical'
  ) then
    return 'finalized';
  end if;

  -- A physical line whose inventory record has since been deleted cannot be
  -- covered by definition. Detect it before touching any stock.
  select count(*) into unmatched_lines
  from public.checkout_order_lines l
  where l.order_id = p_order_id
    and l.fulfillment_type = 'physical'
    and not exists (
      select 1 from public.inventory_records ir
      where (l.variant_id is not null and ir.variant_id = l.variant_id)
         or (l.variant_id is null and ir.product_id = l.product_id)
    );
  if unmatched_lines > 0 then
    return 'insufficient';
  end if;

  -- Lock every inventory row this order touches before reading availability,
  -- so a concurrent checkout cannot take the units between the check and the
  -- decrement. Locking is a separate statement because FOR UPDATE cannot be
  -- combined with the aggregate below.
  perform 1
  from public.inventory_records ir
  where exists (
    select 1 from public.checkout_order_lines l
    where l.order_id = p_order_id
      and l.fulfillment_type = 'physical'
      and ((l.variant_id is not null and ir.variant_id = l.variant_id)
        or (l.variant_id is null and ir.product_id = l.product_id))
  )
  order by ir.id
  for update;

  -- Pass one: verify every record can cover the whole order. No writes yet, so
  -- an insufficient record leaves the order exactly as it was.
  for rec in
    select ir.id as inventory_record_id, sum(l.quantity)::integer as quantity
    from public.checkout_order_lines l
    join public.inventory_records ir
      on (l.variant_id is not null and ir.variant_id = l.variant_id)
      or (l.variant_id is null and ir.product_id = l.product_id)
    where l.order_id = p_order_id and l.fulfillment_type = 'physical'
    group by ir.id
    order by ir.id
  loop
    if public.checkout_available_inventory(rec.inventory_record_id) < rec.quantity then
      return 'insufficient';
    end if;
  end loop;

  -- Pass two: apply. The rows are already locked and were verified above, so a
  -- failure here is a broken invariant rather than a losable race.
  for rec in
    select ir.id as inventory_record_id, sum(l.quantity)::integer as quantity
    from public.checkout_order_lines l
    join public.inventory_records ir
      on (l.variant_id is not null and ir.variant_id = l.variant_id)
      or (l.variant_id is null and ir.product_id = l.product_id)
    where l.order_id = p_order_id and l.fulfillment_type = 'physical'
    group by ir.id
    order by ir.id
  loop
    update public.inventory_records
    set quantity_on_hand = quantity_on_hand - rec.quantity
    where id = rec.inventory_record_id
      and quantity_on_hand >= rec.quantity;

    if not found then
      raise exception 'late settlement inventory finalization failed' using errcode = '40001';
    end if;
  end loop;

  return 'finalized';
end;
$$;

alter function private.finalize_late_settlement_inventory(uuid) owner to postgres;
revoke all on function private.finalize_late_settlement_inventory(uuid) from public, anon, authenticated;

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
    when source_name in ('vietqr_admin', 'admin_review_resolution') then 'admin'
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
  -- Late-settlement working state.
  late_paid_attempt boolean := false;
  late_settlement boolean := false;
  late_inventory text;
  result_code text;
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
    or source_name not in ('paypal_webhook', 'paypal_recheck', 'vietqr_instruction', 'vietqr_admin', 'reservation_expiry_job', 'admin_review_resolution', 'system')
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

  -- Retrying a provider event cannot rescue an order that was parked purely
  -- because its stock had gone: PayPal reuses one capture id for both the
  -- transition key and the event id, so every replay short-circuits as a
  -- duplicate long before the stock is re-checked. This source exists to
  -- re-run *only* that stock check, against money the shop has already
  -- accepted evidence for. It can never assert that a payment arrived.
  if source_name = 'admin_review_resolution' then
    if target_status <> 'paid'
      or payment_row.status <> 'review_required'
      or coalesce(payment_row.review_reason, '') <> 'late_payment_out_of_stock' then
      return jsonb_build_object('status', 'invalid', 'code', 'invalid_review_resolution');
    end if;
    if provider_event_id_value is not null then
      return jsonb_build_object('status', 'invalid', 'code', 'invalid_review_resolution');
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

  -- "The money landed, but the hold is already gone." Either the payment is in
  -- a terminal non-paid state, or it is still open but past its deadline.
  late_paid_attempt := target_status = 'paid'
    and payment_row.status not in ('paid', 'partially_refunded', 'refunded')
    and (
      payment_row.status not in ('pending', 'verifying')
      or payment_row.pending_deadline_at <= now_ts
    );

  if payment_row.status in ('paid', 'partially_refunded', 'refunded') then
    result_status := 'stale';
    effective_status := payment_row.status;
  elsif late_paid_attempt then
    if source_name not in ('vietqr_admin', 'paypal_webhook', 'paypal_recheck', 'admin_review_resolution') then
      -- No evidence of money received: park it for a human, never settle.
      result_status := 'review_required';
      effective_status := 'review_required';
      review_reason_value := 'late_payment_detected';
    elsif payment_row.pending_deadline_at + public.late_settlement_window() <= now_ts then
      result_status := 'review_required';
      effective_status := 'review_required';
      review_reason_value := 'late_payment_window_elapsed';
    else
      late_inventory := private.finalize_late_settlement_inventory(order_row.id);
      if late_inventory = 'insufficient' then
        -- Shop owner decision: never promise stock that is gone. The order is
        -- parked so an admin sees it in the review queue and refunds.
        result_status := 'review_required';
        effective_status := 'review_required';
        review_reason_value := 'late_payment_out_of_stock';
      else
        result_status := 'applied';
        effective_status := 'paid';
        late_settlement := true;
        if late_inventory = 'finalized' then
          -- Stock is already decremented; the reservation loop below must not
          -- run again for this order.
          inventory_effect := 'finalized';
        end if;
      end if;
    end if;
  elsif payment_row.status in ('failed', 'cancelled', 'rejected', 'expired', 'review_required') then
    result_status := 'stale';
    effective_status := payment_row.status;
  else
    effective_status := target_status;
  end if;

  if result_status in ('applied', 'review_required')
    and effective_status = 'paid'
    and inventory_effect <> 'finalized' then
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

  -- The resolved reason and the late-settlement flag are decided above, after
  -- `sanitized_facts` was first assembled from the payload. Record what
  -- actually happened, not what the caller asked for.
  sanitized_facts := sanitized_facts || jsonb_build_object(
    'reviewReason', review_reason_value,
    'lateSettlement', late_settlement
  );

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
    review_reason = case
      when effective_status = 'review_required' then review_reason_value
      -- A late settlement clears the review flag that parked this order.
      when effective_status = 'paid' then null
      else payments.review_reason
    end,
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
    review_reason = case
      when effective_status = 'review_required' then review_reason_value
      when effective_status = 'paid' then null
      else checkout_orders.review_reason
    end,
    updated_at = now_ts
  where id = order_row.id;

  audit_event_type := case
    when late_settlement then 'late_payment_settled'
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

  result_code := case
    when late_settlement then 'late_payment_settled'
    when result_status = 'review_required' then review_reason_value
    else 'payment_transition_applied'
  end;

  return jsonb_build_object(
    'status', result_status,
    'code', result_code,
    'transitionId', transition_id,
    'paymentStatus', effective_status,
    'inventoryEffect', inventory_effect,
    'lateSettlement', late_settlement
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

alter function public.apply_payment_transition(jsonb) owner to postgres;
revoke all on function public.apply_payment_transition(jsonb) from public, anon, authenticated;
grant execute on function public.apply_payment_transition(jsonb) to service_role;
