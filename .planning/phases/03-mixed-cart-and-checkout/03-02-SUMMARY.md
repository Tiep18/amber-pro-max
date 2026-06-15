---
phase: 03-mixed-cart-and-checkout
plan: "02"
subsystem: shipping-checkout
tags: [nextjs, supabase, postgres, rls, shipping, checkout, playwright, vitest]

requires:
  - phase: 03-mixed-cart-and-checkout
    provides: Intent-only mixed cart storage and server-owned cart quote hydration from Plan 03-01
provides:
  - Admin-managed shipping profiles, destination rules, and product or variant shipping attachments
  - Deterministic physical-only shipping calculator with highest-first-item and additional-unit fees
  - Quote-safe RPC for resolving active shipping rules without exposing admin shipping tables
  - Localized checkout routes with destination input, order summary, and material-change confirmation dialog
  - Destination-driven market revalidation that previews price, currency, availability, shipping, and total changes before applying them
  - Focused database, unit, and browser coverage for shipping admin and checkout destination changes
affects: [checkout drafts, discounts, inventory reservations, payments, order totals, fulfillment]

tech-stack:
  added: []
  patterns:
    - Admin shipping mutations use server actions guarded by requireAdmin plus RLS-backed tables
    - Public checkout quote hydration reads shipping fee data through a constrained security-definer RPC
    - Client destination changes produce proposed quotes and only replace the accepted quote after explicit confirmation

key-files:
  created:
    - src/checkout/shipping.ts
    - src/checkout/market-revalidation.ts
    - src/checkout/admin-shipping-actions.ts
    - src/components/admin/commerce/shipping-profile-form.tsx
    - src/components/admin/commerce/deactivate-shipping-profile-button.tsx
    - src/components/checkout/checkout-page.tsx
    - src/components/checkout/destination-form.tsx
    - src/components/checkout/order-summary.tsx
    - src/components/checkout/quote-diff-dialog.tsx
    - src/app/[locale]/checkout/page.tsx
    - src/app/[locale]/thanh-toan/page.tsx
    - src/app/admin/shipping/page.tsx
    - tests/unit/checkout/shipping.test.ts
    - tests/e2e/admin-shipping.spec.ts
    - tests/e2e/checkout-market-change.spec.ts
  modified:
    - supabase/migrations/20260615030000_shipping_profiles.sql
    - supabase/tests/database/02_catalog_storage.test.sql
    - supabase/tests/database/03_checkout_quote.test.sql
    - src/types/supabase.ts
    - src/checkout/types.ts
    - src/checkout/quote.ts
    - src/checkout/actions.ts
    - src/components/cart/cart-page.tsx
    - src/components/cart/mini-cart.tsx
    - src/i18n/routing.ts
    - src/proxy.ts
    - src/auth/redirect.ts
    - tests/unit/checkout/quote-diff.test.ts

key-decisions:
  - "Shipping profile tables remain admin-only; checkout resolves only active fee rows for requested product, variant, and country IDs through get_checkout_shipping_rules()."
  - "Digital-only quotes return no_shipping_required without requiring a destination, while physical or mixed carts require a valid destination before continuing."
  - "Admin profile removal is implemented as deactivate instead of destructive delete so attachments and historical intent remain inspectable while checkout ignores inactive profiles and rules."
  - "Supabase Storage direct SQL delete tests now assert the platform boundary blocks direct storage.objects deletion; app code should use the Storage API boundary."

patterns-established:
  - "Shipping calculators are pure and deterministic, with browser tests reserved for admin and accepted-quote workflows."
  - "Material checkout changes are presented as proposed server quotes until the shopper confirms the complete change set."
  - "Localized physical routes added outside next-intl rewriting must be added to the proxy allowlist."

requirements-completed: [MKT-06, SHIP-01, SHIP-02, SHIP-03]

duration: 64 min
completed: 2026-06-15
---

# Phase 03 Plan 02: Shipping Profiles and Destination Quote Revalidation Summary

