---
phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
plan: "02"
subsystem: testing
tags: [vitest, node-test, next-build, cache-isolation, security, seo, isr]

# Dependency graph
requires:
  - phase: 02-market-aware-catalog
    provides: Existing market-aware catalog RPCs, query DTOs, and public cache wrappers
  - phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
    provides: Independent locale/market resolution contracts from Plan 09-01
provides:
  - Expected-red catalog and product commerce projection contracts for Plan 09-06
  - Static/private/cache/fingerprint/logging security source gates
  - Production build route-table classifier covering localized discovery routes
affects: [09-04, 09-06, 09-08, 09-09, 09-10, 09-11, phase-09-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Expected-red Vitest contracts with explicit future-plan ownership
    - Conditional Node security gates that activate when owning implementation files exist
    - Production route classification from Next.js build output rather than source inference

key-files:
  created:
    - tests/unit/catalog/storefront-projection.test.ts
    - tests/unit/catalog/product-commerce.test.ts
    - scripts/assert-storefront-route-classification.mjs
  modified:
    - tests/security/catalog-boundaries.test.mjs

key-decisions:
  - "Projection tests remain expected-red until Plan 09-06 creates the promised modules, while all fixture inputs and expected DTO/cache behavior are executable now."
  - "The release classifier accepts only Next.js static/SSG markers for every required localized storefront route and treats dynamic or missing routes as failures."
  - "Security gates conditionally activate for future projection files, preserving a green Wave 0 without weakening the eventual boundary checks."

patterns-established:
  - "Future-owned contract: use an explicit owner in expected-fail/skip text and let the owning plan promote the assertion."
  - "Build truth: parse the production route table and require each route individually; do not infer render mode from source cleanliness."

requirements-completed: [MKT-02, MKT-03, MKT-04, CAT-06, CAT-08, SEO-02, SEO-03, SEO-04, OPS-04]

# Metrics
duration: 11min
completed: 2026-07-23
---

# Phase 09 Plan 02: Projection, Cache, Purchase, and Static-Build Contracts Summary

**Executable market-projection and stale-purchase contracts, hardened catalog security gates, and a production Next.js route classifier that exposes the current dynamic catalog baseline**

## Performance

- **Duration:** 11 min
- **Started:** 2026-07-22T17:14:54Z
- **Completed:** 2026-07-22T17:25:42Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Defined strict, table-driven contracts for bounded projection inputs, atomic product/facet replacement, argument-complete cache identity, market-exclusive offers, deterministic fingerprints, and exact Add-to-Cart agreement.
- Expanded catalog security coverage for request-invariant static scopes, server-derived market, private no-store responses, shared-cache inputs, sensitive logging, and non-authoritative fingerprints.
- Added a dependency-free production build classifier whose self-test rejects dynamic or missing routes and whose real build mode identified the expected `/[locale]/catalog`, technique, and tag release-gate failures.

## Task Commits

Each task was committed atomically:

1. **Task 1: Specify complete catalog and product projection contracts** - `bba846f` (test)
2. **Task 2: Add static-route, private-response, and authority security gates** - `3c08a78` (test)

## Files Created/Modified

- `tests/unit/catalog/storefront-projection.test.ts` - Strict input, complete replacement, facet, normalization, and cache-identity contracts.
- `tests/unit/catalog/product-commerce.test.ts` - Parent/variant offer, availability, fingerprint, and purchase-agreement contracts.
- `scripts/assert-storefront-route-classification.mjs` - Self-testing parser and real production-build static/ISR release gate.
- `tests/security/catalog-boundaries.test.mjs` - Static scope, private delivery, cache partitioning, logging, market invalidation, and fingerprint-authority gates.

## Decisions Made

- Kept Plan 09-06 imports inside explicitly owned `it.fails` cases, so Wave 0 verifies the contract suite without pretending the projection implementation already exists.
- Used conditional Node test skips for Plan 09-04/09-06 source boundaries. The gates automatically become active when the legacy behavior disappears or the promised files appear.
- Classified `○` and `●` as static/ISR-compatible, while `ƒ`, partial/dynamic markers, missing routes, and build failures fail the release assertion.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Windows production-build launcher portability**

- **Found during:** Task 2 (real build-classifier verification)
- **Issue:** Direct `spawnSync('npm.cmd', ...)` returned `EINVAL` in the Windows execution environment.
- **Fix:** Launch `npm run build` through the configured Windows command processor with fixed arguments; Unix continues to invoke `npm` directly.
- **Files modified:** `scripts/assert-storefront-route-classification.mjs`
- **Verification:** Real production build completed and the classifier reported the expected dynamic/missing route failures.
- **Committed in:** `3c08a78`

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug)
**Impact on plan:** The fix makes the required real-build gate portable without adding dependencies or changing its classification contract.

## Issues Encountered

- The intentional real-build release gate failed on `/[locale]/catalog` (`ƒ`) and on missing localized technique/tag routes. This is the expected baseline until Plan 09-09 and is not a Plan 09-02 completion blocker.
- Ten projection assertions remain expected-red for Plan 09-06; five security assertions are conditionally skipped until Plan 09-04/09-06 establish their owned source boundaries.

## Known Contract Deferrals

- `tests/unit/catalog/storefront-projection.test.ts` and `tests/unit/catalog/product-commerce.test.ts` intentionally use expected-fail imports owned by Plan 09-06.
- `tests/security/catalog-boundaries.test.mjs` conditionally defers the legacy `revalidatePath` gate to Plan 09-04 and projection implementation gates to Plan 09-06.
- These are executable future contracts, not application stubs; no created or modified runtime file contains placeholder behavior.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 09-04 can remove legacy shared-path market invalidation and automatically activate that security gate.
- Plan 09-06 has exact validation, DTO, cache, private-response, fingerprint, and agreement contracts to promote.
- Plan 09-09 must make catalog static/ISR and add localized technique/tag routes before the real build classifier can pass.

## Verification

- `npm run test:unit -- tests/unit/catalog/storefront-projection.test.ts tests/unit/catalog/product-commerce.test.ts tests/unit/catalog/public-cache.test.ts` - passed (2 current assertions, 10 expected-red contracts).
- `node scripts/assert-storefront-route-classification.mjs --self-test` - passed, including dynamic-catalog and missing-tag rejection fixtures.
- `node --test tests/security/catalog-boundaries.test.mjs` - passed (5 active, 5 conditionally deferred gates).
- `npm run typecheck` - passed.
- Real classifier mode completed `next build` and correctly failed the release gate for dynamic catalog plus missing technique/tag routes.

## Self-Check: PASSED

- All four created/modified plan files exist.
- Task commits `bba846f` and `3c08a78` exist in git history.
- Both task verification commands and the plan-level typecheck pass.
- No schema or dependency changes were introduced.

---

*Phase: 09-independent-locale-and-market-commerce-projection-with-seo-s*
*Completed: 2026-07-23*
