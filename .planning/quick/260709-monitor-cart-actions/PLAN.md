---
status: complete
created: 2026-07-09
slug: monitor-cart-actions
---

# Quick Task: Monitor Cart Actions

Migrate the cart quote refresh action from hand-rolled `try/catch + recordOperationalFailure` to the global `runMonitoredAction` pattern.

## Verification

- Add a failing regression test proving recorder failure does not change the action result.
- `npm run test:unit -- tests/unit/cart/actions.test.ts tests/unit/operations/monitoring.test.ts`
- `npm run typecheck`
- `npm run lint`
