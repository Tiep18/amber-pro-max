---
phase: 06-customer-retention-and-trust
plan: "03"
subsystem: account-retention
tags: [wishlist, account, postgres, rls, next-intl, supabase]
requires:
  - phase: 06-customer-retention-and-trust
    provides: Saved-address account routing and authenticated account page patterns from Plan 06-01/06-02
provides:
  - Owner-scoped product-level wishlist storage
  - Current catalog hydration RPC for account wishlist rendering
  - Localized English and Vietnamese account wishlist pages
  - Wishlist remove action and ACC-04 contracts
affects: [account, catalog, checkout, authenticated-fixtures, phase-06]
tech-stack:
  added: []
  patterns:
    - Security-definer account hydration RPC over private catalog tables
    - Product-reference-only retention storage with current-fact rendering
key-files:
  created:
    - src/account/wishlist.ts
    - src/account/wishlist-actions.ts
    - src/components/account/wishlist-page.tsx
    - src/app/[locale]/account/wishlist/page.tsx
    - src/app/[locale]/account/wishlist/wishlist-page.tsx
    - src/app/[locale]/tai-khoan/yeu-thich/page.tsx
  modified:
    - supabase/migrations/20260620102618_customer_retention_trust.sql
    - supabase/tests/database/06_customer_retention.test.sql
    - src/types/supabase.ts
    - src/i18n/routing.ts
    - src/proxy.ts
    - src/messages/en.json
    - src/messages/vi.json
    - tests/unit/account/wishlist.test.ts
    - tests/e2e/account-retention.spec.ts
key-decisions:
  - "Wishlist rows store only user/product references and timestamps; all commercial facts are hydrated at render time."
  - "Account wishlist hydration uses a security-definer RPC so customers can read current public-safe catalog facts without direct catalog table grants."
patterns-established:
  - "Account retention pages pair route-local render helpers with locale-specific physical routes."
  - "Wishlist mutations delete by server-owned user id and product id, leaving cart state untouched."
requirements-completed: [ACC-04]
duration: 20 min
completed: 2026-06-20
---

# Phase 06 Plan 03: Account Wishlist Summary

**Owner-scoped wishlist storage with current market-aware catalog hydration and localized account rendering**

## Performance

- **Duration:** 20 min
- **Started:** 2026-06-20T22:40:00+07:00
- **Completed:** 2026-06-20T23:00:13+07:00
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments

- Added `wishlist_items` with owner RLS, product-level uniqueness, and explicit snapshot-column exclusions.
- Added `get_customer_wishlist` to hydrate current localized title, price, market availability, stock, image, and variant state.
- Added English and Vietnamese account wishlist routes with unavailable/out-of-stock disabled checkout state and authenticated remove.
- Added ACC-04 database, unit, and skipped authenticated browser contracts for Plan 06-10 fixture activation.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add wishlist account contracts** - `47c1ca8` (test)
2. **Task 2: Implement wishlist schema, actions, and account page** - `e10380c` (feat)

**Plan metadata:** this summary commit

## Files Created/Modified

- `supabase/migrations/20260620102618_customer_retention_trust.sql` - Added wishlist table, policies, grants, indexes, and hydration RPC.
- `supabase/tests/database/06_customer_retention.test.sql` - Added wishlist schema/RLS/reference-only contracts.
- `src/account/wishlist.ts` - Maps RPC/catalog facts into account wishlist items and checkout eligibility.
- `src/account/wishlist-actions.ts` - Removes product-level wishlist entries by authenticated owner.
- `src/components/account/wishlist-page.tsx` - Renders localized wishlist cards and disabled ineligible checkout state.
- `src/app/[locale]/account/wishlist/page.tsx` - English physical account wishlist route.
- `src/app/[locale]/account/wishlist/wishlist-page.tsx` - Shared server render helper for wishlist pages.
- `src/app/[locale]/tai-khoan/yeu-thich/page.tsx` - Vietnamese physical account wishlist route.
- `src/i18n/routing.ts` - Registered localized wishlist pathname.
- `src/proxy.ts` - Added wishlist routes to session-preserving protected paths.
- `src/messages/en.json` - Added English wishlist labels.
- `src/messages/vi.json` - Added Vietnamese wishlist labels.
- `src/types/supabase.ts` - Regenerated Supabase types.
- `tests/unit/account/wishlist.test.ts` - Added hydration/action unit coverage.
- `tests/e2e/account-retention.spec.ts` - Added skipped wishlist browser contracts.

## Decisions Made

- Wishlist storage intentionally excludes price, currency, title, stock, variant, and checkout snapshots so stale commerce facts cannot persist in account data.
- Hydration is centralized in `public.get_customer_wishlist` because catalog base tables are RLS-protected and account UI needs current market-safe facts without broad direct grants.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added account hydration RPC**
- **Found during:** Task 2 (Implement wishlist schema, actions, and account page)
- **Issue:** Direct PostgREST joins from `wishlist_items` into catalog tables would collide with catalog RLS/admin-only policies.
- **Fix:** Added `public.get_customer_wishlist(p_locale, p_market)` as a security-definer, locale/market-validated, auth.uid-scoped RPC returning current public-safe facts.
- **Files modified:** `supabase/migrations/20260620102618_customer_retention_trust.sql`, `src/account/wishlist.ts`, `tests/unit/account/wishlist.test.ts`
- **Verification:** `npm run db:test`, `npm run test:unit -- tests/unit/account/wishlist.test.ts`, `npm run typecheck`
- **Committed in:** `e10380c`

---

**Total deviations:** 1 auto-fixed (missing critical)
**Impact on plan:** The RPC keeps the original reference-only wishlist requirement intact while matching existing catalog security boundaries.

## Issues Encountered

- `npm run db:reset` applied migrations and seed data but failed Supabase Storage readiness after three attempts with `UNION types text and uuid cannot be matched`. This is the same local Storage schema mismatch seen earlier in Phase 06. Follow-up checks passed after the migration application: `db:lint`, `db:test`, `db:types`, and `git diff --exit-code src/types/supabase.ts`.

## Verification

- `npm run db:reset` - failed at Supabase Storage readiness after applying migrations and seed data.
- `npm run db:lint` - passed.
- `npm run db:test` - passed, 18 files / 387 tests.
- `npm run db:types` - passed.
- `git diff --exit-code src/types/supabase.ts` - passed.
- `npm run test:unit -- tests/unit/account/wishlist.test.ts` - passed, 5 tests.
- `npm run test:e2e -- tests/e2e/account-retention.spec.ts --list` - passed, 10 listed contracts.
- `npm run typecheck` - passed.
- `npm run build` - passed and listed both wishlist routes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 06-04 can build on account retention routing and authenticated account-page patterns. Plan 06-10 still owns activating the skipped browser contracts with authenticated customer fixtures.

---
*Phase: 06-customer-retention-and-trust*
*Completed: 2026-06-20*
