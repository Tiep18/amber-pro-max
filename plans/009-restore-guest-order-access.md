# Plan 009: Restore guest order access (token redemption + cookie lifetime)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat b103bb42..HEAD -- src/payments/guest-access.ts src/emails/transactional.ts src/fulfillment/order-claim.ts src/components/payments/guest-recovery-acknowledger.tsx src/components/payments/order-payment-page.tsx src/checkout/actions.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P0
- **Effort**: M
- **Risk**: HIGH (touches an authorization boundary)
- **Depends on**: none
- **Category**: correctness / security
- **Planned at**: commit `b103bb42`, 2026-08-01

## Why this matters

Two independent defects lock guests out of orders they paid for:

1. **The emailed recovery link does nothing.** `src/emails/transactional.ts`
   builds `/vi/don-hang/{order}?token=...`, but
   `src/app/[locale]/orders/[orderNumber]/page.tsx` never reads `searchParams`;
   `OrderPaymentPage` authorises purely from the cookie. `setGuestOrderAccessCookie`
   is called from exactly one place — `src/checkout/actions.ts:149`.
2. **The cookie dies at the reservation deadline.** `guestCookieOptions` sets
   `expires: reservationExpiresAt`, which is **15 minutes** after checkout for
   PayPal orders. A guest who pays successfully loses the order page, the
   download panel and the tracking panel a quarter of an hour later.

## Current state

```ts
// src/payments/guest-access.ts:144
function guestCookieOptions(reservationExpiresAt: string | null | undefined, production: boolean): CookieOptions {
  const expires = reservationExpiresAt ? new Date(reservationExpiresAt) : null;
  const validExpires = expires && Number.isFinite(expires.getTime()) && expires.getTime() > Date.now() ? expires : null;
  return {httpOnly: true, sameSite: 'lax', secure: production, path: '/',
    ...(validExpires ? {expires: validExpires} : {maxAge: DEFAULT_MAX_AGE_SECONDS})};
}
```

```sql
-- supabase/migrations/20260619085118_fulfillment_purchase_access.sql:38
create table public.guest_order_access_tokens (
  purpose text not null check (purpose in ('reopen_order', 'claim_order')),
  status text not null check (status in ('active', 'consumed', 'revoked', 'expired')),
  expires_at timestamptz not null,
  check (expires_at <= created_at + interval '24 hours' + interval '1 minute')
);
```

Note the hard 24 hour cap on token lifetime — recovery links are short-lived by
design and this plan does not change that.

Token lookup helpers already exist in `src/fulfillment/order-claim.ts`
(`findClaimToken` around line 107, `tokenUsable` at line 128). They are
currently private to the claim flow.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Drift check | see above | no unexpected in-scope drift |
| Typecheck | `npm run typecheck` | exit 0 |
| Lint | `npm run lint` | exit 0 |
| Unit | `npx vitest run tests/unit/payments` | all pass |
| Security | `npm run test:security` | all pass |
| E2E focused | `npx playwright test tests/e2e/order-status.spec.ts tests/e2e/order-downloads.spec.ts` | all pass |

## Scope

**In scope**:
- `src/app/api/orders/access/route.ts` (new)
- `src/payments/guest-access.ts`
- `src/fulfillment/order-claim.ts` (extract shared token helpers only)
- `src/emails/transactional.ts` (link builder)
- `src/components/payments/guest-recovery-acknowledger.tsx` (extend into a
  session-sync component)
- `src/checkout/actions.ts` (new refresh action)
- `tests/unit/payments/guest-access.test.ts`
- `tests/security/fulfillment-boundaries.test.mjs`

**Out of scope**:
- The `/claim` flow for signed-in customers (already works).
- Raising the 24 hour token cap.
- Changing how download tokens work in `src/app/api/downloads/route.ts`.

## Steps

### Step 1: Extract reusable token verification

Move `findClaimToken` / `tokenUsable` from `src/fulfillment/order-claim.ts` into
`src/fulfillment/guest-access.ts` (or a new `src/fulfillment/order-tokens.ts`),
exported as `findGuestOrderToken({orderId, rawToken, purpose, client})` and
`isGuestOrderTokenUsable(row, now)`. Update the claim flow to import them.

Do not duplicate the logic. There must remain exactly one place that decides a
token is usable.

**Verify**: `npm run typecheck` -> exit 0 and `npx vitest run tests/unit/payments` -> all pass.

### Step 2: Add the token redemption route

