---
status: complete
created: 2026-07-09
slug: storefront-error-visibility
---

# Quick Task: Storefront Error Visibility

Improve remaining storefront/customer-facing silent degradation cases:

- Record an operational failure when homepage featured product loading falls back to empty sections.
- Show a visible wishlist update error when an optimistic heart toggle rolls back.

## Verification

- Add failing unit tests first.
- Run targeted unit tests.
- Run `npm run typecheck`.
- Run `npm run lint`.
