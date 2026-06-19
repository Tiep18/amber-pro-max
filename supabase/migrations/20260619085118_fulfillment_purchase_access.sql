create table public.digital_entitlements (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.checkout_orders(id) on delete cascade,
  order_line_id uuid not null references public.checkout_order_lines(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete set null,
  contact_email text not null,
  product_id uuid references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'revoked')),
  version integer not null default 1 check (version > 0),
  granted_by_payment_transition_id uuid references public.payment_transitions(id) on delete set null,
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'active' and revoked_at is null and revoke_reason is null) or (status = 'revoked' and revoked_at is not null and revoke_reason is not null))
);

create unique index digital_entitlements_one_active_line_idx on public.digital_entitlements (order_line_id) where status = 'active';
create index digital_entitlements_order_idx on public.digital_entitlements (order_id, status);

create table public.digital_access_tokens (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null references public.digital_entitlements(id) on delete cascade,
  token_hash text not null unique check (length(token_hash) >= 32),
  purpose text not null default 'download' check (purpose = 'download'),
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at <= created_at + interval '24 hours' + interval '1 minute'),
  check ((status = 'active' and revoked_at is null) or (status in ('revoked', 'expired') and revoked_at is not null))
);
create index digital_access_tokens_entitlement_idx on public.digital_access_tokens (entitlement_id, status, expires_at);

create table public.guest_order_access_tokens (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.checkout_orders(id) on delete cascade,
  contact_email text not null,
  token_hash text not null unique check (length(token_hash) >= 32),
  purpose text not null check (purpose in ('reopen_order', 'claim_order')),
  status text not null default 'active' check (status in ('active', 'consumed', 'revoked', 'expired')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at <= created_at + interval '24 hours' + interval '1 minute')
);
create index guest_order_access_tokens_order_idx on public.guest_order_access_tokens (order_id, purpose, status);

create table public.transactional_email_outbox (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.checkout_orders(id) on delete cascade,
  entitlement_id uuid references public.digital_entitlements(id) on delete cascade,
  event_type text not null check (event_type in ('digital_access_granted', 'digital_access_revoked', 'digital_access_reissued', 'physical_shipped', 'guest_order_reopen', 'guest_order_claim')),
  recipient_email text not null,
  locale text not null check (locale in ('en', 'vi')),
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  available_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index transactional_email_outbox_pending_idx on public.transactional_email_outbox (status, available_at) where status = 'pending';

create table public.physical_fulfillments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.checkout_orders(id) on delete cascade,
  status text not null default 'awaiting_fulfillment' check (status in ('awaiting_fulfillment', 'packing', 'shipped', 'delivered', 'cancelled')),
  tracking_number text,
  tracking_url text,
  carrier text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'shipped' or (tracking_number is not null and tracking_url is not null and tracking_url ~ '^https://'))
);

