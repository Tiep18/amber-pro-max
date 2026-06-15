---
phase: 03-mixed-cart-and-checkout
plan: "04"
subsystem: checkout-orders-reservations
tags: [nextjs, supabase, postgres, rls, checkout, inventory, reservations, vitest, pgtap]

requires:
  - phase: 03-mixed-cart-and-checkout
    provides: Intent-only cart quote hydration, destination shipping, and discount allocation from Plans 03-01 through 03-03
provides:
  - Pending-payment checkout order shell with nullable account owner and hashed guest access secret
  - Immutable checkout line snapshots for product, variant, market, currency, price, discount, shipping, and quote data
  - Active inventory reservation records with PayPal 15-minute and VietQR 24-hour deadlines
  - Single submit_checkout RPC boundary with idempotency, safe typed errors, and reservation creation
  - Server wrapper, Server Action, contact/payment-intent UI, and pending-payment handoff
  - Database, unit, and typecheck coverage for checkout order/reservation boundaries
affects: [payments, inventory release, fulfillment, digital entitlements, market exceptions]

tech-stack:
  added: []
  patterns:
    - Checkout submit enters through one security-definer RPC with fixed search_path and explicit execute grants
    - Customer browser state remains intent-only; order snapshots are created from server-side submit data
    - Pending-payment checkout reserves physical stock but stops before payment capture, finalization, fulfillment, or entitlement

key-files:
  created:
    - supabase/migrations/20260615032000_checkout_orders_reservations.sql
    - supabase/tests/database/03_checkout_model.test.sql
    - supabase/tests/database/03_checkout_rls.test.sql
    - supabase/tests/database/03_checkout_concurrency.test.sql
    - src/checkout/schemas.ts
    - src/checkout/submit-checkout.ts
    - src/components/checkout/contact-form.tsx
    - tests/unit/checkout/submit-checkout.test.ts
  modified:
    - src/types/supabase.ts
    - src/checkout/actions.ts
    - src/components/checkout/checkout-page.tsx

key-decisions:
  - "submit_checkout is the only checkout persistence boundary; the Server Action validates input and calls one RPC rather than composing reservation/order mutations in application code."
  - "Pending-payment orders reserve physical inventory but deliberately do not capture payment, finalize/release inventory, grant downloads, send payment emails, or create fulfillment records in Phase 3."
  - "Guest order access stores only a hashed secret at rest; raw guest tokens are returned only at creation time and are not persisted in browser cart storage."
  - "Security-definer crypto calls are schema-qualified under a fixed search_path to keep the RPC lint-clean."

patterns-established:
  - "New public-schema checkout tables must pair explicit grant/revoke statements with RLS policies in the same migration."
  - "Reservation availability is computed from quantity_on_hand minus active, unexpired checkout_inventory_reservations."
  - "Checkout UI success states show reservation deadline and pending-payment handoff without provider buttons or payment instructions."

requirements-completed: [CART-04, CART-05, INV-02, INV-03, CART-03, DISC-03]

duration: 31 min
completed: 2026-06-15
---

# Phase 03 Plan 04: Checkout Orders and Reservations Summary

**Pending-payment checkout orders with immutable line snapshots, idempotent submit, and active inventory reservations**

## Performance

- **Duration:** 31 min
- **Started:** 2026-06-15T06:00:00Z
- **Completed:** 2026-06-15T06:31:00Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Added checkout order, order line, and inventory reservation tables with RLS, direct table grant restrictions, indexes, immutable snapshot trigger, and reservation deadline helpers.
- Added `submit_checkout(jsonb)` as the single database transaction boundary for pending-payment order creation, idempotency lookup, line snapshot creation, physical inventory row locks, and active reservations.
- Added TypeScript submit schema/wrapper and a Server Action that maps safe typed RPC results.
- Updated checkout UI with contact email, payment intent selection, confirm-total submit, duplicate-submit disablement, and pending-payment deadline handoff.
- Generated Supabase types and added focused pgTAP/Vitest coverage for model, RLS, concurrency helper behavior, and wrapper mapping.

## Task Commits

Each task was committed atomically:

1. **Tasks 1-3: Checkout schema, submit RPC, wrapper, UI, and tests** - `efd09f2` (feat)

