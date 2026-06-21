---
phase: 06-customer-retention-and-trust
plan: "04"
subsystem: account-retention
tags: [wishlist, catalog, product-detail, auth-redirect, lucide, next-intl]
requires:
  - phase: 06-customer-retention-and-trust
    provides: Product-reference wishlist storage and remove actions from Plan 06-03
provides:
  - Accessible wishlist heart control for product discovery surfaces
  - Idempotent wishlist add/remove actions with owner derived server-side
  - Localized guest sign-in return for product wishlist intent
affects: [catalog, product-detail, auth, account-wishlist, phase-06]
tech-stack:
  added: []
  patterns:
    - Client heart control backed by server actions
    - Dynamic localized safe-redirect allowlist for product/category/collection/order return paths
key-files:
  created:
    - src/components/catalog/wishlist-heart.tsx
  modified:
    - src/account/wishlist-actions.ts
    - src/components/catalog/product-card.tsx
    - src/app/[locale]/product/[productSlug]/page.tsx
    - src/auth/redirect.ts
    - src/messages/en.json
    - src/messages/vi.json
    - tests/unit/account/wishlist.test.ts
    - tests/e2e/account-retention.spec.ts
key-decisions:
  - "Wishlist hearts do not create guest wishlist records; guests are sent to localized sign-in with a sanitized relative return path."
  - "The heart control defaults unselected on public surfaces and reflects selected state immediately after successful add/remove actions."
patterns-established:
  - "Product-surface wishlist forms pass only product id, locale, and safe return context; owner id is always server-derived."
  - "Dynamic customer-facing routes must be explicitly allowlisted before auth redirect helpers preserve them."
requirements-completed: [ACC-04]
duration: 14 min
completed: 2026-06-21
---

# Phase 06 Plan 04: Wishlist Heart Controls Summary

**Accessible catalog and product-detail wishlist hearts with server-owned mutations and localized guest sign-in return**

## Performance

- **Duration:** 14 min
- **Started:** 2026-06-21T09:37:00+07:00
- **Completed:** 2026-06-21T09:51:30+07:00
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Added RED contracts for product-surface wishlist hearts, selected state, 44px target, `aria-pressed`, and guest sign-in return.
- Added idempotent wishlist add action and reused remove action with server-derived owner id.
- Added `WishlistHeart` using lucide `Heart`, pending labels, accessible names, and stable 44px hit area.
- Integrated hearts into catalog cards and product detail pages without removing primary product/checkout actions.
- Extended safe redirects to preserve explicit localized dynamic product/category/collection/order paths.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add wishlist heart behavior contracts** - `5be0fb5` (test)
2. **Task 2: Implement catalog and product detail heart controls** - `56fa01b` (feat)

**Plan metadata:** this summary commit

## Files Created/Modified

- `src/components/catalog/wishlist-heart.tsx` - Accessible heart control backed by add/remove server actions.
- `src/account/wishlist-actions.ts` - Added idempotent add helper/action and return-context-aware remove.
- `src/components/catalog/product-card.tsx` - Added heart overlay on the image boundary.
- `src/app/[locale]/product/[productSlug]/page.tsx` - Added detail-page heart near the product title and purchase area.
- `src/auth/redirect.ts` - Added safe dynamic localized route handling and `wishlistSignInPath`.
- `src/messages/en.json` - Added English wishlist heart labels.
- `src/messages/vi.json` - Added Vietnamese wishlist heart labels.
- `tests/unit/account/wishlist.test.ts` - Added add/redirect/no-guest-persistence contracts.
- `tests/e2e/account-retention.spec.ts` - Added skipped product-surface heart browser contracts.

## Decisions Made

- Guest wishlist intent is represented only by a safe auth return URL, not by browser storage, cart state, or merge UI.
- Dynamic return paths are allowlisted by concrete localized route patterns rather than accepting arbitrary locale-prefixed URLs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Preserved dynamic product return paths in safe redirects**
- **Found during:** Task 2 (Implement catalog and product detail heart controls)
- **Issue:** Existing `safeRedirect` only accepted static routes from `pathnames`, so `/en/product/pink-bunny` and `/vi/san-pham/tho-hong` were rejected and collapsed to locale home.
- **Fix:** Added explicit dynamic localized route matchers for product, category, collection, and order return paths.
- **Files modified:** `src/auth/redirect.ts`
- **Verification:** `npm run test:unit -- tests/unit/account/wishlist.test.ts`, `npm run typecheck`
- **Committed in:** `56fa01b`

---

**Total deviations:** 1 auto-fixed (missing critical)
**Impact on plan:** The fix was required for D-08 guest return behavior and kept redirect safety bounded.

## Issues Encountered

- Initial GREEN run failed one unit test because dynamic product paths were not accepted by `safeRedirect`; root cause was the static-only allowlist. Fixed with concrete dynamic route matchers.

## Verification

- `npm run test:unit -- tests/unit/account/wishlist.test.ts` - passed, 8 tests.
- `npm run test:e2e -- tests/e2e/account-retention.spec.ts --list` - passed, 14 listed contracts.
- `npm run typecheck` - passed.
- `npm run build` - passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 06-05 can build on the completed product-surface wishlist mutation path. Plan 06-10 still owns authenticated fixture activation for skipped browser contracts.

---
*Phase: 06-customer-retention-and-trust*
*Completed: 2026-06-21*
