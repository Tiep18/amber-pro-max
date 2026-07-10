---
status: in-progress
created: 2026-07-10
---

# Wishlist Polish

## Goal

Refine the account wishlist page so saved products feel consistent with the lighter account surfaces while preserving wishlist removal, quick-add eligibility, cart add behavior, localized routes, and market-aware availability.

## Scope

- Replace the dashboard-like card wrapper with a lighter account section.
- Rework saved product cards into compact rows with smaller imagery and clearer status/price/actions.
- Keep quick add behavior unchanged, including requiring product detail for variant selection.
- Keep wishlist removal action, hidden payload, local state update, and wishlist context update unchanged.

## Verification

- Typecheck.
- Lint.
- Unauthenticated route guard smoke.

## Progress

- [x] Created quick task context.
- [x] Refine wishlist UI.
- [x] Run verification.
