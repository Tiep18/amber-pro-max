# Plan 013: Widen the PayPal reservation window and show a live countdown

> **Execution note (2026-08-01)**: Shop owner approved 25 minutes for
> `paypal_intent` before Step 1 started. Executed in full at the code level.
> The drift check found non-conflicting additive changes to
> `order-payment-page.tsx` and `payment-state-panel.tsx` from plans 008-011
> (cart recovery, guest session sync, VietQR declaration) — the specific
> "Current state" excerpts this plan depends on (`deadlineValue` rendered as
> static text, `mapCustomerPaymentStatus` deriving `expired` from
> `reservationExpiresAt`) were unchanged, so this was not treated as a STOP
> condition. The countdown's rendering/urgency/aria-live logic was extracted
> into a pure `src/payments/reservation-countdown-model.ts` module (beyond
> what the plan text described) because this repo's Vitest config runs under
> Node with no jsdom/`@testing-library/react` — there is no way to mount and
> tick a React component in this test suite, so the timing state machine had
> to be framework-free to be unit-testable per Step 5. The countdown mounts
> via a small client wrapper, `reservation-countdown-refresher.tsx`, that
> also holds the `router.refresh()` debounce/background-tab guard from Step
> 3 (fires at most once; if the tab is backgrounded at expiry, it waits for
> `visibilitychange` before refreshing). Step 4's shared constant lives in
> `src/payments/reservation.ts`. **`npm run db:reset`, `db:lint`, `db:test`,
> `db:types`, `build`, and the manual test plan (opening a real PayPal order
> and watching the countdown live) were not run this pass** — same local
> Supabase/Docker port-exclusion blocker recorded in plan 012's execution
> note (Windows excludes TCP 55430-55529; `supabase/config.toml` uses
> 55431-55439). What *was* run and is clean: `npm run typecheck`,
> `npm run lint`, `npx vitest run` (828/829, same one pre-existing unrelated
> `loading-boundaries.test.ts` failure noted throughout this session),
> `npm run check:vi-diacritics`. The DB test in
> `supabase/tests/database/03_checkout_model.test.sql` was updated to assert
> 25 minutes but has not been run against a live Postgres instance.

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat b103bb42..HEAD -- supabase/migrations/20260615032000_checkout_orders_reservations.sql src/components/payments/payment-state-panel.tsx src/components/payments/order-payment-page.tsx src/payments/format.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED (inventory holding time is a business trade-off)
- **Depends on**: none
- **Category**: conversion / UX
- **Planned at**: commit `b103bb42`, 2026-08-01

## Why this matters

```sql
-- supabase/migrations/20260615032000_checkout_orders_reservations.sql:79
if p_payment_intent = 'paypal_intent' then return p_now + interval '15 minutes'; end if;
if p_payment_intent = 'vietqr_intent' then return p_now + interval '24 hours'; end if;
```

Fifteen minutes covers a smooth PayPal login. It does not cover a first-time
buyer who has to log in, pass 2FA, add a card, and re-authenticate — a very
normal path for an international customer buying from a small shop. And the
deadline is presented as a static timestamp, so nobody realises a clock is
running until the order has already failed.

## Business decision required before Step 1

Raising the window increases how long stock is held for an unpaid order.
For one-of-a-kind handmade items, a longer hold means a real customer can be
told "out of stock" while an abandoned order sits on it. **The shop owner must
approve the new value.** Recommendation: **25 minutes** for `paypal_intent`,
VietQR unchanged at 24 hours.

Do not start this plan without that approval recorded in the PR description.

## Current state

- `public.checkout_reservation_expires_at(p_payment_intent, p_now)` is the only
  place the windows are defined; both the order row and the guest cookie derive
  from it.
- `PaymentStatePanel` renders `deadlineValue` as formatted static text
  (`src/components/payments/payment-state-panel.tsx:61`).
- `src/payments/format.ts` already owns payment date formatting.
- `mapCustomerPaymentStatus` derives `expired` from
  `reservationExpiresAt <= Date.now()`, so a client that stays open past the
  deadline shows a stale status until it refetches.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Drift check | see above | no unexpected in-scope drift |
| DB reset + lint + test | `npm run db:reset && npm run db:lint && npm run db:test` | exit 0 |
| Typecheck / lint | `npm run typecheck && npm run lint` | exit 0 |
| Unit | `npx vitest run tests/unit/payments` | all pass |

