---
phase: 03-mixed-cart-and-checkout
plan: "01"
subsystem: cart-checkout
tags: [nextjs, react, cart, checkout, localstorage, zod, playwright, vitest]

requires:
  - phase: 02-market-aware-catalog
    provides: Market-safe catalog projections, product detail pages, product types, prices, and variant stock states
provides:
  - Versioned 30-day guest cart intent storage with commercial data minimization
  - Pure cart merge helpers with explicit added, combined, capped, and not-merged outcomes
  - Server-owned cart quote hydration with line status, subtotal, unavailable exclusions, and quote hashes
  - Product add-to-cart, header mini-cart, and localized full cart routes for Vietnamese and English
  - Focused unit and browser coverage for mixed cart behavior
affects: [shipping quotes, discounts, checkout drafts, reservations, payments, fulfillment]

tech-stack:
  added: []
  patterns:
    - Browser cart storage persists only productId, optional variantId, quantity, timestamps, and marketAtAdd
    - Client cart UI refreshes a server-owned quote after every mutation
    - Quote service supports injectable catalog loading for deterministic unit tests and existing catalog query helpers in production

key-files:
  created:
    - src/cart/types.ts
    - src/cart/guest-storage.ts
    - src/cart/merge.ts
    - src/cart/actions.ts
    - src/checkout/types.ts
    - src/checkout/quote.ts
    - src/components/cart/cart-provider.tsx
    - src/components/cart/cart-line.tsx
    - src/components/cart/cart-page.tsx
    - src/components/cart/mini-cart.tsx
    - src/components/catalog/add-to-cart.tsx
    - src/app/[locale]/cart/page.tsx
    - src/app/[locale]/gio-hang/page.tsx
    - tests/unit/cart/guest-storage.test.ts
    - tests/unit/cart/merge.test.ts
    - tests/unit/checkout/quote-diff.test.ts
    - tests/e2e/cart.spec.ts
  modified:
    - src/app/[locale]/layout.tsx
    - src/app/[locale]/product/[productSlug]/page.tsx
    - src/components/catalog/variant-selector.tsx
    - src/components/site-header.tsx
    - src/i18n/routing.ts
    - src/proxy.ts

key-decisions:
  - "Guest cart storage remains an intent-only browser cache; all display prices, titles, stock, and quote state come from server quote hydration."
  - "Plan 03-01 stops at cart review and quote refresh; shipping, payment provider UI, payment confirmation, reservations, orders, and fulfillment remain later-phase work."
  - "Cart quote tests use an injectable catalog loader while production quote hydration uses the existing Phase 2 catalog query boundary."

patterns-established:
  - "CartProvider owns local intent writes and calls a thin Server Action for authoritative quote refresh."
  - "Unavailable or invalid lines remain visible and disable checkout instead of being silently removed."
  - "Localized physical route slugs that bypass next-intl rewriting must be added to proxy allowlists."

requirements-completed: [CART-01, CART-02, CART-03]

duration: 24 min
completed: 2026-06-15
---

# Phase 03 Plan 01: Mixed Cart and Server-Owned Pricing Pipeline Summary

**Intent-only guest cart storage with server-hydrated mixed PDF/physical quote review, localized mini-cart, full cart editing, and no payment capture UI**

## Performance

- **Duration:** 24 min
- **Started:** 2026-06-15T03:55:35Z
- **Completed:** 2026-06-15T04:19:31Z
- **Tasks:** 3
- **Files modified:** 23

## Accomplishments

- Added 30-day guest cart persistence that strips browser-submitted commercial, payment, address, email, discount, stock, and quote fields.
- Added cart merge helpers and account-cart contracts for later signed-in synchronization and merge prompts.
- Added authoritative quote hydration that recalculates mixed digital/physical lines from catalog data, returns blocked/unavailable/invalid/capped states, and leaves shipping uncalculated for Plan 03-02.
- Wired product add-to-cart, header mini-cart, and `/en/cart` plus `/vi/gio-hang` full cart pages with quantity editing, removal, undo, localized labels, and checkout blocking reasons.
- Added Vitest and Playwright coverage for cart storage, merge outcomes, quote diffs, add-to-cart, mini-cart, full cart editing, and unavailable blocking lines.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Guest cart and merge tests** - `906b80f` (test)
2. **Task 1 GREEN: Guest cart intent helpers** - `2a802e5` (feat)
3. **Task 2 RED: Quote tests** - `0b5a0ca` (test)
4. **Task 2 GREEN: Server-owned quote hydration** - `0db0d02` (feat)
5. **Task 3 RED: Cart browser spec** - `966b6ea` (test)
6. **Task 3 GREEN: Mixed cart storefront UX** - `794538a` (feat)

**Plan metadata:** pending in docs commit

## Files Created/Modified

