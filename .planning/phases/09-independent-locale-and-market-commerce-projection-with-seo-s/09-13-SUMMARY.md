---
phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
plan: "13"
subsystem: storefront-commerce
tags: [react, nextjs, next-intl, radix-ui, market-context, broadcast-channel, accessibility]

requires:
  - phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
    provides: Authoritative private storefront context, static-safe commerce projections, equivalent localized routing, and context-driven cart requotes from Plans 09-04, 09-05, 09-10, and 09-12
provides:
  - Independent accessible language and shopping-region controls on desktop and mobile
  - Equivalent localized navigation that preserves committed market and allowlisted route intent
  - One server-confirmed StorefrontContext market mutation and unavailable-product recovery lifecycle
  - Latest-intent, focus, reload, and cross-tab convergence without optimistic or forged commerce state
affects: [09-14, 09-15, storefront-controls, catalog, cart, checkout, phase-09-verification]

tech-stack:
  added: []
  patterns:
    - Locale navigation changes route only while StorefrontContext exclusively owns market mutation
    - Pending controls retain committed checked state and expose inline bounded rollback/retry
    - Broadcast messages are invalidation-only and locally published versions are deduplicated before server refetch

key-files:
  created: []
  modified:
    - src/components/commerce-context-switcher.tsx
    - src/components/header-market.tsx
    - src/components/storefront-context.tsx
    - src/components/catalog/unavailable-market.tsx
    - src/i18n/routing.ts
    - src/messages/en.json
    - src/messages/vi.json
    - tests/e2e/catalog-market.spec.ts
    - tests/e2e/storefront-market-convergence.spec.ts

key-decisions:
  - "Language and shopping region remain independent axes: locale navigation never mutates ACTIVE_MARKET, and market changes never navigate locale routes."
  - "Unavailable-product recovery and every compatibility caller delegate to StorefrontContext.requestMarketChange; no component-owned form/action authority remains."
  - "A provider records its own invalidation version before BroadcastChannel publication so same-tab delivery cannot abort the authoritative refresh it just started."

patterns-established:
  - "Committed-state control: pending intent leaves the prior market checked, disables choices, and closes only after the server-confirmed context converges."
  - "Equivalent locale route: dynamic entity mapping and explicit query allowlists are shared by header and footer navigation."
  - "E2E fault injection: rewrite the logical Server Action result while restoring the pre-action HttpOnly cookie, avoiding framework transport retries."

requirements-completed: [MKT-01, MKT-05, CAT-08, CART-03, OPS-04]

duration: 1 day elapsed across checkpoint
completed: 2026-07-26
---

# Phase 09 Plan 13: Independent Locale and Market Controls Summary

**Independent accessible locale and market controls now preserve route intent, commit commerce only through server-confirmed StorefrontContext authority, and converge safely across recovery, focus, reload, and tabs.**

## Performance

- **Duration:** 1 day elapsed across checkpoint
- **Started:** 2026-07-24T17:09:51Z
- **Completed:** 2026-07-26T04:16:25Z
- **Tasks:** 3
- **Files modified:** 25

## Accomplishments

- Replaced paired locale/market choices with independently labelled desktop radio groups and mobile 44px controls whose accessible name always summarizes the committed combination.
- Unified header and footer locale navigation behind equivalent localized routes and explicit query allowlists while leaving the HttpOnly market cookie untouched.
- Reduced legacy market entry points to StorefrontContext delegation and routed unavailable-product recovery through the same pending, commit, cart-requote, rollback, and retry lifecycle.
- Made context mutation latest-intent-safe and suppressed same-provider BroadcastChannel re-entry while retaining authoritative focus and cross-tab refetch.
- Promoted catalog and convergence browser contracts for all four locale/market combinations, rapid intent, mutation failure, reload, focus, and forged cross-tab invalidation.

## Task Commits

1. **Task 1: Build canonical desktop and mobile independent controls** - `06e5ee1` (feat)
2. **Task 2 RED: Add equivalent locale switch href contract** - `39f3acc` (test)
3. **Task 2 GREEN: Preserve route intent across locale switchers** - `2ea2d28` (feat)
4. **Task 3: Remove duplicate market authority and wire unavailable recovery** - `a17743b` (feat)

## Files Created/Modified

- `src/components/commerce-context-switcher.tsx` - Canonical desktop/mobile independent locale and market controls with committed pending/error semantics.
- `src/components/header-market.tsx` - Localized accessible context summary and route-aware control adapter.
- `src/components/locale-switcher.tsx` and `src/i18n/routing.ts` - Shared equivalent localized route and safe-query navigation.
- `src/components/storefront-context.tsx` - Server-confirmed latest-intent mutation, retry, focus, and invalidation lifecycle.
- `src/components/market-switcher.tsx` - Non-authoritative compatibility adapter with no direct form or action mutation.
- `src/components/catalog/unavailable-market.tsx` and `src/components/catalog/product-commerce.tsx` - Inline fail-closed market recovery through StorefrontContext.
- `src/catalog/queries.ts` and `src/components/catalog/catalog-commerce.tsx` - Strict ready projection acceptance with legitimate nullable image metadata.
- `src/messages/en.json` and `src/messages/vi.json` - Localized labels, helper text, status, rollback, and retry copy.
- `tests/e2e/catalog-market.spec.ts` - Four-combination currency projection plus desktop/mobile semantic controls.
- `tests/e2e/fixtures/storefront-market.ts` - Deterministic context sequences and logical market-action failure injection.
- `tests/e2e/storefront-market-convergence.spec.ts` - Rapid intent, rollback, reload, focus, cross-tab authority, and checkout ownership contracts.
- `tests/unit/catalog/storefront-projection.test.ts` - Nullable-image projection regression coverage.

