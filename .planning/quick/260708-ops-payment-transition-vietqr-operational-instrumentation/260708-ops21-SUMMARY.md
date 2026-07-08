---
status: complete
completed: 2026-07-08
id: 260708-ops21
slug: payment-transition-vietqr-operational-instrumentation
---

# 260708-ops21 Summary

## Completed

- Added payment transition operational recording coverage for `apply_payment_transition` RPC failures.
- Added VietQR instruction snapshot failure coverage.
- Instrumented shared payment transitions with sanitized failure facts.
- Instrumented VietQR instruction snapshot failures with order/payment references only.
- Avoided logging transition keys, raw sanitized facts, QR URLs, account numbers, account names, token-like values, and raw database messages.

## Verification

- RED: `npm run test:unit -- tests/unit/payments/transitions.test.ts tests/unit/payments/vietqr.test.ts` failed with 2 missing recorder calls and 10 existing tests passing.
- GREEN: `npm run test:unit -- tests/unit/payments/transitions.test.ts tests/unit/payments/vietqr.test.ts` passed: 2 files, 12 tests.
- `npm run typecheck` passed.
- `npm run lint` passed.
