---
phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
plan: "09"
subsystem: catalog-seo
tags: [nextjs, isr, catalog, seo, client-projection, route-classification]

requires:
  - phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
    provides: Reusable complete catalog commerce island and client-safe product cards from Plan 09-08
  - phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
    provides: Production route classifier and static/private source gates from Plan 09-02
provides:
  - Request-independent localized catalog metadata, canonical, JSON-LD, and five-minute ISR shell
  - Complete active-market catalog products and facets resolved only by the private client island
  - Preserved type tabs, search, sort, category, technique, tag, mobile filters, result count, and load-more UI
  - Focused production route-classification mode that leaves the full release gate strict by default
affects: [09-10, 09-11, 09-14, catalog, seo, phase-09-verification]

tech-stack:
  added: []
  patterns:
    - Suspense-bounded client query projection beneath a deterministic static server shell
    - Locale-default SEO product identity with pending commerce facts until active-market projection settles
    - Route-focused build proof during incremental waves with an unchanged full-route default gate

key-files:
  created:
    - tests/unit/content/catalog-static-route.test.ts
  modified:
    - src/app/[locale]/catalog/page.tsx
    - src/components/catalog/catalog-commerce.tsx
    - src/components/catalog/catalog-controls-client.tsx
    - src/catalog/list-state.ts
    - tests/unit/content/storefront-performance.test.ts
    - scripts/assert-storefront-route-classification.mjs

key-decisions:
  - "Catalog metadata and canonical output depend only on locale; browser query variants never enter the server page or metadata signature."
  - "CatalogCommerce owns the complete result/facet shell so type tabs, mobile filters, active chips, and result count remain synchronized with one normalized client query."
  - "The route classifier accepts optional focused route arguments for incremental plan proof while its default invocation continues to require every Phase 09 storefront route."

patterns-established:
  - "Static catalog integration: serialize locale-default products and labels, wrap useSearchParams commerce in Suspense, and keep query parsing inside the client island."
  - "Client-safe catalog state: runtime allowlists must not import server query modules; shared server types are imported type-only."

requirements-completed: [MKT-02, MKT-03, MKT-04, CAT-06, SEO-02, SEO-04]

duration: 14min
completed: 2026-07-24
---

# Phase 09 Plan 09: Static/ISR Catalog with Deterministic Metadata Summary

**Localized catalog pages now ship deterministic locale-default SEO HTML and five-minute ISR while complete active-market products, facets, and allowlisted query controls resolve privately in CatalogCommerce.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-07-24T15:30:44Z
- **Completed:** 2026-07-24T15:44:28Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Removed server `searchParams` consumption and query-dependent robots metadata from the localized catalog route, preserving stable canonical, hreflang, breadcrumb JSON-LD, and ItemList JSON-LD.
- Added explicit `dynamic = 'force-static'`, five-minute revalidation, `setRequestLocale`, and a deterministic pending product fallback around the client query island.
- Moved the complete catalog result/facet experience into `CatalogCommerce`, including type tabs, search/sort, category/technique/tag filters, mobile Sheet, active filter chips, result count, responsive grid, and load more.
- Kept all six browser query dimensions allowlisted and prevented catalog state from pulling Supabase server code or `next/headers` into the client graph.
- Proved `/[locale]/catalog` is `●` SSG/ISR with both `/vi/catalog` and `/en/catalog` generated at a five-minute revalidation interval.

## Task Commits

1. **Task 1 RED: Static catalog route contract** - `e65e2ba` (test)
2. **Task 1 GREEN: Static shell and private catalog commerce** - `ccf3084` (feat)
3. **Task 2: Source and production classification proof** - `a336e83` (perf)

## Files Created/Modified

- `tests/unit/content/catalog-static-route.test.ts` - RED/GREEN source contract for request independence, client query allowlisting, and responsive island ownership.
- `src/app/[locale]/catalog/page.tsx` - Deterministic metadata, static/ISR shell, locale-default SEO products, JSON-LD, and Suspense-bounded CatalogCommerce.
- `src/components/catalog/catalog-commerce.tsx` - Complete active-market list/facet replacement plus the preserved desktop/mobile discovery shell.
- `src/components/catalog/catalog-controls-client.tsx` - Hidden technique and tag form state alongside type and category.
- `src/catalog/list-state.ts` - Client-safe sort allowlist with type-only server query imports.
- `tests/unit/content/storefront-performance.test.ts` - Explicit catalog static/metadata/request-API source guard.
- `scripts/assert-storefront-route-classification.mjs` - Optional focused route selection with the full route set still enforced by default.

## Decisions Made

