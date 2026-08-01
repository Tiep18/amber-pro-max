# Plan 008: Preserve the cart when an order is created but not paid

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat b103bb42..HEAD -- src/components/checkout/checkout-page.tsx src/components/cart/cart-provider.tsx src/cart/order-completion.ts src/cart/guest-storage.ts src/components/payments/order-payment-page.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P0
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: conversion / correctness
- **Planned at**: commit `b103bb42`, 2026-08-01

## Why this matters

Today the browser cart is emptied the moment the order row is created, before a
single unit of currency has moved. Combined with `sameOrderRetryAllowed: false`
in `src/payments/status.ts`, a customer who cancels on PayPal, closes the tab,
or simply takes longer than the 15 minute reservation window ends up with an
expired order **and** an empty cart, and has to rediscover every product. For a
handmade catalogue where customers often pick several small items, this is the
single most expensive defect in the checkout funnel.

## Current state

```tsx
// src/components/checkout/checkout-page.tsx:495
if (result.status === 'success') {
  completeOrder(
    refreshedQuote.lines
      .filter((line) => (line.status === 'ready' || line.status === 'quantity_capped') && line.quantity > 0)
      .map((line) => ({productId: line.productId, variantId: line.variantId, quantity: line.quantity}))
  );
  window.location.assign(result.orderPath);
}
```

```ts
// src/components/cart/cart-provider.tsx:357
const completeOrder = useCallback((completedLines: CompletedOrderLine[]) => {
  const current = readGuestCart() ?? emptyCart(new Date());
  const lines = subtractCompletedOrderLines({currentLines: current.lines, completedLines, updatedAt: new Date().toISOString()});
  clearCartQuoteCache();
  writeGuestCart({lines});
}, []);
```

Reservation windows come from `public.checkout_reservation_expires_at`:
15 minutes for `paypal_intent`, 24 hours for `vietqr_intent`.

## Approach decision

Two options were considered:

- **A — keep the cart intact and block a second order.** Model-correct, but
  requires pending-order state in the cart page, mini cart and checkout, and a
  mistake there lets one customer hold inventory twice.
- **B — keep subtracting, but persist a restorable snapshot.** ✅ **Chosen.**
  Small blast radius, no new inventory-holding paths, and it fixes the actual
  customer harm (losing the basket when payment does not complete).

If the shop later wants A, it should be a separate approved change.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Drift check | see above | no unexpected in-scope drift |
| Typecheck | `npm run typecheck` | exit 0 |
| Lint | `npm run lint` | exit 0 |
| Unit | `npx vitest run tests/unit/cart` | all pass |
| E2E focused | `npx playwright test tests/e2e/checkout.spec.ts` | all pass with local Supabase available |

## Scope

**In scope**:
- `src/cart/order-snapshot.ts` (new)
- `src/components/cart/cart-provider.tsx`
- `src/components/checkout/checkout-page.tsx`
- `src/components/payments/order-recovery-banner.tsx` (new)
- `src/components/payments/order-payment-page.tsx` (mount point only)
- `src/messages/en.json`, `src/messages/vi.json`
- `tests/unit/cart/order-snapshot.test.ts` (new)
- `tests/e2e/checkout.spec.ts`

**Read-only unless a verified issue requires otherwise**:
- `src/cart/order-completion.ts`
- `src/cart/guest-storage.ts`
- `src/cart/types.ts`

**Out of scope**:
- Any change to `submit_checkout`, reservations, or inventory holds.
- Server-side cart persistence for signed-in customers.
- Letting a customer cancel their own pending order (separate plan candidate).

## Steps

### Step 1: Add the snapshot store

Create `src/cart/order-snapshot.ts`, modelled on `src/cart/guest-storage.ts`
(same fail-closed `try/catch` + Zod parse + TTL discipline, same silent-remove
behaviour when storage is blocked):

```ts
export const ORDER_SNAPSHOT_STORAGE_KEY = 'amigurumi.orderSnapshot.v1';

const orderSnapshotSchema = z.object({
  version: z.literal(1),
  orderNumber: z.string().trim().min(1).max(80),
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  lines: z.array(cartIntentLineSchema).min(1)
});
```

Exports: `writeOrderSnapshot(input)`, `readOrderSnapshot(orderNumber)`,
`clearOrderSnapshot(orderNumber)`. TTL 7 days. `readOrderSnapshot` returns
`null` and removes the record when expired, when the schema fails, or when the
stored `orderNumber` does not match the requested one.

Store the **intent** lines (`productId`, `variantId`, `quantity`,
`marketAtAdd`, `addedAt`, `updatedAt`), not quote lines, so restoration feeds
straight back into the normal requote path.

