---
phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
plan: "11"
subsystem: storefront-commerce
tags: [nextjs, react, isr, catalog-projection, wishlist, server-actions, abort-controller]

requires:
  - phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
    provides: Authoritative storefront context lifecycle from Plan 09-05
  - phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
    provides: Private catalog projections and server-derived market authority from Plan 09-06
  - phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
    provides: Reusable complete CatalogCommerce island from Plan 09-08
provides:
  - Static homepage featured identity with private complete active-market commerce hydration
  - Authenticated wishlist refresh action deriving user and market exclusively on the server
  - Abort and latest-request guarded wishlist projection keyed by market and context version
  - Fail-closed wishlist price, availability, and quick-add behavior with localized retry
affects: [09-12, 09-13, 09-14, homepage, wishlist, cart, phase-09-verification]

tech-stack:
  added: []
  patterns:
    - Locale-default SEO identity with visitor-sensitive commerce masked until private projection agreement
    - Server Action input restricted to locale while user and market are resolved behind the auth boundary
    - Abort plus request-id, market, and context-version guards for personalized wishlist refresh

key-files:
  created: []
  modified:
    - src/app/[locale]/page.tsx
    - src/account/wishlist-actions.ts
    - src/app/[locale]/account/wishlist/wishlist-page.tsx
    - src/components/account/wishlist-page.tsx
    - tests/unit/content/storefront-performance.test.ts
    - tests/unit/account/wishlist.test.ts

key-decisions:
  - "Homepage featured sections always render their deterministic identity shell, even when the locale-default seed is empty, so active-market-only products can replace the whole set."
  - "Wishlist refresh accepts locale only; authenticated user and browsing market are re-derived on the server and caller-supplied market fields are ignored."
  - "Wishlist quick add uses the agreed ready context marketAtAdd only after market and context-version equality; server quote hydration remains authoritative."

patterns-established:
  - "Home projection: CatalogCommerce surface=home receives a fixed product type and limit four, while ProductCardView pending markup masks price and stock."
  - "Wishlist projection: only the latest non-aborted response matching request id, market, and context version may replace items."
  - "Wishlist recovery: identity and removal controls remain available while commerce facts and quick add fail closed."

requirements-completed: [MKT-02, MKT-03, MKT-04, CAT-05, CAT-06, CAT-08]

duration: 16min
completed: 2026-07-24
---

# Phase 09 Plan 11: Homepage and Wishlist Market Projection Migration Summary

**Five-minute ISR homepage identity now hydrates complete private market projections, while authenticated wishlist commerce refreshes from server-derived context with abort/latest-response guards and fail-closed quick add.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-07-24T15:47:53Z
- **Completed:** 2026-07-24T16:04:18Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Replaced both homepage server-rendered product-card rows with reusable `CatalogCommerce` hydration using `surface="home"`, fixed product types, and a four-product limit.
- Preserved deterministic locale-default product identity, metadata, Organization/Website JSON-LD, headings, links, imagery, layout, `force-static`, and five-minute ISR while masking pending price and stock.
- Added an authenticated wishlist refresh Server Action that rejects invalid locale input, requires the signed-in user, derives current market server-side, and returns only bounded wishlist DTOs.
- Added wishlist abort, monotonic request identity, market, and context-version agreement so stale or wrong-market results are exact no-ops.
- Preserved wishlist identity, empty state, removal controls, and auth semantics while hiding stale price/availability, disabling quick add, and offering localized retry on context or projection failure.
- Captured only the agreed ready context market in `marketAtAdd`; browser projections remain presentation data and server quote hydration remains commerce authority.

## Task Commits

1. **Task 1 RED: Homepage static/private-commerce contract** - `e20513b` (test)
2. **Task 1 GREEN: Complete active-market homepage featured hydration** - `55dfcdb` (feat)
3. **Task 2 RED: Wishlist authoritative refresh and race contracts** - `72dcae6` (test)
4. **Task 2 GREEN: Context-agreed wishlist refresh and quick add** - `48870f9` (feat)

## Files Created/Modified

- `src/app/[locale]/page.tsx` - Static homepage shell, localized commerce labels, pending product identity, and two complete home projection islands.
- `src/account/wishlist-actions.ts` - Validated authenticated wishlist refresh action with server-owned market resolution and sanitized outcomes.
- `src/app/[locale]/account/wishlist/wishlist-page.tsx` - Localized resolving, error, and retry labels while preserving initial authenticated hydration.
- `src/components/account/wishlist-page.tsx` - Projection lifecycle, abort/latest-request guards, context agreement, masked commerce, retry, removal preservation, and safe quick add.
- `tests/unit/content/storefront-performance.test.ts` - Homepage static/ISR and private-commerce source contract.
- `tests/unit/account/wishlist.test.ts` - Server-derived market, invalid input, stale response, wrong-market response, and context-version contracts.

## Decisions Made

- The homepage does not omit a featured section merely because its locale-default seed is empty; the private active-market response can still introduce market-exclusive products.
- Wishlist response identity is the tuple of request id, authoritative market, and storefront context version. A matching locale alone is insufficient.
- Removal remains available during commerce refresh/error because it is authenticated, market-independent account intent; pending refresh is aborted and followed by authoritative reread.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The client-component lifecycle import exceeded Vitest's default five-second per-test limit only when three transform-heavy suites ran together. The focused lifecycle test now has a bounded ten-second timeout; subsequent aggregate runs complete in under three seconds.
- Lint reports two pre-existing `_input` warnings in `tests/unit/catalog/storefront-projection.test.ts` and no errors.

## Known Stubs

None. The `Image coming soon` text in `src/app/[locale]/page.tsx` is the intentional existing no-image fallback used by `ProductCardView`, not mock or unwired commerce data.

## Verification

- `npm run test:unit -- tests/unit/account/wishlist.test.ts tests/unit/catalog/storefront-projection.test.ts tests/unit/catalog/product-commerce.test.ts tests/unit/cart/market-sync.test.ts tests/unit/content/storefront-performance.test.ts` - 40 tests passed; 6 Plan 09-12 cart contracts remain expected failures under their declared owner.
- `npm run lint` - passed with two pre-existing warnings and no errors.
- `npm run typecheck` - passed.
- `npm run test:security` - 47 security boundary tests passed.
- `npm run build` - passed; `/[locale]` and both `/vi` and `/en` remain SSG with five-minute revalidation, while authenticated wishlist remains dynamic.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Homepage and wishlist now consume the single authoritative browsing-market contract and are ready for Plan 09-12 cart requote synchronization.
- No blockers remain for context/cart integration or final Phase 09 SEO and checkout regression gates.

## Self-Check: PASSED

- Summary and all six modified implementation/test files exist.
- All four TDD task commits are present in git history.
- Plan-level unit, lint, typecheck, security, and production build verification passed.

---
*Phase: 09-independent-locale-and-market-commerce-projection-with-seo-s*
*Completed: 2026-07-24*
