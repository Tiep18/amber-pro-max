# PayPal Merchant Contract Reconciliation

## Goal

Fix PayPal capture reconciliation when PayPal omits `payee.merchant_id` from capture responses.

## Scope

- Bind PayPal order creation to the configured merchant id.
- Request full PayPal capture representation where supported.
- Treat a missing merchant id differently from a mismatched merchant id when all local/provider order facts match and the server-created payee contract is in force.
- Keep sanitized PayPal flow logs for manual sandbox testing.

## Verification

- Add regression tests before implementation.
- Run PayPal unit tests, typecheck, and lint.
