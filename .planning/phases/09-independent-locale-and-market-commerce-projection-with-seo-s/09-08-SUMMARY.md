---
phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
plan: "08"
subsystem: catalog-commerce
tags: [react, nextjs, market-projection, facets, abort-controller, accessibility]

requires:
  - phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
    provides: Private no-store catalog projection API and strict projection DTOs from Plan 09-06
  - phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
    provides: Fail-closed authoritative storefront context lifecycle from Plan 09-05
  - phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
    provides: Projection, race, static-shell, and security contracts from Plan 09-02
provides:
  - Client-safe ProductCardView with deterministic identity and masked pending commerce
  - Reusable CatalogCommerce island with generation-guarded complete market projections
  - Atomic product and facet replacement with fail-closed resolving, error, retry, and empty states
  - Strict search, type, category, technique, tag, and sort browser query normalization
affects: [09-09, 09-10, 09-11, catalog, homepage, taxonomy-discovery]

tech-stack:
  added: []
  patterns:
    - Serialized client view labels with no hidden market or translation-server reads
    - Abort plus generation, market, context-version, and normalized-query response guards
    - Runtime-validated private projection payloads committed as one products-and-facets snapshot

key-files:
  created:
    - src/components/catalog/product-card-view.tsx
    - src/components/catalog/catalog-commerce.tsx
  modified:
    - src/components/catalog/product-card.tsx
    - src/catalog/list-state.ts
    - src/components/catalog/catalog-filter-content.tsx
    - tests/unit/catalog/storefront-projection.test.ts
    - tests/unit/catalog/list-state.test.ts
    - tests/unit/content/storefront-performance.test.ts

key-decisions:
  - "ProductCardView renders only supplied product and serialized label facts; storefront context and market resolution remain the parent island's responsibility."
  - "A catalog result identity includes locale, market, surface, context generation/version, and the complete normalized query key before products and facets may commit."
  - "Malformed, stale, wrong-market, or failed projection responses remove actionable commerce and never retain a partial previous-market overlay."

patterns-established:
  - "Pending card: retain deterministic identity, image, and route while masking price and stock with aria-hidden dimension-matched skeletons."
  - "Atomic catalog snapshot: products and facets are replaced in one state transition only after response identity validation."
  - "Facet links: rebuild only allowlisted internal query keys and preserve the other normalized filter dimensions."

requirements-completed: [MKT-02, MKT-03, MKT-04, CAT-06]

duration: 13min
completed: 2026-07-24
---

# Phase 09 Plan 08: Reusable Complete List/Facet Commerce Island Summary

**Projection-driven product cards and an abortable catalog island now replace complete active-market products and facets atomically without exposing stale price or stock during resolution**

## Performance

- **Duration:** 13 min
- **Started:** 2026-07-24T15:12:02Z
- **Completed:** 2026-07-24T15:24:36Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Extracted a pure `ProductCardView` that preserves the current card layout, imagery, wishlist, links, focus treatment, and eager-image behavior while masking pending commerce facts.
- Added `CatalogCommerce` with private no-store fetches, abort handling, context/query generation guards, runtime payload validation, retry, stable empty/error states, and one atomic products-plus-facets commit.
- Expanded browser catalog state and facet links for category, technique, and tag while retaining existing accessible filtering and load-more semantics.

## Task Commits

Each task followed the required RED/GREEN sequence:

1. **Task 1 RED: Client-safe card contract** - `3770e1c` (test)
2. **Task 1 GREEN: Projection-driven card view** - `e7ffa01` (feat)
3. **Task 2 RED: Atomic island lifecycle contracts** - `82c204d` (test)
4. **Task 2 GREEN: Catalog commerce island** - `c19dc1e` (feat)

## Files Created/Modified

- `src/components/catalog/product-card-view.tsx` - Pure client card rendering ready or masked pending commerce from supplied projection facts.
- `src/components/catalog/product-card.tsx` - Thin server translation wrapper retained for existing callers.
- `src/components/catalog/catalog-commerce.tsx` - Complete active-market list/facet lifecycle, validation, stale-response guards, and state UI.
- `src/catalog/list-state.ts` - Bounded first-value URL normalization for all six allowed query keys.
- `src/components/catalog/catalog-filter-content.tsx` - Route-safe category, technique, and tag facet groups with counts.
- `tests/unit/catalog/storefront-projection.test.ts` - Atomic commit, stale generation, and wrong-market rejection contracts.
- `tests/unit/catalog/list-state.test.ts` - Technique/tag allowlisting, bounds, duplicate, and invalid enum coverage.
- `tests/unit/content/storefront-performance.test.ts` - Client-safe card boundary and optimized image ownership contract.

## Decisions Made

- Kept `ProductCardView` independent from `useStorefrontContext`, request APIs, and `next-intl/server`; its parent must supply ready projection facts or explicitly request the pending masked state.
- Included every response-shaping dimension plus storefront context generation/version in request identity so rapid market/filter changes cannot move the UI backward.
- Validated the same-origin projection response before state settlement and treated malformed or mismatched payloads as a bounded projection failure.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Moved the optimized-image source contract to the extracted card boundary**
- **Found during:** Task 1 (Extract a client-safe card)
- **Issue:** The existing performance test required `ProductCardImage` to be imported directly by the server wrapper, which contradicted the planned extraction where the client view owns all visual rendering.
- **Fix:** Preserved the optimized-image assertion but pointed it at `ProductCardView`; added an explicit wrapper-to-view boundary assertion.
- **Files modified:** `tests/unit/content/storefront-performance.test.ts`
- **Verification:** Targeted performance tests, lint, and typecheck pass.
- **Committed in:** `e7ffa01`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The adjustment preserved the original performance guarantee while allowing the planned pure visual extraction; no scope expansion.

## Issues Encountered

- Importing the full client component in a Node unit test traversed the wishlist server-action boundary. The test now mocks visual/context dependencies and exercises the pure exported lifecycle functions without weakening runtime integration.
- Lint completes successfully with two pre-existing `_input` warnings in the projection contract test; there are no lint errors.

## Known Stubs

None. The existing localized missing-image fallback remains intentional UI behavior and is not an unwired commerce stub.

## Verification

- `npm run test:unit -- tests/unit/catalog/storefront-projection.test.ts tests/unit/catalog/list-state.test.ts tests/unit/content/storefront-performance.test.ts` — 21 tests passed.
- `node --test tests/security/catalog-boundaries.test.mjs` — 10 security boundary tests passed.
- `npm run typecheck` — passed.
- `npm run lint` — passed with two pre-existing warnings and no errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plans 09-09 through 09-11 can pass deterministic SEO products and serialized labels into the shared island for catalog, taxonomy, and homepage surfaces.
- No implementation blocker remains; route integrations must wrap client query access appropriately while preserving their static/ISR shells.

## Self-Check: PASSED

- All eight created/modified implementation and test files exist.
- All four RED/GREEN task commits are present in repository history.
- Plan verification, security boundary tests, lint, and typecheck pass.

---
*Phase: 09-independent-locale-and-market-commerce-projection-with-seo-s*
*Completed: 2026-07-24*
