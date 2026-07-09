---
status: complete
created: 2026-07-09
slug: monitor-review-query-eligibility
---

# Quick Task: Monitor Review Query Eligibility

Migrate review public/admin query helpers and review eligibility checks to the global monitored action pattern.

## Verification

- Add failing regression coverage proving review query and eligibility states survive recorder failure.
- `npm run test:unit -- tests/unit/reviews/eligibility.test.ts tests/unit/operations/monitoring.test.ts`
- `npm run typecheck`
- `npm run lint`