- Query variants canonicalize to the base localized catalog and do not change robots output; query state is a browser projection concern only.
- The static fallback exposes deterministic product identity and imagery while masking price and stock until the authoritative browsing market projection is ready.
- The complete phase classifier remains strict by default. Incremental plans may select their owned route for production proof before later dependent route families exist.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Preserved the complete responsive catalog shell inside CatalogCommerce**
- **Found during:** Task 1
- **Issue:** The reusable Plan 09-08 island replaced products and facets but did not yet own the existing product-type tabs, mobile filter Sheet, active chips, or visible result count. Replacing the page with the island as-is would have removed working catalog discovery behavior.
- **Fix:** Extended CatalogCommerce with serialized shell labels and allowlisted link construction, preserving all desktop/mobile controls without changing the visual design.
- **Files modified:** `src/components/catalog/catalog-commerce.tsx`, `src/app/[locale]/catalog/page.tsx`
- **Verification:** Catalog static contract, list-state, projection, SEO, lint, and typecheck gates pass.
- **Committed in:** `ccf3084`

**2. [Rule 3 - Blocking] Removed a server-only module from the catalog client graph**
- **Found during:** Task 2 production build
- **Issue:** `catalog-list-state.ts` imported the runtime `catalogSorts` value from `catalog/queries.ts`, which pulled the Supabase server client and `next/headers` into CatalogCommerce's browser bundle.
- **Fix:** Made query types type-only and defined the bounded four-value sort allowlist in the client-safe state module.
- **Files modified:** `src/catalog/list-state.ts`
- **Verification:** Production build compiles, all list-state tests pass, and the catalog route is SSG/ISR.
- **Committed in:** `a336e83`

**3. [Rule 3 - Blocking] Added incremental route selection to the production classifier**
- **Found during:** Task 2 production classification
- **Issue:** The strict phase-level classifier also required technique/tag route families owned by dependent Plan 09-10, so its default invocation correctly remained red even after catalog became static.
- **Fix:** Added repeatable `--route=` selection for incremental plan proof while retaining all seven required routes for the default release-gate invocation.
- **Files modified:** `scripts/assert-storefront-route-classification.mjs`
- **Verification:** Classifier self-test and focused catalog production build both exit zero; default behavior still reports missing future route families.
- **Committed in:** `a336e83`

---

**Total deviations:** 3 auto-fixed (1 missing critical functionality, 2 blocking issues)
**Impact on plan:** All changes were required to preserve existing catalog behavior and produce real build evidence. The full phase release gate was not weakened.

## Issues Encountered

- The first production build exposed a server-only import in the client graph; the type-only boundary fix resolved it.
- The full phase classifier still reports the not-yet-created technique and tag routes. Plan 09-10 explicitly owns those routes and depends on this plan; the catalog-focused classifier is green.
- Lint reports two pre-existing `_input` warnings in `tests/unit/catalog/storefront-projection.test.ts` and no errors.

## Known Stubs

None. The missing-image placeholder copy is an intentional existing product-card fallback, not unwired catalog data.

## Verification

- `npm run test:unit -- tests/unit/catalog/storefront-projection.test.ts tests/unit/catalog/list-state.test.ts tests/unit/content/seo.test.ts tests/unit/content/storefront-performance.test.ts tests/unit/content/catalog-static-route.test.ts` - 29 tests passed.
- `npm run test:security` - 47 security boundary tests passed.
- `npm run lint` - passed with two pre-existing warnings and no errors.
- `npm run typecheck` - passed.
- `node scripts/assert-storefront-route-classification.mjs --self-test` - passed.
- `node scripts/assert-storefront-route-classification.mjs "--route=/[locale]/catalog"` - production build passed; catalog reported `●` SSG with 5-minute ISR and the classifier exited zero.

## TDD Gate Compliance

- RED commit `e65e2ba` failed on the missing static export, server query removal, full hidden allowlist, and responsive client-shell ownership.
- GREEN commit `ccf3084` made all three catalog route contract tests pass before Task 2 added independent performance/build gates.

## User Setup Required

None - no new environment variables, dependencies, or external service configuration required.

## Next Phase Readiness

- Plan 09-10 can reuse the expanded CatalogCommerce shell for category, collection, technique, and tag discovery routes.
- Once Plan 09-10 creates technique/tag route families, rerun the classifier without `--route` to exercise the unchanged full Phase 09 release gate.

## Self-Check: PASSED

- All seven created/modified files exist.
- Task commits `e65e2ba`, `ccf3084`, and `a336e83` exist in repository history.
- Targeted acceptance criteria, source guards, production catalog classification, security, lint, typecheck, and unit verification pass.

---
*Phase: 09-independent-locale-and-market-commerce-projection-with-seo-s*
*Completed: 2026-07-24*
