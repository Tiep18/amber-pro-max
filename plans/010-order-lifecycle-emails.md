# Plan 010: Add order-created and payment-received transactional emails

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat b103bb42..HEAD -- src/emails/transactional.ts src/fulfillment/schemas.ts src/fulfillment/email-outbox.ts src/checkout/actions.ts supabase/migrations`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P0
- **Effort**: L
- **Risk**: MED
- **Depends on**: plan 009 (order links must be redeemable)
- **Category**: customer communication
- **Planned at**: commit `b103bb42`, 2026-08-01

## Why this matters

The store sends no email when an order is created and none when payment is
confirmed. Consequences today:

- A VietQR customer who closes the tab loses the QR code, the bank account and
  the transfer reference, with a 24 hour deadline running. The data exists only
  in that browser session.
- A physical-only customer receives nothing at all until the "shipped" email —
  no confirmation, no receipt.
- Support has no artefact to point a customer at.

## Current state

```ts
// src/fulfillment/schemas.ts:26
export const transactionalEmailEventTypeSchema = z.enum([
  'digital_access_granted', 'digital_access_revoked', 'digital_access_reissued',
  'physical_shipped', 'guest_order_reopen', 'guest_order_claim', 'newsletter_subscribed'
]);
```

```sql
-- supabase/migrations/20260619085118_fulfillment_purchase_access.sql:56
event_type text not null check (event_type in ('digital_access_granted', 'digital_access_revoked',
  'digital_access_reissued', 'physical_shipped', 'guest_order_reopen', 'guest_order_claim')),
