---
status: complete
created: 2026-07-09
slug: monitor-payment-transition-vietqr-instructions
---

# Quick Task: Monitor Payment Transition VietQR Instructions

Migrate payment transition and VietQR instruction snapshot failure recording to the global monitored action pattern.

## Verification

- Add failing regression coverage proving payment transition and VietQR instruction errors survive recorder failure.
- `npm run test:unit -- tests/unit/payments/transitions.test.ts tests/unit/payments/vietqr.test.ts tests/unit/operations/monitoring.test.ts`
- `npm run typecheck`
- `npm run lint`