Create `src/app/api/orders/access/route.ts` with a `GET` handler:

1. Parse `orderNumber`, `token`, `locale` with Zod. Reject anything malformed
   with a redirect to the guest-order lookup page, never with a distinguishing
   error.
2. Resolve the order id from `order_number` using the **admin** client (a guest
   has no session yet), then `findGuestOrderToken({purpose: 'reopen_order'})`.
3. On a usable token: mark it `consumed` (`status = 'consumed'`,
   `consumed_at = now()`), call `setGuestOrderAccessCookieFromServer`, then
   `NextResponse.redirect(getOrderPath(locale, orderNumber), 303)`.
4. On any failure: redirect to the localized guest-order lookup route with a
   generic `?state=link_expired` flag. **Never** reveal whether the order
   exists.
5. Set `Referrer-Policy: no-referrer` on the response and make sure no logging
   path (including `runMonitoredAction` facts) receives the raw token or the
   full URL.

Single-use consumption is deliberate: the link lands in an inbox, and the
`/guest-order` page can always issue a fresh one.

**Verify**: `npm run lint` -> exit 0.

### Step 3: Point the emails at the redemption route

In `src/emails/transactional.ts`, change `orderPath(locale, order, token)` so
that when a token is present it returns
`/api/orders/access?orderNumber=...&token=...&locale=...`, and when it is absent
it keeps returning the plain localized order path.

**Verify**: `npx vitest run tests/unit` (email render tests) -> all pass.

### Step 4: Give paid orders a durable cookie

1. Change `guestCookieOptions(reservationExpiresAt, production)` to
   `guestCookieOptions({reservationExpiresAt, paid, production})`:
   - `paid === true` -> `maxAge = 60 * 60 * 24 * 30` (30 days).
   - otherwise -> `expires` at the later of `reservationExpiresAt` and
     `now + DEFAULT_MAX_AGE_SECONDS`, so an expired order can still be opened
     long enough to recover the cart (plan 008).
2. Add `refreshGuestOrderAccessCookieAction(orderNumber)` to
   `src/checkout/actions.ts` (or a new `src/payments/actions.ts` if that reads
   better): authorise with the current cookie via `getAuthorizedOrderPayment`,
   and only when the order is `paid` re-set the cookie with the long lifetime.
   The action must never mint access — it can only extend access the caller
   already proves.
3. Rename `GuestRecoveryAcknowledger` to `GuestOrderSessionSync` and have it
   call the refresh action once when the server-rendered status is paid, in
   addition to its existing acknowledge behaviour.

**Verify**: `npx vitest run tests/unit/payments/guest-access.test.ts` -> all pass.

### Step 5: Tests

1. `tests/unit/payments/guest-access.test.ts`: cookie lifetime for
   paid vs unpaid vs missing deadline.
2. New unit tests for the redemption route: usable token sets the cookie and
   redirects; consumed/expired/revoked token redirects to lookup without a
   cookie; a token belonging to order A cannot open order B.
3. `tests/security/fulfillment-boundaries.test.mjs`: assert the route never
   returns order data directly and never sets a cookie on a failed redemption.
4. `tests/e2e/order-status.spec.ts`: guest pays, advance past the reservation
   deadline, reload the order page, confirm access is retained.

**Verify**: `npm run test:security` -> all pass.

## Test plan

- All unit and security suites above.
- Manual: request a reopen email from `/guest-order`, click the link in a fresh
  private window, confirm it lands on the order page with a clean URL (no token
  in the address bar) and that a second click on the same link is rejected.

## Done criteria

- [ ] Emailed reopen links actually open the order for a guest with no cookie.
- [ ] Redemption is single-use and leaves no token in the browser URL or logs.
- [ ] A paid guest order stays accessible for 30 days.
- [ ] Failure responses are indistinguishable for "wrong token" and "no such
      order".
- [ ] `npm run typecheck`, `npm run lint`, `npm run test:security` all pass.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- The order id cannot be resolved without leaking existence through timing or
  status codes.
- Marking the token consumed requires a schema change beyond `status` /
  `consumed_at`.
- Extending the cookie would outlive the guest access model in a way that the
  retention migration (`20260620102618_customer_retention_trust.sql`) forbids.

## Maintenance notes

- The 24 hour token cap is a deliberate DB-level constraint. If product wants
  longer-lived links, that is a separate decision with its own risk review.
- Anything that sends an order link by email must go through the redemption
  route; add a lint rule or code comment so future templates do not regress to
  raw `?token=` order URLs.
