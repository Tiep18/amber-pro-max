---
status: complete
completed: 2026-07-09
slug: monitor-admin-commerce-actions
---

# Summary: Monitor Admin Commerce Actions

## Completed

- Migrated discount create/disable actions to `runMonitoredAction`.
- Migrated shipping create/deactivate actions to `runMonitoredAction`.
- Preserved sanitized admin commerce facts and added recorder-failure regression coverage.

## Verification

- `npm run test:unit -- tests/unit/checkout/admin-commerce-actions.test.ts tests/unit/operations/monitoring.test.ts`
- `npm run typecheck`
- `npm run lint`
