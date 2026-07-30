---
quick_id: 260730-wqd
description: 'Optimize store catalog filtering UX across desktop and mobile while preserving SEO and ISR'
date: 2026-07-30
status: completed
mode: quick
autonomous: true
files_modified:
  - supabase/migrations/20260730234000_stable_catalog_facets.sql
  - supabase/tests/database/09_catalog_projection_authority.test.sql
  - src/catalog/projections.ts
  - src/catalog/projection-schemas.ts
  - src/catalog/public-cache.ts
  - src/app/api/storefront/catalog/route.ts
  - src/app/[locale]/catalog/page.tsx
  - src/components/catalog/catalog-commerce.tsx
  - src/components/catalog/catalog-controls-client.tsx
  - src/components/catalog/catalog-sort-select.tsx
  - src/components/catalog/catalog-filter-content.tsx
  - src/components/catalog/catalog-mobile-filters.tsx
  - src/components/catalog/catalog-result-grid.tsx
  - tests/unit/catalog/storefront-projection.test.ts
  - tests/unit/catalog/load-more.test.ts
  - tests/e2e/catalog-discovery.spec.ts
must_haves:
  truths:
    - 'Catalog metadata, canonical URLs, server-rendered SEO products, force-static, and five-minute ISR remain unchanged.'
    - 'Category, technique, and tag choices remain stable within the active market; cross-filters update counts without removing alternative choices, and zero-count choices are visibly unavailable.'
    - 'Filter transitions never expose stale product cards or wrong-market commerce facts, while same-market facet navigation remains stable instead of flashing a full sidebar skeleton.'
    - 'Search and sort controls always agree with URL state after filter chips, Clear all, Back, and Forward navigation.'
    - 'Desktop users can reach every filter from the first viewport through a bounded sticky sidebar; mobile users can reach, search, select, and clear filters in a safe-area-aware scrollable Sheet.'
    - 'Result counts represent the complete filtered set and Load more can progressively fetch beyond the first 48 products without making the catalog route request-dynamic.'
  artifacts:
    - 'A market-bounded disjunctive facet RPC that returns stable localized taxonomy rows and contextual counts, including zero.'
    - 'A total-count-aware private catalog projection with bounded offset/limit pages.'
    - 'A responsive filter panel with local category search, viewport-bounded desktop scrolling, stable pending facets, and mobile active-filter feedback.'
    - 'Focused database, unit, and browser regression coverage for facet stability, URL synchronization, progressive loading, overflow, and SEO/ISR boundaries.'
  key_links:
    - 'Static catalog page -> SEO product shell and JSON-LD -> private client projection remains an enhancement.'
    - 'URL list state -> projection cache key -> filtered products, stable facets, total count.'
    - 'Same-market query transition -> retained non-authoritative facets + safe product skeleton -> atomic current projection.'
    - 'CatalogResultGrid visible count -> bounded API offset page -> append only when request identity still matches.'
---

# Quick Task 260730-wqd: Optimize catalog filtering UX

## Read first

- `AGENTS.md`
- `.planning/STATE.md`
- `.planning/debug/resolved/catalog-filter-double-render.md`
- `src/app/[locale]/catalog/page.tsx`
- `src/components/catalog/catalog-commerce.tsx`
- `src/components/catalog/catalog-filter-content.tsx`
- `src/components/catalog/catalog-controls-client.tsx`
- `src/components/catalog/catalog-sort-select.tsx`
- `src/components/catalog/catalog-result-grid.tsx`
- `src/catalog/public-cache.ts`
- `src/catalog/projections.ts`
- `supabase/migrations/20260723193000_private_catalog_projection_authority.sql`
- `supabase/tests/database/09_catalog_projection_authority.test.sql`

## Scope boundaries

