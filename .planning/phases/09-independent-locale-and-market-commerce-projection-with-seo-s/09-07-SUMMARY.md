---
phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
plan: "07"
subsystem: storefront-product-commerce
tags: [react, nextjs, abort-controller, market-projection, cart-intent, seo, isr]

requires:
  - phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
    provides: Storefront context lifecycle and authoritative private product projection from Plans 09-05 and 09-06
  - phase: 03-mixed-cart-and-checkout
    provides: Intent-only cart storage and authoritative server quote hydration
provides:
  - Private active-market product commerce island with latest-generation response guards
  - Exact context/projection/variant agreement gate shared by main and sticky purchase actions
  - Intent-only Add to Cart handoff with quote-confirmed success feedback
  - Deterministic locale-default metadata and Product JSON-LD shell
affects: [09-12, 09-13, 09-15, phase-09-verification]

tech-stack:
  added: []
  patterns:
    - AbortController plus request identity comparison before committing private projection responses
    - Render-time selection identity gate before effect-driven variant reset
    - Browser offer fingerprints as UI freshness evidence only, never cart authority

key-files:
  created:
    - src/components/catalog/product-commerce.tsx
  modified:
    - src/app/[locale]/product/[productSlug]/page.tsx
    - src/components/catalog/add-to-cart.tsx
    - src/components/catalog/variant-selector.tsx
    - src/catalog/projections.ts
    - tests/unit/catalog/product-commerce.test.ts
    - tests/unit/catalog/add-to-cart.test.ts

key-decisions:
  - "Visible product commerce starts as a reserved fail-closed island; locale-default offers remain only in deterministic SEO metadata and JSON-LD."
  - "Purchase agreement matches locale, market, context generation/version, product, selected variant, and offer fingerprint before creating an intent."
  - "Projected variant attributes and display order are public offer facts and participate in the fingerprint so the UI never substitutes empty labels."

patterns-established:
  - "Latest projection wins: abort the prior request and compare request ID, generation, context version, market, locale, and slug before state commit."
  - "Projection reset: disable against the new identity during render, then clear the prior selection in an effect."
  - "Cart handoff: emit only productId, variantId, quantity, and marketAtAdd; show success only after an authoritative matching quote exists."

requirements-completed: [MKT-02, MKT-03, MKT-04, CAT-08, CART-03]

duration: 16min
completed: 2026-07-24
---

# Phase 09 Plan 07: Product Commerce Projection and Fail-Closed Purchase Summary

**Private active-market product offers with generation-safe fetches, exact purchase agreement, intent-only cart handoff, and request-invariant static SEO**

## Performance

- **Duration:** 16 min
- **Started:** 2026-07-24T14:52:23Z
- **Completed:** 2026-07-24T15:08:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Replaced locale-default visible price, stock, availability, variants, and purchase UI with one private no-store `ProductCommerce` island.
- Prevented stale response commits through AbortController cleanup and exact request identity checks across generation, context version, market, locale, and product slug.
- Kept the product route `force-static` with five-minute revalidation while metadata, canonical/hreflang, reviews, and Product JSON-LD remain derived from `marketForLocale(locale)`.
- Disabled both desktop and mobile sticky purchase actions unless context, projection, selected variant, and fingerprint agree exactly.
- Preserved cart authority by emitting only intent identifiers and waiting for a matching authoritative quote before showing the Added state.

## Task Commits

Each TDD task was committed with RED before GREEN:

1. **Task 1 RED: Product commerce lifecycle contracts** - `43f94c5`
2. **Task 1 GREEN: Private projection lifecycle and static shell** - `6c857ea`
3. **Task 2 RED: Exact purchase agreement contracts** - `2f1c6d5`
4. **Task 2 GREEN: Agreement-gated Add to Cart** - `cf3138c`
5. **Deviation fix: Projection-owned variant labels and ordering** - `aaf7ccd`

## Files Created/Modified

- `src/components/catalog/product-commerce.tsx` - Fetches and renders current private offer states with abort and latest-generation guards.
- `src/app/[locale]/product/[productSlug]/page.tsx` - Retains deterministic SEO facts while delegating visible commerce to the client island.
- `src/components/catalog/add-to-cart.tsx` - Applies exact agreement, first-frame variant reset gating, intent-only submission, and quote-confirmed feedback.
- `src/components/catalog/variant-selector.tsx` - Requires explicit selection rather than carrying or auto-selecting a prior option.
- `src/catalog/projections.ts` - Extends agreement with locale/context version and preserves variant label/order facts.
- `tests/unit/catalog/product-commerce.test.ts` - Covers stale completions, static shell separation, projection facts, and mismatch rejection.
- `tests/unit/catalog/add-to-cart.test.ts` - Covers intent allowlisting, fail-closed agreement, and projection identity resets.

