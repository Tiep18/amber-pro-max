---
status: complete
created: 2026-07-09
slug: monitor-catalog-variant-actions
---

# Quick Task: Monitor Catalog Variant Actions

Migrate catalog variant, variant price override, and inventory action failure recording to the global monitored action pattern.

## Verification

- Add failing regression coverage proving variant action error states survive recorder failure.
- `npm run test:unit -- tests/unit/catalog/variants.test.ts tests/unit/operations/monitoring.test.ts`
- `npm run typecheck`
- `npm run lint`
