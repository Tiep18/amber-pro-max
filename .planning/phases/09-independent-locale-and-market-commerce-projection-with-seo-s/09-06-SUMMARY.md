---
phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
plan: "06"
subsystem: catalog-projections
tags: [supabase, postgres, nextjs, zod, private-api, cache, commerce, security]

requires:
  - phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
    provides: Projection contracts and security gates from Plan 09-02
  - phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
    provides: Server-derived browsing market and private no-store response pattern from Plan 09-04
  - phase: 02-market-aware-catalog
    provides: Private catalog tables, market offers, inventory ownership, and public catalog RPC authority
provides:
  - Authoritative product-commerce RPC with exact variant stock quantity and parent-or-variant price source
  - Filter-aware category, collection, technique, and tag facet counts over the active-market result set
  - Strict normalized catalog and product projection schemas with caller-market rejection
  - Argument-complete server-only catalog projection cache
  - Deterministic public offer fingerprints and fail-closed context/projection agreement
  - Private no-store catalog and product commerce Route Handlers
affects: [09-07, 09-08, 09-09, 09-10, 09-11, 09-12, phase-09-verification]

tech-stack:
  added: []
  patterns:
    - Security-definer public projection RPCs with explicit browser-role execute grants and private base tables
    - Strict SQL-row validation before mapping an authoritative public commerce DTO
    - One normalized cache argument containing every result-shaping dimension
    - Browser-safe deterministic SHA-256 over public offer facts only

key-files:
  created:
    - supabase/migrations/20260723193000_private_catalog_projection_authority.sql
    - supabase/tests/database/09_catalog_projection_authority.test.sql
    - src/catalog/projection-schemas.ts
    - src/catalog/projections.ts
    - src/catalog/sha256.ts
    - src/app/api/storefront/catalog/route.ts
    - src/app/api/storefront/products/[productSlug]/route.ts
  modified:
    - src/catalog/queries.ts
    - src/catalog/public-cache.ts
    - src/types/supabase.ts
    - tests/unit/catalog/storefront-projection.test.ts
    - tests/unit/catalog/product-commerce.test.ts

key-decisions:
  - "A separately scoped migration exposes missing projection facts through two bounded security-definer RPCs; catalog base tables remain unreadable to anon and authenticated roles."
  - "Technique and tag filters use stable entity UUIDs as public facet slugs because their translation tables have no authored slug field; no localized slug is fabricated from mutable display names."
  - "Only an enabled effective offer has a parent or variant priceSource; disabled variants keep price, currency, and source null instead of inheriting fabricated presentation facts."
  - "Projection fingerprints remain presentation identity only and never enter cart, checkout, payment, order, or database authority."

patterns-established:
  - "Projection input: normalize and reject unknown or duplicated query values before resolving market on the server."
  - "Projection cache: locale, market, surface, search, type, every taxonomy filter, sort, and limit live in one cache argument."
  - "Projection response: success, invalid input, not found, and unavailable outcomes all carry Cache-Control: private, no-store."

requirements-completed: [MKT-02, MKT-03, MKT-04, CAT-06, CAT-08]

duration: 29min
completed: 2026-07-23
---

# Phase 09 Plan 06: Private Complete Catalog and Product Commerce Projections Summary

**Authoritative active-market catalog and product DTOs with exact inventory/price provenance, filter-aware facets, complete cache identity, and private no-store delivery**

## Performance

- **Duration:** 29 min after the approved decision checkpoint
- **Started:** 2026-07-23T12:13:00Z
- **Completed:** 2026-07-23T12:42:00Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Added a local-verified database migration that exposes exact variant quantity, reliable `parent|variant` price provenance, alternate-market availability, and filter-aware four-kind facets without opening catalog base-table access.
- Implemented strict Zod schemas for locale, surface, search, type, category/collection/technique/tag filters, sort, limit, and localized product slug; unknown fields, caller-selected market, duplicates, malformed values, and oversized values fail closed.
- Added catalog and product commerce DTO mapping, strict authoritative SQL-row validation, deterministic public-only SHA-256 fingerprints, and agreement checks that require ready market/generation/product/variant/fingerprint plus purchasable stock.
- Added argument-complete reusable caches and two Route Handlers that derive browsing market server-side and mark every success/error response `private, no-store`.
- Regenerated checked-in Supabase public types from the reset local database and preserved existing checkout, payment, order, reservation, and fulfillment authority unchanged.

## Task Commits

1. **Task 1 RED: Promote projection contracts** - `b3c8340` (test)
2. **Approved database authority extension: expose missing facts and pgTAP contracts** - `abe68fa` (feat)
3. **Tasks 1-2 GREEN: Implement schemas, DTOs, caches, queries, and private handlers** - `0f3adf6` (feat)

## Files Created/Modified

