---
status: resolved
trigger: "Loi UI/UX khi nhap thong tin dia chi checkout: country select thieu quoc gia, khong chon/xoa lai duoc, validation im lang, update button disabled khong ro ly do."
created: "2026-06-18T10:05:00+07:00"
updated: "2026-06-18T10:10:00+07:00"
---

# Debug Session: checkout-address-ux

## Symptoms

- Expected behavior: Physical/mixed checkout lets customers choose any shipping country, revise or clear the selected country, and see clear validation feedback near invalid fields.
- Actual behavior: Country choices are hard-coded to a few countries; after selecting a country the field cannot be cleared or naturally changed; invalid fields do not show visible validation; the update button can be disabled without explaining why.
- Error messages: No runtime error reported; UX failure is silent validation and stuck input state.
- Timeline: Started after Phase 04 D-22..D-30 shipping-address gap implementation.
- Reproduction: Open checkout with a physical item, use the shipping address form, select a country, try clearing/changing it, and leave required fields invalid.

## Current Focus

- hypothesis: DestinationForm mixes free text search state with selected country state and uses a five-country hard-coded list plus disabled-only validation.
- test: Add component-level unit coverage for country list size, changing/clearing country, visible validation errors, and submit gating.
- expecting: Tests fail before the UI fix and pass after replacing the ad hoc datalist behavior with a controlled searchable list and inline validation.
- next_action: resolved

## Evidence

- timestamp: 2026-06-18T10:05:00+07:00
  observation: src/components/checkout/destination-form.tsx defines five hard-coded countries and keeps countrySearch separate from shippingAddress.countryCode.
- timestamp: 2026-06-18T10:10:00+07:00
  observation: Added getShippingCountryOptions and validateCheckoutShippingAddress tests, replaced the hard-coded datalist with a searchable country filter plus native select, added clear country behavior, and added inline field validation.

## Eliminated

- hypothesis: Payment/webhook/VietQR logic caused the UI behavior.
  reason: Symptoms are isolated to checkout address input interaction before payment submission.

## Resolution

- root_cause: DestinationForm used a hard-coded five-country datalist, preserved the previous selected country when search text no longer matched, and only represented invalid address state by disabling the update action.
- fix: Introduced full country option generation through Intl.DisplayNames with fallback region codes, a separate search field plus native select, clear-country action, required-field markers, inline validation messages, and a submit path that shows validation instead of silently disabling the update button.
- verification: Targeted checkout unit tests, typecheck, lint, and production build passed. The checkout Playwright spec was updated for the new form but could not be executed because an existing Next dev server lock prevented Playwright's configured webServer from starting.
- files_changed: src/checkout/shipping-address-ui.ts; src/components/checkout/destination-form.tsx; tests/unit/checkout/shipping-address-ui.test.ts; tests/e2e/checkout-market-change.spec.ts
