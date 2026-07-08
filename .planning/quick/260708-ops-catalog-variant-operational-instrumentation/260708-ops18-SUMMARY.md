---
status: complete
completed: 2026-07-08
task_id: 260708-ops18
commit: pending
---

# Catalog Variant Operational Instrumentation Summary

## Completed

- Added sanitized operational failure recording for generic variant save failures.
- Added sanitized recording for variant remove failures.
- Added shared instrumentation for variant price override save/remove and inventory adjustment generic failures.
- Preserved expected validation outcomes such as duplicate SKU and wrong inventory owner without logging them as operational failures.
- Added unit coverage proving recorder facts avoid SKU attributes, raw database details, emails, and tokens.

## Verification

- `npm run test:unit -- tests/unit/catalog/variants.test.ts` - passed, 13 tests.
- `npm run typecheck` - passed.
- `npm run lint` - passed.