## Decisions Made

- The static route may retain its deterministic locale-default offer only for metadata and JSON-LD; visible visitor commerce always starts non-actionable.
- Context generation and context version are both required because generation rejects late local requests while version distinguishes authoritative invalidation state.
- A projection change disables the current selection during render before `useEffect` clears it, closing the one-frame stale-variant window.
- The existing unavailable-market form remains the compatibility switch path until Plan 09-13, as specified by this plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Completed the product agreement helper**
- **Found during:** Task 2
- **Issue:** The Plan 09-06 helper checked status, market, generation, product, variant, and fingerprint but omitted context version and locale required by the locked agreement contract.
- **Fix:** Added context-version and locale comparison and threaded the complete agreement into Add to Cart.
- **Files modified:** `src/catalog/projections.ts`, `src/components/catalog/add-to-cart.tsx`, `src/components/catalog/product-commerce.tsx`
- **Verification:** Mismatch unit matrix, typecheck, and security suite pass.
- **Committed in:** `cf3138c`

**2. [Rule 2 - Missing Critical] Preserved public variant labels and display order**
- **Found during:** Pre-summary stub scan
- **Issue:** The authoritative RPC returned attributes and display order, but the projection DTO dropped them, forcing the commerce island to provide an empty attributes object that flowed to the variant UI.
- **Fix:** Carried sanitized string attributes and display order through the projection and offer fingerprint.
- **Files modified:** `src/catalog/projections.ts`, `src/components/catalog/product-commerce.tsx`, `tests/unit/catalog/product-commerce.test.ts`, `tests/unit/catalog/add-to-cart.test.ts`
- **Verification:** Projection/add-to-cart/storefront unit suites, lint, typecheck, and security suite pass.
- **Committed in:** `aaf7ccd`

---

**Total deviations:** 2 auto-fixed (2 missing critical).
**Impact on plan:** Both changes complete the required agreement and variant presentation contract without changing endpoint, cart, checkout, payment, inventory, or order authority.

## Issues Encountered

- Project lint completes with zero errors and two pre-existing unused-parameter warnings in `tests/unit/catalog/storefront-projection.test.ts`; this plan did not alter that Plan 09-06-owned file.

## Verification

- `npm run test:unit -- tests/unit/catalog/product-commerce.test.ts tests/unit/catalog/add-to-cart.test.ts tests/unit/content/json-ld.test.ts tests/unit/cart/market-sync.test.ts` - 15 passed, 6 expected-fail future contracts.
- `npm run lint` - passed with zero errors and two pre-existing warnings.
- `npm run typecheck` - passed.
- `npm run test:security` - 47 passed.
- Static source gate confirms `force-static`, `revalidate = 300`, `marketForLocale(locale)`, no request API usage, private no-store fetch, AbortController, and generation guard.

## TDD Gate Compliance

- Task 1: RED `43f94c5` precedes GREEN `6c857ea`.
- Task 2: RED `2f1c6d5` precedes GREEN `cf3138c`.
- Both RED suites failed for missing behavior before implementation and passed after GREEN.

## Known Stubs

None. The final scan found no placeholder copy, TODO/FIXME markers, or empty mock commerce facts flowing to the product UI.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Product detail commerce now consumes the same private active-market projection contract as downstream catalog/cart synchronization work.
- Plan 09-13 can replace the temporary unavailable-market compatibility form with the canonical independent context control.
- No blocker remains for later Phase 09 plans.

## Self-Check: PASSED

- All seven created/modified implementation and test files plus this summary exist on disk.
- RED/GREEN commits `43f94c5`, `6c857ea`, `2f1c6d5`, `cf3138c`, and deviation fix `aaf7ccd` exist in git history in the required order.
- Final unit, lint, typecheck, security, static SEO, stale-response, agreement, intent allowlist, and stub scans pass.

---
*Phase: 09-independent-locale-and-market-commerce-projection-with-seo-s*
*Completed: 2026-07-24*
