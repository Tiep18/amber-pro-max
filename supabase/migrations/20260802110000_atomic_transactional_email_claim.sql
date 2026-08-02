-- The outbox worker claimed rows by selecting `status = 'pending'` and then
-- issuing a separate UPDATE per row. Two workers overlapping (the checkout
-- submit path calls the worker inline, and a scheduled run can land at the
-- same moment) could therefore hand the same row to both and send the email
-- twice. Worse, a worker that died between the SELECT and the UPDATE — or
-- after the UPDATE but before sending — left the row parked in 'sending'
-- forever, because nothing ever moved it back.
--
-- Claim atomically with FOR UPDATE SKIP LOCKED, and give the claim a lease so
-- a dead worker's rows become claimable again instead of being lost.

alter table public.transactional_email_outbox
  add column if not exists claimed_at timestamptz,
  add column if not exists attempt_count integer not null default 0;

-- Lets the reaper branch find expired leases without scanning the table.
create index if not exists transactional_email_outbox_sending_lease_idx
  on public.transactional_email_outbox (claimed_at)
  where status = 'sending';

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
       -- Reaper: a lease that expired means the worker holding it is gone.
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
