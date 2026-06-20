---
phase: 06-customer-retention-and-trust
plan: "02"
subsystem: checkout
tags: [checkout, saved-addresses, quote-revalidation, next-intl, account]
requires:
  - phase: 06-customer-retention-and-trust
    provides: 06-01 owner-scoped saved address table, query helper, and account address UI
provides:
  - Saved-address checkout selector for signed-in physical checkouts
  - Address copy helper from account saved records to checkout shipping form state
  - Quote refresh input builder that reuses accepted quote lines and selected destination
  - Localized route/proxy/safe-redirect support for account address paths
affects: [phase-06, checkout, account, cart-quote, localization]
tech-stack:
  added: []
  patterns: [client selector reuses server quote refresh, material quote confirmation before accepting changed totals]
key-files:
  created:
    - src/checkout/saved-addresses.ts
    - src/components/checkout/saved-address-selector.tsx
  modified:
    - src/account/addresses.ts
    - src/components/checkout/checkout-page.tsx
    - src/app/[locale]/checkout/page.tsx
    - src/app/[locale]/thanh-toan/page.tsx
    - src/i18n/routing.ts
    - src/proxy.ts
    - tests/unit/account/addresses.test.ts
    - tests/unit/checkout/shipping-address-ui.test.ts
    - tests/unit/checkout/quote-diff.test.ts
    - tests/e2e/account-retention.spec.ts
key-decisions:
  - "Checkout saved-address reuse copies fields into checkout state and immediately calls the existing refreshCheckoutQuoteAction path."
  - "Saved-address destination changes reuse QuoteDiffDialog when material quote changes are returned; no new quote API was introduced."
  - "Checkout route loading is optional for signed-in customers only, so guest checkout remains available."
patterns-established:
  - "Account-owned convenience data can be server-loaded into checkout while browser-selected destination facts remain revalidated by server quote actions."
  - "Localized nested account paths must be present in routing pathnames for safe nested redirects and locale switching."
requirements-completed: [ACC-03]
duration: 24 min
completed: 2026-06-20
---

# Phase 06 Plan 02: Saved Address Checkout Reuse Summary

**Saved-address checkout reuse that copies account addresses into shipping state and reuses server quote refresh plus material-change confirmation.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-06-20T22:18:00+07:00
- **Completed:** 2026-06-20T22:42:00+07:00
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Added unit and Playwright contracts for saved-address checkout reuse, quote refresh input shape, and material-change preview behavior.
- Added `customerAddressToShippingAddress` so saved account rows copy into checkout without carrying owner metadata.
- Added `SavedAddressSelector` for signed-in customers with saved addresses in physical checkout flows.
- Wired localized checkout routes to load saved addresses through the Plan 06-01 owner-scoped query helper without requiring account creation for guests.
- Extended routing/proxy support so localized account address routes participate in safe redirects and session refresh.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend saved-address checkout tests** - `473a402` (`test(06-02)`)
2. **Task 2: Implement checkout selector and redirect support** - `2e8d95b` (`feat(06-02)`)

## Files Created/Modified

- `src/checkout/saved-addresses.ts` - Pure helper for building saved-address quote refresh inputs.
- `src/components/checkout/saved-address-selector.tsx` - Client selector that copies saved address fields, refreshes quote facts, and opens `QuoteDiffDialog` for material changes.
- `src/account/addresses.ts` - Adds saved-address to checkout shipping-address mapper.
- `src/components/checkout/checkout-page.tsx` - Accepts saved addresses and renders selector before the existing destination form.
- `src/app/[locale]/checkout/page.tsx` - Loads signed-in customer saved addresses for English checkout.
- `src/app/[locale]/thanh-toan/page.tsx` - Loads signed-in customer saved addresses for Vietnamese checkout.
- `src/i18n/routing.ts` - Adds localized account address pathname and helper.
- `src/proxy.ts` - Ensures account address routes refresh Supabase session through middleware.
- `tests/unit/account/addresses.test.ts` - Verifies saved rows copy to checkout shipping-address shape without owner id.
- `tests/unit/checkout/shipping-address-ui.test.ts` - Verifies saved-address quote refresh payloads preserve accepted quote line facts.
- `tests/unit/checkout/quote-diff.test.ts` - Verifies destination-driven shipping/market differences remain material quote changes.
- `tests/e2e/account-retention.spec.ts` - Adds skipped authenticated fixture contract for checkout reuse and material-change preview.

## Decisions Made

- Kept saved-address selection as a compact section inside the existing Destination card, rather than creating a separate checkout step.
- Reused `refreshCheckoutQuoteAction` and `QuoteDiffDialog` so saved-address reuse cannot bypass Phase 3 quote revalidation behavior.
- Loaded saved addresses on checkout routes only when `auth.getUser()` returns a user; failed address loading degrades to no selector instead of blocking checkout.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Test fixture initially used `quoteCartIntent` in a way that produced an unsupported shipping destination, so the material-change unit test was changed to use explicit `CartQuote` fixtures focused on `diffMaterialQuotes`.
- TypeScript initially narrowed a fixture too aggressively; explicit `CartQuote` annotation and a full `ready` shipping literal resolved the test type issue.

## Verification

- `npm run test:unit -- tests/unit/account/addresses.test.ts tests/unit/checkout/shipping-address-ui.test.ts tests/unit/checkout/quote-diff.test.ts` - passed; 14 tests.
- `npm run test:e2e -- tests/e2e/account-retention.spec.ts --list` - passed; 6 skipped fixture-activation contracts listed.
- `npm run typecheck` - passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 06-03 can build wishlist storage/account rendering with ACC-03 checkout reuse complete. Future checkout fixture work in Plan 06-10 can activate the saved-address E2E flow using authenticated users and seeded saved addresses.

---
*Phase: 06-customer-retention-and-trust*
*Completed: 2026-06-20*
