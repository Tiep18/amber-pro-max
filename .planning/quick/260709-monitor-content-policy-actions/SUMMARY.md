---
status: complete
completed: 2026-07-09
slug: monitor-content-policy-actions
---

# Summary: Monitor Content Policy Actions

## Completed

- Migrated blog admin action failure helper to `runMonitoredAction`.
- Migrated policy admin action failure helper to `runMonitoredAction`.
- Added recorder-failure regression coverage for blog and policy actions.

## Verification

- `npm run test:unit -- tests/unit/content/blog.test.ts tests/unit/policies/actions.test.ts tests/unit/operations/monitoring.test.ts`
- `npm run typecheck`
- `npm run lint`
