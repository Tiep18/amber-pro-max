alter table public.payment_events
  add column if not exists delivery_count integer not null default 1 check (delivery_count >= 1),
  add column if not exists last_received_at timestamptz not null default now();

update public.payment_events
set last_received_at = received_at
where last_received_at is null;

create index if not exists payment_events_provider_last_received_idx
on public.payment_events (provider, last_received_at);

grant update (delivery_count, last_received_at) on table public.payment_events to service_role;
