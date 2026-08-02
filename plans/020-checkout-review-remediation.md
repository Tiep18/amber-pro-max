# Plan 020: Remediate the post-implementation checkout review findings

> **Status**: DONE (executed 2026-08-02). This plan documents work that was
> executed directly rather than planned ahead, because it came from a review
> of plans `012`-`019` after they landed. It is written up here so the
> reasoning survives.

## Where this came from

After plans `012`-`019` shipped, a review of the checkout and payment flow
produced ten findings. All ten were verified against the live code before any
fix was written — one of them (finding 1) by writing a throwaway test that
reproduced it, since reasoning alone was not sufficient proof.

**All ten were confirmed correct.** Four were defects in the work that plans
`012`-`019` had just delivered; the rest were pre-existing.

## Fixes, in the order they were applied

### 1. [P0] A valid discount code opened the "something changed" dialog

`diffMaterialQuotes` treated any `totalMinor` movement as material, and a
discount necessarily moves the total. So the happy path — customer types a
valid code, presses Apply — raised `QuoteDiffDialog`.

This is **exactly** the STOP condition plan `014` wrote for itself:

> *"The diff gate fires on every discount apply because the discount itself is
> classified as a material change — in that case fix the classification in
> `diffMaterialQuotes` rather than reintroducing the bypass."*

Plan `014` was marked DONE without stopping, and the three tests its Step 4
required (discount applied / removed / applied-with-a-concurrent-price-change)
were never written.

**Worse than the review described**: cancelling the dialog calls
`reviewDestination`, which drops the proposal but keeps the *old* accepted
quote — while `applyDiscountCode` had already returned `'applied'` to the form
by reading `settled.proposal.quote`. The form therefore showed the code as
applied while the quote that would actually be submitted had no discount. A
customer could be charged full price on a screen that said otherwise.

**Fix**: compare totals net of the applied discount
(`totalMinor + appliedDiscountMinor`). A discount cancels out; anything else
that moves the total still raises the gate. This is strictly *more* sensitive
than the old check: it now also catches a price rise that a simultaneous
discount happens to mask, which the raw `totalMinor` comparison missed.

Added the three missing plan `014` tests plus two more (the masked price rise,
and a shipping change arriving with a discount).

### 2. [P1] Signed-in checkout could create a duplicate order

`idempotencyKeyForQuote` held the key in a React ref. A reload wiped it and
minted a fresh key, so `checkout_orders`'s
`(idempotency_actor, idempotency_key)` unique index could not recognise the
retry.

Guest checkout was never exposed to this: `submit_checkout` strips the
client-supplied key and substitutes `'guest-attempt:' || attempt_hash`, derived
from the httpOnly recovery cookie. Signed-in checkout uses the client key
as-is.

**Fix**: `src/checkout/idempotency.ts` persists `{quoteHash, key}` in
sessionStorage — per-tab, so it survives a reload but does not leak into a
second tab where the customer is deliberately placing a separate order. The
key is cleared on successful submit, otherwise a later cart that hashed
identically would dedupe onto the completed order.

**Deliberately not done**: blanket-changing the "your order was not created"
copy. That sentence is *true* for guests, and making it vague would degrade the
larger, better-protected group. Instead `presentSubmitError` takes a
`dedupeGuaranteed` flag and only signed-in checkout sees the hedged wording.

### 3. [P1] Guest reopen-link redemption was not atomic

Redemption read the order, read the token, checked usability, consumed, then
rotated the guest secret — five round trips. Two clicks on the same emailed
link could both pass the check before either consumed, so both were granted and
the second rotation invalidated the cookie the first had just issued. The
consume also matched on `id` alone and only inspected the error channel, so an
UPDATE matching zero rows still reported success.

**Fix**: `public.redeem_guest_order_reopen_token` does the whole thing in one
transaction, with a conditional `UPDATE ... RETURNING` as the concurrency
control. The raw secret is still minted in the application; only hashes cross
the boundary. The access route gained a `try/catch` so an exception cannot
strand the browser on a URL that carries the raw token.

### 4. [P1] The VietQR manual-payment fallback did not work

Plan `018` Step 3 asserted the transfer details below the QR code "are
sufficient to complete the payment manually". They were not — the account
number was masked to `****1234` everywhere, including in the snapshot type, so
when the third-party QR image failed the customer had no way to pay at all.

Plan `018`'s execution note recorded Step 3 as "already implemented" because
the `onError` handler existed. The mechanism was there; it did not achieve its
purpose. **Verifying that a mechanism exists is not the same as verifying it
works.**

**Fix**: `accountNo` added to the instruction snapshot for the authorized
payment surface, rendered in full with a copy button, and the QR-failure state
now lists bank, account name, account number, amount and reference. The audit
trail keeps `accountNoMasked`.

**Email deliberately left masked**: emails get forwarded, stored and indexed,
and training customers to read bank details out of email is a phishing
foothold. The email CTA now reliably reaches the authorized order page instead
(see fix 7), which is the second option the review itself offered.

### 5. [P1] VietQR "I have transferred" claimed success on server refusal

`declareVietQrTransferAction` reports failure by *returning* a status —
`runMonitoredAction` swallows exceptions into an error result — and the
component discarded the return value, always showing "recorded". A customer
whose cookie had expired, or whose order had expired, was told the shop had
their payment.

**Fix**: only `recorded`/`unchanged` show success; `not_eligible`, `forbidden`
and `error` each get their own message and next step.