**Admin-managed shipping profiles with deterministic physical-only fees and blocking destination-change quote previews for mixed checkout**

## Performance

- **Duration:** 64 min
- **Started:** 2026-06-15T04:20:00Z
- **Completed:** 2026-06-15T05:23:23Z
- **Tasks:** 3
- **Files modified:** 29

## Accomplishments

- Added shipping profile, rule, and product or variant attachment schema with admin RLS, grants, indexes, and quote support RPC.
- Added a deterministic shipping calculator that charges the highest first-item fee once, applies additional-item fees to the remaining physical units, and ignores digital lines.
- Added admin shipping profile create/list/deactivate UI and server actions guarded by `requireAdmin`.
- Added localized checkout pages with destination entry, physical-only shipping summary, unsupported-destination blocking, and no-destination requirement for digital-only carts.
- Added material-change quote preview dialog so destination-driven market, currency, price, availability, shipping, and total changes are not silently applied.
- Added database, unit, and browser coverage for shipping profiles, quote rules, admin UI, destination revalidation, and digital-only no-shipping behavior.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Shipping rule tests** - `d66a76b` (test)
2. **Task 1 GREEN: Shipping profiles and rules** - `13cda01` (feat)
3. **Task 2/3 GREEN: Shipping admin and destination quote flow** - `24ab7d4` (feat)
4. **Task 2/3 Tests and final behavior coverage** - `7fcf3c3` (test)

**Plan metadata:** pending in docs commit

## Files Created/Modified

- `supabase/migrations/20260615030000_shipping_profiles.sql` - Shipping profile/rule tables, attachment tables, admin RLS, grants, and quote-safe RPC.
- `src/checkout/shipping.ts` - Deterministic physical-unit shipping fee selection.
- `src/checkout/quote.ts` and `src/checkout/types.ts` - Destination-aware quote hydration, shipping states, totals, and digital-only no-shipping behavior.
- `src/checkout/actions.ts` and `src/checkout/market-revalidation.ts` - Destination quote action and material-change diffing.
- `src/checkout/admin-shipping-actions.ts` - Admin create and deactivate shipping profile actions.
- `src/components/admin/commerce/*shipping*` and `src/app/admin/shipping/page.tsx` - Admin shipping management UI.
- `src/components/checkout/*` and localized checkout pages - One-page checkout summary, destination form, and blocking quote-diff dialog.
- `src/components/cart/cart-page.tsx`, `src/components/cart/mini-cart.tsx`, `src/i18n/routing.ts`, `src/proxy.ts`, `src/auth/redirect.ts` - Checkout navigation, localized route support, proxy allowlist, and admin redirect allowlist.
- `tests/unit/checkout/shipping.test.ts`, `tests/unit/checkout/quote-diff.test.ts`, `tests/e2e/admin-shipping.spec.ts`, `tests/e2e/checkout-market-change.spec.ts`, and pgTAP tests - Focused verification.

## Decisions Made

- Public quote hydration uses `get_checkout_shipping_rules(uuid[], uuid[], text)` instead of granting anonymous access to shipping tables. This keeps fee data scoped to quoted cart identifiers and country.
- Deactivation is the admin removal path for this slice. It prevents future quote use while avoiding destructive history and attachment churn.
- Digital-only checkout does not ask for destination or calculate shipping. Mixed or physical carts remain blocked until destination shipping is ready or explicitly unsupported.
- Storage delete pgTAP assertions were corrected to match current Supabase Storage behavior: direct SQL deletes are blocked by `storage.protect_delete()`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Replaced direct anonymous shipping-table reads with a constrained RPC**
- **Found during:** Task 2 (Checkout quote integration)
- **Issue:** Public checkout quote hydration could not read admin-only shipping tables under RLS, and opening table reads would expose broader admin configuration.
- **Fix:** Added `get_checkout_shipping_rules()` as a stable security-definer RPC that returns only active rule rows for requested products, variants, and country.
- **Files modified:** `supabase/migrations/20260615030000_shipping_profiles.sql`, `src/checkout/quote.ts`, `src/types/supabase.ts`
- **Verification:** `npm run db:reset`, `npm run db:lint`, `npm run db:test`, `npm run db:types`, `npm run typecheck`, and checkout E2E passed.
- **Committed in:** `24ab7d4`

