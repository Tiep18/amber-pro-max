---
status: complete
created: 2026-07-09
slug: monitor-catalog-media-actions
---

# Quick Task: Monitor Catalog Media Actions

Migrate catalog media operational failure recording to the global monitored action pattern without changing upload, association, primary image, social image, or PDF behavior.

## Verification

- Add failing regression coverage proving media action error states survive recorder failure.
- `npm run test:unit -- tests/unit/catalog/media-actions.test.ts tests/unit/operations/monitoring.test.ts`
- `npm run typecheck`
- `npm run lint`
