---
quick_id: 260710-nhw
status: planned
created: 2026-07-10
---

# Make admin product editor smart sections easier to navigate while scrolling

## Goal

Improve the admin product editor section navigation so users can keep working in long forms without scrolling back to the top just to reveal the next section.

## Scope

- `src/components/admin/catalog/product-form.tsx`

## Tasks

1. Replace the top-only smart section toggle strip with in-flow collapsible section cards.
   - Each section keeps its own visible header in the form flow.
   - Users can open or collapse the next section at its actual location while scrolling.
   - Multiple sections remain open at the same time.

2. Preserve the supporting desktop section navigation.
   - Keep the sticky sidebar as a quick overview and secondary control.
   - Do not make the sidebar the only way to navigate the form.

3. Preserve product editor behavior.
   - Do not change server actions, schemas, saved payloads, publish checks, SEO, ISR, or storefront routes.

4. Verify.
   - Run `npm run typecheck`.
   - Run `npm run lint`.

## Done Criteria

- Section controls are available in the form flow while scrolling.
- Users no longer need to return to the top of the editor to open later sections.
- Product form behavior remains unchanged.
- Typecheck and lint pass.
