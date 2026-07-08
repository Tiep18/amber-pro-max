---
status: complete
created: 2026-07-09
slug: monitor-checkout-actions
---

# Quick Task: Monitor Checkout Actions

Migrate checkout quote and submit actions to the global monitored action pattern while preserving `errorId` when operational recording succeeds.

## Verification

- Add failing wrapper/action regression tests first.
- `npm run test:unit -- tests/unit/operations/monitoring.test.ts tests/unit/checkout/actions.test.ts`
- `npm run typecheck`
- `npm run lint`
