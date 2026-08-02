# Plan 021: Accept late payments, and stop failing checkout silently

> **Status**: DONE (executed 2026-08-02). Like plan `020`, this documents work
> that came out of a review rather than being planned ahead, and is written up
> so the reasoning survives.

## Where this came from

A second full review of the customer checkout flow — cart through payment,
including the admin side of VietQR reconciliation — after plan `020` landed.
Nine findings, all verified against the live code before any fix was written.

Three shop-owner decisions were taken before the first migration (2026-08-02):

1. **Accept late payments for 7 days** after the hold expires.
2. **Never settle when the stock is gone** — park the order and refund.
3. **Extend the PayPal hold at handoff** rather than from order creation.

## Findings and fixes

### 1. [P0] A late VietQR transfer could never be accepted, by anyone

The single largest hole in the flow, and it pointed straight at the primary
market.

- VietQR orders hold stock for 24 hours; `expire_due_payments` runs every
  minute and flips them to `expired` the moment that lapses.
- The shop reconciles its bank statement the next morning and finds **both the
  Confirm and Reject buttons disabled**: `isVietQrPaymentActionAvailable` and
  `isPendingVietQrAction` both required `deadline > now`.
- Even bypassing the UI, `apply_payment_transition` mapped
  `expired → paid` to `review_required`, never to `paid`.

The money is in the shop's bank account, the order can never be fulfilled in
the product, and `admin-entitlement-actions.ts` has only `revoke`/`reissue` —
there is no "grant entitlement for an unpaid order" escape hatch. The only
outcomes were a manual refund or direct DB surgery. A shop owner taking a
weekend off would hit this on *every* VietQR order placed in that window.

### 2. [P0] `review_required` was a permanent dead end

Same root cause, wider blast radius. From `review_required`, a `paid` attempt
matched neither the `('failed','cancelled','rejected','expired')` branch (the
list omits `review_required`) nor anything below it — it fell through to
`target = 'paid' and pending_deadline_at <= now`, which produces
`review_required` again. No source could ever move it out.

For PayPal this is the *normal* destination of a capture that lands after the
hold expires. Real money, order stuck forever, and the customer sees an
open-ended "we are reviewing your payment" with no deadline.

**Fix** (`20260802170000_late_payment_settlement.sql`): one late-settlement
branch replaces both dead ends.

- `public.late_settlement_window()` — 7 days, named rather than a literal, in
  sync with `LATE_SETTLEMENT_WINDOW_DAYS`.
- Only sources carrying evidence that money moved may settle late:
  `vietqr_admin` (a human with a bank statement, still subject to the existing
  reference/amount evidence check) and `paypal_webhook` / `paypal_recheck`
  (PayPal itself). `reservation_expiry_job` and `system` cannot — they park the
  order as before.
- `private.finalize_late_settlement_inventory` re-checks stock under lock in
  two passes (verify all, then apply all) so an insufficient record leaves the
  order untouched rather than half-decremented. It returns `reserved` when the
  order still has active reservations, so the normal reservation-backed path
  keeps ownership of that case and stock is never decremented twice.
- Out of stock → `review_required` with `late_payment_out_of_stock`; past the
  window → `late_payment_window_elapsed`. Both are visible to the admin.
- Settling clears `review_reason`, so an order rescued out of review does not
  keep claiming it is under review.

`isVietQrPaymentActionAvailable` is now `resolveVietQrActionWindow`, which also
reports *whether* the action would be a late settlement so the admin form can
say so before the click. `rejected` is deliberately **not** in the late-eligible
set: reversing an explicit admin rejection is a different decision from
accepting a transfer that merely arrived late.

### 3. [P1] The admin was told a successful action had failed

`mapConfirmResult` handled `applied`, `duplicate` and `stale` — everything else
became `{status: 'error', code: 'vietqr_action_failed'}`. So the moment the DB
started returning `review_required` (which it did for every late confirm), the
admin would see a generic failure while the order had in fact moved to the
review queue, and an operational **error** would be recorded for it.

**Fix**: `review_required` is a first-class result with its own copy per code,
recorded at `warning` severity, not `error`.

### 4. [P1] PayPal capture failures were invisible to the buyer

`onApprove` had no `try/catch` around the capture `fetch`, and every non-`paid`
answer only called `logPayPalStage(...)` before `router.refresh()`. The buyer
approved the payment, came back, and the page silently re-rendered as
**"awaiting payment"** with the same PayPal button. Nothing said whether their
money had moved. The `verifying_payment` copy that seems to cover this is dead
for PayPal: `verifying` is intentionally not a valid transition target.

**Fix**: `resolveCaptureOutcome` in `src/payments/paypal-capture-outcome.ts`
maps every answer to something the buyer can read — including the case that
matters most, an unreachable capture, where the honest advice is "do not pay
again, check the order first". It lives outside the component because this
repo's Vitest has no jsdom (same reasoning as `reservation-countdown-model.ts`),
so a decision made inside `onApprove` would otherwise be untestable.

