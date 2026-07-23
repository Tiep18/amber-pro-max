---
phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
plan: "04"
subsystem: storefront-context
tags: [next-intl, proxy, locale-negotiation, market-resolution, private-api, security]

requires:
  - phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
    provides: Locale/market precedence, navigation safety, and private-boundary contracts from Plan 09-01
  - phase: 01-secure-bilingual-foundation
    provides: next-intl routing and Supabase session response composition
provides:
  - next-intl-owned URL, locale-cookie, Accept-Language, and Vietnamese fallback negotiation
  - Independent ACTIVE_MARKET cookie, trusted-country suggestion, and intl fallback composition
  - Dynamic equivalent-route and route-specific safe query preservation helpers
  - Strict server-confirmed market mutation with a safe legacy form adapter
  - Minimal private no-store storefront context success and failure responses
affects: [09-05, 09-06, 09-10, 09-12, 09-13, phase-09-verification]

tech-stack:
  added: []
  patterns:
    - One composed next-intl, market-suggestion, and Supabase-session response
    - Stable discriminated server-action results with no shared path invalidation
    - Minimal personalized Route Handler DTOs with private no-store on every outcome

key-files:
  created: []
  modified:
    - src/proxy.ts
    - src/i18n/routing.ts
    - src/catalog/market-actions.ts
    - src/app/api/storefront-context/route.ts
    - tests/unit/proxy.test.ts
    - tests/unit/i18n/routing.test.ts
    - tests/unit/catalog/market.test.ts

key-decisions:
  - "Unprefixed and localized-auth requests use next-intl as the sole locale negotiator; only system callbacks, admin, sitemaps, APIs, and assets remain outside that path."
  - "Browsing-market mutation returns only the server-accepted enum or a stable error and never invalidates shared storefront paths."
  - "Storefront context failures return a bounded context_unavailable code with HTTP 503 and the same private, no-store policy as successful responses."

patterns-established:
  - "Independent axes: locale is derived by next-intl while browsing market is derived only from ACTIVE_MARKET then trusted country then intl."
  - "Navigation state: dynamic localized slugs are caller-supplied, catalog filters are allowlisted, and auth next accepts one localized internal path only."
  - "Private context boundary: expose only {market,user}; never echo cookie, country header, destination, quote, price, or payment facts."

requirements-completed: [MKT-01, MKT-05]

duration: 9min
completed: 2026-07-23
---

# Phase 09 Plan 04: Independent Server Resolution and Strict Market Mutation Summary

**next-intl-owned locale negotiation composed with independent market suggestion, strict HttpOnly market mutation, safe localized navigation, and a minimal private storefront-context API**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-23T00:35:00Z
- **Completed:** 2026-07-23T00:44:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Removed the hand-written unprefixed locale redirect so next-intl now owns explicit URL, valid `NEXT_LOCALE`, weighted `Accept-Language`, and `vi` fallback precedence.
- Composed localized public/auth routing, ACTIVE_MARKET suggestion, and Supabase session refresh on one response while preserving request-invariant public page code.
- Added equivalent dynamic product/category/collection/technique/tag route mapping plus catalog and auth query allowlists that reject unsafe return paths and duplicate auth targets.
- Added strict server-confirmed market mutation without coercion, raw-input logging, redirects, or shared revalidation; retained legacy forms as a safe redirect adapter.
- Hardened `/api/storefront-context` to return only `{market,user}` on success and a sanitized stable error on failure, always with `Cache-Control: private, no-store`.

## Task Commits

Each TDD task was committed through RED then GREEN:

1. **Task 1 RED: Promote locale and market resolution contracts** - `740d21a` (test)
2. **Task 1 GREEN: Compose independent locale and market resolution** - `aba2170` (feat)
3. **Task 2 RED: Add strict market boundary contracts** - `e255590` (test)
4. **Task 2 GREEN: Harden market mutation and private context** - `148aa6a` (feat)

## Files Created/Modified

- `src/proxy.ts` - Routes public and localized-auth requests through one next-intl/market/session response chain.
- `src/i18n/routing.ts` - Enables locale detection, weighted fallback helper behavior, dynamic equivalent routes, and safe query allowlists.
- `src/catalog/market-actions.ts` - Provides strict market mutation results and a compatibility form adapter without shared invalidation.
- `src/app/api/storefront-context/route.ts` - Delivers minimal private context and sanitized private failures.
- `tests/unit/proxy.test.ts` - Covers next-intl delegation and single-response composition.
- `tests/unit/i18n/routing.test.ts` - Promotes locale precedence, dynamic route, and query-safety contracts.
- `tests/unit/catalog/market.test.ts` - Covers strict mutation, safe compatibility behavior, and private context responses.

## Decisions Made

- next-intl remains the sole locale negotiation authority because its documented prefix, cookie, best-fit language, and default precedence exactly matches D-02.
- Market resolution stays separate from locale and remains browsing suggestion only; no market segment/query was added to public URLs and no destination/order authority entered this boundary.
- Context failures use HTTP 503 plus `{status:'error', code:'context_unavailable'}` so clients receive a stable retryable signal without raw request or provider detail.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The Context7 CLI was unavailable locally, so the version-specific next-intl middleware precedence and composition behavior was verified against the official next-intl routing documentation before implementation.
- Repository-wide lint reports two existing unused-parameter warnings in `tests/unit/catalog/storefront-projection.test.ts`; there are no lint errors and the warnings are outside Plan 09-04 ownership.

## Known Stubs

None in files created or modified by this plan.

## Verification

- `npm run test:unit -- tests/unit/proxy.test.ts tests/unit/i18n/routing.test.ts tests/unit/catalog/market.test.ts` - 44 passed.
- `node --test tests/security/catalog-boundaries.test.mjs` - 6 passed; 4 future Plan 09-06 gates remain intentionally skipped.
- `npm run lint` - passed with 0 errors and 2 pre-existing out-of-scope warnings.
- `npm run typecheck` - passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 09-05 can consume the strict `commitActiveMarketAction` result and minimal private context DTO for latest-request-wins client lifecycle behavior.
- Plan 09-06 can add market-shaped private projections without changing public ISR request invariance or the context trust boundary established here.

## Self-Check: PASSED

- All seven modified implementation/test files and this summary exist on disk.
- RED/GREEN commits `740d21a`, `aba2170`, `e255590`, and `148aa6a` exist in git history in the required order.
- Plan-level unit, security, lint, and typecheck gates pass.

---
*Phase: 09-independent-locale-and-market-commerce-projection-with-seo-s*
*Completed: 2026-07-23*
