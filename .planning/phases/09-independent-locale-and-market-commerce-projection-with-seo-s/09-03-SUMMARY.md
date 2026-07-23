---
phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
plan: "03"
subsystem: testing
tags: [vitest, playwright, cart, market-sync, quote-cache, cross-tab]

# Dependency graph
requires:
  - phase: 03-mixed-cart-and-checkout
    provides: Intent-only guest cart storage and authoritative server quote hydration
  - phase: 08-shipping-profile-fallbacks-destination-zones-and-us-region-s
    provides: Latest-request-wins destination quote lifecycle and material-change confirmation
  - phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
    provides: Independent locale/market and invalidation-only cross-tab contracts from Plans 09-01 and 09-02
provides:
  - Expected-red cart market synchronization and quote-cache identity contracts for Plan 09-12
  - Reusable Playwright fixture for isolated market sessions, delayed/failing responses, focus, visibility, and cross-tab invalidation
  - Four-combination catalog and browser convergence contracts for Plans 09-12, 09-13, and the final checkout gate
affects: [09-12, 09-13, 09-15, phase-09-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Owner-tagged expected-red contracts for future runtime wiring
    - Invalidation-only cross-tab signaling followed by authoritative server refetch
    - Playwright contexts isolate market cookies, geo suggestions, and concurrent tab behavior

key-files:
  created:
    - tests/unit/cart/market-sync.test.ts
    - tests/e2e/fixtures/storefront-market.ts
    - tests/e2e/storefront-market-convergence.spec.ts
  modified:
    - tests/unit/cart/quote-cache.test.ts
    - tests/e2e/catalog-market.spec.ts

key-decisions:
  - "Cart synchronization remains an executable expected-red contract until Plan 09-12 creates the runtime coordinator; current quote-cache behavior is asserted green now."
  - "Cross-tab fixtures broadcast only invalidation/version signals, and forged market, price, or quote fields must never become commerce authority."
  - "Runtime-dependent browser cases are individually owned by Plan 09-12 or 09-13, while fixture behavior and the final checkout matrix remain green in Wave 0."

patterns-established:
  - "Market race harness: control response order and failure at the route boundary, count requests, and assert private no-store delivery."
  - "Browser convergence: refresh server context after focus, visibility, or tab invalidation; never apply a broadcast commerce body."

requirements-completed: [MKT-02, MKT-05, CART-03, OPS-04]

# Metrics
duration: 7h 1m elapsed across executor interruption
completed: 2026-07-23
---

# Phase 09 Plan 03: Cart Synchronization and Browser Race Contracts Summary

**Market-aware quote-cache and latest-wins cart contracts backed by a deterministic Playwright harness for four locale/market combinations, failure recovery, focus, visibility, and cross-tab convergence**

## Performance

- **Duration:** 7h 1m elapsed across executor interruption
- **Started:** 2026-07-22T17:27:37Z
- **Completed:** 2026-07-23T00:28:13Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Specified cache identity, invalidation, requote races, grouped material changes, blocked intent preservation, rollback, and retry behavior before CartProvider runtime changes.
- Added an isolated Playwright market fixture with cookie/geo seeding, controlled private response sequences, server-action failure, focus/visibility events, two-page contexts, and invalidation-only tab signals.
- Replaced legacy paired-control browser assertions with the four locale/market currency combinations and owner-tagged contracts for rapid switching, stale responses, reload/navigation, focus, visibility, cross-tab convergence, cart masking, and destination authority.

## Task Commits

Each task was committed atomically:

1. **Task 1: Specify quote-cache invalidation, authoritative requote, material changes, and rollback** - `e8042d5` (test)
2. **Task 2: Build reusable four-combination and convergence browser contracts** - `5a5a2d5` (test)

## Files Created/Modified

- `tests/unit/cart/market-sync.test.ts` - Expected-red reducer/coordinator contract for latest-wins requote, material differences, rollback, retry, and blocked intent rows.
- `tests/unit/cart/quote-cache.test.ts` - Market, context-version, locale, fingerprint, TTL, and authoritative quote-market cache identity assertions with legacy payload rejection.
- `tests/e2e/fixtures/storefront-market.ts` - Reusable isolated-context, delay/failure, focus/visibility, two-tab, no-store, and invalidation-only fixture.
- `tests/e2e/catalog-market.spec.ts` - Four locale/market catalog projections plus independent desktop/mobile control contracts.
- `tests/e2e/storefront-market-convergence.spec.ts` - Rapid-switch, stale-response, rollback, reload/navigation, focus, visibility, cross-tab, cart, destination, and checkout-matrix contracts.

## Decisions Made

- Kept runtime-only assertions as individual `test.fixme` cases with exact Plan 09-12 or Plan 09-13 ownership; fixture setup and currently supported behavior run green.
- Modeled cross-tab data as an untrusted invalidation signal. The harness deliberately injects forged market/price/quote fields so later runtime wiring must prove they are ignored.
- Preserved the existing destination-driven quote lifecycle as downstream authority instead of redefining shipping or material-confirmation behavior in this Wave 0 plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Regenerated truncated Next.js development type cache after Playwright shutdown**

- **Found during:** Plan-level typecheck after Task 2
- **Issue:** The Playwright-managed Next.js development server left concatenated partial content in ignored `.next/dev/types/routes.d.ts` and `.next/dev/types/validator.ts`, causing parser errors despite an earlier clean typecheck.
- **Fix:** Removed only the two generated, ignored cache files after verifying both resolved inside the repository, then reran TypeScript validation.
- **Files modified:** Generated `.next/dev/types/routes.d.ts` and `.next/dev/types/validator.ts` only; no tracked source files.
- **Verification:** `npm run typecheck` passed after cache cleanup.
- **Committed in:** Not applicable; generated `.next` cache is gitignored.

---

**Total deviations:** 1 auto-fixed (1 Rule 3 blocking verification-cache issue)
**Impact on plan:** No production, test-contract, dependency, or schema scope changed.

## Issues Encountered

- The focused Playwright run logged expected catalog query failures because local Supabase was not running, but the three active tests use controlled routes and passed. All database-dependent future runtime cases remain explicitly deferred rather than producing false green results.
- The executor stream was interrupted after Task 1; continuation preserved commit `e8042d5` and completed Task 2 without redoing or amending Task 1.

## Known Contract Deferrals

- Ten cart synchronization assertions are expected-red until Plan 09-12 creates `src/cart/market-sync.ts`.
- Fourteen Playwright cases are individually marked `test.fixme` until Plan 09-12 or Plan 09-13 supplies the corresponding cart/control runtime wiring.
- These are executable future contracts, not application stubs. The empty context registry and default option objects in the fixture are resource-management/test-input structures and do not flow to storefront rendering.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 09-12 has exact cache, synchronization, material-difference, cart masking, retry, and destination-preservation contracts to promote.
- Plan 09-13 has reusable four-combination, route-preservation, rapid-switch, failure, focus/visibility, and cross-tab browser cases to promote.
- Plan 09-15 can reuse the explicit digital/physical/mixed, guest/account, and VietQR/PayPal matrix for its final checkout gate.

## Verification

- `npm run test:unit -- tests/unit/cart/market-sync.test.ts tests/unit/cart/quote-cache.test.ts tests/unit/checkout/quote-lifecycle.test.ts` - passed (13 current assertions, 10 expected-red contracts).
- `npm run test:e2e -- tests/e2e/catalog-market.spec.ts tests/e2e/storefront-market-convergence.spec.ts` - passed (3 active contracts, 14 owner-tagged fixme cases).
- `npm exec prettier -- --check tests/e2e/fixtures/storefront-market.ts tests/e2e/catalog-market.spec.ts tests/e2e/storefront-market-convergence.spec.ts` - passed.
- `npm run typecheck` - passed after generated Next.js development type-cache cleanup.
- Temporary `playwright.phase09-03.config.ts` was removed before the Task 2 commit.

## Self-Check: PASSED

- All five created/modified plan files exist.
- Task commits `e8042d5` and `5a5a2d5` exist in git history in the required order.
- Both task verification commands and the plan-level typecheck pass.
- The temporary Playwright config is absent, Task 1 remains untouched, and no production source, schema, or dependency changes were introduced.

---

*Phase: 09-independent-locale-and-market-commerce-projection-with-seo-s*
*Completed: 2026-07-23*