- Preserve `dynamic = 'force-static'`, `revalidate = 300`, locale-only catalog metadata/canonical output, server-rendered `seoProducts`, JSON-LD, localized taxonomy routes, and sitemap behavior.
- Keep market and commerce authority private. Never display previous product cards during a filtered transition, and clear retained facets whenever locale, market, context generation/version, or surface changes.
- Retaining same-market facets is a presentation optimization only. Products, prices, inventory, wishlist state, and purchase actions must still settle atomically for the current identity.
- Do not add dependencies or replace the existing Tailwind, Radix Sheet, Next Link, Supabase RPC, caching, or storefront-context architecture.
- Keep filter state in the URL. Search/sort/category/technique/tag/type query URLs remain client projection variants rather than new indexable server pages.

## Task 1: Stabilize facet and result projection data

**Files**

- `supabase/migrations/20260730234000_stable_catalog_facets.sql`
- `supabase/tests/database/09_catalog_projection_authority.test.sql`
- `src/catalog/projections.ts`
- `src/catalog/projection-schemas.ts`
- `src/catalog/public-cache.ts`
- `src/app/api/storefront/catalog/route.ts`
- `tests/unit/catalog/storefront-projection.test.ts`

**Action**

- Replace `list_catalog_facets_filtered` with a compatible security-definer implementation that first establishes the full localized taxonomy available in the active market, then computes each group count with every active filter except that group’s own selection. Return stable category, technique, tag, and collection rows with zero counts instead of removing them.
- Preserve locale/market validation, UUID validation for technique/tag identities, private base-table boundaries, deterministic localized ordering, and anon/authenticated execute grants.
- Add pgTAP fixtures proving an alternate category remains present while another category is selected, and that a no-result search returns stable zero-count facets instead of an empty sidebar.
- Extend catalog projections with `offset` and authoritative `totalCount`. Keep offset/limit bounded at the API schema, fetch one filtered authoritative product set, slice the requested page, and return its complete length as `totalCount`.
- Keep projection caching keyed by every shaping dimension, including offset and limit. Do not pass caller-controlled market data.

**Verify**

- `npm run test:unit -- tests/unit/catalog/storefront-projection.test.ts`
- `npm run db:reset`
- `npm run db:lint`
- `npm run db:test`
- `npm run typecheck`

**Done**

- Facet rows are stable and contextual, product pages are bounded with an exact total, invalid taxonomy remains fail-closed, and static catalog rendering is untouched.

## Task 2: Build stable responsive filter interactions

**Files**

- `src/app/[locale]/catalog/page.tsx`
- `src/components/catalog/catalog-commerce.tsx`
- `src/components/catalog/catalog-controls-client.tsx`
- `src/components/catalog/catalog-sort-select.tsx`
- `src/components/catalog/catalog-filter-content.tsx`
- `src/components/catalog/catalog-mobile-filters.tsx`
- `src/components/catalog/catalog-result-grid.tsx`
- `tests/unit/catalog/load-more.test.ts`
- `tests/unit/catalog/storefront-projection.test.ts`

**Action**

- Retain facets only across query changes whose locale, market, surface, generation, and context version match. Render retained facets with an accessible busy state while the product area continues using the safe skeleton required by the resolved double-render regression.
- Keep zero-count facet rows visible but unavailable, keep selected rows discoverable, and add a lightweight local category search only when the group is long. This search filters navigation choices locally and never changes product/API/SEO state.
- Bound the desktop sidebar to the available dynamic viewport below the sticky header, give it a stable scrollbar gutter and independent vertical scrolling, and preserve a clear visual boundary from the product grid.
- Keep the mobile Sheet full-height, independently scrollable, overscroll-contained, safe-area padded, and automatically closed after a facet link is activated. Show the active-filter count in the trigger and keep filter targets at least 44px high.
- Make the search input and sort select synchronize from URL state without overwriting normal typing. Clear, Back, Forward, and chip removal must update both the controls and results.
- Make result count use `totalCount`. Extend Load more so local 12-item disclosure continues within the loaded page, then fetch and append the next bounded page without clearing current products; reject stale/wrong-market append responses.

**Verify**

