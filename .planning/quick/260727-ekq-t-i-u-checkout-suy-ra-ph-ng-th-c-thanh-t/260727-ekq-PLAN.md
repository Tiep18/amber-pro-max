---
quick_id: 260727-ekq
description: "Optimize checkout payment derivation and destination quote authority"
date: 2026-07-27
status: human_needed
mode: quick-validate
must_haves:
  truths:
    - "Checkout renders exactly one payment method derived from the accepted market/currency quote."
    - "A physical shipping destination remains final quote authority when browsing market changes."
    - "Server actions canonicalize payment intent while the lower submit boundary and database still reject invalid pairs."
    - "Checkout retries do not place the customer's email address in the idempotency key."
  artifacts:
    - "Pure checkout payment-method resolver with unit coverage for valid and invalid pairs."
    - "Checkout UI with a non-interactive, localized automatic payment method summary."
    - "Browser regressions for destination changes and market changes after destination acceptance."
  key_links:
    - "acceptedQuote.market + acceptedQuote.currencyCode -> canonical paymentIntent -> guest recovery and submit"
    - "CartProvider upstream quote -> current checkout destination -> latest-request-wins requote"
---

# Quick Task 260727-ekq: Optimize checkout authority and payment UX

## Task 1: Derive payment method from accepted quote

**Files**
- `src/checkout/payment-method.ts`
- `src/components/checkout/contact-form.tsx`
- `src/components/checkout/checkout-page.tsx`
- `src/checkout/actions.ts`
- `tests/unit/checkout/payment-method.test.ts`
- relevant checkout action/component tests

**Action**
- Add a pure resolver for the only valid v1 pairs: `vn + VND -> vietqr_intent` and `intl + USD -> paypal_intent`.
- Replace the two-option payment selector with one localized automatic payment summary.
- Derive payment intent from the accepted quote in the page and canonicalize it again in server actions.
- Keep `submitCheckout` and database constraints as fail-closed defense in depth.
- Replace the email-bearing idempotency key with a stable per-quote opaque key.

**Verify**
- Unit tests cover both valid pairs and every invalid market/currency pair.
- Existing submit tampering tests still prove the lower boundary rejects invalid payment overrides.

**Done**
- A normal customer cannot choose an invalid method, while forged low-level payloads remain blocked.

## Task 2: Preserve destination quote authority across browsing-market changes

**Files**
- `src/components/checkout/checkout-page.tsx`
- `src/checkout/quote-lifecycle.ts`
- `tests/unit/checkout/quote-lifecycle.test.ts`
- `tests/e2e/checkout-market-change.spec.ts`
- `tests/e2e/checkout.spec.ts`

**Action**
- Track whether checkout has committed physical destination authority.
- When the upstream cart quote changes, requote the latest cart intent with the current destination instead of replacing the accepted destination quote.
- Preserve address/contact state, use the existing latest-request-wins lifecycle, and require material-change acceptance when facts change.
- Update browser tests to assert only the canonical payment method is rendered and an actual header market change cannot override a committed destination.

**Verify**
- Targeted unit, security, typecheck, lint, and checkout browser suites pass.
- No payment, webhook, inventory, order-state, or fulfillment authority is weakened.

**Done**
- Destination, currency, total, and payment method converge atomically and remain stable during storefront context changes.

## Task 3: Validate and document

**Files**
- `.planning/quick/260727-ekq-t-i-u-checkout-suy-ra-ph-ng-th-c-thanh-t/260727-ekq-SUMMARY.md`
- `.planning/quick/260727-ekq-t-i-u-checkout-suy-ra-ph-ng-th-c-thanh-t/260727-ekq-VERIFICATION.md`
- `.planning/STATE.md`

**Action**
- Run proportional regression gates and record evidence, limitations, and commits.

**Verify**
- Worktree is clean after atomic source and documentation commits.

**Done**
- Quick task is recorded as completed and verified.
