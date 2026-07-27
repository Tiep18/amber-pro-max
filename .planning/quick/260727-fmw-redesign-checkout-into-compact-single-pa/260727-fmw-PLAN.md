---
quick_id: 260727-fmw
description: "Redesign checkout into compact single-page flow with safe customer and destination prefill"
date: 2026-07-27
status: complete
mode: quick-validate
must_haves:
  truths:
    - "Authenticated customer email is prefilled from the server-authenticated user and remains editable."
    - "A physical Vietnam-market checkout defaults the country to Vietnam when no saved destination has higher precedence."
    - "Every prefilled country/state destination triggers the same authoritative shipping quote path immediately."
    - "Checkout remains a single page with compact input sections, a useful sticky order rail, and a safe-area mobile action dock."
    - "Empty carts show a dedicated recovery state instead of inactive checkout controls."
    - "Payment remains derived from accepted market/currency and destination remains checkout market authority."
  artifacts:
    - "Server checkout route passes minimized authenticated email and saved-address data."
    - "Checkout composition moves products, discount, totals, destination/payment facts, policies, blockers, and CTA into one summary rail."
    - "Destination form progressively reveals address details and includes semantic autocomplete metadata."
    - "Focused unit, security, and browser regressions cover prefill and compact checkout behavior."
  key_links:
    - "server auth.getUser -> initialEmail -> editable ContactForm default"
    - "saved default address OR vn quote default -> one initialization effect -> requestQuote(country,state,address)"
    - "acceptedQuote -> summary products/totals/payment -> desktop CTA and mobile dock"
---

# Quick Task 260727-fmw: Compact checkout redesign and safe prefill

## Task 1: Establish deterministic checkout prefill

**Files**
- `src/app/[locale]/checkout/page.tsx`
- `src/components/checkout/checkout-page.tsx`
- focused checkout tests

**Action**
- Pass only the authenticated user's normalized email from the server checkout route.
- Define destination precedence: default saved address, then first saved address, then Vietnam for a physical `vn` quote, otherwise blank.
- Run the selected prefilled country/state through `requestQuote` exactly once per applicable cart context.
- Keep saved addresses and email editable, and keep latest-request-wins/material-change behavior unchanged.

**Verify**
- Email prefill is sourced only from `auth.getUser`.
- Saved/default and Vietnam destinations initiate authoritative shipping calculation without an extra button.
- International carts without a saved destination do not infer the United States.

## Task 2: Recompose checkout into a compact one-page workspace

**Files**
- `src/components/checkout/checkout-page.tsx`
- `src/components/checkout/contact-form.tsx`
- `src/components/checkout/destination-form.tsx`
- `src/components/checkout/saved-address-selector.tsx`
- `src/components/checkout/discount-code-form.tsx`
- `src/components/checkout/order-summary.tsx`

**Action**
- Replace repeated left-side cards with one flat checkout details surface.
- Remove the read-only payment box from Contact and show canonical payment in the order rail.
- Add order lines, discount disclosure, destination/payment facts, totals, blockers, policies, and CTA to the sticky summary.
- Add an accessible mobile total/CTA action dock with safe-area padding.
- Reveal address details only after country selection, compact quote status, and add semantic autofill attributes.
- Replace empty-cart checkout controls with a localized recovery state.
- Normalize Vietnamese checkout copy with accents.

**Verify**
- One primary CTA per viewport, no duplicated interactive submit control exposed to assistive technology.
- No horizontal overflow at 375px and no content hidden by the mobile action dock.
- Digital-only checkout renders no destination fields.

## Task 3: Regression and documentation

**Files**
- checkout unit/security/E2E tests
- `.planning/quick/260727-fmw-redesign-checkout-into-compact-single-pa/260727-fmw-SUMMARY.md`
- `.planning/quick/260727-fmw-redesign-checkout-into-compact-single-pa/260727-fmw-VERIFICATION.md`
- `.planning/STATE.md`

**Action**
- Run lint, typecheck, full unit and security gates.
- Run focused checkout browser tests when the local Supabase environment is available.
- Record commits, evidence, and any environment limitation.

**Done**
- Checkout is compact, prefilled safely, and preserves all payment, quote, inventory, and fulfillment authority boundaries.
