---
phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
plan: "12"
subsystem: cart-commerce
tags: [react, nextjs, cart, quote-cache, latest-request-wins, radix-dialog, accessibility]

requires:
  - phase: 03-mixed-cart-and-checkout
    provides: Intent-only guest cart storage and server-authoritative quote hydration
  - phase: 08-shipping-profile-fallbacks-destination-zones-and-us-region-s
    provides: Latest-request-wins destination lifecycle and blocking material confirmation
  - phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
    provides: Authoritative storefront context lifecycle and market projection contracts from Plans 09-03 and 09-05
provides:
  - Latest-request-wins cart market synchronization with bounded recovery and grouped material diffs
  - Locale, market, context-version, intent, TTL, and quote-market isolated session cache
  - Context-driven intent-only server requotes with fail-closed cart and mini-cart presentation
  - Accessible destination material-change dialog with explicit acceptance and focus restoration
affects: [09-13, 09-14, 09-15, cart, checkout, phase-09-verification]

tech-stack:
  added: []
  patterns:
    - Pure monotonic request reducer shared by context changes and cart intent mutations
    - Prior quote retained as presentation evidence only while current commerce facts remain masked
    - Radix modal dismissal routes through cancel while only the primary action accepts a quote

key-files:
  created:
    - src/cart/market-sync.ts
    - src/components/cart/cart-change-summary.tsx
  modified:
    - src/cart/quote-cache.ts
    - src/app/[locale]/layout.tsx
    - src/components/cart/cart-provider.tsx
    - src/components/cart/cart-page.tsx
    - src/components/cart/mini-cart.tsx
    - src/components/cart/cart-line.tsx
    - src/components/checkout/quote-diff-dialog.tsx
    - tests/unit/cart/market-sync.test.ts
    - tests/unit/cart/quote-cache.test.ts
    - tests/unit/checkout/quote-diff.test.ts

key-decisions:
  - "Cart quote cache v2 is readable only when locale, resolved market, context version, commercial intent fingerprint, TTL, quote locale, and quote market all agree."
  - "The prior accepted quote may preserve product identity and quantity during recovery, but it never supplies current price, availability, totals, or checkout authority."
  - "Destination dialog Escape, overlay, and secondary actions all cancel; only the explicit primary action accepts the proposal."

patterns-established:
  - "Cart convergence: context identity changes clear session cache, mask the current quote, and start one server-derived intent-only requote whose request id must still be active at settlement."
  - "Material summary: removed, unavailable, repriced, currency-changed, and quantity-adjusted facts are grouped once, with same-currency price arrows only."
  - "Fail-closed cart UI: quantity and checkout controls are blocked while unresolved, retry remains durable, and Remove stays available for persisted intent."

requirements-completed: [MKT-06, CART-03, CART-05, OPS-04]

duration: 20min
completed: 2026-07-24
---

# Phase 09 Plan 12: Authoritative Cart Requote and Material Synchronization Summary

**Context-versioned latest-request-wins cart requotes now isolate every market cache entry, mask stale commerce facts, preserve intent through recovery, and keep destination checkout authority explicit.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-07-24T16:30:00Z
- **Completed:** 2026-07-24T16:50:31Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments

- Added a pure cart market synchronization reducer whose stale successes and failures are exact no-ops, whose current settlement is atomic, and whose error surface contains bounded retry codes only.
- Replaced the legacy quote cache with a v2 session identity covering locale, resolved market, context version, complete commercial cart intent, TTL, and quote agreement; malformed, old-market, and v1 payloads fail closed.
- Moved `CartProvider` beneath authoritative storefront context and unified context changes plus add/update/remove/refresh operations behind the same monotonic server requote coordinator.
- Preserved intent rows during requote and error while masking price, currency, totals, and eligibility; checkout and quantity changes remain blocked until the current quote agrees.
- Added one localized grouped change summary to cart and mini-cart, retaining removed or unavailable intent with an explicit Remove action.
- Upgraded destination material confirmation to a trapped Radix modal with localized previous-to-proposed facts, Escape/overlay cancellation, and destination focus restoration.

## Task Commits

1. **Task 1 RED: Promote cart synchronization and cache contracts** - `d5c3eb4` (test)
2. **Task 1 GREEN: Pure reducer and market/version-aware cache** - `04f0a24` (feat)
3. **Task 2 RED: CartProvider context integration contract** - `22e6263` (test)
4. **Task 2 GREEN: Context-aware authoritative requote orchestration** - `a9291ac` (feat)
5. **Task 3: Fail-closed cart recovery, grouped summary, and accessible dialog** - `f8dd021` (feat)

## Files Created/Modified

- `src/cart/market-sync.ts` - Pure request lifecycle, bounded failure state, atomic settlement, and grouped material quote diff.
- `src/cart/quote-cache.ts` - Strict v2 session cache identity, legacy rejection, quote agreement, and safe clear.
- `src/app/[locale]/layout.tsx` - Storefront context now wraps cart so no request API enters the static server layout.
- `src/components/cart/cart-provider.tsx` - Server-only market resolution handoff, cache invalidation, request guards, recovery, and public block reasons.
- `src/components/cart/cart-page.tsx` - Intent-preserving pending/error rows, masked totals, grouped summary, retry, and blocked checkout.
- `src/components/cart/mini-cart.tsx` - Compact fail-closed quote region, grouped summary, retry, and blocked checkout.
- `src/components/cart/cart-line.tsx` - Identity/quantity presentation with independently disabled quote controls and safe Remove.
- `src/components/cart/cart-change-summary.tsx` - Localized material groups and same-currency-only price comparisons.
- `src/components/checkout/quote-diff-dialog.tsx` - Modal focus management, explicit cancel routes, localized labels, and previous/current currency formatting.
- `tests/unit/cart/market-sync.test.ts` - Promoted reducer contracts plus provider and fail-closed UI source integration gates.
- `tests/unit/cart/quote-cache.test.ts` - Exact cache identity, legacy rejection, wrong-market rejection, and safe-clear coverage.
- `tests/unit/checkout/quote-diff.test.ts` - Existing quote behavior plus modal accessibility and dismissal ownership contract.