## Decisions Made

- The market trigger and menu display only committed context. Attempted market intent is represented through busy/disabled/error state, never by optimistic labels.
- Broadcast and storage payloads carry an invalidation version only. Receivers must refetch private server authority before changing market or commerce.
- Valid products without optional image metadata remain ready commerce rows; the image fallback belongs to rendering and must not turn a valid market projection into an error.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Suppressed same-provider invalidation re-entry**
- **Found during:** Task 3 convergence verification
- **Issue:** The provider's BroadcastChannel received its own newly published signal, aborted the intended post-mutation refresh, and started a duplicate request that could consume stale fixture/server state.
- **Fix:** Record locally published invalidation versions before broadcasting and share bounded deduplication for local and received signals.
- **Files modified:** `src/components/storefront-context.tsx`
- **Verification:** Rapid VN → INTL → VN and cross-tab authoritative-refetch browser contracts pass without retries.
- **Committed in:** `a17743b`

**2. [Rule 1 - Bug] Accepted valid nullable product image metadata**
- **Found during:** Task 3 catalog matrix verification
- **Issue:** The private API returned a correct ready USD projection whose optional image fields were null, but the client validator rejected it and rendered the fail-closed catalog alert.
- **Fix:** Model and validate nullable image metadata consistently with the existing product-card fallback.
- **Files modified:** `src/catalog/queries.ts`, `src/components/catalog/catalog-commerce.tsx`, `tests/unit/catalog/storefront-projection.test.ts`
- **Verification:** Catalog matrix passes all four locale/market combinations and the new regression passes.
- **Committed in:** `a17743b`

**3. [Rule 3 - Blocking] Made convergence fixtures deterministic at framework boundaries**
- **Found during:** Task 3 E2E verification
- **Issue:** Tests omitted the fixture's market-cookie field, used compact labels against full accessible names, dispatched focus before visibility settlement, and modeled action failure as a retried transport 503.
- **Fix:** Seed exact market cookies, synchronize on full localized committed names, settle authoritative transitions, and rewrite the logical action result while restoring the pre-action cookie.
- **Files modified:** `tests/e2e/catalog-market.spec.ts`, `tests/e2e/fixtures/storefront-market.ts`, `tests/e2e/storefront-market-convergence.spec.ts`
- **Verification:** Combined assigned E2E run passes 14 promoted tests with three intentional future-owner skips and zero failures/flaky retries.
- **Committed in:** `a17743b`

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking test-infrastructure issue).
**Impact on plan:** The fixes enforce the planned authority and fail-closed contracts and make their browser proof deterministic. No schema, dependency, payment, shipping, or fulfillment scope changed.

## Issues Encountered

- Next dev logs reject loopback Supabase seed images as private upstream URLs during browser tests. Product image fallbacks render correctly, and this does not affect the asserted market/currency/context behavior.
- Three convergence cases remain intentionally `fixme` under their declared Plan 09-12/09-13 future ownership; all cases promoted by this plan are green.

## Verification

- `npx playwright test tests/e2e/catalog-market.spec.ts tests/e2e/storefront-market-convergence.spec.ts` - 14 passed, 3 intentionally skipped, zero failures or flaky retries.
- `npm run test:unit -- tests/unit/i18n/routing.test.ts tests/unit/storefront-context-lifecycle.test.ts tests/unit/cart/market-sync.test.ts tests/unit/catalog/storefront-projection.test.ts tests/unit/catalog/market.test.ts` - 65/65 passed across five files.
- `npm run typecheck` - passed.
- `npm run lint` - passed without warnings.
- `npm run test:security` - 47/47 security boundary tests passed.
- Targeted Prettier check and `git diff --check` - passed.

## User Setup Required

None - no environment variables, dependencies, migrations, or external service configuration required.

## Next Phase Readiness

- Plan 09-14 can validate SEO/ISR route truth against a single, independent storefront control model.
- Plan 09-15 can run the final checkout and release matrix with authoritative context and cart convergence intact.
- Human browser verification remains the final checkpoint before archiving the associated debug session.

## Self-Check: PASSED

- All 25 implementation/test files and this summary exist on disk.
- Task commits `06e5ee1`, `39f3acc`, `2ea2d28`, and `a17743b` exist in repository history.
- Combined E2E, targeted unit, type, lint, formatting, diff, and security gates pass.

---
*Phase: 09-independent-locale-and-market-commerce-projection-with-seo-s*
*Completed: 2026-07-26*
