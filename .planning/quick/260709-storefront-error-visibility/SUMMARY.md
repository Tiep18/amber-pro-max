---
status: complete
completed: 2026-07-09
slug: storefront-error-visibility
---

# Summary: Storefront Error Visibility

## Completed

- Moved homepage featured product loading into `getHomeFeaturedProducts`, preserving empty-section fallback while recording a sanitized operational failure when the loader throws.
- Added wishlist mutation feedback mapping so failed/invalid wishlist results produce user-visible text instead of only rolling back the optimistic state.
- Rendered an `aria-live` error bubble beside storefront wishlist hearts.
- Added English and Vietnamese wishlist error copy for catalog cards and product detail pages.

## Verification

- `npm run test:unit -- tests/unit/account/wishlist-client-state.test.ts tests/unit/storefront/home-featured-products.test.ts`
- `npm run test:unit -- tests/unit/account/wishlist.test.ts tests/unit/account/wishlist-client-state.test.ts tests/unit/storefront/home-featured-products.test.ts`
- `npm run typecheck`
- `npm run lint`
