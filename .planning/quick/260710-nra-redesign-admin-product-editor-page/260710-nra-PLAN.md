---
quick_id: 260710-nra
status: planned
created: 2026-07-10
---

# Redesign admin product editor page

## Goal

Redesign the whole admin product editor page into a cleaner operations workspace for long product-entry work, using the existing shadcn-style UI primitives and preserving all catalog logic.

## Design Direction

- Dense but calm admin UI, not a storefront/landing page.
- Use fewer, larger work zones instead of many equally weighted cards.
- Keep critical actions sticky and visible.
- Keep long-form sections available in the form flow while scrolling.
- Make readiness/status feel like operational telemetry, not repeated decorative badges.

## Scope

- `src/components/admin/catalog/product-form.tsx`

## Tasks

1. Add page-level editor chrome inside the form.
   - Compact sticky command bar with draft state and primary actions.
   - Clear status hierarchy without duplicating the same cards repeatedly.

2. Redesign section cards.
   - Stronger visual hierarchy and softer surfaces.
   - Section number, open/closed state, and concise descriptions.
   - Keep accessible `aria-expanded` and `aria-controls`.

3. Simplify the right sidebar.
   - Consolidate state, readiness, workflows, and section navigation.
   - Avoid heavy stacked cards and repeated labels.

4. Preserve behavior.
   - Do not change server actions, schemas, save/publish payloads, SEO, ISR, or storefront routes.

5. Verify.
   - Run `npm run typecheck`.
   - Run `npm run lint`.

## Done Criteria

- The product editor reads as a cohesive admin workspace.
- Long-form navigation remains ergonomic while scrolling.
- Existing catalog behavior is unchanged.
- Typecheck and lint pass.
