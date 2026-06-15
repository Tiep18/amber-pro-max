---
phase: 03-mixed-cart-and-checkout
plan: "03"
subsystem: discounts-checkout
tags: [nextjs, supabase, postgres, rls, discounts, checkout, playwright, vitest]

requires:
  - phase: 03-mixed-cart-and-checkout
    provides: Intent-only cart quote hydration from Plan 03-01 and destination-aware shipping totals from Plan 03-02
provides:
  - Admin-managed percentage and fixed discount codes with market, schedule, usage, customer, product, category, collection, and minimum-spend restrictions
  - Discount redemption tracking structures for later atomic checkout/order commits
  - Quote-safe RPCs for fetching one discount code and product discount scopes without exposing admin tables
  - Server-only discount validation and deterministic integer allocation across eligible quote lines
  - Checkout apply/remove discount UI that never writes validated discount state to browser cart storage
  - Focused database, unit, and browser coverage for admin discounts and checkout discount application
affects: [checkout drafts, inventory reservations, payments, order snapshots, fulfillment]

tech-stack:
  added: []
  patterns:
    - Discount tables stay admin-only under RLS; checkout reads scoped data through constrained RPCs
    - Discount allocation is pure integer-minor-unit logic before quote integration
    - Checkout discount code state stays in component/action input only, not guest cart localStorage

key-files:
  created:
    - supabase/migrations/20260615031000_discounts.sql
    - src/checkout/discounts.ts
    - src/checkout/admin-discount-actions.ts
    - src/components/admin/commerce/discount-code-form.tsx
    - src/components/admin/commerce/disable-discount-code-button.tsx
    - src/components/checkout/discount-code-form.tsx
    - src/app/admin/discounts/page.tsx
    - tests/unit/checkout/discounts.test.ts
    - tests/e2e/admin-discounts.spec.ts
    - tests/e2e/checkout.spec.ts
  modified:
    - supabase/tests/database/03_checkout_quote.test.sql
    - src/types/supabase.ts
    - src/checkout/types.ts
    - src/checkout/quote.ts
    - src/checkout/actions.ts
    - src/components/checkout/checkout-page.tsx
    - src/components/checkout/order-summary.tsx
    - src/auth/redirect.ts

key-decisions:
  - "Discount code tables remain private to admin users; guest checkout uses get_checkout_discount_code() and get_checkout_product_discount_scopes() for narrowly scoped quote data."
  - "Customer-targeted discounts require a signed-in user ID; guests receive a safe customer_required not-eligible state."
  - "Discount code removal is implemented as disable instead of destructive delete so redemption history and later order references remain intact."
  - "Validated discount state is never persisted in guest cart localStorage; apply/remove always returns a fresh server quote."

patterns-established:
  - "Commercial modifiers should be represented in CartQuote with line-level allocation data for later immutable order snapshots."
  - "Admin commercial controls use create/list/disable flows guarded by requireAdmin and RLS-backed policies."
  - "Checkout quote-safe RPCs may expose only the specific data needed to recalculate the submitted cart."

requirements-completed: [DISC-01, DISC-02, DISC-03, CART-03]

duration: 20 min
completed: 2026-06-15
---

# Phase 03 Plan 03: Discount Administration and Quote Allocation Summary

**Admin discount management with server-only eligibility checks and deterministic line-level quote allocations**

## Performance

- **Duration:** 20 min
- **Started:** 2026-06-15T05:25:00Z
- **Completed:** 2026-06-15T05:45:00Z
- **Tasks:** 2
- **Files modified:** 18

## Accomplishments

- Added discount schema, restriction join tables, redemption tracking, RLS, grants, indexes, and constrained checkout RPCs.
- Added admin discount list/create/disable UI with percentage and fixed-code inputs, market and minimum-spend preview, usage limits, and server-side admin actions.
- Added pure discount validation and allocation logic for invalid, inactive, scheduled, exhausted, wrong-market, wrong-currency, minimum-spend, customer-targeted, and no-eligible-line outcomes.
- Integrated discounts into authoritative cart quotes after subtotal and before shipping total, including line-level allocation snapshots.
- Added checkout apply/remove discount UI that refreshes quotes through Server Actions and keeps guest cart localStorage intent-only.
- Added pgTAP, Vitest, and Playwright coverage for discount schema, allocation, admin management, checkout apply/remove, and destination-regression behavior.

