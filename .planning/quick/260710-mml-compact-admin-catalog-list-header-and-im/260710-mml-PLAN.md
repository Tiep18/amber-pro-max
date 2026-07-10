---
quick_id: 260710-mml
status: planned
created: 2026-07-10
---

# Compact admin catalog list header and improve badge color hierarchy

## Goal

Reduce the vertical space above the `/admin/catalog` product table and make row badges easier to scan by using distinct tones for type, status, and market availability.

## Scope

- `src/app/admin/catalog/page.tsx`
- `src/components/admin/catalog/catalog-list-controls.tsx`

## Tasks

1. Remove redundant top metadata and metric card stack from the admin catalog page.
2. Move product counts into a compact summary strip near the list controls.
3. Replace same-color row tags with distinct, restrained badge styles.
4. Verify with `npm run typecheck` and `npm run lint`.

## Done Criteria

- Product table appears significantly earlier on desktop.
- Search/filter/pagination remain functional.
- Product rows still show thumbnail, type, status, markets, updated date, and edit action.
