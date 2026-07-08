---
status: complete
created: 2026-07-09
slug: global-operational-pattern
---

# Quick Task: Global Operational Pattern

Introduce a global operational monitoring pattern so new server actions, route helpers, and data loaders do not hand-roll `try/catch` and silent fallbacks.

## Scope

- Add shared wrappers for monitored actions and monitored queries/loaders.
- Add tests that prove operational failures are recorded while invalid/expected results are not noisy.
- Migrate representative code to use the pattern.
- Document the rule in project conventions.

## Verification

- `npm run test:unit -- tests/unit/operations/monitoring.test.ts tests/unit/storefront/home-featured-products.test.ts tests/unit/account/wishlist.test.ts tests/unit/account/wishlist-client-state.test.ts`
- `npm run typecheck`
- `npm run lint`
