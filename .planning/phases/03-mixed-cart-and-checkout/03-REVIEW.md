---
status: clean
phase: "03"
files_reviewed: 4
findings:
  critical: 0
  warning: 0
  info: 1
  total: 1
updated: 2026-06-16T17:52:30+07:00
---

# Code Review: Add-to-cart Eligibility Pattern

## Scope

- `src/app/[locale]/product/[productSlug]/page.tsx`
- `src/components/catalog/add-to-cart.tsx`
- `src/catalog/add-to-cart-eligibility.ts`
- `tests/unit/catalog/add-to-cart.test.ts`

## Result

No blocking issues found after refactor.

## Findings

### INFO-01: Pure add-to-cart eligibility should live outside the client component

Initial placement of `canAddToCart` inside `src/components/catalog/add-to-cart.tsx` was behaviorally correct, but not the best project pattern. Existing tested pure logic lives in domain modules such as `src/catalog/variant-pricing.ts`, `src/cart/merge.ts`, and `src/checkout/shipping.ts`.

Resolution: moved the helper to `src/catalog/add-to-cart-eligibility.ts`, leaving the client component responsible for UI state and cart dispatch only.

## Verification

- `npm run test:unit -- tests/unit/catalog/add-to-cart.test.ts`
- `npm run test:unit -- tests/unit/checkout/quote-diff.test.ts tests/unit/catalog/add-to-cart.test.ts`
- `npm run typecheck`
- `npm run lint`

