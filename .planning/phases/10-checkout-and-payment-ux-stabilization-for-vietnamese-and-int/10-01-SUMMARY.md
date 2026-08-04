---
phase: 10-checkout-and-payment-ux-stabilization-for-vietnamese-and-int
plan: "01"
subsystem: ui
tags: [next-intl, playwright, accessibility, cart, ecommerce]

# Dependency graph
requires:
  - phase: 02-market-aware-public-catalog-and-private-admin
    provides: Authoritative market-aware product projections and exact add-to-cart agreements
  - phase: 03-cart-checkout-and-trusted-order-creation
    provides: Server-quoted cart state, shared cart provider, and trusted checkout boundary
provides:
  - Canonical localized PDP blocker reasons with inactive sticky actions removed from focus order
  - Item-specific 44px cart controls and one provider-owned remove/Undo contract across cart surfaces
  - Products-only subtotal wording, complete checkout blockers, and bounded English/Vietnamese cart messages
affects: [10-03-checkout, 10-07-responsive-focus-matrix, cart, product-detail]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Presentation consumes authoritative product projections and cart quotes without recalculating commerce facts
    - Client components create active-locale next-intl translators from bounded message namespaces

key-files:
  created: []
  modified:
    - src/components/catalog/add-to-cart.tsx
    - src/components/cart/cart-page.tsx
    - src/components/cart/cart-line.tsx
    - src/components/cart/mini-cart.tsx
    - src/messages/en.json
    - src/messages/vi.json
    - tests/unit/catalog/add-to-cart.test.ts
    - tests/e2e/cart.spec.ts

key-decisions:
  - "Unmount the inactive mobile sticky add-to-cart action so duplicate controls never enter keyboard focus."
  - "Reuse cart-provider removedLine and undoRemove state in both full and mini-cart surfaces."
  - "Use next-intl createTranslator with the active locale because the current client component tree has no NextIntlClientProvider."

patterns-established:
  - "Authoritative presentation: blocker names, availability, money, and stock are displayed only from existing projections, quotes, and provider change sets."
  - "Accessible disabled actions: complete localized reasons are linked through stable aria-describedby IDs."

requirements-completed: [CART-01, CART-02, CART-03, CART-05, INV-03, OPS-04]

# Metrics
duration: 22min
completed: 2026-08-04
---

# Phase 10 Plan 01: Cart and PDP UX Stabilization Summary

**Projection-authoritative PDP and cart presentation with 44px controls, shared durable Undo feedback, complete linked blockers, and bounded bilingual copy**

## Performance

- **Duration:** 22 min
- **Started:** 2026-08-04T06:21:45Z
- **Completed:** 2026-08-04T06:42:48Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Added one canonical PDP blocked-reason resolver, linked disabled controls to complete explanations, and removed inactive sticky actions from the focus order.
- Raised cart quantity and removal targets to 44px, shared the provider-owned remove/Undo contract with the mini-cart, and exposed complete item-specific checkout blockers.
- Reframed totals as products-only subtotals with explicit shipping caveats and moved touched customer copy into matching `productCart` and `cart` English/Vietnamese namespaces.
- Preserved the exact add-to-cart agreement and server cart quote as the only sources of market, price, stock, availability, and checkout eligibility facts.

## Task Commits

Each task was committed atomically:

1. **Task 1: Lock PDP and cart accessibility contracts before changing presentation**
   - `e84fcc66` — test: add failing cart accessibility contracts
   - `6fd85a4f` — feat: harden PDP and cart controls
2. **Task 2: Unify durable cart feedback and clarify blockers/subtotals**
   - `e689b894` — test: add failing cart feedback contracts
   - `8a3d043f` — feat: unify cart feedback and subtotals
3. **Task 3: Move touched cart and PDP strings into bounded bilingual messages**
   - `29d34dde` — feat: localize cart and PDP feedback

## Files Created/Modified

- `src/components/catalog/add-to-cart.tsx` — Canonical blocked-reason presentation, inert sticky behavior, and localized PDP cart actions.
- `src/components/cart/cart-page.tsx` — Complete quote-derived blockers, products subtotal wording, and localized full-cart feedback.
- `src/components/cart/cart-line.tsx` — Item-specific 44px quantity/remove controls and wrapping availability details.
- `src/components/cart/mini-cart.tsx` — Shared provider Undo feedback, complete blockers, and products subtotal wording.
- `src/messages/en.json` — Bounded English `productCart` and `cart` messages.
- `src/messages/vi.json` — Matching Vietnamese `productCart` and `cart` messages with verified diacritics.
- `tests/unit/catalog/add-to-cart.test.ts` — Blocked-reason precedence and exact-agreement unit coverage.
- `tests/e2e/cart.spec.ts` — Cart/PDP focus, target size, localization, blocker, subtotal, and Undo evidence.

## Decisions Made

- Inactive sticky PDP actions are conditionally unmounted rather than visually hidden, guaranteeing that keyboard users encounter only the active control.
- Mini-cart removal feedback consumes `removedLine` and `undoRemove` from the existing cart provider, avoiding a second undo stack or competing timeout.
- Bounded message namespaces are translated with `createTranslator` and the component's active locale; this satisfies current client architecture without expanding scope into shared layout/provider files.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The initial `useTranslations` integration revealed that the current client tree has no `NextIntlClientProvider`. The same installed next-intl package now uses its provider-free `createTranslator` API with the active locale and bounded message namespaces.
- A Unicode verification caught mojibake ellipses before commit; the locale values were corrected and the Vietnamese diacritic/key-parity checks were rerun successfully.

## Verification

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm run check:vi-diacritics` — passed
- `npm run test:unit -- tests/unit/catalog/add-to-cart.test.ts` — 6 passed
- `npm run test:security` — 58 passed
- `npm run test:e2e -- tests/e2e/cart.spec.ts` — 3 passed
- Locale namespace key parity and Unicode punctuation checks — passed
- Stub and threat-surface scans — no goal-blocking stubs or new trust-boundary surface

## TDD Gate Compliance

- Task 1 recorded a failing test commit before the implementation commit.
- Task 2 recorded a failing test commit before the implementation commit.
- Task 3 extended localization assertions and passed the focused browser suite before commit.

## Known Stubs

None in the files and message namespaces changed by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The stabilized PDP/cart contracts are ready for checkout presentation work and the Plan 10-07 consolidated responsive focus matrix.
- No blockers remain.

## Self-Check: PASSED

- All eight declared plan files exist.
- All five task commits exist in git history.
- Overall verification and authority-boundary scans passed.

---
*Phase: 10-checkout-and-payment-ux-stabilization-for-vietnamese-and-int*
*Completed: 2026-08-04*