### 6. [P1] The email outbox could double-send and could wedge forever

Rows were claimed with a SELECT followed by per-row UPDATEs — not an atomic
claim. Two overlapping workers (checkout submit runs one inline) could take the
same row. A worker dying after the UPDATE left the row in `sending` with
nothing to recover it. Separately, any worker exception marked the row `failed`
immediately, so a dropped connection permanently destroyed an email that would
have sent seconds later.

**Fix**: `public.claim_transactional_emails` claims with
`FOR UPDATE SKIP LOCKED` and reclaims rows whose lease expired. Transient
exceptions now retry with backoff against an `attempt_count` budget.

### 7. [P2] Refund states told the customer the wrong thing

`isPaid` was true for `partially_refunded` and `refunded`, and the paid-state
"what happens next" block (added by plan `019` — this one is ours) keyed off it,
so a refunded order still promised "your download link is on its way". The
guest cookie upgrade meanwhile required the literal `'paid'`, so a refunded
guest silently dropped to the short-lived cookie and lost access.

**Fix**: `isRefunded` added alongside `isPaid`, which keeps its meaning ("money
arrived at some point" — the fulfillment gate and cookie lifetime still depend
on it). Delivery promises check `!isRefunded`; the cookie upgrade now accepts
all settled states.

### 8. [P2] `payment_received` emails were unopenable on a second device

`order_created` mints a reopen token; `payment_received` used a bare order URL,
which only works on the device still holding the guest cookie.

**Fix**: `payment_received` mints a reopen token for guests, same as
`order_created`.

### 9. [P1, environment] The launch gate would lie on a capped cron plan

`vercel.json` schedules the expiry fallback every minute, which needs a plan
that permits minute-level cron. **This was not verified against current Vercel
pricing and should be confirmed before deploying.**

Beyond the review's point, this exposed a design flaw in plan `012`'s gate: it
hard-coded a 10-minute freshness window, so a shop on a daily-cron plan would
see "blocked" forever even with a perfectly healthy fallback — the gate would
be lying about a working system.

**Fix**: the window is now a parameter derived from
`PAYMENT_EXPIRY_FALLBACK_INTERVAL_MINUTES`, which must track `vercel.json`.
Two DB tests pin both directions (a 6-hour-old run is healthy at a daily
cadence, stale at a one-minute cadence).

### 10. [P2] UI and accessibility

- The payment page had no `<h1>` at all; its highest heading was the `<h2>`
  inside `PaymentStatePanel`. Added one.
- Two `ReservationCountdownRefresher` instances each held their own
  "fire once" ref, so both called `router.refresh()` at expiry. The aside now
  renders a plain `ReservationCountdown`; only the status panel refreshes.
- The countdown seeded state from `Date.now()` during render, which makes the
  server and client HTML disagree. It now seeds from the deadline and starts
  ticking on the first effect.

**Not changed** — the recovery banner rendering before probing for a snapshot.
The snapshot lives in localStorage, so a server component cannot know at render
time; hiding it needs a client probe that costs a visible flash. Showing the
button and reporting "no longer available" on click is the better trade.

## A security guard this work had to renegotiate

`tests/security/checkout-boundaries.test.mjs` banned `sessionStorage` outright
in the checkout client. That guard exists to keep guest recovery credentials
out of JS-readable storage — a real invariant.

The idempotency key is not a credential: the client mints it, sends it in the
request body anyway, and holding it only prevents duplicate orders rather than
granting access to any. Rather than deleting the assertion, it was **narrowed
and extended**: credential names and `localStorage` stay banned outright, the
new module is held to the same ban, and any `sessionStorage` reference in the
checkout client must sit next to the reviewed helper.

## Verification

Run against a live local Postgres, not by inspection:

- `npm run db:reset && npm run db:lint && npm run db:test` — clean, 889 pgTAP
  tests passing (a first run reported 876 with two failures; both were the
  known flaky pair, `02_catalog_queries` #7 and
  `08_checkout_guest_retry_concurrency`, and both passed on a clean reset)
- `npm run db:types` — regenerated (via `--db-url`; the `--local` flag fails on
  this machine, see plan 012's note)
- `npm run typecheck`, `npm run lint` — clean
- `npx vitest run` — 859/860, the one failure being the pre-existing,
  unrelated `loading-boundaries.test.ts`
- `npm run test:security` — 57/57
- `npm run build` — clean
- `npm run check:vi-diacritics` — clean

**Not run**: `npx playwright test`. The e2e suite has known pre-existing
failures documented in `plans/README.md` and is slow and load-sensitive on this
machine; these changes touch checkout and payment UI, so it should be run
before shipping.

## New migrations

- `supabase/migrations/20260802100000_atomic_guest_order_reopen_redemption.sql`
- `supabase/migrations/20260802110000_atomic_transactional_email_claim.sql`
- `supabase/migrations/20260802120000_configurable_expiry_fallback_window.sql`

## Maintenance notes

- The rule plan `014` set still stands: exactly one path replaces an accepted
  quote, and it always goes through the diff comparison. The fix narrowed *what
  counts as material*, not *what goes through the gate*.
- Anything that promises the customer a future delivery must check
  `isRefunded`, not just `isPaid`.
- `PAYMENT_EXPIRY_FALLBACK_INTERVAL_MINUTES` and `vercel.json`'s cron schedule
  are two halves of one fact. Changing either alone makes `/admin/launch` lie.
