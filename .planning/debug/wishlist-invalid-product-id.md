---
status: resolved
created: 2026-07-09
slug: wishlist-invalid-product-id
---

# Debug: Wishlist `invalid_product_id`

## Symptom

- `addCustomerWishlistItemAction` returns `{"status":"invalid","code":"invalid_product_id"}`.
- UI rolls back/no visible change.
- Server log shows action call but no `operational_errors` row is created.

## Evidence

- `wishlist-actions.ts` validates product IDs with `z.string().uuid()`.
- Local runtime check shows Zod accepts RFC-versioned IDs like `33333333-3333-4333-8333-333333333333` but rejects PostgreSQL-valid seeded IDs like `50000000-0000-0000-0000-000000000003`.
- Public catalog and product detail pass `product.product_id` into `WishlistHeart`.

## Root Cause

Wishlist validators are stricter than PostgreSQL UUID parsing. Products with PostgreSQL-valid but RFC-versionless UUIDs are rejected before persistence, causing an `invalid_product_id` validation result. Invalid results are intentionally not recorded as operational failures, so no `operational_errors` row is inserted.

## Fix

- Added failing unit tests for wishlist add/remove and client wishlist batch parsing with PostgreSQL-valid UUIDs.
- Replaced wishlist product ID validation with a PostgreSQL-compatible UUID string regex shared by server actions and client wishlist state parsing.
- Verified targeted wishlist tests, typecheck, and lint.

## Verification

- `npm run test:unit -- tests/unit/account/wishlist.test.ts tests/unit/account/wishlist-client-state.test.ts`
- `npm run typecheck`
- `npm run lint`
