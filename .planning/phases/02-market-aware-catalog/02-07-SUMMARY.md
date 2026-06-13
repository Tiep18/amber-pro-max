---
phase: 02-market-aware-catalog
plan: "07"
subsystem: storefront
tags: [nextjs, next-intl, catalog, search, filters, playwright]
requires:
  - phase: 02-market-aware-catalog
    provides: Market context and typed public catalog queries from Plans 02-05 and 02-06
provides:
  - Localized catalog, category, and collection routes
  - Market-aware product cards and GET filter controls
  - Seeded public catalog fixtures for browser verification
affects: [product detail, localized SEO, storefront navigation]
tech-stack:
  added: []
  patterns:
    - Server-rendered catalog pages query by locale and market
    - Vietnamese translated routes use physical wrappers matching the Phase 1 proxy pattern
key-files:
  created:
    - src/app/[locale]/catalog/page.tsx
    - src/components/catalog/product-card.tsx
    - src/components/catalog/catalog-controls.tsx
    - tests/e2e/catalog-discovery.spec.ts
  modified:
    - src/i18n/routing.ts
    - src/components/site-header.tsx
    - supabase/seed.sql
key-decisions:
  - "Market-dependent pages are rendered dynamically from the market cookie and RPC projections."
  - "Search, type, taxonomy IDs, collection, and sort remain URL-addressable GET parameters."
requirements-completed: [MKT-02, MKT-03, CAT-05, CAT-06, CAT-07]
duration: 41 min
completed: 2026-06-13
---

# Phase 02 Plan 07: Localized Catalog Discovery Summary

**Localized market-safe catalog, category, and collection pages with composable URL filters, type badges, and currency-correct product cards**

## Accomplishments

- Added translated catalog/category/collection/product route contracts and Shop navigation.
- Added server-rendered listing, category, and collection pages backed only by Plan 02-06 RPCs.
- Added accessible GET search/type/sort controls, empty states, product badges, stock state, and localized detail links.
- Added deterministic VN/INTL seed fixtures and four Playwright discovery journeys.

## Task Commits

1. **Discovery RED journeys** - `8b764d9` (test)
2. **Localized catalog discovery implementation** - `e92933d` (feat)

## Deviations from Plan

### Auto-fixed Issues

- Added `revalidatePath` after market selection because Next.js reused stale RSC catalog output after the cookie changed.
- Added physical Vietnamese route wrappers and proxy bypasses to prevent next-intl internal rewrite/canonical redirect loops, matching the existing Phase 1 auth-route pattern.
- Added seed fixtures because the existing seed was intentionally empty and browser market-isolation tests required deterministic public products.

## Verification

- `npm run test:unit -- tests/unit/catalog/market.test.ts tests/unit/i18n/routing.test.ts` - passed, 10 tests.
- `npm run typecheck` - passed.
- `npm run build` - passed.
- `npm run test:e2e -- tests/e2e/catalog-discovery.spec.ts` - passed, 4 tests.

## Next Phase Readiness

Product links, localized route helpers, market-safe query projections, and taxonomy pages are ready for Plan 02-08 detail states and metadata.

---
*Phase: 02-market-aware-catalog*
*Completed: 2026-06-13*
