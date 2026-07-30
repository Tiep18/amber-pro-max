---
phase: quick
plan: 260730-wqd
subsystem: catalog
tags: [nextjs, supabase, catalog, filters, responsive, seo, isr]

requires:
  - phase: phase-09
    provides: private market-aware catalog projections, localized static discovery routes, and ISR storefront shell
provides:
  - Stable disjunctive catalog facets with contextual counts and visible zero-count choices
  - URL-synchronized responsive filters with independently scrollable desktop and mobile surfaces
  - Exact result totals and identity-checked progressive server-page loading
  - Preserved localized static HTML, metadata, JSON-LD, canonical URLs, and five-minute ISR
affects: [catalog, taxonomy, storefront-projection, responsive-ui, seo]

tech-stack:
  added: []
  patterns:
    - Same-context pending requests retain navigation facets but always clear commerce product cards
    - Each facet group applies all active filters except its own group when calculating choices
    - Progressive result pages append only after projection identity and offset checks

key-files:
  created:
    - supabase/migrations/20260730234000_stable_catalog_facets.sql
  modified:
    - src/catalog/public-cache.ts
    - src/components/catalog/catalog-commerce.tsx
    - src/components/catalog/catalog-filter-content.tsx
    - src/components/catalog/catalog-result-grid.tsx
    - tests/e2e/catalog-discovery.spec.ts

key-decisions:
  - "Retain only facet navigation during same-market filter transitions; product cards remain behind the established neutral skeleton."
  - "Keep catalog query state client-side and URL-owned so the localized catalog route remains static and ISR-compatible."
  - "Use a bounded sticky desktop panel and a safe-area-aware mobile Sheet instead of coupling filter reachability to product-page scroll."

requirements-completed: []

duration: 4h
completed: 2026-07-31
---

# Quick Task 260730-wqd: Catalog Filtering UX Summary

**Catalog filters now remain stable and reachable across desktop and mobile, result totals and progressive loading are authoritative, and the localized storefront remains SEO-first static HTML with five-minute ISR.**

## Accomplishments

- Reworked facet projection into stable market-bounded category, collection, technique, and tag lists. Cross-filters update counts without making unrelated choices disappear; zero-result choices remain visible but disabled.
- Preserved the safe pending-product barrier while retaining same-context facet navigation, eliminating the sidebar collapse/flash without showing stale prices, stock, or cards.
- Added an independently scrollable, viewport-bounded sticky desktop sidebar and an overscroll-contained, safe-area-aware mobile filter Sheet with active-filter count and local category search.
- Synchronized search and sort controls from URL state for Clear, chip removal, Back, and Forward navigation.
- Added exact `totalCount` and bounded offset pages so Load more can append results beyond the initial 48 without clearing the grid.
- Kept server-rendered product identity, localized metadata, canonical output, JSON-LD, taxonomy routes, `force-static`, and `revalidate = 300` intact.

## Task Commit

1. **Stable responsive catalog filtering, projection totals, and regression coverage** - `4498bb3`

## Verification

- `npm run typecheck` - passed
- `npm run lint` - passed
- Focused Vitest catalog/SEO suite - 23 tests passed
- `npm run db:lint` - passed with no schema errors
- `supabase test db` - 850 tests passed
- `npm run test:security` - 54 tests passed
- Targeted Playwright coverage - 5 responsive/filter/history/pagination scenarios passed
- `npm run build` - passed; `/[locale]/catalog` remained SSG with five-minute revalidation and 127 static pages generated
- `git diff --check` - passed

## Decisions Made

- Facets are presentation navigation, so they may remain visible only when locale, market, surface, context generation, and context version are unchanged. Products and all commerce facts are never retained during a query transition.
- Facet counts are disjunctive per group: all other filters apply, while the group's own selection is omitted. This lets shoppers understand alternatives without losing context.
- Mobile uses the existing Radix Sheet architecture; desktop uses a bounded sticky panel with its own scroll. No new dependency or duplicate filter state was introduced.
- Filter query variants remain client projections rather than request-bound server pages, preserving the existing canonical/indexing model.

## Deviations from Plan

- The migration keeps the existing catalog product projection RPC unchanged and slices the cached authoritative filtered set at the private projection layer. API responses and client loading are bounded; a future database-level cursor can be added only if catalog scale makes it necessary.
- Browser verification was focused on the changed regression scenarios instead of using every legacy catalog E2E assertion as a release gate.

## User Setup Required

Apply migration `20260730234000_stable_catalog_facets.sql` through the normal Supabase deployment workflow.

## Self-Check: PASSED

- Implementation commit exists and contains the migration, source, and regression tests.
- Production build confirms the catalog route remains static/ISR.
- No dependency, public data boundary, caller-selected market input, or request-dynamic page read was added.

---

*Quick task: 260730-wqd*
*Completed: 2026-07-31*
