---
status: in-progress
created: 2026-06-27
---

# Quick Task Plan: Account Pages UX

## Scope

- Add a shared account area shell with desktop sidebar and mobile drawer navigation.
- Polish existing account pages that already have data and actions: overview, orders, pattern library, wishlist, and addresses.
- Improve empty states, status badges, spacing, and action hierarchy without adding unsupported backend features.

## Verification

- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Run a focused Playwright smoke check for account route rendering when possible.
