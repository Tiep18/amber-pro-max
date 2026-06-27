---
status: completed
created: 2026-06-28
slug: taxonomy-usage-counts
---

# Taxonomy Usage Counts

Show usage counts for admin taxonomy records.

## Scope

- Count references for catalog and blog taxonomy records.
- Display per-item usage counts in the taxonomy manager.
- Disable delete controls for in-use items while keeping server-side delete protection.

## Verification

- Run `npm run lint`.
- Run `npm run typecheck`.

## Result

- Added usage counts for taxonomy terms from product, blog, discount, and collection links.
- Displayed per-term counts in the admin taxonomy manager and summarized total usage.
- Disabled delete controls for in-use taxonomy records while retaining server-side protection.