**2. [Rule 2 - Missing Critical] Added digital-only no-shipping behavior before checkout**
- **Found during:** Final verification
- **Issue:** Digital-only checkout could remain in `not_calculated` shipping state without a destination, which contradicted D-17 and could block checkout later.
- **Fix:** Quote hydration now returns `no_shipping_required` for carts with no payable physical lines, and a unit test locks that behavior.
- **Files modified:** `src/checkout/quote.ts`, `tests/unit/checkout/quote-diff.test.ts`
- **Verification:** Unit quote tests, typecheck, and checkout E2E passed.
- **Committed in:** `7fcf3c3`

**3. [Rule 2 - Missing Critical] Added admin deactivate flow for shipping profiles**
- **Found during:** Final plan review
- **Issue:** The admin page had create/list coverage but lacked a safe removal path with impact confirmation.
- **Fix:** Added a client-side confirmation button backed by an admin-only server action that deactivates the profile and its rules without deleting attachments or history.
- **Files modified:** `src/checkout/admin-shipping-actions.ts`, `src/components/admin/commerce/deactivate-shipping-profile-button.tsx`, `src/app/admin/shipping/page.tsx`, `tests/e2e/admin-shipping.spec.ts`
- **Verification:** Typecheck and admin shipping E2E passed.
- **Committed in:** `7fcf3c3`

---

**Total deviations:** 3 auto-fixed (2 missing critical, 1 blocking).
**Impact on plan:** All fixes tightened trust boundaries and completed planned behavior without adding payment, reservation, fulfillment, or order finalization scope.

## Issues Encountered

- Local Supabase Kong returned empty host responses after a database reset even though containers were running. Restarting `supabase_kong_Test_GSD` restored host API, REST, and Storage endpoints, then `npm run db:reset` passed.
- Existing Supabase Storage trigger behavior blocked direct SQL deletes from `storage.objects`; database tests were corrected to assert that boundary instead of bypassing it.
- Repeated admin E2E runs left duplicate profile names in the local database, so the spec now creates a unique profile name and uses non-strict locators for repeated fee preview text.

## Verification

- `npm run db:reset` - passed.
- `npm run db:lint` - passed.
- `npm run db:test` - passed, 110 tests.
- `npm run db:types` - passed.
- `npx vitest run tests/unit/checkout/shipping.test.ts tests/unit/checkout/quote-diff.test.ts` - passed, 9 tests.
- `npm run typecheck` - passed.
- `npx playwright test tests/e2e/admin-shipping.spec.ts tests/e2e/checkout-market-change.spec.ts` - passed, 2 tests.

## Known Stubs

- Checkout still stops at accepted quote and destination validation. Payment provider buttons, order draft persistence, inventory reservation, and paid fulfillment remain later plans in Phase 3.
- Discount eligibility is represented in the material-change comparison boundary but actual discount application remains Plan 03-03.

## Threat Flags

None open for this plan. Shipping fee tampering is mitigated by integer DB constraints, admin-only mutations, server-side quote recalculation, and the constrained RPC boundary for public quote hydration.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Plan 03-03. Checkout now has destination-aware totals and material-change confirmation, so discount eligibility and order draft work can rely on accepted server quotes without trusting browser-submitted prices or shipping fees.

## Self-Check: PASSED

- Created files exist for shipping calculator, admin shipping actions/UI, checkout destination UI, quote diff dialog, and browser tests.
- Task commits exist: `d66a76b`, `13cda01`, `24ab7d4`, `7fcf3c3`.
- Verification commands listed above passed after the final implementation.

---
*Phase: 03-mixed-cart-and-checkout*
*Completed: 2026-06-15*
