---
status: complete
completed: 2026-07-08
task_id: 260708-ops13
commit: pending
---

# Storefront Public Loaders Operational Instrumentation Summary

## Completed

- Added sanitized operational failure recording for public catalog product list, facets, product detail, category detail, and collection detail RPC failures.
- Added sanitized operational failure recording for public blog list/detail query failures.
- Added sanitized operational failure recording for public product review query failures and unexpected data shapes.
- Added unit coverage proving public loader failures still expose only safe generic errors/results and do not log raw database/private relation details, review body text, emails, tokens, or payloads.

## Verification

- `npm run test:unit -- tests/unit/catalog/queries.test.ts tests/unit/content/blog.test.ts tests/unit/reviews/eligibility.test.ts` - passed, 28 tests.
- `npm run typecheck` - passed.
- `npm run lint` - passed.