## Decisions Made

- A missing market or context version cannot read or write the v2 quote cache. Callers must supply authoritative context identity.
- Context resolving/error can retain the old quote only inside reducer evidence; `useCart().quote` is `null` until market and context version agree.
- Removed lines are reconstructed from the prior quote solely for recognizable blocked presentation because persisted cart intent intentionally remains unchanged.
- Browsing-market synchronization does not touch the Phase 08 destination lifecycle, accepted hash, payment pair, submit validation, inventory, discounts, shipping, or immutable snapshot authority.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added reusable summary and line-level commerce masking**
- **Found during:** Task 3
- **Issue:** Updating only the planned page and mini-cart files could not preserve prior product identity while independently hiding stale price/status or retaining removed rows with a safe Remove action.
- **Fix:** Added `cart-change-summary.tsx` and extended `cart-line.tsx` with commerce masking, removed-row presentation, and independently disabled quantity controls.
- **Files modified:** `src/components/cart/cart-change-summary.tsx`, `src/components/cart/cart-line.tsx`, both cart surfaces, and `src/components/cart/cart-provider.tsx`.
- **Verification:** Cart source contract, 42 unit/checkout tests, lint, typecheck, and security suite pass.
- **Committed in:** `f8dd021`

**2. [Rule 1 - Bug] Preserved the previous currency when formatting destination changes**
- **Found during:** Task 3 typecheck
- **Issue:** A material shipping or total transition across currencies could incorrectly format the previous minor amount using the proposed currency.
- **Fix:** Derived and validated the previous currency from the explicit `currency_changed` fact, then formatted both sides independently without implying FX equivalence.
- **Files modified:** `src/components/checkout/quote-diff-dialog.tsx`
- **Verification:** Typecheck and destination quote-diff/lifecycle tests pass.
- **Committed in:** `f8dd021`

**3. [Rule 1 - Bug] Corrected stale STATE progress percentage after SDK update**
- **Found during:** Plan close-out
- **Issue:** `state.update-progress` reported 83/86 plans and 97% but left the persisted frontmatter percentage at the previous 78%.
- **Fix:** Reconciled the persisted percentage with the SDK's own recalculated result while retaining its plan count and position updates.
- **Files modified:** `.planning/STATE.md`
- **Verification:** STATE now records 83 completed plans, Plan 13 as next, and 97% progress; ROADMAP records 12/15 Phase 09 plans.
- **Committed in:** plan metadata commit

---

**Total deviations:** 3 auto-fixed (1 missing critical functionality, 2 bugs)
**Impact on plan:** The implementation fixes were required for fail-closed presentation and independent-offer accuracy; the close-out fix keeps tracking internally consistent. No server authority, schema, dependency, or checkout lifecycle architecture changed.

## Issues Encountered

- Lint continues to report two pre-existing unused `_input` warnings in `tests/unit/catalog/storefront-projection.test.ts`; there are no lint errors and the file is outside this plan.

## Known Stubs

None. Null quote/context initializers are lifecycle states, and `Not available` in the destination dialog is the bounded label for absent authoritative amounts rather than mock data.

## Threat Surface

No unplanned trust boundary was introduced. The changed session cache, browser intent handoff, context race handling, and browsing-versus-destination authority are all covered by T-09-01, T-09-03, T-09-05, T-09-06, T-09-07, and T-09-08 in the plan.

## TDD Gate Compliance

- RED commit `d5c3eb4` failed on the missing market-sync module, legacy cache identity, wrong-market hydration, and absent clear operation.
- GREEN commit `04f0a24` made all reducer/cache/lifecycle contracts pass before provider wiring.
- RED commit `22e6263` failed because `CartProvider` still wrapped storefront context and lacked guarded context-driven requotes.
- GREEN commit `a9291ac` made provider/cache/action tests, lint, and typecheck pass before Task 3 UI work.

## Verification

- `npm run test:unit -- tests/unit/cart/market-sync.test.ts tests/unit/cart/quote-cache.test.ts tests/unit/cart/actions.test.ts tests/unit/checkout/quote-diff.test.ts tests/unit/checkout/quote-lifecycle.test.ts tests/unit/checkout/submit-checkout.test.ts` - 42 tests passed.
- `npm run lint` - passed with two pre-existing warnings and no errors.
- `npm run typecheck` - passed.
- `npm run test:security` - 47 security boundary tests passed.
- Source acceptance gates confirm storefront context wraps cart, refresh input contains locale and intent lines only, cart surfaces mask stale commerce, and modal dismissal never calls acceptance.

## User Setup Required

None - no environment variables, dependencies, migrations, or external service configuration required.

## Next Phase Readiness

- Plan 09-13 can promote cross-tab/browser convergence against the authoritative cart fan-out now implemented.
- Plans 09-14 and 09-15 can run final SEO, build, browser, and checkout matrices without changing cart or destination authority.

## Self-Check: PASSED

- All 12 implementation/test files and this summary exist on disk.
- Task commits `d5c3eb4`, `04f0a24`, `22e6263`, `a9291ac`, and `f8dd021` exist in repository history.
- Plan-level unit, checkout, lint, type, and security gates pass.

---
*Phase: 09-independent-locale-and-market-commerce-projection-with-seo-s*
*Completed: 2026-07-24*