```

Digital delivery is enqueued from `private.grant_paid_digital_entitlements`,
which is fired by the `payment_transition_grants_digital_entitlements` trigger
on `payment_transitions`. The paid path already calls
`triggerTransactionalEmailOutboxNow` from the PayPal capture route and webhook.

`messageShell(subject, intro, linkText, link, footer)` in
`src/emails/transactional.ts` only supports one paragraph plus one link, which
is not enough for bank transfer details.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Drift check | see above | no unexpected in-scope drift |
| DB reset + lint + test | `npm run db:reset && npm run db:lint && npm run db:test` | exit 0 |
| Regenerate types | `npm run db:types && git diff --exit-code src/types/supabase.ts` | no unexpected diff after commit |
| Typecheck | `npm run typecheck` | exit 0 |
| Unit | `npx vitest run tests/unit` | all pass |

## Scope

**In scope**:
- `supabase/migrations/<timestamp>_order_lifecycle_emails.sql` (new)
- `src/fulfillment/schemas.ts`
- `src/emails/transactional.ts`
- `src/checkout/actions.ts` (trigger the outbox after submit)
- `src/types/supabase.ts` (regenerated, never hand-edited)
- `tests/unit/` email render tests
- `supabase/tests/` db tests

**Out of scope**:
- Rich HTML email design / a template engine. Keep the existing plain, escaped
  markup; readability beats styling for a transactional receipt.
- Changing when entitlements are granted.
- Marketing email or newsletter behaviour.

## Steps

### Step 1: Migration — widen the event enum and enqueue the new events

Create `supabase/migrations/<timestamp>_order_lifecycle_emails.sql`:

1. Drop and re-add the `event_type` check constraint on
   `public.transactional_email_outbox`, adding `'order_created'` and
   `'payment_received'`. Find the generated constraint name first with
   `\d public.transactional_email_outbox` rather than guessing it.
2. `private.enqueue_order_created_email(p_order_id uuid)`:
   - Load the order row.
   - For guest orders (`owner_user_id is null`), mint a
     `guest_order_access_tokens` row with `purpose = 'reopen_order'` and
     `expires_at = least(now() + interval '24 hours', created_at + interval '24 hours')`
     so the DB check constraint holds. Store only the hash, exactly as the
     existing reopen flow does.
   - Insert one outbox row with payload:
     `orderNumber`, `totalMinor`, `currencyCode`, `paymentIntent`,
     `reservationExpiresAt`, and for VietQR also `transferReference`.
   - The payload must satisfy `private.reject_unsafe_fulfillment_payload`; run
     `npm run db:test` early to catch a violation.
3. Trigger `after insert on public.checkout_orders for each row` calling that
   function.
4. Extend the paid path: inside
   `private.grant_paid_digital_entitlements`, or better in a **new** trigger
   function on `payment_transitions` (`result = 'applied' and to_status = 'paid'`),
   insert a `payment_received` outbox row for every paid order, digital or not,
   keyed idempotently (`on conflict do nothing` against a unique event key) so a
   duplicate webhook cannot double-send.

Keep the two concerns in separate functions; do not overload the entitlement
grant with receipt logic.

**Verify**: `npm run db:reset && npm run db:lint && npm run db:test` -> exit 0.

### Step 2: Regenerate types

`npm run db:types`, then commit `src/types/supabase.ts` in the same change.

**Verify**: `git diff --exit-code src/types/supabase.ts` is clean after commit.

### Step 3: Widen the Zod enum

Add `'order_created'` and `'payment_received'` to
`transactionalEmailEventTypeSchema`. The enum and the SQL check constraint must
stay in lockstep — note that in a comment next to the enum.

**Verify**: `npm run typecheck` -> exit 0.

### Step 4: Generalise `messageShell`

Change the signature to an options object:

```ts
messageShell({subject, intro, rows, cta, footer}: {
  subject: string; intro: string;
  rows?: {label: string; value: string}[];
  cta?: {label: string; href: string};
  footer: string;
})
```

`rows` render as a simple definition list; every label and value goes through
the existing `escapeHtml`, and the text variant renders `label: value` lines.
Update the four existing callers so behaviour is unchanged for them.

**Verify**: `npx vitest run tests/unit` -> existing email tests still pass.

### Step 5: Render the two new emails

In `renderTransactionalEmail`:

- **`order_created`** — subject "Đơn hàng {order} đang chờ thanh toán" /
  "Order {order} is awaiting payment". Rows: total, payment deadline, and for
  VietQR the bank id, account name, **masked** account number, transfer
  reference and exact amount. CTA: the order link built through the redemption
  route from plan 009.
  This email is the customer's offline backup — the transfer details must be
  readable without loading any image.
- **`payment_received`** — subject "Đã nhận thanh toán cho đơn {order}" /
  "Payment received for order {order}". Rows: total paid, payment method, order
  number. Body states the next step conditionally: digital buyers get a
  separate download email; physical buyers wait for packing.

Both locales, full Vietnamese diacritics (see plan 015).

**Verify**: `npm run typecheck` -> exit 0.

### Step 6: Flush the outbox after checkout

In `submitCheckoutAction` (`src/checkout/actions.ts`), after a successful
submit and cookie set, call
`triggerTransactionalEmailOutboxNow({reason: 'checkout_submitted'})`. Failures
must be swallowed — the customer is already being redirected to the payment
page and the outbox will retry.

**Verify**: `npm run lint` -> exit 0.

### Step 7: Tests

1. Unit render tests for both new events × both locales: assert subject, that
   the VietQR body contains the reference and amount as text, and that no raw
   token appears in the HTML body outside the CTA href.
2. `supabase test db`: creating an order enqueues exactly one `order_created`;
   applying a paid transition twice enqueues exactly one `payment_received`.
3. Assert the account-number value is masked in the email, matching the masking
   already used by `getVietQrInstructions`.

**Verify**: `npm run db:test` and `npx vitest run tests/unit` -> all pass.

## Test plan

- Full `npm run ci` before merge, because this touches migrations and generated
  types.
- Manual: place a VietQR order in a local environment, read the outbox row,
  render it, and check the transfer details are complete and copy-pasteable.

## Done criteria

- [ ] Every new order produces exactly one `order_created` email.
- [ ] Every paid order produces exactly one `payment_received` email, including
      physical-only orders.
- [ ] VietQR order emails contain complete bank transfer instructions as text.
- [ ] Duplicate webhooks do not produce duplicate receipts.
- [ ] Generated Supabase types are regenerated and committed.
- [ ] `npm run ci` passes.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- `private.reject_unsafe_fulfillment_payload` rejects the payload shape and the
  fix would require relaxing that guard.
- Minting a reopen token inside the order-insert trigger conflicts with the
  24 hour `expires_at` check constraint.
- The paid trigger cannot be made idempotent without a schema change beyond a
  unique event key.

## Maintenance notes

- Email copy is customer-visible legal-adjacent text for VN commerce; have the
  shop owner read both locales before launch.
- If a refund flow is added later, a `payment_refunded` email belongs in the
  same enum and the same trigger family.