### 5. [P1] The 25-minute hold could cut the buyer off mid-PayPal

The hold is counted from order creation, but the capture route refuses any
order past its deadline. A buyer who reads the payment page for twenty minutes
and then opens PayPal gets a 404 on capture — combined with finding 4, silently.

**Fix** (`20260802180000_extend_paypal_reservation_on_handoff.sql`):
`public.extend_paypal_reservation` pushes the deadline to at least 10 minutes
from the handoff, capped at 2 hours from order creation so reopening the button
in a loop cannot hold stock indefinitely. It moves `reservation_expires_at`,
`payments.pending_deadline_at` **and** the active reservations' `expires_at`
together — availability is computed from `expires_at > now()`, so missing the
third would have released the stock the buyer is paying for. It refuses
anything that is not an open PayPal payment.

### 6. [P1] Checkout could dead-end with nothing on screen

`lifecycle.issue` was rendered only inside `DestinationForm`, which is not
mounted for a digital-only cart (`physicalCount === 0`) or while a saved
address is collapsed. A failed requote — including the one `submit()` runs
before every submission — set the issue, disabled the button via
`actionDisabled`, and returned silently. For a PDF-only cart `submitIssues` is
empty too, so there was **literally no feedback**; only a reload recovered. For
a physical cart with a collapsed address the message shown was *wrong*
("complete the delivery address" when the address was fine).

**Fix**: a page-level alert with a retry that re-runs the quote.

### 7. [P2] Errors landed off-screen on mobile

The submit button is in a sticky bottom dock; the error alert renders in the
left column. `stale_commercial_quote` and `checkout_submit_failed` carry no
`focusTarget`, so nothing scrolled — the customer tapped and saw no change.

**Fix**: scroll and focus the feedback region, but only when the error does not
point at a field (focusing that field already scrolls to it, and stealing focus
would undo the more useful move).

### 8. [P2] The mobile dock gave no reason when the quote was blocked

`quote.status === 'blocked'` was never in `submitIssues`, and the dock only
showed those after a submit attempt. Disabled button, no explanation.

### 9. [P2] Signed-in customers were over-warned about duplicate orders

`presentSubmitError` hardcoded `dedupeGuaranteed: !isSignedIn`, so signed-in
customers always got "we could not confirm whether your order went through"
— even though plan `020` had made the idempotency key survive a reload, which
*does* guarantee dedupe. The warning is only true when storage is blocked.

**Fix**: `resolveIdempotencyKey` reports whether the key was actually
persisted, and the copy follows that instead of the sign-in state.

## Also fixed in passing

- **The whole cart page shipped in unaccented Vietnamese** (`Gio hang`,
  `Tien hanh thanh toan`, …) while neighbouring keys in the same object had
  full diacritics. `check-vi-diacritics.mjs` only scanned `src/messages/vi.json`
  — and checkout-flow components deliberately carry their own per-locale `copy`
  dictionaries (plans `017`, `019`), so the guard could never have caught it.
  The guard now scans those component directories too, which immediately found
  two more (`account-order-history`, `pattern-library-card`). Also fixed:
  `approved-exception-page`, `exception-request-form`, `guest-reopen-form`,
  `order-claim-panel`, `pattern-library`.
- `PAYMENT_EXPIRY_FALLBACK_INTERVAL_MINUTES` documented itself as needing to
  match `crons[].schedule` in `vercel.json`, a file that does not exist —
  scheduling moved to Supabase pg_cron in commit `7b50170`.

## Follow-up review of this plan's own work

A review of the fixes above found five more, all reproduced with SQL probes
against live Postgres before anything was changed. Three were defects **this
plan introduced or left half-finished**.

### F1. [P0] `status = 'active'` is not the same as "still holding stock"

`finalize_late_settlement_inventory` returned `reserved` — handing the order to
the unchecked reservation path — for any reservation row marked `active`. But
the expiry job only runs once a minute and can be down for far longer, and
`checkout_available_inventory` filters on `expires_at > now()`. So between the
deadline and that run, the units are already being sold to other buyers while
the row still says `active`.

Probe: `status=active`, `expired_by_time=true`, `available=4` to a new buyer,
classifier says `reserved`. A late settlement in that window would skip the
availability check and take stock a newer order had bought.

**Fix**: `reserved` now requires that *no* active reservation has lapsed.
Reservations for one order always share a deadline, so the normal on-time case
is unchanged; anything else takes the checked path.

### F2. [P0] `review_required` was still terminal for PayPal

