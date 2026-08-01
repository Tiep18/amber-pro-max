# Plan 012: Make the payment expiry job observable and add an HTTP fallback

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat b103bb42..HEAD -- supabase/migrations/20260615034000_trusted_payments_orders.sql src/launch/gates.ts src/launch/settings.ts src/components/admin/launch`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: operations
- **Planned at**: commit `b103bb42`, 2026-08-01

## Why this matters

Inventory release depends entirely on a pg_cron job that is scheduled
best-effort and fails silently:

```sql
-- supabase/migrations/20260615034000_trusted_payments_orders.sql:996
do $$
begin
  if to_regnamespace('cron') is not null then
    begin
      execute $cron$ select cron.schedule('trusted-payment-expiry', '* * * * *',
        'select public.expire_due_payments(100)') $cron$;
    exception
      when duplicate_object or unique_violation then null;
      when others then raise notice 'trusted-payment-expiry cron schedule skipped: %', sqlerrm;
    end;
  end if;
end;
$$;
```

No migration runs `create extension pg_cron`. If the extension is not enabled in
the target project, the job is never scheduled, nothing raises an alarm, and
abandoned orders hold stock forever. For a shop with one-of-a-kind handmade
items, a single stuck reservation can make a product unbuyable indefinitely.

## Current state

- `public.expire_due_payments(limit int)` exists and is idempotent per order.
- `src/launch/gates.ts` already models fail-closed launch gates with a
  `gate(id, label, ready, readyReason, blockedReason)` helper, surfaced by
  `/admin/launch`.
- There is no `vercel.json` cron configuration in the repo.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Drift check | see above | no unexpected in-scope drift |
| DB reset + lint + test | `npm run db:reset && npm run db:lint && npm run db:test` | exit 0 |
| Typecheck / lint | `npm run typecheck && npm run lint` | exit 0 |
| E2E focused | `npx playwright test tests/e2e/launch-critical.spec.ts` | all pass |

## Scope

**In scope**:
- `supabase/migrations/<timestamp>_payment_expiry_job_health.sql` (new)
- `src/app/api/cron/expire-payments/route.ts` (new)
- `src/launch/gates.ts`, `src/launch/settings.ts`
- `src/components/admin/launch/launch-checklist.tsx`
- `vercel.json` (new or extended)
- `src/lib/env/server.ts` (new `CRON_SECRET`)

**Out of scope**:
- Changing expiry semantics or the reservation windows (see plan 013).
- Enabling pg_cron itself — that is a Supabase project setting, documented here
  but not automated.

## Steps

### Step 1: Health function

Create the migration with
`public.get_payment_expiry_job_health()` returning `jsonb`,
`security definer`, admin-only (`private.is_admin()` guard, matching the other
admin RPCs):

```json
{"scheduled": true, "lastRunAt": "...", "lastStatus": "succeeded", "failuresLast24h": 0, "extensionAvailable": true}
```

- When `to_regnamespace('cron') is null` -> `{"extensionAvailable": false, "scheduled": false}`.
- Otherwise read `cron.job` for a row named `trusted-payment-expiry`, and
  `cron.job_run_details` for the most recent run and the 24 hour failure count.
- Wrap the `cron.*` reads in an exception handler; a permissions error must
  degrade to `scheduled: false`, never raise.

**Verify**: `npm run db:reset && npm run db:lint && npm run db:test` -> exit 0.

### Step 2: Launch gate

In `src/launch/gates.ts` add a gate `payment-expiry-job`:

- Ready when `scheduled === true` **or** the HTTP fallback has recorded a
  successful run in the last 10 minutes.
- Blocked reason must be actionable: "Enable the pg_cron extension in the
  Supabase project, or configure the CRON_SECRET fallback".

Surface it in `/admin/launch` through the existing checklist rendering — no new
UI patterns.

**Verify**: `npm run typecheck` -> exit 0.

### Step 3: HTTP fallback route

Create `src/app/api/cron/expire-payments/route.ts`:

1. `export const runtime = 'nodejs'` and `dynamic = 'force-dynamic'`.
2. Require a `CRON_SECRET` bearer header, compared with `timingSafeEqual`
   (never `===`). Missing or wrong secret -> `404`, not `401`, so the endpoint
   is not discoverable.
3. Call `public.expire_due_payments(100)` with the admin client.
4. Record the run so the launch gate can see it: reuse
   `runMonitoredAction` with `shouldRecordResult` and a stable action name, or
   write to a small `system_job_runs` table if the operations schema already has
   a natural home. Prefer reuse over a new table.
5. Return `{status: 'ok', processed}`.

Add `CRON_SECRET` to `src/lib/env/server.ts` as optional, and document it in
`README.md` alongside the other server secrets.

Add to `vercel.json`:

```json
{"crons": [{"path": "/api/cron/expire-payments", "schedule": "* * * * *"}]}
```

Running both pg_cron and the HTTP fallback is safe: `expire_due_payments` is
idempotent and row-locked.

**Verify**: `npm run lint` -> exit 0.

### Step 4: Tests

1. DB test: the health function returns `extensionAvailable: false` cleanly on a
   local instance without pg_cron.
2. Unit test for the route: no secret -> 404; wrong secret -> 404; correct
   secret -> calls the RPC once.
3. Add the new gate to `tests/e2e/launch-critical.spec.ts` assertions.

**Verify**: `npx playwright test tests/e2e/launch-critical.spec.ts` -> all pass.

## Test plan

- `npm run ci`.
- Manual: with pg_cron disabled locally, confirm `/admin/launch` shows the gate
  blocked with the actionable reason, then hit the fallback route with the
  secret and confirm the gate turns ready.

## Done criteria

- [ ] `/admin/launch` shows whether payment expiry is actually running.
- [ ] A shop can run expiry without pg_cron via the authenticated HTTP route.
- [ ] The fallback endpoint is not discoverable without the secret.
- [ ] Running both schedulers cannot double-expire an order.
- [ ] `npm run ci` passes.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- `cron.job_run_details` is not readable by the migration owner and no
  alternative signal exists.
- Recording fallback runs would require a new table that overlaps an existing
  operations table.

## Maintenance notes

- Document in `README.md` that pg_cron must be enabled in the Supabase project,
  with the fallback as the explicit alternative.
- If more scheduled work appears (retention purges, outbox sweeps), generalise
  the health function into a job registry rather than copying it.
