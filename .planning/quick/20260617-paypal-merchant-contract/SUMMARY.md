---
status: complete
---

# Summary

PayPal capture reconciliation no longer treats an omitted `payee.merchant_id` as a merchant mismatch when the order was created server-side with the configured merchant payee and all provider/local capture facts match.

## Changes

- Create PayPal orders with `purchase_units[0].payee.merchant_id`.
- Request `Prefer: return=representation` for create, capture, and retrieve calls.
- Preserve strict rejection when PayPal returns a merchant id that differs from the configured merchant id.
- Record `merchantVerificationSource` in capture transition logs and sanitized facts.
- Keep sanitized PayPal flow logs only at failure-prone or state-changing points; remove noisy happy-path browser/server logs.

## Verification

- `npm run test:unit -- tests/unit/payments/paypal-client.test.ts`: 14 passed.
- `npm run test:unit -- tests/unit/payments/paypal-client.test.ts tests/unit/payments/paypal-webhook.test.ts tests/unit/payments/paypal-buttons.test.ts tests/unit/payments/paypal-logging.test.ts`: 27 passed.
- `npm run test:unit -- tests/unit/payments/status-mapping.test.ts`: 10 passed.
- `npm run typecheck`: pass.
- `npm run lint`: 0 errors, 9 existing warnings.
- `npm run db:test -- supabase/tests/database/04_payment_transitions.test.sql`: 31 passed.
- `npm run test:security -- tests/security/payment-boundaries.test.mjs tests/security/secret-boundary.test.mjs`: 10 passed.
