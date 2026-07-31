---
status: resolved
trigger: "Thích hoặc bỏ thích sản phẩm làm trang cửa hàng chớp nháy vì load và render lại."
created: 2026-07-31T15:45:00+07:00
updated: 2026-07-31T15:50:00+07:00
---

# Debug Session: Wishlist Catalog Flash

## Symptoms

- Expected: the heart updates optimistically in place while the product grid remains mounted and stable.
- Actual: a successful like or unlike causes the catalog to load and render again, producing a visible flash.
- Errors: no mutation error was reported.
- Timeline: observed after restoring the catalog wishlist action flow.
- Reproduction: sign in, open the catalog, then like or unlike a product.

## Current Focus

- hypothesis: any `revalidatePath` issued by the wishlist server action refreshes the active RSC tree, while the wishlist surfaces already maintain their own client state.
- test: observe catalog card connectivity across authenticated add/remove mutations before and after removing route invalidation.
- expecting: no catalog card disconnect, no loading text, stable article count, and only the heart state changes.
- next_action: resolved.

## Evidence

- timestamp: 2026-07-31T15:45:00+07:00
  observation: `WishlistHeart` already applies optimistic local state and synchronizes `WishlistProvider`; no full-grid refresh is needed for heart state.
- timestamp: 2026-07-31T15:45:00+07:00
  observation: successful add/remove actions call `revalidateWishlistSurfaces`, which revalidates the localized account wishlist pages and the form's `returnTo` route.
- timestamp: 2026-07-31T15:45:00+07:00
  observation: catalog cards pass the current catalog URL as `returnTo`, making the active ISR catalog route an explicit revalidation target after every wishlist mutation.
- timestamp: 2026-07-31T15:46:00+07:00
  observation: the first regression test proved both add and remove revalidated `/en/catalog` in addition to the two account wishlist paths.
- timestamp: 2026-07-31T15:47:00+07:00
  observation: after removing only current-route invalidation, authenticated browser instrumentation still observed the first product card disconnect during unlike; the remaining account-page `revalidatePath` calls still refreshed the active RSC tree.
- timestamp: 2026-07-31T15:49:00+07:00
  observation: after removing all wishlist route invalidation, both add and remove kept all 12 articles mounted, never showed loading text, and changed only the heart label/state.

## Eliminated

- hypothesis: catalog navigation pending is still activated by the wishlist function-action form.
  reason: the previous fix restricts that handler to forms with an explicit `method="get"` attribute.
- hypothesis: optimistic heart state itself replaces the product grid.
  reason: `WishlistHeart` state is component-local and provider synchronization updates only the saved-state record.

## Resolution

- root_cause: successful wishlist server actions called `revalidatePath`. In Next.js server-action responses this refreshed the active catalog RSC tree and remounted product cards, even when the invalidated path was an account wishlist route rather than the current catalog route.
- fix: removed wishlist route invalidation from add/remove actions. Catalog hearts already update optimistically through `WishlistHeart` and `WishlistProvider`; the account wishlist removes locally and dynamic navigation reads current database state.
- files_changed:
  - `src/account/wishlist-actions.ts`
  - `tests/unit/account/wishlist.test.ts`
  - `.planning/debug/wishlist-catalog-flash.md`
- verification:
  - Wishlist/catalog unit suites: 37 tests passed.
  - Static route/performance suites: 35 tests passed.
  - TypeScript and targeted ESLint passed.
  - Authenticated browser against remote Supabase verified like and unlike with 12/12 articles continuously present, no card disconnect, no loading text, stable URL, and correct heart labels.
  - The temporary Supabase test user was deleted after verification.
  - Production build and route-classification gate passed; catalog, product, taxonomy, collection, tag, technique, and homepage routes remain static/ISR with five-minute revalidation.
