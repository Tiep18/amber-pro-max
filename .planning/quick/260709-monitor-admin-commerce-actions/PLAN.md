---
status: complete
created: 2026-07-09
slug: monitor-admin-commerce-actions
---

# Quick Task: Monitor Admin Commerce Actions

Migrate checkout admin discount and shipping actions to the global monitored action pattern so admin UI error states remain stable if operational recording fails.

## Verification

- Add failing regression coverage proving admin commerce actions survive recorder failure.
- `npm run test:unit -- tests/unit/checkout/admin-commerce-actions.test.ts tests/unit/operations/monitoring.test.ts`
- `npm run typecheck`
- `npm run lint`
