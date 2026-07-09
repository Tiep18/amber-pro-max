---
status: complete
completed: 2026-07-09
slug: monitor-throwing-storefront-queries
---

# Summary: Monitor Throwing Storefront Queries

## Completed

- Added `runMonitoredThrowingQuery` for query helpers that must throw stable public errors.
- Migrated storefront catalog and public blog query failures to the throwing-query wrapper.
- Added regression coverage for recorder failures preserving stable thrown errors.

## Verification

- `npm run test:unit -- tests/unit/operations/monitoring.test.ts tests/unit/catalog/queries.test.ts tests/unit/content/blog.test.ts`
- `npm run typecheck`
- `npm run lint`
