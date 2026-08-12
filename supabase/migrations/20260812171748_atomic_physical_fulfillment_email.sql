alter table public.physical_fulfillments
  add column if not exists admin_note text;

comment on column public.physical_fulfillments.admin_note is
  'Private admin-only fulfillment note. Never expose through customer projections.';

-- The table previously had a table-wide SELECT grant for authenticated users.
-- Replace it with an explicit customer-safe column grant before adding the
-- admin-only note. RLS continues to restrict rows to the order owner or admin.
revoke select on table public.physical_fulfillments from authenticated;
grant select (
  id,
  order_id,
  status,
  tracking_number,
  tracking_url,
  carrier,
  shipped_at,
  delivered_at,
  version,
  created_at,
  updated_at
) on table public.physical_fulfillments to authenticated;

create or replace function public.update_physical_fulfillment(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  fulfillment_row public.physical_fulfillments%rowtype;
  order_row public.checkout_orders%rowtype;
  target_order_id uuid;
  expected_status text;
  expected_version integer;
  target_status text;
  carrier_value text;
  tracking_number_value text;
  tracking_url_value text;
  note_value text;
  changed_at timestamptz := now();
begin
  if not private.is_admin() then
    return jsonb_build_object('status', 'forbidden');
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    return jsonb_build_object('status', 'invalid', 'code', 'invalid_physical_request');
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_payload) as payload_key(key_name)
    where key_name not in (
      'orderId',
      'expectedStatus',
      'expectedVersion',
      'status',
      'carrier',
      'trackingNumber',
      'trackingUrl',
      'note'
    )
  ) then
    return jsonb_build_object('status', 'invalid', 'code', 'invalid_physical_request');
  end if;

  if jsonb_typeof(p_payload -> 'orderId') is distinct from 'string'
    or jsonb_typeof(p_payload -> 'expectedStatus') is distinct from 'string'
    or jsonb_typeof(p_payload -> 'expectedVersion') is distinct from 'number'
    or jsonb_typeof(p_payload -> 'status') is distinct from 'string'
    or (p_payload ? 'carrier' and jsonb_typeof(p_payload -> 'carrier') not in ('string', 'null'))
    or (p_payload ? 'trackingNumber' and jsonb_typeof(p_payload -> 'trackingNumber') not in ('string', 'null'))
    or (p_payload ? 'trackingUrl' and jsonb_typeof(p_payload -> 'trackingUrl') not in ('string', 'null'))
    or (p_payload ? 'note' and jsonb_typeof(p_payload -> 'note') not in ('string', 'null')) then
    return jsonb_build_object('status', 'invalid', 'code', 'invalid_physical_request');
  end if;

  begin
    target_order_id := (p_payload ->> 'orderId')::uuid;
  exception
    when invalid_text_representation then
      return jsonb_build_object('status', 'invalid', 'code', 'invalid_physical_request');
  end;

  if length(p_payload ->> 'expectedVersion') > 10
    or (p_payload ->> 'expectedVersion') !~ '^[0-9]+$' then
    return jsonb_build_object('status', 'invalid', 'code', 'invalid_physical_request');
  end if;

  begin
    expected_version := (p_payload ->> 'expectedVersion')::integer;
  exception
    when numeric_value_out_of_range then
      return jsonb_build_object('status', 'invalid', 'code', 'invalid_physical_request');
  end;

  expected_status := p_payload ->> 'expectedStatus';
  target_status := p_payload ->> 'status';
  carrier_value := nullif(btrim(p_payload ->> 'carrier'), '');
  tracking_number_value := nullif(btrim(p_payload ->> 'trackingNumber'), '');
  tracking_url_value := nullif(btrim(p_payload ->> 'trackingUrl'), '');
  note_value := nullif(btrim(p_payload ->> 'note'), '');

  if expected_status not in (
    'awaiting_fulfillment', 'packing', 'shipped', 'delivered', 'cancelled'
  ) or target_status not in (
    'awaiting_fulfillment', 'packing', 'shipped', 'delivered', 'cancelled'
  ) or char_length(coalesce(carrier_value, '')) > 120
    or char_length(coalesce(tracking_number_value, '')) > 160
    or char_length(coalesce(tracking_url_value, '')) > 500
    or char_length(coalesce(note_value, '')) > 240 then
    return jsonb_build_object('status', 'invalid', 'code', 'invalid_physical_request');
  end if;

  if tracking_url_value is not null and tracking_url_value !~ '^https://' then
    return jsonb_build_object('status', 'invalid', 'code', 'invalid_tracking_url');
  end if;

  select pf.*
  into fulfillment_row
  from public.physical_fulfillments pf
  where pf.order_id = target_order_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if fulfillment_row.status <> expected_status
    or fulfillment_row.version <> expected_version then
    return jsonb_build_object('status', 'stale');
  end if;

  if target_status <> fulfillment_row.status and not (
    (fulfillment_row.status = 'awaiting_fulfillment' and target_status in ('packing', 'shipped', 'cancelled'))
    or (fulfillment_row.status = 'packing' and target_status in ('shipped', 'cancelled'))
    or (fulfillment_row.status = 'shipped' and target_status = 'delivered')
  ) then
    return jsonb_build_object('status', 'invalid', 'code', 'invalid_physical_transition');
  end if;

  select co.*
  into strict order_row
  from public.checkout_orders co
  where co.id = fulfillment_row.order_id
  for key share;

  update public.physical_fulfillments
  set status = target_status,
      carrier = carrier_value,
      tracking_number = tracking_number_value,
      tracking_url = tracking_url_value,
      admin_note = note_value,
      shipped_at = case
        when target_status = 'shipped' then changed_at
        else fulfillment_row.shipped_at
      end,
      delivered_at = case
        when target_status = 'delivered' then changed_at
        else fulfillment_row.delivered_at
      end,
      version = fulfillment_row.version + 1,
      updated_at = changed_at
  where id = fulfillment_row.id;

  insert into public.physical_fulfillment_events (
    physical_fulfillment_id,
    event_type,
    actor_type,
    actor_id,
    metadata
  ) values (
    fulfillment_row.id,
    'physical_' || target_status,
    'admin',
    auth.uid(),
    jsonb_build_object(
      'status', target_status,
      'carrier', carrier_value,
      'hasTracking', tracking_number_value is not null or tracking_url_value is not null
    )
  );

  if target_status = 'shipped' then
    insert into public.transactional_email_outbox (
      order_id,
      event_type,
      recipient_email,
      locale,
      payload
    ) values (
      order_row.id,
      'physical_shipped',
      order_row.contact_email,
      order_row.locale,
      jsonb_build_object(
        'orderNumber', order_row.order_number,
        'carrier', carrier_value,
        'trackingNumber', tracking_number_value,
        'trackingUrl', tracking_url_value
      )
    );
  end if;

  return jsonb_build_object(
    'status', 'updated',
    'physicalStatus', target_status,
    'version', fulfillment_row.version + 1
  );
end;
$$;

alter function public.update_physical_fulfillment(jsonb) owner to postgres;
revoke all on function public.update_physical_fulfillment(jsonb) from public, anon, authenticated;
grant execute on function public.update_physical_fulfillment(jsonb) to authenticated;
