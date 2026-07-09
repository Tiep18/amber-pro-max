---
slug: action-error-id-traces
status: complete
---

# Summary: Action Error ID Traces

Implemented global monitored-action `errorId` propagation for recorded failures and applied it to wishlist mutation errors.

## Changes

- `runMonitoredAction` now attaches a recorded `errorId` to public error states by default for thrown and result-based recorded failures.
- Wishlist mutation failures now preserve safe Supabase diagnostics in operational facts while returning only `status`, `code`, and `errorId` to the UI.
- Wishlist feedback shows the safe `errorId` reference so support/admins can correlate with `operational_errors`.
- Project conventions now document the `errorId` public trace pattern and diagnostic redaction boundary.

## Verification

- `npm run test:unit -- tests/unit/operations/monitoring.test.ts tests/unit/account/wishlist.test.ts tests/unit/account/wishlist-client-state.test.ts tests/unit/checkout/actions.test.ts`
- `npm run test:unit -- tests/unit/payments/vietqr.test.ts`
- `npm run test:unit`
- `npm run typecheck`
- `npm run lint`
