---
status: resolved
slug: wishlist-static-surfaces
---

# Wishlist state on static storefront surfaces

## Root Causes

1. The SEO ISR conversion correctly removed request-user reads from product and catalog Server Components, but no client-owned replacement was added for personalized initial wishlist state.
2. `WishlistHeart` derives selection from two persistent `useActionState` results. Once add returns `saved`, that stale result can continue to win after remove, so repeated toggles become inconsistent.

## Fix Contract

- Keep public product and catalog pages force-static with five-minute ISR.
- Load authenticated wishlist IDs after hydration through one deduplicated batch API.
- Use one explicit selection state per heart and update the shared snapshot after successful mutations.
- Reset personalized state on auth changes.

## Verification

- 281 unit tests pass.
- Lint and typecheck pass.
- Focused Playwright tests pass and confirm one wishlist request for a multi-product catalog.
- 34 security boundary tests pass.
- A clean production build preserves five-minute ISR for home, product, category, and collection pages; `/api/wishlist` remains independently dynamic.