The state machine was fixed, but not the way back into it. PayPal reuses one
capture id for **both** `transitionKey` and `providerEventId`, so replaying it
short-circuits as `duplicate_payment_transition` / `duplicate_payment_event`
long before stock is re-checked. The capture route refuses orders past their
deadline, and there was no admin action for PayPal at all. Probe confirmed:
`review_required → restock → duplicate → review_required`.

VietQR escaped this only because its admin can confirm again with a fresh
idempotency key — which is why the original pgTAP test passed while the real
hole stayed open.

**Fix**: a new `admin_review_resolution` source that re-runs *only* the stock
check, against money the shop already accepted evidence for. It is rejected
unless the payment is `review_required` with reason `late_payment_out_of_stock`,
and rejected outright if it carries a `providerEventId` — it can never assert
that a payment arrived. Exposed as a "Recheck stock and settle" panel on the
admin order page, so it works for both providers.

### F3. [P1] "No money has been taken" was said when we did not know

`resolveCaptureOutcome` mapped the capture route's `202 {status:'verifying'}`
to `capture_failed`, whose copy promises the buyer they were not charged. That
response is returned precisely when the capture request **timed out** and
whether PayPal moved the money is unknown. The copy invited a second payment.

**Fix**: a separate `capture_uncertain` outcome — "we could not confirm; do not
pay again; check the order status". The test that asserted the old mapping was
wrong and has been corrected.

### F4. [P1] Reject was offered on lapsed orders but always answered `stale`

`resolveVietQrActionWindow` opened both decisions in the late window, but the
state machine only treats `paid` as late-settleable; a late `rejected` falls to
the terminal branch. Probe confirmed `stale`.

**Fix**: rejection is only offered inside the original hold. There is nothing
to reject afterwards — the order is already expired, its stock released and the
customer already told. `isVietQrPaymentActionAvailable` now takes the action.

### F5. [P2] The diacritics guard did not see the shapes components use

It scanned single-line quoted literals only, so it missed JSX text
(`<p>Gio hang</p>`) and template literals carrying an interpolation
(`` `Dang cap nhat ${market}` ``) — the two shapes a React component reaches
for most. Concatenated multi-line strings *were* caught.

**Fix**: whole-file scan covering JSX text and templates, with `${…}` stripped
so interpolations neither hide nor invent words. Verified against a probe
component containing all three shapes: 0 hits before, 4 after. It stays a regex
heuristic rather than a TypeScript AST rule — noted in the script, with the
condition for promoting it.

## Deliberately not done

- **Anchoring the market for digital-only orders.** `refreshCheckoutQuoteAction`
  derives the market from the shipping destination only when there is one, so a
  PDF-only order takes whatever `market` the client sends. Combined with the
  user-switchable `ACTIVE_MARKET` cookie this lets anyone buy PDFs at VN prices.
  Since the storefront ships a market switcher, this is a pricing-policy
  decision, not a defect — flagged for the shop owner rather than changed.
- **Reopening a rejected VietQR payment.** See finding 2.

## Verification

Against live local Postgres: `db:reset`, `db:lint` (clean), `db:test`
(**942/942, "All tests successful"**), `db:types` (regenerated). Then
`typecheck`, `lint`, `check:vi-diacritics`, `vitest run` (**878/878 — the
previously known `loading-boundaries.test.ts` failure is gone**),
`test:security` (58/58), `build` (clean).

The five follow-up findings were each reproduced with a SQL probe **before**
being fixed, and the probes re-run afterwards. F1's classifier went
`reserved → finalized` on the checked path; F2's stuck PayPal order went
`review_required → applied → paid` through the new source. F4 still answers
`stale` at the DB level by design — the fix is that the button is no longer
offered.

**`npx playwright test` was not run.** It should be, since this touches
checkout, payment and admin UI.

### A false alarm worth recording

A mid-work `db:test` reported failures in `02_catalog_queries` and
`08_checkout_guest_retry_concurrency` — two files this work does not touch.
They were **contamination from an earlier aborted run of the new test file**,
not regressions: a fresh `db:reset` followed by the full suite passed
completely. Re-run `db:reset` before trusting a `db:test` failure that appears
in an unrelated file.

## New migrations

- `supabase/migrations/20260802170000_late_payment_settlement.sql`
- `supabase/migrations/20260802180000_extend_paypal_reservation_on_handoff.sql`

## New tests

- `supabase/tests/database/04_late_payment_settlement.test.sql` (26 assertions)
  covers: settling in stock, blocking out of stock without driving stock
  negative, `review_required` recovering once the blocker clears, the 7-day
  boundary, sources without evidence being refused, and the PayPal extension
  moving all three deadlines together.
- `resolveVietQrActionWindow` and the review-result mapping in
  `tests/unit/payments/vietqr.test.ts`.
- `resolveCaptureOutcome` in `tests/unit/payments/paypal-buttons.test.ts`.
- Idempotency durability reporting in `tests/unit/checkout/idempotency.test.ts`.
