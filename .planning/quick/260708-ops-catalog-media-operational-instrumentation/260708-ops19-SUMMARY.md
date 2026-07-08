---
status: complete
completed: 2026-07-08
id: 260708-ops19
slug: catalog-media-operational-instrumentation
---

# 260708-ops19 Summary

## Completed

- Added catalog media operational recording tests for update and remove failures.
- Instrumented catalog media admin failure branches with sanitized `recordOperationalFailure` calls.
- Covered image upload, image association, image metadata update, primary image update, social image update, image remove, social-image-clear warning, pattern PDF upload, pattern PDF association, and pattern PDF remove failures.
- Kept validation outcomes as invalid results and avoided logging file names, object paths, alt text, raw database messages, emails, tokens, or stack traces.

## Verification

- RED: `npm run test:unit -- tests/unit/catalog/media-actions.test.ts` failed because `recordOperationalFailure` had zero calls.
- GREEN: `npm run test:unit -- tests/unit/catalog/media-actions.test.ts` passed: 1 file, 2 tests.
- Regression: `npm run test:unit -- tests/unit/catalog/media-actions.test.ts tests/unit/catalog/variants.test.ts` passed: 2 files, 15 tests.
- `npm run typecheck` passed.
- `npm run lint` passed.
