---
status: complete
completed: 2026-07-10
---

# Wishlist Polish Summary

## Completed

- Replaced the dashboard-like wishlist card wrapper with a lighter account section.
- Reworked saved product cards into compact rows with smaller product imagery, clearer status, price, and actions.
- Preserved quick-add eligibility logic, including sending variant products to the product detail flow instead of adding a variant picker.
- Preserved add-to-cart behavior, wishlist removal server action, hidden `locale` and `productId` payload, local state update, and wishlist context update.
- Made empty and route error states consistent with the polished account surfaces.

## Verification

- `npm run typecheck` passed.
- `npm run lint` passed.
- Unauthenticated `/en/account/wishlist` still redirects to sign-in.

## Notes

- No checkout, variant selection, or wishlist mutation semantics were changed.
