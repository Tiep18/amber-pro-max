# Plan 016: Show what the customer is paying for on the payment page

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat b103bb42..HEAD -- src/payments/queries.ts src/components/payments/order-payment-page.tsx src/components/checkout/order-summary.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plan 013 (countdown slots into the same panel)
- **Category**: UX / trust
- **Planned at**: commit `b103bb42`, 2026-08-01

## Why this matters

The payment page asks for money while showing only an order number, a total and
a deadline. The customer cannot verify what they are buying at the moment of
payment — the highest-anxiety point in the funnel — and support cannot ask
"does the order page show the right items?" because it does not show any.

## Current state

`getAuthorizedOrderPayment` in `src/payments/queries.ts` selects from
`order_payment_statuses` and returns totals, status, provider, deadline and the
shipping address snapshot. It does not read `checkout_order_lines`.

`OrderPaymentPage` renders a summary card with order number, total and deadline
(`src/components/payments/order-payment-page.tsx:238-258`).

Line snapshots are already persisted immutably at submit time by
`submit_checkout`, including `title`, `variantLabel`, `quantity`,
`unitPriceMinor`, `lineSubtotalMinor`, `discountAllocationMinor` and
`shipping_allocation_minor`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Drift check | see above | no unexpected in-scope drift |
| Typecheck / lint | `npm run typecheck && npm run lint` | exit 0 |
| Unit | `npx vitest run tests/unit/payments` | all pass |
| Security | `npm run test:security` | all pass |
| E2E focused | `npx playwright test tests/e2e/order-status.spec.ts` | all pass |

## Scope

**In scope**:
- `src/payments/queries.ts`
- `src/components/payments/order-line-summary.tsx` (new presentational component)
- `src/components/payments/order-payment-page.tsx`
- `src/messages/{en,vi}.json`
- `tests/unit/payments/order-queries.test.ts`
- `tests/security/payment-boundaries.test.mjs`

**Out of scope**:
- Any recalculation on the payment page. The persisted snapshot is the truth;
  this page displays, it never computes.
- Editing an order after creation.

## Steps

### Step 1: Extend the authorised projection

In `src/payments/queries.ts`, after the existing authorisation check succeeds,
load the order's lines and money breakdown:

1. Select from `checkout_order_lines` by `order_id`: `line_id`, `title`,
   `variant_label`, `sku`, `fulfillment_type`, `quantity`, `unit_price_minor`,
   `line_subtotal_minor`, `discount_allocation_minor`.
2. Select `subtotal_minor`, `discount_minor`, `shipping_minor`, `total_minor`
   and the discount code from the order row.
3. Map into a typed `OrderLineSummary[]` plus an `OrderMoneyBreakdown`, using
   the same defensive `typeof` mapping style as the existing `mapQueueItem`.

The line query must run **after** authorisation, never as part of it, and must
be scoped by the already-authorised `order_id` — not by anything derived from
user input.

**Verify**: `npx vitest run tests/unit/payments/order-queries.test.ts` -> all pass.

### Step 2: Presentational component

Create `src/components/payments/order-line-summary.tsx` — a server component
rendering the persisted lines and the money breakdown.

Reuse the visual language of `src/components/checkout/order-summary.tsx`
(48px thumbnail slot, truncated title, variant + quantity secondary line,
right-aligned `tabular-nums` amount) but **do not** import or generalise that
component: it is bound to `CartQuote` and to live quote semantics. Duplicating
~40 lines of markup is the right trade against coupling a paid order's
immutable snapshot to the live quote type.

Line images are not stored on the order snapshot (`imageUrl` is written as
`null` by `submit_checkout`), so render the fulfillment-type icon
(`FileText` / `Package`) rather than adding a catalogue lookup.

**Verify**: `npm run typecheck` -> exit 0.

### Step 3: Mount and complete the page

In `OrderPaymentPage`:

1. Render `OrderLineSummary` in the right-hand aside, above the existing total
   card, and collapse the two into one card so there is a single money block.
2. Show the money breakdown: subtotal, discount (with code), shipping, total.
3. Add CTAs below the payment area: "Continue shopping" (catalog path) and, for
   signed-in customers, "My orders".
4. For guests, add a short note: "We emailed a link to this order to
   {masked email}. Keep it to come back later." Mask with the same helper the
   admin views use (`maskEmailForAdmin`), or a customer-facing equivalent —
   never render the full address.

**Verify**: `npm run lint` -> exit 0.

### Step 4: Tests

1. Unit: the projection returns lines only for the authorised order; an
   unauthorised call returns no lines at all, not an empty array from a
   successful query.
2. Security: add a case to `tests/security/payment-boundaries.test.mjs` proving
   order A's lines are never reachable through order B's number, and that the
   contact email is never returned unmasked to a customer surface.
3. E2E: place an order with two lines including one variant, open the payment
   page, assert both titles, the variant label, and the total are visible.

**Verify**: `npm run test:security` -> all pass.

## Test plan

- Suites above plus `npm run ci`.
- Manual: mixed digital + physical order, check the breakdown adds up and the
  shipping row only appears when shipping was charged.

## Done criteria

- [ ] The payment page lists exactly what was ordered, from the immutable
      snapshot.
- [ ] Subtotal, discount, shipping and total are all visible and consistent with
      the order row.
- [ ] No recalculation happens on this page.
- [ ] Guests are told where their order link went, with a masked address.
- [ ] `npm run ci` passes.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- Reading `checkout_order_lines` requires relaxing RLS for anon.
- The persisted snapshot lacks a field needed for a comprehensible summary — in
  that case report which field, rather than falling back to a live catalogue
  lookup.

## Maintenance notes

- This page is the closest thing the shop has to an invoice. If a formal
  VAT-style invoice is ever needed, it should be generated from this same
  snapshot, not from the catalogue.
