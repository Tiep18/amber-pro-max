---
status: complete
completed: 2026-07-09
slug: monitoring-wrapper-hardening
---

# Summary: Monitoring Wrapper Hardening

## Completed

- Made operational recording best-effort so recorder failures never change action/query return values.
- Kept recorded error results distinct from thrown business failures.
- Added `factsFromResult` and `factsFromError` hooks for dynamic safe operational facts.
- Added regression tests for recorder failures and dynamic facts.
- Updated project conventions to document best-effort monitoring and dynamic fact hooks.

## Verification

- `npm run test:unit -- tests/unit/operations/monitoring.test.ts`
- `npm run test:unit -- tests/unit/operations/monitoring.test.ts tests/unit/operations/redaction.test.ts tests/unit/operations/admin-queries.test.ts tests/unit/storefront/home-featured-products.test.ts tests/unit/account/wishlist.test.ts`
- `npm run typecheck`
- `npm run lint`
