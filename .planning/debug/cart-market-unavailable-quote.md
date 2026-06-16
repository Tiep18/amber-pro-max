---
status: resolved
trigger: "Selecting either international or Vietnam market, adding a product sold only in that selected market showed 'Unavailable for the current quote'. Products sold in both markets did not show the issue."
created: 2026-06-16T17:46:06+07:00
updated: 2026-06-16T17:46:06+07:00
---

# Debug Session: Cart Market Unavailable Quote

## Symptoms

- Expected behavior: A product that is available in the currently selected market can be added to the cart, or the UI prevents adding it if it is not purchasable.
- Actual behavior: Some single-market products could be added from the product page, then the cart quote showed "Unavailable for the current quote".
- Error messages: Cart line-level unavailable message, not a thrown server error.
- Timeline: Observed during dev testing after seeding the remote Supabase project.
- Reproduction: Select a market, open a product sold only in that market, add it to cart.

## Current Focus

- hypothesis: Product market availability is correct, but the add-to-cart UI is allowing an item that the server quote later rejects because physical inventory is unavailable.
- test: Compare Supabase RPC catalog/detail output with `quoteCartIntent` output for VN-only, intl-only, and both-market seeded products.
- expecting: RPC detail should show the product available in the selected market; quote should block only when the hydrated product is not actually purchasable due to inventory.
- next_action: resolved

## Evidence

- timestamp: 2026-06-16T17:46:06+07:00
  observation: REST RPC used the correct project host `kpnazmkprosboeiuhgea.supabase.co`.
- timestamp: 2026-06-16T17:46:06+07:00
  observation: `list_catalog_products('en','vn')` returned `vn-bear-pattern` and `both-market-bear`.
- timestamp: 2026-06-16T17:46:06+07:00
  observation: `list_catalog_products('en','intl')` returned `intl-bear` and `both-market-bear`.
- timestamp: 2026-06-16T17:46:06+07:00
  observation: `get_catalog_product_by_slug('en','intl','intl-bear')` returned `available=true`, `currency_code=USD`, `price_minor=2400`, but `in_stock=false`.
- timestamp: 2026-06-16T17:46:06+07:00
  observation: `quoteCartIntent` marked `intl-bear` as `blocked` with line `status=unavailable` because it is a physical product and `inStock=false`.
- timestamp: 2026-06-16T17:46:06+07:00
  observation: Before the fix, `AddToCart` computed `canAdd` from `available` plus selected variant stock only; physical products without variants did not use product-level `in_stock`.

## Eliminated

- hypothesis: The product is missing from the selected market offer rows.
  reason: Catalog list/detail RPC returned the single-market products for their selected markets.
- hypothesis: The cart quote is using the wrong active market.
  reason: Direct quote tests with explicit `market='vn'` and `market='intl'` reproduced readiness/blocking according to inventory, not according to market mismatch.
- hypothesis: Supabase REST/API URL is still wrong.
  reason: REST checks used host `kpnazmkprosboeiuhgea.supabase.co` and returned status 200.

## Resolution

- root_cause: The server quote was correctly blocking out-of-stock physical products, but the product page Add to cart control only checked market availability. For physical products without variants, it failed to check product-level `in_stock`, allowing a non-purchasable item into the cart.
- fix: Pass `product.in_stock` from the product detail page into `AddToCart`; centralize add-to-cart eligibility in `canAddToCart`; block non-variant physical products when `inStock=false` while still allowing digital products that are market-available.
- files_changed:
  - `src/app/[locale]/product/[productSlug]/page.tsx`
  - `src/components/catalog/add-to-cart.tsx`
  - `tests/unit/catalog/add-to-cart.test.ts`
- verification:
  - `npm run test:unit -- tests/unit/catalog/add-to-cart.test.ts`
  - `npm run test:unit -- tests/unit/checkout/quote-diff.test.ts tests/unit/catalog/add-to-cart.test.ts`
  - `npm run typecheck`
  - `npm run lint`

