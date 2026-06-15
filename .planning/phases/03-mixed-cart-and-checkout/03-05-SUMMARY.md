---
phase: 03-mixed-cart-and-checkout
plan: "05"
subsystem: checkout-market-exceptions
tags: [nextjs, supabase, postgres, rls, checkout, market-exceptions, inventory, reservations, vitest, pgtap, playwright]

requires:
  - phase: 03-mixed-cart-and-checkout
    provides: Market-aware cart quotes, shipping quotes, discounts, checkout orders, and inventory reservations from Plans 03-01 through 03-04
provides:
  - Non-binding market exception request records for unavailable physical destinations
  - Admin-only exception queue with approve/reject actions and masked customer contact in list views
  - Scoped 48-hour exception grants with hashed bearer tokens, generic invalid responses, and exact product/variant/market/country scope
  - Approved exception pages that validate tokens without exposing raw secrets or fulfillment behavior
  - Atomic exception grant consumption inside submit_checkout with the same order and reservation transaction
  - Security, database, integration, route-smoke, build, and type coverage for Phase 3 boundaries
affects: [payments, checkout, inventory release, fulfillment, digital entitlements, admin commerce]

tech-stack:
  added: []
  patterns:
    - Exception grants are bearer-token permissions stored only as SHA-256 hashes and consumed inside the checkout RPC transaction
    - Public exception request creation and grant validation use fixed-search-path security-definer RPCs with explicit grants
    - Browser-facing exception UI stays pre-payment and pre-fulfillment, with generic invalid/expired messaging

key-files:
  created:
    - supabase/migrations/20260615033000_market_exceptions.sql
    - src/checkout/exceptions.ts
    - src/checkout/exception-actions.ts
    - src/components/checkout/exception-request-form.tsx
    - src/components/checkout/approved-exception-page.tsx
    - src/components/admin/commerce/exception-review.tsx
    - src/app/[locale]/exception-request/page.tsx
    - src/app/[locale]/exception-request/approved/page.tsx
    - src/app/[locale]/yeu-cau-ngoai-le/page.tsx
    - src/app/admin/exceptions/page.tsx
    - tests/e2e/market-exception.spec.ts
    - tests/integration/checkout-concurrency.mjs
    - tests/security/checkout-boundaries.test.mjs
    - tests/unit/checkout/exceptions.test.ts
  modified:
    - package.json
    - src/types/supabase.ts
    - supabase/tests/database/03_checkout_concurrency.test.sql
    - supabase/tests/database/03_checkout_model.test.sql
    - supabase/tests/database/03_checkout_rls.test.sql
    - tests/security/catalog-boundaries.test.mjs

key-decisions:
  - "Exception requests remain non-binding customer signals; no stock reservation happens until submit_checkout succeeds."
  - "Admin approvals create scoped, expiring grants instead of permanent market availability overrides."
  - "Grant validation can display approved-link state, but grant consumption happens only inside submit_checkout after exact quote scope checks and row locks."
  - "Phase 3 still excludes payment capture, VietQR instructions, PayPal buttons, digital entitlements, emails, and fulfillment records."

patterns-established:
  - "Sensitive checkout bearer tokens must be hashed before storage and should never be logged or stored in client-side cart state."
  - "Exceptional commerce paths must preserve the ordinary checkout transaction boundary for price, shipping, discount, inventory, and idempotency checks."
  - "Security tests for phase boundaries use Node's built-in test runner with .mjs files on the current Node runtime."

requirements-completed: [SHIP-04, SHIP-05, MKT-06, INV-02, INV-03]

duration: 42 min
completed: 2026-06-15
---

# Phase 03 Plan 05: Market Exceptions Summary

**Scoped market exception requests and grants with admin review, approved-link validation, and atomic checkout consumption**

## Performance

- **Duration:** 42 min
- **Started:** 2026-06-15T06:31:00Z
- **Completed:** 2026-06-15T07:13:00Z
- **Tasks:** 3
- **Files modified:** 21

## Accomplishments

- Added exception request and grant schema, RLS, explicit grants, request RPC, validation RPC, and a replacement `submit_checkout` RPC that locks and consumes valid grants inside the checkout transaction.
- Added checkout exception server helpers/actions for request creation, admin approval/rejection, token generation, token hashing, masked emails, and validation.
- Added localized request and approved-link pages plus an admin exception review screen.
- Converted checkout security tests to Node-compatible `.mjs` coverage and added static integration guards for grant locking and single-use consumption.
- Re-ran database, typecheck, unit, security, lint, build, and route-smoke gates after the transaction fix.

## Task Commits

Each task was committed atomically:

1. **Tasks 1-3: Exception schema, admin UI, approved links, checkout consumption, and verification** - `30a7177` (feat)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `supabase/migrations/20260615033000_market_exceptions.sql` - Exception request/grant tables, request/validate RPCs, RLS/grants, and grant-consuming `submit_checkout` replacement.
- `src/checkout/exceptions.ts` and `src/checkout/exception-actions.ts` - Server helpers/actions for request creation, admin decisions, token hashing, validation, and safe result mapping.
- `src/components/checkout/exception-request-form.tsx` - Public non-binding exception request form.
- `src/components/checkout/approved-exception-page.tsx` - Approved-link token validation page with generic invalid state.
- `src/components/admin/commerce/exception-review.tsx` and `src/app/admin/exceptions/page.tsx` - Admin review list and approve/reject controls.
- `src/app/[locale]/exception-request/page.tsx`, `src/app/[locale]/exception-request/approved/page.tsx`, and `src/app/[locale]/yeu-cau-ngoai-le/page.tsx` - Localized public routes.
- `tests/unit/checkout/exceptions.test.ts` - Pure helper and validation wrapper tests.
- `tests/security/checkout-boundaries.test.mjs` and `tests/security/catalog-boundaries.test.mjs` - Phase boundary tests on the current Node test runner.
- `tests/integration/checkout-concurrency.mjs` - Static assertions for idempotency, row locks, reservations, and grant consumption.
- `tests/e2e/market-exception.spec.ts` - Browser-level route/form expectations, currently blocked by local dev-server ownership.

