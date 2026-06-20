---
phase: 05-fulfillment-and-purchase-access
plan: "07"
subsystem: account-purchase-access
tags: [account, order-history, pattern-library, downloads, owner-scoped]
requires:
  - phase: 05-fulfillment-and-purchase-access
    plan: "02"
    provides: entitlement-checked download route and signed URL boundary
provides:
  - Owner-scoped signed-in order history page
  - Grouped pattern library with repeated purchase history
  - Localized English and Vietnamese account purchase routes
  - Download actions mediated through /api/downloads only
  - Unit, e2e-list, security, typecheck, and lint coverage
affects: [phase-05, account, digital-fulfillment, storefront]
tech-stack:
  added: []
  patterns: [injectable owner-scoped account query helpers, server-rendered account routes, app-route-mediated downloads]
key-files:
  created:
    - src/fulfillment/account-queries.ts
    - src/app/[locale]/account/orders/account-orders-page.tsx
    - src/app/[locale]/account/orders/page.tsx
    - src/app/[locale]/account/patterns/pattern-library-page.tsx
    - src/app/[locale]/account/patterns/page.tsx
    - src/app/[locale]/tai-khoan/don-hang/page.tsx
    - src/app/[locale]/tai-khoan/mau-pdf/page.tsx
    - src/components/fulfillment/account-order-history.tsx
    - src/components/fulfillment/pattern-library.tsx
    - src/components/fulfillment/pattern-library-card.tsx
    - tests/unit/fulfillment/account-access.test.ts
    - tests/e2e/account-purchases.spec.ts
  modified:
    - src/messages/en.json
    - src/messages/vi.json
    - tests/security/fulfillment-boundaries.test.mjs
key-decisions:
  - "Account queries accept the signed-in user id and apply owner predicates before projecting order and entitlement rows."
  - "Repeated PDF purchases are grouped by product/pattern while retaining individual order and entitlement history inside each group."
  - "Pattern library download controls post only entitlement ids to /api/downloads; UI never renders signed URLs, storage paths, bucket names, token hashes, or service-role details."
patterns-established:
  - "Account purchase pages share small server page modules with localized route aliases for English and Vietnamese paths."
  - "Fulfillment security boundary tests now include account library surfaces in addition to admin and download surfaces."
requirements-completed: [DIG-05, ACC-02]
duration: 35 min
completed: 2026-06-20
---

# Phase 05 Plan 07: Account Purchase Access Summary

Implemented signed-in account purchase access: customers can view their own order history and a grouped PDF pattern library, with download actions still mediated by the secure app route.

## Performance

- **Duration:** 35 min
- **Completed:** 2026-06-20
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments

- Added owner-scoped account query helpers for order history and pattern library projections.
- Added signed-in account order history pages for `/account/orders` and Vietnamese `/tai-khoan/don-hang`.
- Added grouped pattern library pages for `/account/patterns` and Vietnamese `/tai-khoan/mau-pdf`.
- Built responsive order history, pattern library, and pattern card components.
- Added English and Vietnamese account purchase copy.
- Added unit contracts for owner-only access, anonymous denial, repeated purchase grouping, and download action safety.
- Added e2e route/list contracts for English and Vietnamese account purchase surfaces.
- Extended fulfillment static security checks to cover account purchase library files.

## Task Commits

1. **Task 1 and Task 2: Owner-scoped account order history and pattern library** - `7ef75ac5` (`feat(05-07)`)

## Files Created/Modified

- `src/fulfillment/account-queries.ts` - Owner-scoped order history and grouped pattern library helpers.
- `src/app/[locale]/account/orders/account-orders-page.tsx` - Shared server page for account order history.
- `src/app/[locale]/account/orders/page.tsx` - English account order route.
- `src/app/[locale]/account/patterns/pattern-library-page.tsx` - Shared server page for account pattern library.
- `src/app/[locale]/account/patterns/page.tsx` - English account pattern library route.
- `src/app/[locale]/tai-khoan/don-hang/page.tsx` - Vietnamese account order route alias.
- `src/app/[locale]/tai-khoan/mau-pdf/page.tsx` - Vietnamese account pattern library route alias.
- `src/components/fulfillment/account-order-history.tsx` - Order history UI.
- `src/components/fulfillment/pattern-library.tsx` - Pattern library grouping UI.
- `src/components/fulfillment/pattern-library-card.tsx` - Pattern purchase card and download form UI.
- `src/messages/en.json` - English purchase access messages.
- `src/messages/vi.json` - Vietnamese purchase access messages.
- `tests/unit/fulfillment/account-access.test.ts` - Owner-only, grouping, and download boundary contracts.
- `tests/e2e/account-purchases.spec.ts` - Account purchase route/list contracts.
- `tests/security/fulfillment-boundaries.test.mjs` - Static checks for account library download boundaries.

## Decisions Made

- The account pages require a signed-in user before querying purchases, then pass that user id into owner-scoped helper functions.
- Grouping uses product/pattern identity as the library key while preserving purchase history entries with order, entitlement, payment, and timestamp context.
- Download forms submit to `/api/downloads` and do not expose storage object data, signed URL material, token hashes, or service-role configuration.

## Deviations from Plan

### Auto-fixed Issues

**1. Vietnamese account purchase route aliases added alongside planned English account routes**
- **Found during:** Route coverage implementation
- **Issue:** The plan required localized route coverage, while only English path files were explicitly listed.
- **Fix:** Added `/tai-khoan/don-hang` and `/tai-khoan/mau-pdf` aliases that reuse the same server page modules.
- **Automated check:** `npm run test:e2e -- tests/e2e/account-purchases.spec.ts --list` lists English and Vietnamese scenarios.

---

**Total deviations:** 1 auto-fixed.
**Impact on plan:** No scope reduction; localized route coverage is stronger.

## Issues Encountered

- None blocking.
- `npm run lint` passes with pre-existing warnings outside this plan.

## Automated Checks

- `npm run test:unit -- tests/unit/fulfillment/account-access.test.ts` - passed, 2 tests.
- `npm run test:e2e -- tests/e2e/account-purchases.spec.ts --list` - passed, 3 scenarios listed.
- `npm run typecheck` - passed.
- `npm run test:security` - passed, 18 tests.
- `npm run lint` - passed with pre-existing warnings.

## User Setup Required

None.

## Next Phase Readiness

Wave 3 is complete. Plan 05-06 can proceed with admin entitlement revoke/reissue work using the download, email, and account access foundations now in place. Plan 05-08 can proceed on customer-facing fulfillment status communications.

---
*Phase: 05-fulfillment-and-purchase-access*
*Completed: 2026-06-20*
