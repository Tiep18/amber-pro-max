---
status: complete
completed: 2026-06-28
---

# Taxonomy Safe Delete Summary

Added safe delete controls for admin taxonomy records.

## Completed

- Added `deleteTaxonomyTermAction`.
- Blocked deletion when taxonomy terms are still referenced by products, blog posts, discounts, or collections.
- Added delete controls and success/blocked feedback to catalog and blog taxonomy pages.

## Verification

- `npm run lint` passed with no warnings.
- `npm run typecheck` passed.
