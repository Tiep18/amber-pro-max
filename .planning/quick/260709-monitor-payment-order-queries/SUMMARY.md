---
status: complete
created: 2026-07-09
---

# Payment Order Query Monitoring

## Progress

- Started quick task to migrate payment order query failure recording to monitored wrappers.
- Replaced direct payment order query operational recording with `runMonitoredAction`.
- Added regression coverage proving payment query helpers still return stable public error results when operational recording fails.

## Verification

- `npm run test:unit -- tests/unit/payments/order-queries.test.ts tests/unit/operations/monitoring.test.ts`
- `npm run typecheck`
- `npm run lint`
