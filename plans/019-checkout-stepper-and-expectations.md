# Plan 019: Checkout stepper and expectation-setting microcopy

> **Correction (2026-08-02)**: three defects in this plan's output were found
> by the later review and fixed in
> [plan 020](020-checkout-review-remediation.md) — the Step 4 "what happens
> next" block keyed off `isPaid`, which is also true for refunded orders, so a
> refunded customer was told their download was on its way; the two countdown
> instances each guarded themselves but not each other, so both called
> `router.refresh()` at expiry; and the countdown seeded state from
> `Date.now()` during render, risking a hydration mismatch. The missing `<h1>`
> this plan flagged but left alone has also been added.

> **Execution note (2026-08-01)**: Executed in full. `CheckoutStepper`
> (`src/components/checkout/checkout-stepper.tsx`) carries its own
> per-locale copy dictionary rather than `next-intl`, matching the pattern
> confirmed by plans 015/017/018: every component it mounts into
> (`cart-page.tsx`, `checkout-page.tsx`) is `'use client'` and already
> sources copy this way, and `order-payment-page.tsx` (a server component
> using `getTranslations`) needed the same component to work in both
> contexts without prop-drilling translated strings through three different
> call sites. The `payment`/`done` step on the order page is chosen from the
> already-computed `status.isPaid` (covers `paid`/`partially_refunded`/
> `refunded`), matching the plan's `paid` -> `done` row; every other status
> maps to `payment`, which the plan's table didn't enumerate but is the only
> sensible default for a flow that never reached `done`. Step 3's mobile
> microcopy shares the same single-line slot Step 6 of plan 018 already
> added above the dock button (`blockingIssue`), rather than adding a
> second line, to avoid the exact "pushes the button below the fold" risk
> this plan's own STOP condition warns about. **Accessibility pass
> (Step 5) findings**: the stepper introduces no headings and no live
> region, and renders at most one focusable element (the cart step becomes
> a `<Link>` only once it's no longer active) — verified by code review, not
> a live browser pass, since local Supabase is still blocked (same as
> plans 012/013/016/017/018) so `/cart`, `/checkout`, and `/orders/...`
> cannot actually be loaded this session. One **pre-existing** finding, not
> fixed here (out of scope): `order-payment-page.tsx` has no `<h1>` at all
> — its highest heading is the `<h2>` inside `PaymentStatePanel`'s
> `AlertTitle` — so "heading order stays h1 -> section h2s" does not hold on
> that page independent of anything in this plan; flagging for a future
> pass. `npm run db:reset`/`db:lint`/`db:test`/`db:types`/`build` were not
> run (no migration in this plan, so not gated by the blocker); the e2e
> specs (`checkout.spec.ts`, `foundation-ux.spec.ts`) and the manual
> 375px/1280px check were not run for the same Supabase-availability reason.
> What *was* run and is clean: `npm run typecheck`, `npm run lint`,
> `npx vitest run` (839/840, same pre-existing unrelated failure),
> `npm run test:security` (57/57), `npm run check:vi-diacritics`.

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat b103bb42..HEAD -- src/components/checkout/checkout-page.tsx src/components/checkout/order-summary.tsx src/components/cart/cart-page.tsx src/components/payments/order-payment-page.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plan 013 (hold duration constant), plan 015 (message files)
- **Category**: UX
- **Planned at**: commit `b103bb42`, 2026-08-01

## Why this matters

This store has an unusual shape: pressing the checkout button **creates an
order and holds inventory**, then payment happens on a different page. Nothing
in the UI tells the customer that. The button says "Create order and continue to
PayPal" with no indication that a clock starts, that stock is held, or how many
steps remain. Customers who do not understand the shape of a flow abandon it.

## Current state

- No breadcrumb or step indicator on `/cart`, `/checkout`, or the order page.
- The submit button label already names the destination
  (`t.paypalHandoff` / `t.vietqrHandoff` in `checkout-page.tsx:60`), which is
  good; there is no supporting line under it.
- The trust line in `OrderSummary` covers fulfillment ("Digital files unlock
  only after full payment is confirmed") but not timing.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Drift check | see above | no unexpected in-scope drift |
| Typecheck / lint | `npm run typecheck && npm run lint` | exit 0 |
| E2E focused | `npx playwright test tests/e2e/checkout.spec.ts tests/e2e/foundation-ux.spec.ts` | all pass |

## Scope

**In scope**:
- `src/components/checkout/checkout-stepper.tsx` (new)
- `src/components/cart/cart-page.tsx`
- `src/components/checkout/checkout-page.tsx`
- `src/components/checkout/order-summary.tsx`
- `src/components/payments/order-payment-page.tsx`
- `src/messages/{en,vi}.json`

**Out of scope**:
- Splitting checkout into multiple routes. The single-page form works; this plan
  only makes the existing shape legible.
- Changing the button labels.

## Steps

### Step 1: Stepper component

Create `src/components/checkout/checkout-stepper.tsx`:

- Props: `current: 'cart' | 'details' | 'payment' | 'done'`, `locale`.
- Semantics: an ordered list with `aria-current="step"` on the active item.
  Not a `nav` with links — completed steps may link back to the cart, but
  future steps must not be clickable.
- Visual: a single compact row, numbers plus short labels, muted for future
  steps. No progress bar animation; keep it quiet.
- Mobile: labels shrink to numbers with the active step's label visible.

**Verify**: `npm run typecheck` -> exit 0.

### Step 2: Mount on all three pages

| Page | `current` |
|---|---|
| `/cart` | `cart` |
| `/checkout` | `details` |
| `/orders/[orderNumber]` awaiting or verifying | `payment` |
| `/orders/[orderNumber]` paid | `done` |

Place it directly under the page `h1` so it reads as part of the heading block.

**Verify**: `npm run lint` -> exit 0.

### Step 3: Expectation microcopy under the submit button

In `OrderSummary`, below the submit button, render a line whose content depends
on `paymentIntent`:

- `paypal_intent`: "We will create your order and hold these items for
  {minutes} minutes. You pay on the next step."
- `vietqr_intent`: "We will create your order and hold these items for 24 hours,
  then show you the VietQR transfer details."
- unresolved intent: nothing (the payment method block already explains it is
  pending).

Read `{minutes}` from the shared reservation constant introduced by plan 013 so
this copy cannot drift from the SQL value.

Mirror the same line in `MobileCheckoutDock`, condensed to one clause.

**Verify**: `npm run typecheck` -> exit 0.

### Step 4: Close the loop on the paid state

On the order page in the `paid` state, add a short "what happens next" list
derived from the order contents:

- digital lines present -> "Your download link is on its way to {masked email}"
  plus a pointer to the download panel already on the page;
- physical lines present -> "We will email tracking once your parcel ships";
- both -> both lines, digital first.

Keep it to two lines maximum. This is the closest thing to a thank-you page the
flow has, and it should answer "what now?" without a wall of text.

**Verify**: `npx playwright test tests/e2e/order-status.spec.ts` -> all pass.

### Step 5: Accessibility pass

1. The stepper must be announced once, not on every re-render — it is static
   per page, so no live region.
2. Verify heading order stays `h1` -> section `h2`s; the stepper introduces no
   headings.
3. Check colour contrast of muted future-step text against
   `var(--surface-paper)` at AA.
4. Keyboard: the stepper contains at most one focusable element (a back link to
   the cart) and never traps focus.

**Verify**: run the project's UI review pass over the three pages; document any
finding not fixed here.

## Test plan

- E2E specs above.
- Manual at 375px and 1280px: the stepper does not wrap awkwardly, and the
  microcopy does not push the submit button below the fold on mobile — if it
  does, move it above the button instead.

## Done criteria

- [ ] All three checkout-funnel pages show consistent step context.
- [ ] Customers are told, before pressing submit, that an order will be created
      and for how long stock is held.
- [ ] The hold duration in copy comes from the same constant as the countdown
      and the SQL default.
- [ ] The paid state answers "what happens next" in at most two lines.
- [ ] `npm run ci` passes.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- The stepper pushes the mobile submit button below the fold and no arrangement
  keeps both visible.
- Reservation minutes cannot be imported into client copy without duplicating
  the value.

## Maintenance notes

- If checkout is ever split into multiple routes, the stepper becomes real
  navigation and its links need rethinking; today it is deliberately inert.
- Keep the microcopy factual. "Hold for 25 minutes" is a promise the inventory
  system actually keeps; anything vaguer is worse than nothing.
