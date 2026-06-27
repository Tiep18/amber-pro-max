---
status: in-progress
created: 2026-06-27
slug: admin-taxonomy-navigation
---

# Admin Taxonomy And Navigation

Add the missing admin management surfaces requested after the admin UX pass.

## Groups

1. Add sidebar navigation entries for existing commerce/admin pages:
   - Discounts
   - Shipping
   - Exceptions

2. Add catalog taxonomy management:
   - Categories
   - Tags
   - Techniques
   - Collections

3. Add blog taxonomy management:
   - Blog categories
   - Blog tags

## Scope

- Reuse existing database tables and Supabase server client patterns.
- Keep CRUD minimal and practical: list existing records, create new records, update translations/status-like display data where available.
- Support Vietnamese and English labels/slugs where the tables are localized.
- Revalidate affected admin/product/blog routes after writes.
- Do not change storefront routing, checkout logic, RLS policies, or migrations unless a blocking schema gap is discovered.

## Verification

- Run formatter on changed files.
- Run `npm run lint`.
- Run `npm run typecheck`.
