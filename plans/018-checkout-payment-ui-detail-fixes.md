# Plan 018: Checkout and payment UI detail fixes

> **Correction (2026-08-02)**: the execution note below records Step 3 as
> "already implemented" because the `onError` handler existed. The handler did
> exist — but the fallback it showed was unusable, because the account number
> was masked everywhere, so a QR outage left the customer with no way to pay.
> The plan's premise ("the transfer details below ... are sufficient to
> complete the payment manually") was simply false, and was accepted without
> checking. Confirming a mechanism exists is not confirming it works. Fixed in
> [plan 020](020-checkout-review-remediation.md).

> **Execution note (2026-08-01)**: Steps 1-6 executed; steps 7-8 skipped per
> shop owner decision (2026-08-01) — no blocking policy checkbox, no
> customer order note field. Findings while executing:
> - **Steps 1 and 3 were already implemented** in the live code before this
>   pass started (found during the drift check): the amount copy button
>   already used `amountMinor` directly, and the QR `<img>` already had an
>   `onError` fallback plus `referrerPolicy="no-referrer"`. No changes were
>   needed for either.
> - **Step 2** had the `try/catch` already in place (no unhandled
>   rejection) but was missing the plan's "select the text node so the
>   customer can copy manually" and the failure message — both added, using
>   refs on the amount/reference display nodes and a new `copyFailed` label.
> - Steps 4-6 executed as described: `OrderSummary` takes a new `pending`
>   prop (wired to the same `lifecycle.activeRequestId !== null` check
>   `discountPending` already used) that skeletons the shipping and total
>   rows; `focusFirstIncompleteField` now also handles
>   `unsupported_destination`; `MobileCheckoutDock` takes a new
>   `blockingIssue` prop showing the first `submitIssues` entry above the
>   button once a submit has been attempted.
> **`npm run db:reset`/`db:lint`/`db:test`/`db:types`/`build` were not run
> this pass** (no migration in the executed steps, so this plan is not
> actually gated by the environment blocker recorded in plans
> 012/013/016/017's execution notes — only `npx playwright test
> tests/e2e/checkout.spec.ts` and the manual QR-image-blocked / 375px checks
> were skipped). What *was* run and is clean: `npm run typecheck`,
> `npm run lint`, `npx vitest run` (839/840, same pre-existing unrelated
> failure), `npm run test:security` (57/57), `npm run check:vi-diacritics`.

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat b103bb42..HEAD -- src/components/payments/vietqr-instructions.tsx src/components/checkout/order-summary.tsx src/components/checkout/checkout-page.tsx src/payments/vietqr/instructions.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW, except the order-note item which touches the DB
- **Depends on**: plan 015 for copy placement
- **Category**: UX polish / robustness
- **Planned at**: commit `b103bb42`, 2026-08-01

## Why this matters

A set of independent small defects, each cheap to fix, that together make the
payment step feel unreliable. They are grouped into one plan because they share
files, but each step is independently shippable.

## Steps

### Step 1: Copy the amount from `amountMinor`, not from formatted text

```tsx
// src/components/payments/vietqr-instructions.tsx:83
onClick={() => copyValue(amountLabel.replace(/[^\d]/g, ''), 'amount')}
```

Stripping non-digits from an already-formatted string is correct for VND today
purely by accident of formatting. Add an `amountMinor: number` prop and copy
`String(amountMinor)` — VietQR expects the integer VND amount. Pass it from
`OrderPaymentPage`, which already has `result.order.amountMinor`.

**Verify**: `npm run typecheck` -> exit 0.

### Step 2: Make clipboard copying fail gracefully

```tsx
// src/components/payments/vietqr-instructions.tsx:56
async function copyValue(value: string, target) {
  await navigator.clipboard.writeText(value);   // unhandled rejection
  ...
}
```

`navigator.clipboard` is undefined on insecure origins and rejects when the
permission is denied. Wrap in `try/catch`; on failure, select the text node so
the customer can copy manually and show a short "copy failed, select and copy"
message in the existing `aria-live` region. Never leave the button silently
dead.

**Verify**: `npm run lint` -> exit 0.

### Step 3: Handle a failed QR image

The `<img>` at `vietqr-instructions.tsx:98` has an `onLoad` handler but no
`onError`. If the external QR service is slow or down, the customer stares at
"loading" forever. Add `onError` state that replaces the QR frame with a short
notice pointing at the transfer details already listed below, which are
sufficient to complete the payment manually.

Also add `referrerPolicy="no-referrer"` on the image — the order number is part
of the QR request and should not leak in a referrer header.

**Verify**: manual check with the network blocked for that host.

### Step 4: Skeleton the shipping row while requoting

`OrderSummary` shows the previous shipping amount while a new quote is in
flight, which looks like the price is not updating. Accept a `pending: boolean`
prop (the page already knows `lifecycle.activeRequestId !== null`) and render a
pulse placeholder in the shipping row and the total, matching the pattern
already used in `cart-page.tsx`.

**Verify**: `npm run lint` -> exit 0.

### Step 5: Focus the right thing on an unsupported destination

`focusFirstIncompleteField` (`checkout-page.tsx:414`) handles missing email and
missing address fields but not `unsupported_destination`. Add a branch that
scrolls the destination section into view and focuses the country trigger, so
the submit attempt does not appear to do nothing.

**Verify**: `npx playwright test tests/e2e/checkout.spec.ts` -> all pass.

### Step 6: Explain the disabled state in the mobile dock

`MobileCheckoutDock` renders a disabled button with no reason; the reason list
lives in `OrderSummary`, off-screen below. Pass the first entry of
`submitIssues` and render it above the button in small text when the button is
disabled and a submit has been attempted.

**Verify**: manual check at 375px width.

### Step 7: Policy acknowledgement

Checkout links to policies but records no acknowledgement.

1. Migration: `alter table public.checkout_orders add column policies_acknowledged_at timestamptz;`
2. Add a required checkbox to the checkout form, wired into `readyToSubmit` and
   `submitIssues`.
3. Pass an acknowledgement flag through `submitCheckoutInputSchema` and set the
   column in `submit_checkout_legacy_v1`. Do **not** trust a browser-supplied
   timestamp — set it with `now()` server-side; the payload carries only the
   boolean.

Confirm with the shop owner whether this is wanted before shipping; some VN
storefronts prefer an implicit notice line over a blocking checkbox.

**Verify**: `npm run db:reset && npm run db:lint && npm run db:test` -> exit 0,
then `npm run db:types`.

### Step 8: Customer order note

1. Migration: `alter table public.checkout_orders add column customer_note text
   check (customer_note is null or length(customer_note) <= 500);`
2. Optional textarea on checkout, 500 char limit shown as a live counter.
3. Thread through `submitCheckoutInputSchema` -> `submit_checkout` -> persisted
   column. Trim and reject control characters server-side.
4. Render it in the admin order detail so it is actually seen while packing.
5. The note must never influence pricing, shipping or fulfillment logic — it is
   inert text.

**Verify**: `npm run db:test` and `npx playwright test tests/e2e/admin-orders.spec.ts` -> all pass.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck / lint | `npm run typecheck && npm run lint` | exit 0 |
| DB (steps 7-8 only) | `npm run db:reset && npm run db:lint && npm run db:test && npm run db:types` | exit 0 |
| E2E focused | `npx playwright test tests/e2e/checkout.spec.ts tests/e2e/admin-orders.spec.ts` | all pass |

## Scope

**In scope**: the files named in each step, plus `src/messages/{en,vi}.json`,
plus migrations and regenerated types for steps 7-8.

**Out of scope**: hosting the QR image locally; redesigning the VietQR card;
any change to shipping or discount computation.

## Done criteria

- [ ] Steps 1-6 shipped and individually verified.
- [ ] Steps 7-8 shipped only with shop-owner confirmation, with migrations and
      regenerated types committed together.
- [ ] The order note is proven inert with respect to money and fulfillment.
- [ ] `npm run ci` passes.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- The shop owner does not want a blocking policy checkbox (skip step 7, keep the
  rest).
- Adding columns to `checkout_orders` conflicts with the
  `checkout_orders_authoritative_arithmetic_check` constraint or the immutable
  snapshot guarantees.

## Maintenance notes

- Steps 1-3 are robustness fixes for the VietQR card and should be reviewed
  together; the transfer details in text are the fallback that makes an image
  failure survivable.
- Any future free-text field on an order needs the same treatment as step 8:
  length bound, server-side sanitisation, no effect on money.