**Plan metadata:** pending in docs commit

## Files Created/Modified

- `supabase/migrations/20260615032000_checkout_orders_reservations.sql` - Checkout order shell, immutable lines, reservations, helper functions, submit RPC, RLS, grants, and indexes.
- `supabase/tests/database/03_checkout_model.test.sql` - pgTAP model coverage for order, line, reservation, helper, and RPC structure.
- `supabase/tests/database/03_checkout_rls.test.sql` - RLS, grant, trigger, and function privilege coverage.
- `supabase/tests/database/03_checkout_concurrency.test.sql` - Reservation helper, idempotency, deadline, and safe invalid-payload coverage.
- `src/checkout/schemas.ts` and `src/checkout/submit-checkout.ts` - Submit input validation and RPC result mapping.
- `src/checkout/actions.ts` - Checkout submit Server Action.
- `src/components/checkout/contact-form.tsx` and `src/components/checkout/checkout-page.tsx` - Contact/payment intent controls and pending-payment handoff.
- `src/types/supabase.ts` - Generated database/RPC types.
- `tests/unit/checkout/submit-checkout.test.ts` - Submit schema and wrapper unit coverage.

## Decisions Made

- Used a JSON payload RPC to keep the public Data API surface small while preserving one transaction boundary.
- Kept direct customer access off reservation records; customers see order/line data only through owner RLS, while guest follow-up access remains a later scoped-token flow.
- Used pending redemptions linkage fields already created in Plan 03-03 but did not commit discount usage finalization; payment confirmation remains Phase 4.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Schema-qualified crypto functions under fixed search_path**
- **Found during:** Task 2 verification (`npm run db:lint` and `npm run db:test`)
- **Issue:** `submit_checkout` used a fixed `search_path = public, pg_temp`, so unqualified `gen_random_bytes()` and `digest()` did not resolve inside the security-definer function.
- **Fix:** Qualified calls as `extensions.gen_random_bytes()` and `extensions.digest()` instead of widening the function search path.
- **Files modified:** `supabase/migrations/20260615032000_checkout_orders_reservations.sql`
- **Verification:** `npm run db:reset`, `npm run db:lint`, and `npm run db:test` passed.
- **Committed in:** `efd09f2`

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** The fix preserves the intended security-definer boundary and improves lint compliance without scope creep.

## Issues Encountered

- Direct `supabase test db supabase/tests/database/03_checkout_model.test.sql` is unreliable on this Windows shell because pg_prove mis-parses the path; the canonical `npm run db:test` suite was used and passed.
- Generated Supabase types initially lacked the new RPC until `npm run db:types`; the wrapper uses a narrow RPC client type so it remains typecheckable before regeneration.

## Verification

- `npm run db:reset` - passed.
- `npm run db:lint` - passed.
- `npm run db:test` - passed, 162 tests.
- `npm run db:types` - passed.
- `npm run test:unit -- tests/unit/checkout/submit-checkout.test.ts` - passed, 3 tests.
- `npm run typecheck` - passed.

## Known Stubs

- `submit_checkout` creates pending-payment order and reservation records but does not capture payment, finalize inventory, release reservations, create entitlements, or create fulfillment records.
- Guest order follow-up access is represented by hashed token storage and returned creation token, but a public order-status page is not part of this plan.
- Deep DB-side authoritative quote recalculation is represented by accepted quote validation and persisted snapshots in this slice; later hardening can move more quote recomputation into SQL if Phase 4 requires it.

## Threat Flags

None open for this plan. Browser-submitted prices remain confined to the submit RPC boundary, order lines become immutable snapshots, direct reservation access is denied to anon/authenticated users, and payment/fulfillment behavior is intentionally absent.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Plan 03-05. Checkout now has the order/reservation primitives that market exception grants can validate and consume atomically during submit.

## Self-Check: PASSED

- Created files exist for checkout schema, RLS/concurrency tests, submit wrapper, contact UI, and unit tests.
- Task commit exists: `efd09f2`.
- Verification commands listed above passed after the final migration fix.

---
*Phase: 03-mixed-cart-and-checkout*
*Completed: 2026-06-15*
