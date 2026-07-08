---
status: complete
completed: 2026-07-09
slug: monitor-checkout-actions
---

# Summary: Monitor Checkout Actions

## Completed

- Added monitored-action support for decorating error results with operational record output.
- Migrated checkout quote refresh and checkout submit actions to `runMonitoredAction`.
- Preserved `errorId` on checkout error states when operational recording succeeds.
- Added regression coverage for recorder failures returning stable checkout error states.

## Verification

- `npm run test:unit -- tests/unit/operations/monitoring.test.ts tests/unit/checkout/actions.test.ts`
- `npm run typecheck`
- `npm run lint`
