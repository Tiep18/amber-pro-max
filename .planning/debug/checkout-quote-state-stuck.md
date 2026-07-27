---
status: resolved
trigger: "Checkout shows an unnecessary price-confirmation modal for autofilled contact/address, becomes stale after accepting a country quote and trying to pay, keeps duplicate stale coupon warnings, and remains blocked after choosing Review address."
created: 2026-07-27T11:35:00+07:00
updated: 2026-07-27T12:03:00+07:00
---

# Debug Session: Checkout Quote State Stuck

## Symptoms

- Expected behavior: Autofill within the accepted market should settle silently; accepting a material destination quote should make checkout immediately submittable; transient coupon warnings should clear on the next relevant action and appear once; reviewing an address should return to an editable, unblocked state.
- Actual behavior: Autofill can show the material-change modal; accepted destination totals can submit as stale; invalid coupon warnings duplicate and persist after later actions; Review address closes the modal but checkout remains blocked until another destination is selected.
- Error messages: "Báo giá đã thay đổi. Hãy xem lại tổng tiền và thử lại."
- Timeline: Observed after the compact checkout and safe-prefill redesign.
- Reproduction: Open checkout with prefilled contact/address; change destination and accept the new quote; submit with derived VietQR/PayPal; apply an invalid coupon then perform another action; choose Review address in the quote-change modal.

## Current Focus

- hypothesis: Confirmed. Several client transitions retained an older accepted quote or feedback state after the visible destination/quote changed.
- test: Completed lifecycle tracing, regression tests, security-boundary tests, and real-browser interaction checks.
- expecting: Resolved transitions keep the visible destination, accepted quote, guest-recovery evidence, and transient feedback synchronized.
- next_action: Resolved; monitor checkout telemetry after deployment.

## Evidence

- Autofill used the same material-change settlement path as a deliberate destination edit, so a valid server-derived default could open the confirmation dialog.
- Reviewing a proposed destination cleared the proposal but kept the edited destination beside the previous accepted quote, leaving `canSubmitAcceptedQuote` false until another destination event occurred.
- Submit refreshed the commercial quote, but guest recovery still received the pre-refresh `acceptedQuote` object alongside the refreshed hash.
- Ineligible coupons were rendered both by `DiscountCodeForm` and `OrderSummary`, and the local form warning had no interaction-scoped reset.
- Browser verification: reviewing a Vietnam proposal restored the previously accepted Australia destination and immediately re-enabled the PayPal action without selecting a third destination.
- Browser verification: an invalid coupon produced one warning; a subsequent country change cleared it.
- Automated verification: typecheck passed; 52 security boundary tests passed; 20 targeted lifecycle/prefill unit tests passed. The earlier full suite also passed with 733 unit tests, lint, and typecheck.

## Eliminated

- Server-side quote validation was not removed or weakened. Checkout persistence still recalculates and validates commercial facts authoritatively.
- Payment-provider selection was not the root cause; both VietQR and PayPal consumed the same inconsistent accepted-quote state.
- Market/locale projection changes did not require trusting client totals or exchange-rate conversion.

## Resolution

- root_cause: Client quote lifecycle transitions did not distinguish silent prefill from deliberate destination edits, review dismissed the proposal without restoring an accepted destination, submit mixed refreshed and stale quote evidence, and coupon feedback lived in two render locations without an interaction boundary.
- fix: Settle prefill quotes silently, restore the last accepted destination when reviewing a proposal, refresh and consistently use one quote immediately before guest recovery and persistence, carry only applied coupons across requotes, and scope coupon warnings to one component plus the current interaction.
- files_changed:
  - `src/checkout/prefill.ts`
  - `src/components/checkout/checkout-page.tsx`
  - `src/components/checkout/discount-code-form.tsx`
  - `src/components/checkout/order-summary.tsx`
  - `tests/unit/checkout/prefill.test.ts`
  - `tests/unit/checkout/quote-lifecycle.test.ts`
  - `tests/e2e/checkout-market-change.spec.ts`
  - `tests/security/checkout-boundaries.test.mjs`
- verification:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test:unit` (85 files, 733 tests)
  - `npm run test:security` (52 tests)
  - Targeted lifecycle/prefill unit tests (20 tests)
  - Real-browser checks for review-destination recovery and coupon-warning cleanup; no order was created.
