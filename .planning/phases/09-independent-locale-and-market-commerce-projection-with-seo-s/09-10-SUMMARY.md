---
phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
plan: "10"
subsystem: taxonomy-commerce-seo
tags: [nextjs, isr, taxonomy, seo, market-projection, localized-routing]

requires:
  - phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
    provides: Dynamic equivalent-route helpers and locale/market independence from Plan 09-04
  - phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
    provides: Complete fail-closed CatalogCommerce projection island from Plan 09-08
  - phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
    provides: Deterministic catalog SEO shell and production route classifier from Plan 09-09
provides:
  - Static category and collection shells backed by complete active-market projections
  - Literal localized technique and tag discovery route families
  - Cross-market deterministic taxonomy identity unions for static generation
  - Localized route registration consumed by language and market switchers
affects: [09-14, taxonomy-discovery, catalog-seo, localized-navigation]

tech-stack:
  added: []
  patterns:
    - Deterministic locale-default taxonomy HTML with private active-market commerce replacement
    - Vietnam and international facet union before static-path deduplication
    - Page-registered localized slugs shared with global navigation controls

key-files:
  created:
    - src/app/[locale]/technique/[techniqueSlug]/page.tsx
    - src/app/[locale]/tag/[tagSlug]/page.tsx
    - src/components/catalog/taxonomy-commerce.tsx
    - src/components/localized-route-context.tsx
    - tests/unit/content/taxonomy-static-routes.test.ts
  modified:
    - src/app/[locale]/category/[categorySlug]/page.tsx
    - src/app/[locale]/collection/[collectionSlug]/page.tsx
    - src/app/[locale]/layout.tsx
    - src/components/locale-switcher.tsx
    - src/components/commerce-context-switcher.tsx
    - src/i18n/routing.ts
    - tests/unit/i18n/routing.test.ts

key-decisions:
  - "Technique and tag pages use their stable entity UUID facet slug in both locales while resolving locale-specific labels from deterministic cached projections."
  - "Static params union vn and intl facet identities per locale before deduplication so market-exclusive taxonomy remains reachable."
  - "Dynamic taxonomy pages register localized slugs in a client-only route context so global switchers preserve the entity without making the public route request-dependent."

patterns-established:
  - "Taxonomy shell: metadata, breadcrumbs, ItemList JSON-LD, headings, and fallback products use the locale-default market; CatalogCommerce replaces the complete visible result for the active market."
  - "Equivalent navigation: page data registers only localized entity slugs and the current canonical path; switchers continue to own locale/market mutation and query allowlisting."

requirements-completed: [MKT-01, MKT-02, MKT-03, MKT-04, CAT-05, CAT-06, SEO-02, SEO-03, SEO-04]

duration: 18min
completed: 2026-07-24
---

# Phase 09 Plan 10: Complete Localized Taxonomy Discovery Surfaces Summary

**Category, collection, technique, and tag discovery now retain deterministic static SEO shells while complete active-market products resolve privately through one shared commerce island.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-07-24T16:10:39Z
- **Completed:** 2026-07-24T16:27:16Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Migrated category and collection grids from direct locale-default cards to Suspense-bounded `CatalogCommerce` with fixed taxonomy filters and masked deterministic SEO fallbacks.
- Added literal localized technique and tag routes with stable canonical/hreflang output, breadcrumbs, ItemList JSON-LD, accessible shells, and five-minute static caching.
- Unioned deterministic taxonomy facets from both commerce markets for every locale so a term represented only outside the locale-default market still receives a reachable route.
- Connected page-owned localized slugs to both global switchers so language and paired market navigation stay on the equivalent taxonomy entity.
- Proved the full storefront route set remains static/SSG in the production Next.js route table.

## Task Commits

1. **Task 1 RED: Category/collection static projection contracts** - `a4d5998` (test)
2. **Task 1 GREEN: Category/collection deterministic shells** - `f177176` (feat)
3. **Task 2 RED: Technique/tag route contracts** - `89f0824` (test)
4. **Task 2 GREEN: Technique/tag discovery pages** - `34b0dbe` (feat)
5. **Deviation RED: Equivalent taxonomy navigation contract** - `d9f45f1` (test)
6. **Deviation GREEN: Localized route registration** - `2b6401d` (feat)

## Files Created/Modified

