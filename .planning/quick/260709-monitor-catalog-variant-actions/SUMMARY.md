---
status: complete
completed: 2026-07-09
slug: monitor-catalog-variant-actions
---

# Summary: Monitor Catalog Variant Actions

## Completed

- Migrated generic variant save/remove failure recording to `runMonitoredAction`.
- Preserved sanitized product and variant reference facts.
- Added recorder-failure regression coverage for variant actions.

## Verification

- `npm run test:unit -- tests/unit/catalog/variants.test.ts tests/unit/operations/monitoring.test.ts`
- `npm run typecheck`
- `npm run lint`
