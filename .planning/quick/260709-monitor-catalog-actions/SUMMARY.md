---
status: complete
completed: 2026-07-09
slug: monitor-catalog-actions
---

# Summary: Monitor Catalog Actions

## Completed

- Migrated catalog product save, relation save, publish, publish-issue lookup, and archive failure recording to `runMonitoredAction`.
- Preserved stage-specific admin catalog action facts.
- Added recorder-failure regression coverage for catalog actions.

## Verification

- `npm run test:unit -- tests/unit/catalog/publish-checks.test.ts tests/unit/operations/monitoring.test.ts`
- `npm run typecheck`
- `npm run lint`
