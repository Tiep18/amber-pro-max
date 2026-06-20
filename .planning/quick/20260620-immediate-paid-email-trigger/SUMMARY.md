---
status: complete
completed: 2026-06-20
---

# Summary

Paid order flows now trigger the transactional email outbox immediately after the verified paid transition commits. The hosted scheduler remains the fallback/retry mechanism, not the normal customer wait path.

## Changes

- Added `triggerTransactionalEmailOutboxNow` in the server-only email outbox adapter.
- Triggered the worker after paid PayPal capture/recheck transitions.
- Triggered the worker after verified paid PayPal webhook transitions.
- Triggered the worker after VietQR admin confirmation transitions.
- Kept the trigger best-effort: missing Resend config or worker errors return typed results and do not roll back payment confirmation.
- Updated Phase 5 docs to clarify immediate trigger plus scheduler fallback behavior.

## Verification

- `npm run test:unit -- tests/unit/fulfillment/email-outbox.test.ts tests/unit/payments/paypal-client.test.ts tests/unit/payments/paypal-webhook.test.ts tests/unit/payments/vietqr.test.ts` - passed, 41 tests.
- `npm run typecheck` - passed.
- `npm run lint` - passed with 8 existing warnings.
- `npm run test:security` - passed, 22 tests.
- `npm run test:unit` - passed, 185 tests.
- `npm run build` - passed.
