---
quick_id: 260714-mhn
status: complete
completed_at: '2026-07-14T17:05:00+07:00'
commits:
  - 52da2eba
  - d586f9c7
  - edf054ed
  - cb712144
---

# Quick task summary: secure guest checkout retry recovery

## Delivered

- Added a private, hash-only guest attempt claim keyed independently from the proof. The public submit RPC serializes the attempt before order work, rejects a different proof generically, and returns metadata only.
- Guest order/payment idempotency evidence uses `guest-attempt:<sha256(attemptId)>`; raw attempt and proof values are removed before authoritative persistence.
- Added a 30-minute HttpOnly recovery cookie with independent 256-bit attempt/proof values, checkout-intent binding, strict parsing, and production-only Secure behavior.
- Checkout prepares recovery before submit, exchanges the server-held proof for the order-scoped cookie, and retains recovery until the authorized order page acknowledges access.
- Signed-in checkout remains on the auth-owned path and does not require or consume guest credentials.
- Added a forward-only verifier migration with separate allocation control flow: zero discounts validate every allocation directly and never enter the allocation CTE; positive discounts require a concrete rule and eligible subtotal before preserving the exact largest-remainder formula.
- Added a committed two-session `dblink` full-order race. The same attempt with different proofs produces exactly one order/payment/line graph and one generic conflict.
- The concurrency harness uses Supabase's stable internal `db:5432` alias and is portable across supported local runtimes.
- Added application contracts for both transport-loss states, a signed-in database wrapper regression, positive and zero discount cases, and explicit raw-credential absence across responses, claims, orders, payments, and snapshots.

## Verification

- `npm run db:reset` - pass
- `npm run db:lint` - pass, no schema errors
- `npm run db:test` - pass, 729 assertions across 29 files
- `npm run db:types` plus `git diff --exit-code -- src/types/supabase.ts` - pass, zero public type drift
- Targeted checkout/payment unit suite - pass, 144 tests
- Targeted checkout/payment security boundaries - pass, 12 tests
- `npm run typecheck` - pass
- `npm run lint` - pass
- `npm run build` - pass, 104 static pages generated
- Full `npm run test:security` retains two unrelated pre-existing failures in catalog public-media and newsletter retention boundary tests; neither touches checkout recovery files.

## Remaining risk

- Expired unclaimed attempt rows are indexed by `expires_at` for later maintenance, but no scheduled cleanup job is introduced in this quick task.

## Scope preserved

- No changes to shipping formulas, package grouping, inventory/payment state machines, fulfillment gates, or historical migrations.
- The user's `.gitignore` modification was not staged or committed.
