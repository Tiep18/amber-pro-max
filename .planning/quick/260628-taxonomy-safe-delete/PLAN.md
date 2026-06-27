---
status: in-progress
created: 2026-06-28
slug: taxonomy-safe-delete
---

# Taxonomy Safe Delete

Add safe delete controls for admin taxonomy records.

## Scope

- Add a server action to remove taxonomy terms only when they are not referenced.
- Block deletion for taxonomy terms linked to products, blog posts, discounts, or collections.
- Add delete controls and result feedback to catalog/blog taxonomy admin pages.
- Preserve existing create/update behavior.

## Verification

- Run `npm run lint`.
- Run `npm run typecheck`.
