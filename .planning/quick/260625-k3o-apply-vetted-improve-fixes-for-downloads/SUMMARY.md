---
status: complete
---

# Summary

Applied the improve findings that were confirmed against the live codebase and rejected the speculative index work.

## Changes

- Fixed digital download authorization so one order can contain multiple active entitlements without failing on a PostgREST cardinality error.
- Added optional `productId` scoping to download requests so pattern-library downloads resolve the correct entitlement when the latest order contains multiple digital products.
- Corrected the admin dashboard newsletter count and drill-down link to use the real `subscribed` status.
- Updated the root `README.md` so it reflects the current Phase 1-7 application surface instead of the old Phase 1-only boundary text.
- Rejected improve plans `003` and `004` because no measured launch-path bottleneck or failing query evidence justified new indexes in the current phase.

## Verification

- `npm run typecheck`: pass.
- `npm run test:unit`: 43 files, 251 tests passed.
- `npm run lint`: 0 errors, 8 pre-existing warnings.