create table public.physical_fulfillment_events (
  id uuid primary key default gen_random_uuid(),
  physical_fulfillment_id uuid not null references public.physical_fulfillments(id) on delete cascade,
  event_type text not null,
  actor_type text not null check (actor_type in ('admin', 'system')),
  actor_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create table public.fulfillment_audit_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  order_id uuid references public.checkout_orders(id) on delete cascade,
  entitlement_id uuid references public.digital_entitlements(id) on delete set null,
  physical_fulfillment_id uuid references public.physical_fulfillments(id) on delete set null,
  event_type text not null,
  actor_type text not null check (actor_type in ('system', 'admin', 'customer')),
  actor_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create or replace function private.fulfillment_safe_json(p_value jsonb) returns boolean language sql immutable set search_path = private, public, pg_temp as $$
  select not (lower(coalesce(p_value::text, '')) ~ '(raw_token|download_token|signed_url|signedurl|storage_path|object_path|service_role|sb_secret_|authorization|provider_payload|paypal_client_secret|webhook_id)');
$$;

create or replace function private.reject_unsafe_fulfillment_payload() returns trigger language plpgsql set search_path = private, public, pg_temp as $$
begin
  if tg_table_name = 'transactional_email_outbox' and not private.fulfillment_safe_json(new.payload) then raise exception 'email outbox payload contains unsafe fulfillment material' using errcode = '23514'; end if;
  if tg_table_name in ('physical_fulfillment_events', 'fulfillment_audit_events') and not private.fulfillment_safe_json(new.metadata) then raise exception 'fulfillment metadata contains unsafe material' using errcode = '23514'; end if;
  return new;
end;
$$;

create or replace function private.prevent_fulfillment_audit_mutation() returns trigger language plpgsql set search_path = private, public, pg_temp as $$
begin
  raise exception 'fulfillment audit events are append only' using errcode = '23514';
end;
$$;

create trigger transactional_email_outbox_safe_payload before insert or update on public.transactional_email_outbox for each row execute function private.reject_unsafe_fulfillment_payload();
create trigger physical_fulfillment_events_safe_metadata before insert or update on public.physical_fulfillment_events for each row execute function private.reject_unsafe_fulfillment_payload();
create trigger fulfillment_audit_events_safe_metadata before insert or update on public.fulfillment_audit_events for each row execute function private.reject_unsafe_fulfillment_payload();
create trigger fulfillment_audit_events_append_only before update or delete on public.fulfillment_audit_events for each row execute function private.prevent_fulfillment_audit_mutation();

create or replace function private.grant_paid_digital_entitlements(p_payment_id uuid, p_payment_transition_id uuid) returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare
  order_row public.checkout_orders%rowtype;
  line_row public.checkout_order_lines%rowtype;
  entitlement_id uuid;
  token_hash_value text;
  granted_count integer := 0;
begin
  select co.* into order_row from public.checkout_orders co join public.payments p on p.order_id = co.id where p.id = p_payment_id and p.status = 'paid' and co.paid_gate_status = 'open' for update of co;
  if not found then return 0; end if;
  for line_row in select * from public.checkout_order_lines where order_id = order_row.id and fulfillment_type = 'digital' order by id loop
    entitlement_id := null;
    insert into public.digital_entitlements(order_id, order_line_id, owner_user_id, contact_email, product_id, variant_id, status, granted_by_payment_transition_id)
    values (order_row.id, line_row.id, order_row.owner_user_id, order_row.contact_email, line_row.product_id, line_row.variant_id, 'active', p_payment_transition_id)
    on conflict do nothing returning id into entitlement_id;
    if entitlement_id is not null then
      token_hash_value := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
      insert into public.digital_access_tokens(entitlement_id, token_hash, purpose, status, expires_at) values (entitlement_id, token_hash_value, 'download', 'active', now() + interval '24 hours');
      insert into public.transactional_email_outbox(order_id, entitlement_id, event_type, recipient_email, locale, payload) values (order_row.id, entitlement_id, 'digital_access_granted', order_row.contact_email, order_row.locale, jsonb_build_object('orderNumber', order_row.order_number, 'entitlementId', entitlement_id, 'expiresInHours', 24));
      insert into public.fulfillment_audit_events(event_key, order_id, entitlement_id, event_type, actor_type, metadata) values ('digital_entitlement_granted:' || entitlement_id::text, order_row.id, entitlement_id, 'digital_entitlement_granted', 'system', jsonb_build_object('paymentTransitionId', p_payment_transition_id)) on conflict (event_key) do nothing;
      granted_count := granted_count + 1;
    end if;
  end loop;
  update public.checkout_orders set digital_fulfillment_status = case when granted_count > 0 then 'eligible' else digital_fulfillment_status end, updated_at = now() where id = order_row.id;
  return granted_count;
end;
$$;

create or replace function private.after_paid_payment_transition_grant_entitlements() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.result = 'applied' and new.to_status = 'paid' then perform private.grant_paid_digital_entitlements(new.payment_id, new.id); end if;
  return new;
end;
$$;
create trigger payment_transition_grants_digital_entitlements after insert on public.payment_transitions for each row execute function private.after_paid_payment_transition_grant_entitlements();

create or replace function public.revoke_digital_entitlement(p_entitlement_id uuid, p_expected_version integer, p_reason text) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare entitlement_row public.digital_entitlements%rowtype;
begin
  if not private.is_admin() then return jsonb_build_object('status', 'forbidden'); end if;
  select * into entitlement_row from public.digital_entitlements where id = p_entitlement_id for update;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if entitlement_row.status <> 'active' or entitlement_row.version <> p_expected_version then return jsonb_build_object('status', 'stale', 'version', entitlement_row.version); end if;
  update public.digital_entitlements set status = 'revoked', version = version + 1, revoked_by = auth.uid(), revoked_at = now(), revoke_reason = coalesce(nullif(btrim(p_reason), ''), 'admin_revoked'), updated_at = now() where id = p_entitlement_id;
  update public.digital_access_tokens set status = 'revoked', revoked_at = now() where entitlement_id = p_entitlement_id and status = 'active';
  insert into public.transactional_email_outbox(order_id, entitlement_id, event_type, recipient_email, locale, payload) select de.order_id, de.id, 'digital_access_revoked', de.contact_email, co.locale, jsonb_build_object('orderNumber', co.order_number, 'reason', coalesce(nullif(btrim(p_reason), ''), 'admin_revoked')) from public.digital_entitlements de join public.checkout_orders co on co.id = de.order_id where de.id = p_entitlement_id;
  insert into public.fulfillment_audit_events(event_key, order_id, entitlement_id, event_type, actor_type, actor_id, metadata) values ('digital_entitlement_revoked:' || p_entitlement_id::text || ':' || p_expected_version::text, entitlement_row.order_id, p_entitlement_id, 'digital_entitlement_revoked', 'admin', auth.uid(), jsonb_build_object('reason', coalesce(nullif(btrim(p_reason), ''), 'admin_revoked'))) on conflict (event_key) do nothing;
  return jsonb_build_object('status', 'revoked', 'version', p_expected_version + 1);
end;
$$;

create or replace function public.reissue_digital_access_token(p_entitlement_id uuid, p_expected_version integer, p_new_token_hash text) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare entitlement_row public.digital_entitlements%rowtype;
begin
  if not private.is_admin() then return jsonb_build_object('status', 'forbidden'); end if;
  if p_new_token_hash is null or length(p_new_token_hash) < 32 then return jsonb_build_object('status', 'invalid'); end if;
  select * into entitlement_row from public.digital_entitlements where id = p_entitlement_id for update;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if entitlement_row.status <> 'active' or entitlement_row.version <> p_expected_version then return jsonb_build_object('status', 'stale', 'version', entitlement_row.version); end if;
  update public.digital_access_tokens set status = 'revoked', revoked_at = now() where entitlement_id = p_entitlement_id and status = 'active';
  insert into public.digital_access_tokens(entitlement_id, token_hash, purpose, status, expires_at) values (p_entitlement_id, p_new_token_hash, 'download', 'active', now() + interval '24 hours');
  update public.digital_entitlements set version = version + 1, updated_at = now() where id = p_entitlement_id;
  insert into public.transactional_email_outbox(order_id, entitlement_id, event_type, recipient_email, locale, payload) select de.order_id, de.id, 'digital_access_reissued', de.contact_email, co.locale, jsonb_build_object('orderNumber', co.order_number, 'expiresInHours', 24) from public.digital_entitlements de join public.checkout_orders co on co.id = de.order_id where de.id = p_entitlement_id;
  insert into public.fulfillment_audit_events(event_key, order_id, entitlement_id, event_type, actor_type, actor_id, metadata) values ('digital_access_reissued:' || p_entitlement_id::text || ':' || p_expected_version::text, entitlement_row.order_id, p_entitlement_id, 'digital_access_reissued', 'admin', auth.uid(), jsonb_build_object('expiresInHours', 24)) on conflict (event_key) do nothing;
  return jsonb_build_object('status', 'reissued', 'version', p_expected_version + 1);
end;
$$;

alter table public.digital_entitlements enable row level security;
alter table public.digital_access_tokens enable row level security;
alter table public.guest_order_access_tokens enable row level security;
alter table public.transactional_email_outbox enable row level security;
alter table public.physical_fulfillments enable row level security;
alter table public.physical_fulfillment_events enable row level security;
alter table public.fulfillment_audit_events enable row level security;

revoke all on table public.digital_entitlements from public, anon, authenticated;
revoke all on table public.digital_access_tokens from public, anon, authenticated;
revoke all on table public.guest_order_access_tokens from public, anon, authenticated;
revoke all on table public.transactional_email_outbox from public, anon, authenticated;
revoke all on table public.physical_fulfillments from public, anon, authenticated;
revoke all on table public.physical_fulfillment_events from public, anon, authenticated;
revoke all on table public.fulfillment_audit_events from public, anon, authenticated;

grant select on table public.digital_entitlements to authenticated;
grant select on table public.physical_fulfillments to authenticated;
grant select, insert, update on table public.digital_entitlements to service_role;
grant select, insert, update on table public.digital_access_tokens to service_role;
grant select, insert, update on table public.guest_order_access_tokens to service_role;
grant select, insert, update on table public.transactional_email_outbox to service_role;
grant select, insert, update on table public.physical_fulfillments to service_role;
grant select, insert on table public.physical_fulfillment_events to service_role;
grant select, insert on table public.fulfillment_audit_events to service_role;

create policy "digital entitlements are owner readable" on public.digital_entitlements for select to authenticated using (owner_user_id = (select auth.uid()));
create policy "digital entitlements are admin managed" on public.digital_entitlements for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "digital access tokens are admin managed" on public.digital_access_tokens for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "guest order access tokens are admin managed" on public.guest_order_access_tokens for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "email outbox is admin managed" on public.transactional_email_outbox for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "physical fulfillments are owner readable" on public.physical_fulfillments for select to authenticated using (exists (select 1 from public.checkout_orders co where co.id = physical_fulfillments.order_id and co.owner_user_id = (select auth.uid())));
create policy "physical fulfillments are admin managed" on public.physical_fulfillments for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "physical fulfillment events are admin managed" on public.physical_fulfillment_events for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "fulfillment audit events are admin readable" on public.fulfillment_audit_events for select to authenticated using (private.is_admin());

revoke all on function private.fulfillment_safe_json(jsonb) from public, anon, authenticated;
revoke all on function private.reject_unsafe_fulfillment_payload() from public, anon, authenticated;
revoke all on function private.prevent_fulfillment_audit_mutation() from public, anon, authenticated;
revoke all on function private.grant_paid_digital_entitlements(uuid, uuid) from public, anon, authenticated;
revoke all on function private.after_paid_payment_transition_grant_entitlements() from public, anon, authenticated;
revoke all on function public.revoke_digital_entitlement(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.reissue_digital_access_token(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.revoke_digital_entitlement(uuid, integer, text) to authenticated;
grant execute on function public.reissue_digital_access_token(uuid, integer, text) to authenticated;

