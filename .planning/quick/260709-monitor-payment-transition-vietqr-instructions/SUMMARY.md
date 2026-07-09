---
status: complete
completed: 2026-07-09
slug: monitor-payment-transition-vietqr-instructions
---

# Summary: Monitor Payment Transition VietQR Instructions

## Completed

- Migrated payment transition RPC failure recording to `runMonitoredAction`.
- Migrated VietQR instruction snapshot failure recording to `runMonitoredAction`.
- Added recorder-failure regression coverage for payment transition and VietQR instruction helpers.

## Verification

- `npm run test:unit -- tests/unit/payments/transitions.test.ts tests/unit/payments/vietqr.test.ts tests/unit/operations/monitoring.test.ts`
- `npm run typecheck`
- `npm run lint`
