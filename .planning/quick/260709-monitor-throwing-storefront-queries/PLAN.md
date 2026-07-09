---
status: complete
created: 2026-07-09
slug: monitor-throwing-storefront-queries
---

# Quick Task: Monitor Throwing Storefront Queries

Add a global monitored throwing-query wrapper and migrate storefront catalog/blog query helpers that intentionally throw stable public errors.

## Verification

- Add wrapper regression coverage proving recorder failures still throw stable public errors.
- Add query regression coverage for catalog/blog recorder failures.
- `npm run test:unit -- tests/unit/operations/monitoring.test.ts tests/unit/catalog/queries.test.ts tests/unit/content/blog.test.ts`
- `npm run typecheck`
- `npm run lint`
