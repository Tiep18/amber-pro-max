---
quick_id: 260710-mgm
status: planned
created: 2026-07-10
---

# Improve admin catalog list with pagination and product thumbnails

## Goal

Upgrade `/admin/catalog` from a basic product queue into a compact admin workspace. The list must support pagination and every product row must show a product thumbnail, while preserving existing admin-only behavior and avoiding changes to catalog save, publish, media, variant, SEO, ISR, and storefront logic.

## Scope

In scope:

- `src/app/admin/catalog/catalog-data.ts`
- `src/app/admin/catalog/page.tsx`
- Small admin catalog UI component(s) under `src/components/admin/catalog/`

Out of scope:

- Product form submission logic
- Publish checks
- Media upload/remove actions
- Variant/inventory mutations
- Storefront catalog, SEO metadata, ISR/static behavior

## Tasks

1. Extend admin catalog data loading.
   - Return product title, type, status, updated timestamp, primary/first thumbnail URL, market offer readiness, and total/page metadata.
   - Accept search, status, type, and page inputs from URL search params.
   - Keep loader server-only and admin route dynamic.

2. Redesign the admin catalog list surface.
   - Add compact search/filter controls.
   - Add pagination controls.
   - Render each row with a square thumbnail, title, metadata, product type, status, market availability, updated time, and an edit action.
   - Keep empty state clear for no products vs no filter results.

3. Verify.
   - Run `npm run typecheck`.
   - Run `npm run lint`.

## Done Criteria

- `/admin/catalog` accepts URL-backed list controls.
- Product rows include thumbnails or a polished placeholder when no image exists.
- Pagination is visible and functional.
- No changes are made to public storefront SEO/ISR/static routes.
- Typecheck and lint pass.
