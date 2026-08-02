-- Fence every outbox lease with a unique token. A worker whose lease expires
-- may still return from the email provider later; token-checked transitions
-- prevent that stale worker from overwriting the state owned by a reclaimer.

alter table public.transactional_email_outbox
  add column if not exists claim_token uuid,
  add column if not exists provider_message_id text,
  add column if not exists last_error_code text;

-- Rows left in `sending` before fencing was introduced cannot have a valid
-- token, so make them immediately claimable instead of manufacturing ownership.
update public.transactional_email_outbox
set status = 'pending',
    claimed_at = null,
    claim_token = null,
    available_at = least(available_at, now()),
    updated_at = now()
where status = 'sending';

update public.transactional_email_outbox
set claimed_at = null,
    claim_token = null
where status <> 'sending'
  and (claimed_at is not null or claim_token is not null);

alter table public.transactional_email_outbox
  add constraint transactional_email_outbox_claim_state_check
  check (
    (status = 'sending' and claimed_at is not null and claim_token is not null)
    or
    (status <> 'sending' and claimed_at is null and claim_token is null)
  );

create or replace function public.claim_transactional_emails(
  p_limit integer default 10,
  p_lease_seconds integer default 300
)
returns setof public.transactional_email_outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  bounded_limit integer := least(greatest(coalesce(p_limit, 10), 1), 100);
  bounded_lease integer := least(greatest(coalesce(p_lease_seconds, 300), 30), 3600);
begin
  return query
  with claimable as (
    select o.id
    from public.transactional_email_outbox o
    where (o.status = 'pending' and o.available_at <= now())
       or (
         o.status = 'sending'
         and o.claimed_at is not null
         and o.claimed_at <= now() - make_interval(secs => bounded_lease)
       )
    order by o.available_at
    limit bounded_limit
    for update skip locked
  )
  update public.transactional_email_outbox target
  set status = 'sending',
      claimed_at = now(),
      claim_token = gen_random_uuid(),
      attempt_count = target.attempt_count + 1,
      updated_at = now()
  from claimable
  where target.id = claimable.id
  returning target.*;
end;
$$;

alter function public.claim_transactional_emails(integer, integer) owner to postgres;
revoke all on function public.claim_transactional_emails(integer, integer) from public, anon, authenticated;
grant execute on function public.claim_transactional_emails(integer, integer) to service_role;

create or replace function public.transition_transactional_email_claim(
  p_id uuid,
  p_claim_token uuid,
  p_status text,
  p_provider_message_id text default null,
  p_error_code text default null,
  p_available_at timestamptz default null,
  p_transitioned_at timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected_rows integer;
begin
  if p_id is null or p_claim_token is null or p_transitioned_at is null then
    raise exception 'invalid email claim transition' using errcode = '22023';
  end if;

  if p_status = 'sent' then
    if nullif(btrim(p_provider_message_id), '') is null
       or p_error_code is not null
       or p_available_at is not null then
      raise exception 'invalid sent email claim transition' using errcode = '22023';
    end if;
  elsif p_status = 'pending' then
    if nullif(btrim(p_error_code), '') is null
       or p_available_at is null
       or p_provider_message_id is not null then
      raise exception 'invalid retry email claim transition' using errcode = '22023';
    end if;
  elsif p_status = 'failed' then
    if nullif(btrim(p_error_code), '') is null
       or p_provider_message_id is not null
       or p_available_at is not null then
      raise exception 'invalid failed email claim transition' using errcode = '22023';
    end if;
  else
    raise exception 'invalid email claim transition status' using errcode = '22023';
  end if;

  update public.transactional_email_outbox target
  set status = p_status,
      sent_at = case when p_status = 'sent' then p_transitioned_at else target.sent_at end,
      provider_message_id = case when p_status = 'sent' then btrim(p_provider_message_id) else null end,
      last_error_code = case when p_status in ('pending', 'failed') then btrim(p_error_code) else null end,
      available_at = case when p_status = 'pending' then p_available_at else target.available_at end,
      claimed_at = null,
      claim_token = null,
      updated_at = p_transitioned_at
  where target.id = p_id
    and target.status = 'sending'
    and target.claim_token = p_claim_token;

  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

alter function public.transition_transactional_email_claim(uuid, uuid, text, text, text, timestamptz, timestamptz) owner to postgres;
revoke all on function public.transition_transactional_email_claim(uuid, uuid, text, text, text, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.transition_transactional_email_claim(uuid, uuid, text, text, text, timestamptz, timestamptz)
  to service_role;