**Verify**: `npm run typecheck` -> exit 0.

### Step 2: Write the snapshot at submit time

In `src/components/checkout/checkout-page.tsx`, inside the
`result.status === 'success'` branch, call `writeOrderSnapshot` **before**
`completeOrder(...)`, using the same filtered line list plus
`orderNumber: result.orderNumber` and
`expiresAt` = now + 7 days.

Wrap the call so a storage failure never blocks the redirect to the payment
page — a lost snapshot is a degraded experience, a blocked redirect is a lost
order.

**Verify**: `npm run typecheck` -> exit 0.

### Step 3: Add restore to the cart provider

In `src/components/cart/cart-provider.tsx`:

1. Add `restoreOrderSnapshot: (orderNumber: string) => Promise<boolean>` to
   `CartContextValue` and to the memoised context object.
2. Implementation: read the snapshot, merge its lines into the current cart by
   `cartLineKey` (sum quantities), `writeGuestCart`, `clearCartQuoteCache`,
   `clearOrderSnapshot`, then `await refresh(mergedLines)` so the customer
   immediately sees any quantity caps applied by the fresh quote.
3. Return `false` when there is no usable snapshot so the caller can hide its
   UI.

Reuse the merge semantics already proven in `src/cart/merge.ts` rather than
inventing a second merge rule; extract a shared helper if the shapes differ.

**Verify**: `npx vitest run tests/unit/cart` -> all pass.

### Step 4: Surface recovery on the order page

Create `src/components/payments/order-recovery-banner.tsx` (client component,
same mount pattern as `GuestRecoveryAcknowledger`):

- Props: `orderNumber`, `recoverable: boolean`, `paid: boolean`.
- On mount when `paid` -> `clearOrderSnapshot(orderNumber)` and render nothing.
- When `recoverable` and a snapshot exists -> render an alert with the copy
  "This order expired. Restore these items to your cart?" plus a primary button
  that calls `restoreOrderSnapshot` then navigates to the cart path.
- While restoring, disable the button and set `aria-busy`.
- If restore returns `false`, replace the banner with a short "items no longer
  available" note rather than leaving a dead button.

Mount it in `src/components/payments/order-payment-page.tsx` near
`GuestRecoveryAcknowledger`, passing
`recoverable={['expired', 'cancelled', 'failed', 'rejected'].includes(status.status)}`
and `paid={status.isPaid}`.

**Verify**: `npm run lint` -> exit 0.

### Step 5: Localise the new copy

Add keys under an `orders.recovery.*` namespace in `src/messages/en.json` and
`src/messages/vi.json`. Vietnamese strings **must use full diacritics** — see
plan 015; do not copy the unaccented style found in
`src/components/cart/cart-page.tsx`.

**Verify**: `npm run typecheck` -> exit 0.

### Step 6: Tests

1. `tests/unit/cart/order-snapshot.test.ts`: write/read round trip, TTL
   expiry removes the record, schema mismatch removes the record, mismatched
   order number returns null, blocked storage does not throw.
2. Extend `tests/unit/cart/order-completion.test.ts` or add a provider-level
   test for merge-on-restore (sum quantities, no duplicate lines).
3. `tests/e2e/checkout.spec.ts`: create a PayPal order, drive the order page to
   an expired state via the existing fixtures, assert the recovery banner
   appears, click it, and assert the cart shows the original lines and
   quantities.

**Verify**: `npx playwright test tests/e2e/checkout.spec.ts` -> all pass, or
document the exact environment blocker.

## Test plan

- Unit coverage above.
- Manual smoke: create a VietQR order, close the tab, reopen the order link,
  confirm the cart is still empty (expected) and the banner is absent while the
  order is payable; then let it expire and confirm the banner appears.
- Confirm the snapshot is cleared after a successful payment so a later visit
  does not offer to re-add already-purchased items.

## Done criteria

- [ ] A customer whose payment fails, is cancelled, or expires can restore the
      exact basket in one click.
- [ ] Snapshots are cleared on paid orders and after a successful restore.
- [ ] No change to reservation, inventory, or `submit_checkout` behaviour.
- [ ] Storage failures degrade silently and never block the payment redirect.
- [ ] `npm run typecheck`, `npm run lint`, `npx vitest run tests/unit/cart` all pass.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- Restoring requires changing `submit_checkout` or any reservation logic.
- The merge produces quantities above available inventory without the requote
  capping them.
- Signed-in customers turn out to use a server-side cart that this localStorage
  approach would desynchronise.

## Maintenance notes

- If the shop later adds "cancel this order" for customers, restore should also
  be offered from that flow.
- Snapshot keys are versioned (`v1`); bump the key rather than migrating shapes.
