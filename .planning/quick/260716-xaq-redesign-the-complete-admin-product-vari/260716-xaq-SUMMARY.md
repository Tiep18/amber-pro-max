---
quick_id: 260716-xaq
status: complete
completed_at: '2026-07-17T00:34:00+07:00'
commits:
  - 706f88c
  - 965e227
---

# Quick task 260716-xaq summary

## Outcome

The admin variants screen is now a coherent master-detail workspace instead of a flat stack of equally weighted cards. The page shell is wider, the page header remains the single workflow identity, and a compact workspace header combines inventory mode, saved count, total stock, market issues, dirty state, and the primary New variant action.

Saved variants are presented as vertically scannable rows at every viewport. Each row exposes SKU, canonical attributes, display order, stock, Vietnam and International availability, selected state, unsaved target state, and pending target state. The desktop navigator is sticky and independently scrollable; mobile no longer depends on a horizontal card rail.

The active draft now follows the admin workflow: Identity and attributes, Inventory and merchandising, Market availability and pricing, then Fulfillment. Attributes use aligned responsive rows and labelled remove controls. Stock, display order, and media share one merchandising composition. Vietnam and International use compact segmented controls and a side-by-side comparison at wide widths. New drafts explain why fulfillment remains locked until the first save.

Save, Reset, and Remove now live in an in-flow sticky action dock with safe-area padding and explicit Saved, Unsaved, Invalid, and target-bound pending copy. Product inventory and first-variant states were also redesigned as deliberate mode choices without implying or performing stock conversion.

All persistence and domain behavior remains owned by the existing editor state and actions: single aggregate save, immutable operation target, monotonic token checks, stale completion rejection, dirty/discard guards, exact integer price conversion, market override serialization, product/variant inventory XOR, shipping precedence and captured-owner updates, and final removal reconciliation are unchanged. No dependency, migration, remote Supabase mutation, or server contract was added. `src/components/admin/catalog/product-form.tsx` was not modified or staged.

## Verification

- Focused ESLint: passed.
- `npm run typecheck`: passed.
- `npx vitest run tests/unit/catalog/variants.test.ts`: passed, 68 tests.
- `npm run db:reset`: passed against local Supabase.
- `npm run build`: passed, including the dynamic variants route.
- `npx playwright test tests/e2e/admin-variants.spec.ts --project=chromium`: passed, 2 tests.
- Responsive geometry and action reachability: passed at `375x812`, `768x900`, and `1280x900` after correcting the inventory grid breakpoint for the actual editor width inside the admin sidebar and variant navigator.
- `git diff --check`: passed.
- Prohibited-file diff check for `src/components/admin/catalog/product-form.tsx`: empty.
- Port 3000 development server: restored and listening after verification.
