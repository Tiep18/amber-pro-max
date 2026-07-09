---
status: in-progress
created: 2026-07-09
---

# Payment Order Query Monitoring

## Goal

Migrate payment order query failure recording to the shared monitored action wrapper so operational logging is best-effort and cannot swallow or alter customer/admin error results.

## Scope

- Replace direct `recordOperationalFailure` use in `src/payments/queries.ts` with `runMonitoredAction`.
- Preserve sanitized facts for order number/order id and existing public error result codes.
- Add regression coverage for recorder failures.
- Run focused payment/monitoring tests plus typecheck and lint.