- `src/cart/types.ts` - Intent schemas, account cart contracts, merge result types, and add-to-cart input types.
- `src/cart/guest-storage.ts` - Versioned localStorage adapter with 30-day expiry and safe failure behavior.
- `src/cart/merge.ts` - Pure merge helper for added, combined, capped, and not-merged line outcomes.
- `src/cart/actions.ts` - Thin Server Action for quote refresh.
- `src/checkout/types.ts` - Quote action input and quote response contracts.
- `src/checkout/quote.ts` - Authoritative quote pipeline and quote diff helper.
- `src/components/cart/*` - Provider, mini-cart, full cart page, and line presentation.
- `src/components/catalog/add-to-cart.tsx` - Product detail add-to-cart client control.
- `src/app/[locale]/cart/page.tsx` and `src/app/[locale]/gio-hang/page.tsx` - Localized full cart routes.
- `src/app/[locale]/layout.tsx`, `src/components/site-header.tsx`, `src/i18n/routing.ts`, `src/proxy.ts` - Cart provider/header route integration.
- `tests/unit/cart/*`, `tests/unit/checkout/quote-diff.test.ts`, `tests/e2e/cart.spec.ts` - Focused verification.

## Decisions Made

- Browser storage is deliberately non-authoritative and stores only cart intent references plus timestamps.
- Server quote hydration is the only source for title, fulfillment type, current price, line subtotal, availability, and blocking status.
- Shipping remains `not_calculated` with zero amount in this plan so digital lines never receive placeholder shipping and Plan 03-02 can add destination rules cleanly.
- Checkout CTA is disabled only for blocking cart lines in this slice; no PayPal, VietQR, payment confirmation, digital entitlement, or reservation UI was added.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test Bug] Corrected quote excluded-subtotal expectation**
- **Found during:** Task 2 (Build authoritative cart quote hydration)
- **Issue:** The RED quote test expected `740000` excluded subtotal for a quantity capped from 5 to 2 at `390000` each, but the correct excluded amount is 3 excluded units, `1170000`.
- **Fix:** Updated the assertion to match the intended quantity-cap behavior before committing the GREEN implementation.
- **Files modified:** `tests/unit/checkout/quote-diff.test.ts`
- **Verification:** `npx vitest run tests/unit/checkout/quote-diff.test.ts` passed.
- **Committed in:** `0db0d02`

**2. [Rule 3 - Blocking] Accepted existing seed GUID format in cart intent validation**
- **Found during:** Task 3 (Wire product add-to-cart, mini-cart, and full cart UX)
- **Issue:** The initial `z.uuid()` schema rejected existing project seed IDs such as `50000000-0000-0000-0000-000000000001` because they are GUID-shaped fixtures without strict UUID version bits.
- **Fix:** Switched cart intent ID validation to `z.guid()` so browser intent validation remains format-bound while accepting current catalog identifiers.
- **Files modified:** `src/cart/types.ts`
- **Verification:** Cart/quote Vitest and Playwright cart spec passed with real seed products.
- **Committed in:** `794538a`

**3. [Rule 3 - Blocking] Added localized cart route to proxy physical slug allowlist**
- **Found during:** Task 3 (Wire product add-to-cart, mini-cart, and full cart UX)
- **Issue:** `/vi/gio-hang` entered a next-intl redirect loop because the proxy bypass list had not been extended for the new translated cart route.
- **Fix:** Added `/vi/gio-hang` and `/en/cart` to the cart slug allowlist in `src/proxy.ts`.
- **Files modified:** `src/proxy.ts`
- **Verification:** `npx playwright test tests/e2e/cart.spec.ts` passed.
- **Committed in:** `794538a`

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking).
**Impact on plan:** All fixes were required for correctness and route functionality; no payment, fulfillment, reservation, shipping, or order scope was added.

## Issues Encountered

- A leftover Next dev server from an earlier Playwright RED run held port 3210; the process was stopped before rerunning the focused cart spec.
- Some Playwright locators were narrowed after implementation because repeated accessible text appeared in the mini-cart, full cart, and screen-reader labels.
- Playwright emitted `ECONNRESET` messages while shutting down the dev server after passing runs; the command exited successfully.

## Verification

- `npx vitest run tests/unit/cart/guest-storage.test.ts tests/unit/cart/merge.test.ts` - passed, 7 tests.
- `npx vitest run tests/unit/checkout/quote-diff.test.ts` - passed, 3 tests.
- `npm run typecheck` - passed.
- `npx playwright test tests/e2e/cart.spec.ts` - passed, 3 tests.
- Final combined gate `npx vitest run tests/unit/cart/guest-storage.test.ts tests/unit/cart/merge.test.ts tests/unit/checkout/quote-diff.test.ts; npm run typecheck; npx playwright test tests/e2e/cart.spec.ts` - passed.

## Known Stubs

None. Shipping is intentionally shown as not calculated because Plan 03-02 owns destination shipping quotes; no placeholder fee is used.

## Threat Flags

None. New browser-storage and quote trust boundaries are covered by the plan threat model and mitigated by intent-only storage, Zod validation, and server-side quote recalculation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Plan 03-02. The cart now provides authoritative product subtotal and line status inputs that shipping profiles and destination revalidation can extend without trusting browser-submitted prices or hidden commercial data.

## Self-Check: PASSED

- Created files exist for cart storage, merge, quote, cart UI, localized routes, and tests.
- Task commits exist: `906b80f`, `2a802e5`, `0b5a0ca`, `0db0d02`, `966b6ea`, `794538a`.
- Verification commands listed above passed after final implementation.

---
*Phase: 03-mixed-cart-and-checkout*
*Completed: 2026-06-15*