## Scope

**In scope**:
- `supabase/migrations/<timestamp>_widen_paypal_reservation_window.sql` (new)
- `src/components/payments/reservation-countdown.tsx` (new)
- `src/components/payments/payment-state-panel.tsx`
- `src/components/payments/order-payment-page.tsx`
- `src/messages/{en,vi}.json`
- `tests/unit/payments/reservation-countdown.test.ts` (new)

**Out of scope**:
- Extending a reservation in place (a "give me more time" button) — that
  changes inventory semantics and needs its own plan.
- The VietQR window.

## Steps

### Step 1: Migration

`create or replace function public.checkout_reservation_expires_at` with
`interval '25 minutes'` for `paypal_intent`. Keep the signature, volatility
(`stable`), `search_path`, and the `raise exception` for unknown intents
unchanged.

Existing orders keep their original deadline — the function is only consulted at
insert time. Note that in the migration comment.

**Verify**: `npm run db:reset && npm run db:lint && npm run db:test` -> exit 0.
Confirm any DB test asserting 15 minutes is updated in the same change.

### Step 2: Countdown component

Create `src/components/payments/reservation-countdown.tsx` (client):

- Props: `expiresAt: string`, `labels: {remaining: string; expired: string}`,
  `onExpire?: () => void`.
- Tick every **1 second** internally for accuracy but only re-render the
  displayed string when the minute changes above 1 minute remaining; below
  1 minute, show seconds.
- `aria-live="polite"` on a wrapper that updates **at most once per minute** —
  a per-second live region is unusable with a screen reader. Below one minute,
  stop updating the live region entirely and rely on the visible text.
- Respect `prefers-reduced-motion`: no pulsing or animated urgency, only a
  colour change to `var(--warning)` under 5 minutes and `var(--destructive)`
  under 1 minute.
- On reaching zero, render the expired label and call `onExpire`.
- Guard against an unparsable or past `expiresAt` by rendering the expired state
  immediately.

**Verify**: `npm run typecheck` -> exit 0.

### Step 3: Mount it

1. In `PaymentStatePanel`, when the status is `awaiting_payment` or
   `verifying_payment` and a deadline exists, render the countdown next to the
   existing static deadline line (keep the absolute timestamp — customers in
   different timezones need it).
2. Pass `onExpire={() => router.refresh()}` from a small client wrapper so the
   page picks up the real server-side `expired` status instead of guessing.
   Debounce so a background tab does not hammer the server.
3. Also show it in the right-hand summary card of `OrderPaymentPage`.

**Verify**: `npm run lint` -> exit 0.

### Step 4: Checkout-side expectation

In the checkout submit microcopy (delivered by plan 019), state the hold
duration explicitly. Keep the number in one place: export it from a shared
constant module so the copy, the countdown warning thresholds and the docs
cannot drift from the SQL value. Add a comment in the migration pointing at that
constant.

**Verify**: `npm run typecheck` -> exit 0.

### Step 5: Tests

1. Unit: countdown renders minutes then seconds, hits the expired state, calls
   `onExpire` once, handles an invalid date, and does not update the live region
   more than once per minute.
2. DB test: a new PayPal order gets a deadline 25 minutes out; VietQR still 24
   hours.

**Verify**: `npx vitest run tests/unit/payments` -> all pass.

## Test plan

- `npm run ci`.
- Manual: open a PayPal order, watch the countdown cross the 5 minute and
  1 minute thresholds, let it hit zero, and confirm the page refreshes into the
  expired state with the cart-recovery banner from plan 008.

## Done criteria

- [ ] Shop owner approval for the new window is recorded in the PR.
- [ ] PayPal orders hold for 25 minutes; VietQR unchanged.
- [ ] Customers see a live countdown plus the absolute deadline.
- [ ] Reaching zero transitions the page to the real server status.
- [ ] The window value is defined in one place and referenced everywhere else.
- [ ] `npm run ci` passes.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- The shop owner has not approved a longer inventory hold.
- Any DB test or fixture depends on the 15 minute value in a way that cannot be
  updated in the same change.
- The countdown causes refresh loops in a background tab.

## Maintenance notes

- Watch the rate of `expired` orders before and after; if it does not drop,
  the window was not the constraint and the change should be reconsidered rather
  than extended further.
- A "extend my reservation" button is the natural follow-up, but it must
  re-check inventory before granting more time.
