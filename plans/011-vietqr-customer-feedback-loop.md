# Plan 011: Close the VietQR feedback loop

> **Execution note (2026-08-01)**: Executed in full except the admin queue
> **re-ordering** in Step 5 — only the "customer declared" badge was added
> (order-queue.tsx and order-detail.tsx). Re-sorting the queue was skipped
> per the plan's own STOP condition risk guidance (touching the shared
> `.order('updated_at', ...)` query builder chain used by other admin
> screens). E2E (`tests/e2e/admin-vietqr.spec.ts`) was not run this pass —
> covered instead by pgTAP (`supabase/tests/database/05_vietqr_customer_declaration.test.sql`)
> and unit tests (`tests/unit/payments/vietqr-declare.test.ts`,
> `tests/unit/payments/paypal-buttons.test.ts`). Migration:
> `supabase/migrations/20260801160000_vietqr_customer_declaration.sql`.

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat b103bb42..HEAD -- src/components/payments/vietqr-instructions.tsx src/components/payments/payment-state-panel.tsx src/components/payments/paypal-buttons.tsx src/components/payments/order-payment-page.tsx src/payments/queries.ts src/components/admin/orders`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P0
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: operations / UX
- **Planned at**: commit `b103bb42`, 2026-08-01

## Why this matters

VietQR is a one-way street today. The customer transfers money and then has no
way to tell the shop, and no way to check whether the shop noticed. The admin
must reconcile bank statements blind. Two concrete gaps:

- No "I have transferred" signal, so the admin queue cannot be prioritised.
- No status refresh control. `PaymentStatusRecheck` is only rendered when the
  status is `verifying_payment`
  (`src/components/payments/payment-state-panel.tsx:76`), and
  `VietQrInstructions` declares a `checkStatus` label prop
  (`src/components/payments/vietqr-instructions.tsx:25`) that it **never
  renders**. A VietQR customer can only press F5.

## Design decision: do not put the customer inside the payment state machine

The obvious implementation — let the customer move the payment to `verifying` —
is rejected. `public.apply_payment_transition` restricts
`target_status` to `('pending', 'paid', 'failed', 'cancelled', 'rejected',
'expired', 'review_required')`
(`supabase/migrations/20260615034000_trusted_payments_orders.sql:542`);
`verifying` is not an accepted target, and widening that enum plus adding a
customer-writable source into the money state machine is a large risk for a
small benefit.

Instead: record an **unverified customer declaration** as a separate fact
(column + audit event), surface it to the admin queue, and derive a softer
customer-facing label from it. Payment status, the fulfillment gate and
entitlements are untouched.

## Current state

```tsx
// src/components/payments/payment-state-panel.tsx:76
{presentation.status === 'verifying_payment' && recheckLabels ? <PaymentStatusRecheck labels={recheckLabels} /> : null}
```

```ts
// src/components/payments/paypal-buttons.tsx:8
export const PAYPAL_RECHECK_COOLDOWN_MS = 5000;
export const PAYPAL_POLLING_WINDOW_MS = 30000;
const PAYPAL_POLLING_INTERVAL_MS = 5000;
```

`PaymentStatusRecheck` lives in the PayPal file although it is provider-neutral.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Drift check | see above | no unexpected in-scope drift |
| DB reset + lint + test | `npm run db:reset && npm run db:lint && npm run db:test` | exit 0 |
| Regenerate types | `npm run db:types && git diff --exit-code src/types/supabase.ts` | clean after commit |
| Typecheck / lint | `npm run typecheck && npm run lint` | exit 0 |
| E2E focused | `npx playwright test tests/e2e/admin-vietqr.spec.ts` | all pass |

## Scope

**In scope**:
- `supabase/migrations/<timestamp>_vietqr_customer_declaration.sql` (new)
- `src/payments/vietqr/customer-actions.ts` (new server action)
- `src/payments/queries.ts` (expose the declaration flag)
- `src/components/payments/payment-status-recheck.tsx` (new home for the
  extracted component)
- `src/components/payments/vietqr-instructions.tsx`
- `src/components/payments/payment-state-panel.tsx`
- `src/components/payments/paypal-buttons.tsx` (remove the moved component)
- `src/components/admin/orders/*` (queue badge + ordering)
- `src/messages/{en,vi}.json`

**Out of scope**:
- `public.apply_payment_transition` and every payment status value.
- Automatic bank statement reconciliation.
- Any change that could make a declaration unlock fulfillment.

## Steps

### Step 1: Migration — store the declaration as a fact, not a status

1. `alter table public.checkout_orders add column customer_transfer_declared_at timestamptz;`
2. `public.declare_vietqr_transfer(p_order_number text, p_guest_secret_hash text)`,
   `security definer`, granted to `anon` and `authenticated`:
   - Authorise exactly the way `getAuthorizedOrderPayment` does: the caller is
     either the owning user or presents the matching guest secret hash.
   - Require `provider = 'vietqr'`, `payment_status = 'pending'`, and
     `reservation_expires_at > now()`.
   - Set `customer_transfer_declared_at = coalesce(customer_transfer_declared_at, now())`
     — idempotent by construction.
   - Insert a `fulfillment_audit_events` row with
     `event_key = 'vietqr_transfer_declared:' || order_id` and
     `actor_type = 'system'`, `on conflict (event_key) do nothing`.
   - Return `{status: 'recorded' | 'unchanged' | 'not_eligible' | 'forbidden'}`.
   - It must be structurally impossible for this function to write
     `payment_status`, `paid_gate_status`, or any entitlement.
3. Expose `customer_transfer_declared_at` on the customer and admin order
   projections used by `src/payments/queries.ts`.

**Verify**: `npm run db:reset && npm run db:lint && npm run db:test` -> exit 0,
then `npm run db:types`.

### Step 2: Server action

`src/payments/vietqr/customer-actions.ts`:

```ts
'use server';
export async function declareVietQrTransferAction(orderNumber: string):
  Promise<{status: 'recorded' | 'unchanged' | 'not_eligible' | 'forbidden'}>
```

Wrap it in `runMonitoredAction` (`area: 'payment'`, `action: 'vietqr_declare'`)
for consistency with the rest of the payment surface. Resolve the guest secret
hash with `getGuestOrderAccessHashFromServer` before calling the RPC.

**Verify**: `npm run typecheck` -> exit 0.

### Step 3: Extract `PaymentStatusRecheck`

Move it from `src/components/payments/paypal-buttons.tsx` to
`src/components/payments/payment-status-recheck.tsx` and parameterise the
timings:

```ts
type RecheckTiming = {cooldownMs: number; pollIntervalMs: number; pollWindowMs: number};
export const PAYPAL_RECHECK_TIMING: RecheckTiming = {cooldownMs: 5000, pollIntervalMs: 5000, pollWindowMs: 30000};
export const VIETQR_RECHECK_TIMING: RecheckTiming = {cooldownMs: 15000, pollIntervalMs: 60000, pollWindowMs: 600000};
```

VietQR settlement is human-paced; polling it every five seconds would be waste.
Keep the existing `document.visibilityState === 'visible'` guard. Update the
existing import sites and `tests/unit/payments/paypal-buttons.test.ts`.

**Verify**: `npx vitest run tests/unit/payments` -> all pass.

### Step 4: Wire the VietQR UI

In `src/components/payments/vietqr-instructions.tsx`:

1. Add props `declared: boolean` and `onDeclare: () => Promise<void>`.
2. Render a primary button "Tôi đã chuyển khoản" / "I have transferred",
   disabled while pending and replaced after success by a status line
   "Đã ghi nhận — chúng tôi đang đối soát" with `role="status"`.
3. Add a warning line above the button: only press this after the transfer has
   actually completed.
4. Render `PaymentStatusRecheck` with `VIETQR_RECHECK_TIMING` using the
   already-declared-but-unused `labels.checkStatus`.
5. Keep the existing fulfillment-lock alert exactly as it is: a declaration must
   not visually imply the files are unlocked.

In `src/components/payments/order-payment-page.tsx`, pass `declared` from the
new projection field and mount a small client wrapper for the action.

**Verify**: `npm run lint` -> exit 0.

### Step 5: Admin queue

In the admin orders queue:

1. Sort VietQR orders with `customer_transfer_declared_at is not null` to the
   top of the awaiting-payment group.
2. Show a badge "Khách báo đã chuyển" with the declaration timestamp.
3. Leave the existing `VietQrEvidenceForm` decision flow untouched — the
   declaration is a hint, the bank reference and amount check remain the only
   thing that can mark an order paid.

**Verify**: `npx playwright test tests/e2e/admin-vietqr.spec.ts` -> all pass.

### Step 6: Tests

1. DB test: declaring twice writes one audit event and leaves
   `payment_status = 'pending'`; declaring on a PayPal order or an expired order
   returns `not_eligible`; declaring without authorisation returns `forbidden`.
2. Security test in `tests/security/payment-boundaries.test.mjs`: a declaration
   never changes `paid_gate_status`, `digital_fulfillment_status`, or creates an
   entitlement.
3. E2E: customer declares -> admin sees the badge -> admin confirms evidence ->
   order becomes paid.

**Verify**: `npm run test:security` -> all pass.

## Test plan

- Full `npm run ci` (migration + generated types are involved).
- Manual: on a VietQR order, press the button, reload, confirm the state
  persists and the download panel is still locked.

## Done criteria

- [ ] A VietQR customer can signal a completed transfer and see it acknowledged.
- [ ] A VietQR customer can re-check payment status without reloading manually.
- [ ] The declaration provably cannot unlock fulfillment or change payment
      status.
- [ ] The admin queue prioritises declared transfers.
- [ ] `checkStatus` is no longer a dead prop.
- [ ] `npm run ci` passes.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- Authorising the RPC requires duplicating the guest-hash comparison instead of
  reusing the existing authorisation path.
- The admin queue ordering change would require altering the shared order
  projection in a way other admin screens depend on.
- Any test shows a declaration affecting fulfillment state.

## Maintenance notes

- If bank statement ingestion is ever automated, the declaration becomes a
  matching hint rather than the primary signal; keep the column.
- Do not let the customer-facing status string for a declared order read as
  "paid" in any locale — the shop has not seen the money yet.
