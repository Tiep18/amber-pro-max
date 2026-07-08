---
status: complete
completed_at: 2026-07-08
---

# Quick Task 260708-ops10 Summary

## Result

Newsletter subscribe, unsubscribe, and admin lookup failures now record sanitized operational failures.

## Changes

- Recorded subscribe RPC failures and unexpected subscribe results.
- Recorded unsubscribe RPC failures and unexpected unsubscribe results.
- Wired public newsletter subscribe action to the shared operational error recorder.
- Recorded admin subscriber lookup and consent lookup failures.
- Kept subscriber email, raw unsubscribe token, token hash, request hashes, search text, and raw database details out of operational facts.

## Verification

- `npm run test:unit -- tests/unit/newsletter/consent.test.ts tests/unit/newsletter/admin.test.ts` - 2 files passed, 17 tests passed.
- `npm run typecheck` - passed.
- `npm run lint` - passed.