## Decisions Made

- Kept exception request submission generic and physical-product-only at the database boundary.
- Kept approval as an admin server action using server-side authorization and service client writes rather than exposing table access to customers.
- Replaced `submit_checkout` in the 03-05 migration rather than editing prior migration history, so fresh databases apply the original checkout RPC first and then the grant-aware version.
- Left payment provider and fulfillment behavior out of exception pages to preserve the Phase 4/5 boundary.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Converted TypeScript security test entrypoints to `.mjs`**
- **Found during:** Task 3 verification (`npm run test:security`)
- **Issue:** Node's built-in test runner in the current project setup could not execute `.ts` security tests directly.
- **Fix:** Converted the catalog boundary test to `.mjs`, added the checkout boundary test as `.mjs`, and updated `package.json`.
- **Files modified:** `package.json`, `tests/security/catalog-boundaries.test.mjs`, `tests/security/checkout-boundaries.test.mjs`
- **Verification:** `npm run test:security` passed.
- **Committed in:** `30a7177`

**2. [Rule 2 - Missing Critical] Added atomic grant consumption to `submit_checkout`**
- **Found during:** Final plan review before commit
- **Issue:** Exception grants were created and validated, but checkout submit was not yet locking and consuming the grant in the same transaction as order/reservation creation.
- **Fix:** Added a grant-aware `submit_checkout` replacement in the 03-05 migration. It hashes the raw token, locks the active grant row, checks exact quote scope, creates the order and reservations, and marks the grant `used` with `consumed_order_id`.
- **Files modified:** `supabase/migrations/20260615033000_market_exceptions.sql`, `tests/integration/checkout-concurrency.mjs`
- **Verification:** `npm run db:reset`, `npm run db:lint`, `npm run db:test`, and `node tests/integration/checkout-concurrency.mjs` passed.
- **Committed in:** `30a7177`

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical).
**Impact on plan:** Both fixes were required to satisfy the planned security and concurrency boundary. No Phase 4 payment or Phase 5 fulfillment scope was added.

## Issues Encountered

- Top-level imports from `src/checkout/exceptions.ts` initially pulled `server-only` into unit tests through admin helpers. Dynamic imports now keep pure token/masking helpers unit-testable while preserving server-only behavior for actions.
- Generated Supabase types did not include exception tables/RPCs until `npm run db:types` ran after the migration reset.
- `npx playwright test tests/e2e/market-exception.spec.ts` could not start because a pre-existing Next dev server was already running for this repo on `localhost:3000`, PID 25172. I did not stop that process. Route smoke against `http://127.0.0.1:3000` passed for the public request and invalid approved-link pages.

## Verification

- `npm run db:reset` - passed.
- `npm run db:lint` - passed.
- `npm run db:test` - passed, 178 tests.
- `npm run db:types` - passed.
- `npm run typecheck` - passed.
- `npm run test:unit -- tests/unit/checkout/exceptions.test.ts tests/unit/checkout/submit-checkout.test.ts` - passed, 6 tests.
- `npm run test:security` - passed, 3 tests.
- `node tests/integration/checkout-concurrency.mjs` - passed.
- `npm run lint` - passed with 6 pre-existing warnings and 0 errors.
- `npm run build` - passed.
- Route smoke via `Invoke-WebRequest` against `http://127.0.0.1:3000/en/exception-request` and `/en/exception-request/approved?token=bad-token` - passed.
- `npx playwright test tests/e2e/market-exception.spec.ts` - blocked by existing Next dev server on PID 25172.

## Known Stubs

- Approved exception pages validate and display grant scope but do not yet provide a full prefilled checkout journey. The server-side submit boundary is grant-aware and ready for that UI wiring.
- Exception grants do not create permanent market availability or shipping rules; they only authorize one scoped checkout submit.
- Payment capture, VietQR instructions, inventory finalization/release, email, digital entitlement, and fulfillment remain later-phase work.

## Threat Flags

None open for this plan. Raw grant tokens are not stored, invalid tokens return generic responses, admin review is server-authorized, table access remains RLS-protected, and grant consumption now shares the checkout transaction boundary.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 3 has its planned mixed-cart, shipping, discounts, order shell, reservation, and market-exception primitives. The next phase can build payment initiation/confirmation on top of pending-payment orders without needing to invent a second checkout persistence path.

## Self-Check: PASSED WITH PLAYWRIGHT CAVEAT

- Created files exist for exception schema, admin review, public routes, validation pages, tests, and generated types.
- Targeted database, unit, security, integration, typecheck, lint, build, and route-smoke checks passed.
- Playwright spec exists but could not run under the configured webServer while the user-owned Next dev process was active.

---
*Phase: 03-mixed-cart-and-checkout*
*Completed: 2026-06-15*