- `npm run test:unit -- tests/unit/catalog/list-state.test.ts tests/unit/catalog/load-more.test.ts tests/unit/catalog/storefront-projection.test.ts`
- `npm run lint`
- `npm run typecheck`

**Done**

- Desktop and mobile filters stay reachable and understandable, query controls cannot drift from the URL, safe loading behavior remains intact, and users can progressively reach the complete filtered assortment.

## Task 3: Verify browser UX and SEO/ISR boundaries

**Files**

- `tests/e2e/catalog-discovery.spec.ts`
- `tests/security/catalog-boundaries.test.mjs`

**Action**

- Add browser coverage for stable alternative facets after selection; accurate result count; Clear/Back/Forward control synchronization; bounded desktop sidebar scrolling at 1440x900; mobile Sheet scrolling, local category search, active-filter count, safe-area/overflow behavior at 320x800 and 390x844; and progressive append behavior when the result set exceeds one API page.
- Keep the existing tests that require a skeleton and zero stale product titles during filter transitions.
- Preserve source-boundary assertions for static/ISR catalog metadata and private market-aware projection APIs.
- Use browser artifacts only under `output/playwright/`.

**Verify**

- `npm run test:security`
- `npx playwright test tests/e2e/catalog-discovery.spec.ts`
- `npm run build`

**Done**

- Automated and real-browser checks prove the catalog remains static/ISR and SEO-complete while desktop and mobile filtering are stable, reachable, responsive, and safe.

<threat_model>

## Trust boundaries

| Boundary                                             | Description                                                                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Static catalog HTML -> private storefront projection | SEO content remains deterministic; personalized market/filter commerce stays private and request-authoritative.          |
| URL filter state -> catalog API                      | Only allowlisted, bounded query dimensions shape cached projections; caller market is ignored.                           |
| Prior ready projection -> pending projection         | Facets may be retained only within the same authoritative context; product commerce is always cleared for query changes. |
| Load-more response -> current result list            | Append only when locale, market, context version/generation, surface, and filter identity still match.                   |

## STRIDE threat register

| Threat ID       | Category               | Component                       | Disposition | Mitigation plan                                                                                                                                            |
| --------------- | ---------------------- | ------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-260730-wqd-01 | Spoofing               | Market-aware catalog projection | mitigate    | Continue deriving market server-side and validate every response identity before replace or append.                                                        |
| T-260730-wqd-02 | Tampering              | Filter and pagination inputs    | mitigate    | Strict Zod object, single-value query enforcement, slug/UUID validation, and bounded offset/limit.                                                         |
| T-260730-wqd-03 | Information disclosure | Pending products                | mitigate    | Preserve the established zero-product pending barrier; never retain cards, prices, stock, or purchase actions across queries.                              |
| T-260730-wqd-04 | Denial of service      | Facet counts and pagination     | mitigate    | Market-bounded taxonomy, stable SQL functions, deterministic ordering, bounded page size/offset, cache-key participation, and no unbounded client request. |
| T-260730-wqd-SC | Tampering              | Package supply chain            | accept      | No dependency changes.                                                                                                                                     |

</threat_model>

## Success criteria

- Catalog remains `force-static` with five-minute ISR, locale-only canonical metadata, SSR product identity, JSON-LD, and no request-bound server page reads.
- Selecting any facet does not remove alternative rows from that same group; no-result searches retain useful zero-count taxonomy and human-readable selected labels.
- Products remain hidden behind the verified neutral skeleton until the current projection settles; same-market sidebar structure does not flash or collapse.
- Search/sort UI equals URL state after submit, chip removal, Clear all, Back, and Forward.
- At 1440x900 every sidebar option is reachable without scrolling to the end of the product grid; at 320x800 and 390x844 the Sheet is overflow-free, safe-area-aware, and fully navigable.
- Result count is exact and Load more reaches products beyond the initial 48 through bounded identity-checked requests.
- Focused database, unit, security, Playwright, typecheck, lint, and production build checks pass.
