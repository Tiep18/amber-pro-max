---
status: complete
created: 2026-07-09
slug: monitor-catalog-actions
---

# Quick Task: Monitor Catalog Actions

Migrate catalog admin product save, publish, and archive actions to the global monitored action pattern while preserving stage-specific operational facts.

## Verification

- Add failing regression coverage proving catalog action error states survive recorder failure.
- `npm run test:unit -- tests/unit/catalog/publish-checks.test.ts tests/unit/operations/monitoring.test.ts`
- `npm run typecheck`
- `npm run lint`
