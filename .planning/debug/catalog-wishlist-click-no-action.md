---
status: resolved
trigger: "Clicking the wishlist heart on the catalog page produced no visible result and no wishlist action request."
created: 2026-07-31T15:10:00+07:00
updated: 2026-07-31T15:35:00+07:00
---

# Debug Session: Catalog Wishlist Click No Action

## Symptoms

- Expected: clicking a product-card heart runs the wishlist action and either updates the saved state or asks a signed-out customer to sign in.
- Actual: the button received the click, but the UI did not change and no wishlist action reached the server.
- Reproduction: open `/en/catalog` as a guest and click the heart on a product card.

## Root Cause

`CatalogCommerce.beginFormNavigation` inspected the DOM `form.method` property during submit capture. A React function-action form has no `method` attribute, but the DOM property defaults to `"get"`. The catalog therefore treated the wishlist form as a filter navigation, enabled its pending skeleton, and unmounted the product grid before React could dispatch the server action.

The catalog search form is different: it explicitly declares `method="get"`.

## Evidence

- The wishlist element is an enabled `<button type="submit">` and received both the click and native submit event.
- Before the fix, the browser logged `Form submission canceled because the form is not connected`.
- The wishlist form reported `form.method === "get"` and `form.getAttribute("method") === null`.
- No wishlist mutation request crossed the network boundary before the fix, eliminating Supabase and RLS as causes.

## Resolution

- Added `isExplicitCatalogGetMethod` and changed submit capture to recognize only an explicit `method="get"` attribute.
- React function-action forms no longer activate catalog navigation pending state.
- The existing catalog GET search form continues to use the pending navigation behavior.

## Files Changed

- `src/components/catalog/catalog-commerce.tsx`
- `tests/unit/catalog/storefront-projection.test.ts`
- `.planning/debug/catalog-wishlist-click-no-action.md`

## Verification

- Regression test failed before implementation because the explicit-method guard did not exist, then passed after the fix.
- Wishlist/account unit suites: 36 tests passed.
- Static route and storefront performance suites: 35 tests passed.
- TypeScript and targeted ESLint passed.
- Real browser against `.env.local` and remote Supabase sent `POST /en/catalog` with a `next-action` header and received the expected guest redirect to `/en/sign-in`.
- The disconnected-form warning did not recur after the fix.
- Production build passed and the route classifier confirmed the home, catalog, category, collection, technique, tag, and product routes remain static/ISR with five-minute revalidation.
- No metadata, route data fetching, cache, revalidation, schema, or Supabase data changes were made.
