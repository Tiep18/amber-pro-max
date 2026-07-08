---
status: complete
completed: 2026-07-08
task_id: 260708-ops14
commit: pending
---

# Storefront Cart And Account Loaders Operational Instrumentation Summary

## Completed

- Added sanitized operational failure recording for cart quote refresh exceptions.
- Added sanitized operational failure recording for customer wishlist load failures.
- Added sanitized operational failure recording for saved shipping address load failures.
- Added unit coverage proving recorder facts avoid raw cart labels, discount codes, owner IDs, user IDs, address details, phone numbers, emails, tokens, and raw database/private relation details.

## Verification

- `npm run test:unit -- tests/unit/cart/actions.test.ts tests/unit/account/wishlist.test.ts tests/unit/account/addresses.test.ts` - passed, 18 tests.
- `npm run typecheck` - passed.
- `npm run lint` - passed.