- `src/app/[locale]/category/[categorySlug]/page.tsx` - Cross-market static params, locale-default SEO shell, fixed category projection, and localized-slug registration.
- `src/app/[locale]/collection/[collectionSlug]/page.tsx` - Cross-market static params, locale-default SEO shell, fixed collection projection, and localized-slug registration.
- `src/app/[locale]/technique/[techniqueSlug]/page.tsx` - Literal localized technique discovery route using stable facet identity.
- `src/app/[locale]/tag/[tagSlug]/page.tsx` - Literal localized tag discovery route using stable facet identity.
- `src/components/catalog/taxonomy-commerce.tsx` - Shared serialized labels and deterministic pending product presentation.
- `src/components/localized-route-context.tsx` - Client-only equivalent-route registration for global switchers.
- `src/app/[locale]/layout.tsx` - Provides localized route registration across header, page, and footer.
- `src/components/locale-switcher.tsx` - Consumes registered dynamic slugs when changing language.
- `src/components/commerce-context-switcher.tsx` - Preserves the equivalent dynamic route during paired locale/market changes.
- `src/i18n/routing.ts` - Adds encoded localized technique and tag path helpers.
- `tests/unit/content/taxonomy-static-routes.test.ts` - Static, market-union, metadata, projection, and navigation integration contracts.
- `tests/unit/i18n/routing.test.ts` - Technique/tag helper and equivalent-route coverage.

## Decisions Made

- Reused the Phase 09 filtered projection cache for technique/tag labels, products, and facet identities because the original unfiltered facet RPC exposes only category and collection.
- Kept technique/tag public slugs locale-stable because Plan 09-06 established entity UUIDs as the authoritative slug; no fabricated translation slug or schema migration was introduced.
- Registered localized slugs in a client-only context keyed to the current canonical path. The static server route remains free of cookies, headers, and search parameters.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Connected taxonomy slug data to global switchers**
- **Found during:** Final success-criteria review after Task 2
- **Issue:** `getEquivalentLocalizedPath` accepted caller-supplied localized slugs, but the global language and market switchers never received page-owned category/collection slugs and could fall back to the locale homepage.
- **Fix:** Added a path-scoped localized-route provider and registered the authoritative slugs from all four taxonomy page families; both switchers now supply them to the existing equivalent-route helper.
- **Files modified:** `src/components/localized-route-context.tsx`, `src/app/[locale]/layout.tsx`, both switchers, and all four taxonomy routes.
- **Verification:** RED/GREEN source contracts, typecheck, lint, security suite, and production route classification pass.
- **Committed in:** `d9f45f1`, `2b6401d`

---

**Total deviations:** 1 auto-fixed (1 missing critical functionality)
**Impact on plan:** The fix completes the locked D-05 equivalent-route behavior without changing public URLs, market authority, or static rendering.

## Issues Encountered

- The first production classifier run used `.env.local`, whose remote Supabase target has not received the Plan 09-06 projection migration, and failed on the missing filtered-facet RPC. No remote mutation was authorized. The same classifier passed against the already-running local Supabase instance where the migration is applied.
- Lint reports two pre-existing unused `_input` warnings in `tests/unit/catalog/storefront-projection.test.ts`; there are no lint errors.

## Known Stubs

- `src/components/catalog/taxonomy-commerce.tsx` retains the existing localized missing-image status (`Dang cap nhat anh` / `Image coming soon`) for products without media. This is an intentional bounded image fallback, not an unwired commerce data source.

## Verification

- `npm run test:unit -- tests/unit/i18n/routing.test.ts tests/unit/catalog/storefront-projection.test.ts tests/unit/content/seo.test.ts tests/unit/content/storefront-performance.test.ts tests/unit/content/taxonomy-static-routes.test.ts` - 47 tests passed.
- `npm run test:security` - 47 security boundary tests passed.
- `npm run typecheck` - passed.
- `npm run lint` - passed with two pre-existing warnings and no errors.
- `node scripts/assert-storefront-route-classification.mjs` with the verified local Supabase URL/key - production build passed and all required storefront routes were classified static/SSG.
- Source audit across all four taxonomy routes found no `cookies()`, `headers()`, or server `searchParams` access.

## User Setup Required

None for local development. Before a production build against the current remote Supabase project, apply the already-reviewed Plan 09-06 migration through the normal deployment workflow.

## Next Phase Readiness

- Plan 09-14 can include the literal technique/tag routes in sitemap and final SEO invariance validation.
- Production deployment remains gated on applying the existing Plan 09-06 projection migration to the target Supabase project; no new migration was added by this plan.

## Self-Check: PASSED

- All five created implementation/test files exist on disk.
- RED/GREEN commits `a4d5998`, `f177176`, `89f0824`, `34b0dbe`, `d9f45f1`, and `2b6401d` exist in repository history.
- Unit, security, type, lint, source-invariance, and production route-classification gates pass.

---
*Phase: 09-independent-locale-and-market-commerce-projection-with-seo-s*
*Completed: 2026-07-24*