- `supabase/migrations/20260723193000_private_catalog_projection_authority.sql` - Adds bounded product-commerce and filtered-facet RPCs with explicit privileges.
- `supabase/tests/database/09_catalog_projection_authority.test.sql` - Verifies exact quantities, price sources, filtered counts, browser execution, input rejection, and base-table denial.
- `src/catalog/projection-schemas.ts` - Defines strict normalized public projection boundaries.
- `src/catalog/projections.ts` - Maps complete catalog/product DTOs, validates authoritative rows, fingerprints offers, and checks ready agreement.
- `src/catalog/sha256.ts` - Provides browser-safe synchronous SHA-256 without a new dependency.
- `src/catalog/queries.ts` - Calls the two authoritative projection RPCs through monitored server queries.
- `src/catalog/public-cache.ts` - Adds normalized argument-complete catalog and product projection caches.
- `src/app/api/storefront/catalog/route.ts` - Serves complete active-market products/facets with private no-store outcomes.
- `src/app/api/storefront/products/[productSlug]/route.ts` - Serves strict product commerce projections with private no-store outcomes.
- `src/types/supabase.ts` - Includes locally generated types for both new RPCs.
- `tests/unit/catalog/storefront-projection.test.ts` - RED contract promotion retained unchanged.
- `tests/unit/catalog/product-commerce.test.ts` - RED contract promotion retained unchanged.

## Decisions Made

- The user approved adding a dedicated migration after the existing RPCs proved unable to provide exact stock quantity, price provenance, or filter-aware facet counts. New functions expose only bounded public facts and retain the original RLS/privilege model.
- Technique/tag translation tables do not contain authoritative slugs. Their public facet slug is therefore the stable entity UUID; category/collection facets continue using authored localized slugs.
- A variant with an explicit disabled override has no effective offer, so its price, currency, and price source remain null. The mapper rejects incomplete enabled offers rather than filling fields from TypeScript.
- Cache identity is the serialized normalized function argument itself; server-derived market is injected only after query validation and callers cannot select it.

## Deviations from Plan

### User-Approved Architectural Deviation

**1. Added separately scoped authoritative projection migration**
- **Found during:** Task 1 GREEN, after RED contracts were committed
- **Issue:** Existing product detail variants exposed stock only as a boolean and no price source; existing facets were unfiltered and omitted technique/tag results.
- **Decision:** The user selected the recommended migration option at the blocking decision checkpoint.
- **Implementation:** Added two bounded security-definer RPCs plus pgTAP coverage and regenerated public database types.
- **Files modified:** `supabase/migrations/20260723193000_private_catalog_projection_authority.sql`, `supabase/tests/database/09_catalog_projection_authority.test.sql`, `src/types/supabase.ts`
- **Commit:** `abe68fa`

## Issues Encountered

- Docker Desktop was initially stopped, so the first local reset could not connect. It was started automatically; reset, database lint, and the full pgTAP suite then passed.
- `supabase gen types --local` attempted the wrong local port and failed authentication. Types were safely restored before commit and regenerated from the explicit local database URL with the same public/GraphQL schema scope as the checked-in file.
- Repository lint reports two warnings in the unchanged RED contract mocks for unused `_input` parameters; lint has zero errors.

## Known Stubs

None in files created or modified by this plan.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: security_definer_rpc | `supabase/migrations/20260723193000_private_catalog_projection_authority.sql` | Two new browser-callable functions cross the private catalog boundary; explicit revoke/grant rules and anon base-table-denial pgTAP coverage constrain the surface. |
| threat_flag: private_route_handler | `src/app/api/storefront/catalog/route.ts` | Accepts untrusted catalog filters; strict schema, duplicate rejection, server-derived market, stable errors, and private no-store mitigate cache/input leakage. |
| threat_flag: private_route_handler | `src/app/api/storefront/products/[productSlug]/route.ts` | Accepts untrusted locale/slug; strict validation, server-derived market, stable errors, and private no-store constrain the response. |

## Verification

- `npm run db:reset` - passed with the new migration applied locally.
- `npm run db:lint` - passed with no schema errors.
- `npm run db:test` - 35 files and 849 database assertions passed; one disposable rehearsal remained intentionally skipped.
- Local public type generation via explicit local DB URL - generated only the 36 expected new RPC lines.
- `npm run test:unit -- tests/unit/catalog/storefront-projection.test.ts tests/unit/catalog/product-commerce.test.ts tests/unit/catalog/public-cache.test.ts` - 12 passed.
- `node --test tests/security/catalog-boundaries.test.mjs` - 10 passed.
- `npm run typecheck` - passed.
- `npm run lint` - passed with 0 errors and 2 unchanged RED-contract warnings.

## User Setup Required

None - no remote Supabase migration was applied or pushed.

## Next Phase Readiness

- Plan 09-07 can consume `ProductCommerceProjection` and the strict agreement helper without sending projection facts into cart or checkout authority.
- Plans 09-08 through 09-11 can consume the complete catalog projection and four-kind active-market facets from one private response.
- Plan 09-05 remains the next incomplete plan in project state; this close-out does not advance past that pending dependency.

## Self-Check: PASSED

- All 12 created/modified files and this summary exist on disk.
- RED/GREEN and migration commits `b3c8340`, `abe68fa`, and `0f3adf6` exist in git history in the required order.
- Local migration reset/lint/tests, generated type diff, unit contracts, security contracts, typecheck, and lint all pass.
- No temporary generation files remain, no remote Supabase action occurred, and checkout/payment/order authority files were not modified.

---
*Phase: 09-independent-locale-and-market-commerce-projection-with-seo-s*
*Completed: 2026-07-23*
