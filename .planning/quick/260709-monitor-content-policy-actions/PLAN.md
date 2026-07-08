---
status: complete
created: 2026-07-09
slug: monitor-content-policy-actions
---

# Quick Task: Monitor Content Policy Actions

Migrate blog and policy admin action failure recording helpers to the global monitored action pattern.

## Verification

- Add failing regression coverage proving blog and policy action error states survive recorder failure.
- `npm run test:unit -- tests/unit/content/blog.test.ts tests/unit/policies/actions.test.ts tests/unit/operations/monitoring.test.ts`
- `npm run typecheck`
- `npm run lint`