## Task Commits

Each task was committed atomically:

1. **Tasks 1/2: Discount schema, admin UI, quote allocation, and tests** - `bf05f74` (feat)

**Plan metadata:** pending in docs commit

## Files Created/Modified

- `supabase/migrations/20260615031000_discounts.sql` - Discount tables, restrictions, redemption tracking, RLS, grants, and quote-safe RPCs.
- `src/checkout/discounts.ts` - Server-side discount validation and deterministic integer allocation helpers.
- `src/checkout/quote.ts`, `src/checkout/types.ts`, and `src/checkout/actions.ts` - Discount-aware quote hydration, line allocations, totals, and user-aware validation.
- `src/app/admin/discounts/page.tsx`, `src/checkout/admin-discount-actions.ts`, and `src/components/admin/commerce/*discount*` - Admin discount management UI/actions.
- `src/components/checkout/discount-code-form.tsx`, `src/components/checkout/checkout-page.tsx`, and `src/components/checkout/order-summary.tsx` - Customer discount apply/remove UI and order summary display.
- `tests/unit/checkout/discounts.test.ts`, `tests/e2e/admin-discounts.spec.ts`, `tests/e2e/checkout.spec.ts`, and `supabase/tests/database/03_checkout_quote.test.sql` - Focused verification.

## Decisions Made

- Used constrained public RPCs for checkout discount data, matching the Plan 03-02 shipping pattern, rather than granting broader table access.
- Stored future redemption data in `discount_redemptions` with pending/committed/void status but did not increment usage during quote application; Plan 03-04 owns atomic checkout persistence.
- Kept customer-targeted discounts signed-in only. Guest attempts return a safe not-eligible state instead of relying on unverified email.
- Used disable as the admin removal path to preserve history and future order references.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added quote-safe discount RPCs instead of exposing discount tables**
- **Found during:** Task 2 (Quote validation integration)
- **Issue:** Guest checkout needs discount data, but discount tables are admin-only and should not be readable through direct Data API access.
- **Fix:** Added `get_checkout_discount_code()` and `get_checkout_product_discount_scopes()` with narrow inputs/outputs for quote recalculation.
- **Files modified:** `supabase/migrations/20260615031000_discounts.sql`, `src/checkout/quote.ts`, `src/types/supabase.ts`
- **Verification:** `npm run db:reset`, `npm run db:lint`, `npm run db:test`, `npm run db:types`, `npm run typecheck`, and discount checkout E2E passed.
- **Committed in:** `bf05f74`

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** The fix preserves the intended security boundary and completes category/collection restriction validation without opening admin tables.

## Issues Encountered

- Playwright grep containing `|` was interpreted by PowerShell, so the final browser verification ran the three relevant spec files directly instead of using a piped regex.
- Some Playwright locators needed tighter scoping because repeated money values appear as both subtotal and total.

## Verification

- `npm run db:reset` - passed.
- `npm run db:lint` - passed.
- `npm run db:test` - passed, 122 tests.
- `npm run db:types` - passed.
- `npx vitest run tests/unit/checkout/discounts.test.ts tests/unit/checkout/quote-diff.test.ts` - passed, 7 tests.
- `npm run typecheck` - passed.
- `npx playwright test tests/e2e/admin-discounts.spec.ts tests/e2e/checkout.spec.ts tests/e2e/checkout-market-change.spec.ts` - passed, 3 tests.

## Known Stubs

- Discount quote application does not reserve usage or create final redemption history yet. Plan 03-04 owns the atomic checkout draft/order transaction boundary.
- Admin restriction assignment UI is backed by schema/RPC/allocator support but currently exposes the basic create/list/disable workflow; richer edit screens can build on the same tables.

## Threat Flags

None open for this plan. Discount tampering is mitigated by server-only validation, integer money allocation, admin-only table mutation, and quote-safe RPC boundaries.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Plan 03-04. Accepted quotes now include subtotal, shipping, discount status, total, and line-level discount allocation fields suitable for checkout draft snapshots and inventory reservation work.

## Self-Check: PASSED

- Created files exist for discount schema, domain logic, admin UI/actions, checkout UI, and tests.
- Task commit exists: `bf05f74`.
- Verification commands listed above passed after final implementation.

---
*Phase: 03-mixed-cart-and-checkout*
*Completed: 2026-06-15*
