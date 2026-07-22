---
phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
plan: "01"
subsystem: testing
tags: [vitest, playwright, i18n, market-resolution, lifecycle, race-safety]

requires:
  - phase: 01-secure-bilingual-foundation
    provides: Localized routing, proxy composition, and Supabase session boundaries
  - phase: 03-mixed-cart-and-checkout
    provides: Pure latest-request-wins quote lifecycle pattern
provides:
  - Executable locale/market precedence and four-combination browser matrix
  - Safe equivalent-route, query allowlist, and strict market mutation contracts
  - Pure storefront-context lifecycle specification for generations, rollback, revalidation, and cross-tab invalidation
affects: [09-04, 09-05, 09-10, 09-13, phase-09-verification]

tech-stack:
  added: []
  patterns: [owner-tagged expected failures, table-driven precedence contracts, object-identity stale-response assertions]

key-files:
  created:
    - tests/unit/storefront-context-lifecycle.test.ts
  modified:
    - tests/unit/i18n/routing.test.ts
    - tests/unit/catalog/market.test.ts
    - tests/e2e/localization.spec.ts

key-decisions:
  - "Wave 0 runtime gaps use owner-tagged expected-failure annotations; supported behavior remains executable with no skip or fixme cases."
  - "Localization browser assertions use stable URL, html language, and HttpOnly market-cookie outcomes rather than copy that may change independently."
  - "Cross-tab context contracts accept invalidation/version signals only and require an authoritative server refetch before market state can change."

patterns-established:
  - "Future-contract tests dynamically load not-yet-created pure modules so the suite passes only while the named expected failure remains real."
  - "Stale async completions must return the exact current state object, not merely an equal clone."

requirements-completed: [MKT-01, MKT-05, OPS-04]

duration: 20min
completed: 2026-07-22
---

# Phase 09 Plan 01: Wave 0 Resolution and Storefront-Context Contracts Summary

**Executable locale/market independence and race-safe storefront-context contracts with narrowly owned expected failures for Plans 09-04, 09-05, and 09-13**

## Performance

- **Duration:** 20 min
- **Started:** 2026-07-22T16:51:58Z
- **Completed:** 2026-07-22T17:10:59Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Replaced stale locale and market assumptions with table-driven URL, cookie, header, geo-suggestion, safe-return, query-allowlist, and strict mutation contracts.
- Added browser coverage for direct and unprefixed entry, localized auth isolation, all four locale/market combinations, and locale changes that preserve market intent.
- Added an implementation-independent lifecycle suite for unresolved startup, monotonic generations, one-in-flight abort, stale no-ops, bounded rollback errors, retry, focus/visibility, and invalidation-only cross-tab convergence.
- Kept all production sources untouched while making every known runtime gap enumerable by owner plan.

## Task Commits

Each task was committed atomically:

1. **Task 1: Characterize locale and market precedence plus safe equivalent navigation** - `d963ad4` (test)
2. **Task 2: Specify race-safe storefront-context lifecycle and convergence** - `c9403b5` (test)

## Files Created/Modified

- `tests/unit/i18n/routing.test.ts` - Locale precedence, localized equivalent-route, and route-specific query allowlist contracts.
- `tests/unit/catalog/market.test.ts` - Strict cookie/geo resolution, safe return-path, and server-confirmed mutation-result contracts.
- `tests/e2e/localization.spec.ts` - Direct/unprefixed entry, auth isolation, and four locale/market browser combinations.
- `tests/unit/storefront-context-lifecycle.test.ts` - Pure state, generation, abort, rollback, focus, visibility, and cross-tab contracts.

## Decisions Made

- Expected failures name their exact owner plan and are used only where the required runtime or pure module does not yet exist.
- No broad `skip` or `fixme` annotations were added; behavior already supported by the current storefront runs normally.
- Browser combination tests prove independent axes through localized document state plus the preserved market cookie, avoiding assertions against the legacy paired control that Plan 09-13 will replace.
- Cross-tab payload fixtures deliberately include forged market, price, and quote fields to prove they cannot become authority.

## Verification

- `npm run test:unit -- tests/unit/i18n/routing.test.ts tests/unit/catalog/market.test.ts tests/unit/storefront-context-lifecycle.test.ts tests/unit/components/storefront-context-policy.test.ts` - PASS: 29 passed, 16 expected failures.
- `npx playwright test tests/e2e/localization.spec.ts` against the already-running project server - PASS: 8 passed, including 2 expected failures.
- `npm run typecheck` - PASS.
- `npm run lint` - PASS.
- Prettier checks for all four changed test files - PASS.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The configured Playwright web server could not start because a project `next dev` process was already running on port 3000 and held Next.js's development lock. Verification used a temporary, uncommitted Playwright config pointed at that existing server, then removed the config. No running process was stopped or modified.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 09-04 can promote the resolution, dynamic-route, query-allowlist, and strict mutation expected failures without redefining outputs.
- Plan 09-05 can implement the pure lifecycle against fixed state objects and object-identity stale-result assertions.
- Plan 09-13 owns the remaining browser locale-control promotion for dynamic route and market preservation.

## Self-Check: PASSED

- All four created or modified contract files exist.
- Task commits `d963ad4` and `c9403b5` exist in git history.
- Plan-level unit, browser, lint, formatting, and typecheck gates pass with only owner-tagged expected failures.

---
*Phase: 09-independent-locale-and-market-commerce-projection-with-seo-s*
*Completed: 2026-07-22*
