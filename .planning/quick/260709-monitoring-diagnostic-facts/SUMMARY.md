---
status: complete
date: 2026-07-09
---

# Monitoring Diagnostic Facts

Added safe operational diagnostics for Supabase/PostgREST failures. Operational error facts can now include `dbCode`, `dbMessage`, `dbHint`, `dbDetails`, `httpStatus`, `source`, `authState`, `authRole`, and `userPresent` when safe.

Applied the pattern first to the real failure sources seen in remote records: public review queries and customer account fulfillment queries. Account orders and pattern library pages now pass actual request claims state into the query layer for future diagnosis.

Verification:

- `npm run test:unit -- tests/unit/operations/monitoring.test.ts tests/unit/operations/redaction.test.ts tests/unit/reviews/eligibility.test.ts tests/unit/fulfillment/account-access.test.ts`
- `npm run test:unit`
- `npm run typecheck`
- `npm run lint`
