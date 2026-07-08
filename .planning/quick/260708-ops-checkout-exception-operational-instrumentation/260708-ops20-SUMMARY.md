---
status: complete
completed: 2026-07-08
id: 260708-ops20
slug: checkout-exception-operational-instrumentation
---

# 260708-ops20 Summary

## Completed

- Added checkout exception operational recording tests for request creation, approval grant insert, rejection update, and grant validation failures.
- Instrumented checkout exception flows with sanitized `recordOperationalFailure` calls.
- Kept invalid input, invalid request state, and invalid/expired grants as non-operational outcomes.
- Avoided logging customer email, customer/admin notes, grant tokens, token hashes, raw database messages, or admin email.
- Added warning visibility for approval status update failure after a grant insert while preserving the existing approved return contract.

## Verification

- RED: `npm run test:unit -- tests/unit/checkout/exceptions.test.ts` failed with 4 missing recorder calls and 3 existing tests passing.
- GREEN: `npm run test:unit -- tests/unit/checkout/exceptions.test.ts` passed: 1 file, 7 tests.
- Regression: `npm run test:unit -- tests/unit/checkout/exceptions.test.ts tests/unit/checkout/actions.test.ts` passed: 2 files, 9 tests.
- `npm run typecheck` passed.
- `npm run lint` passed.
