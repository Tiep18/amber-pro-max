---
quick_id: 260710-mqi
status: planned
created: 2026-07-10
---

# Polish admin catalog product editor shell without changing form actions

## Goal

Improve the `/admin/catalog/new` and `/admin/catalog/[productId]` product editor experience by making the long form easier to scan and operate, while preserving existing form state, validation schema, server actions, publish checks, and cache invalidation.

## Scope

- `src/components/admin/catalog/product-form.tsx`
- Optional light page-shell spacing changes in:
  - `src/app/admin/catalog/new/page.tsx`
  - `src/app/admin/catalog/[productId]/page.tsx`

## Tasks

1. Reframe the editor as a responsive two-column workspace on desktop.
   - Main column keeps the existing form sections.
   - Sidebar becomes sticky and contains save/publish actions, product status, market readiness, and links to media/variant workflows.

2. Improve section hierarchy without changing submitted payloads.
   - Add a compact section navigation/status card.
   - Keep all current fields wired to the same local state setters.
   - Keep `saveDraft()` and `publishProduct()` behavior unchanged.

3. Improve publish feedback.
   - Keep existing blocked/saved/error alerts.
   - Show blocker summary in the sidebar when publish is blocked.

4. Verify.
   - Run `npm run typecheck`.
   - Run `npm run lint`.

## Done Criteria

- Editor is easier to scan on desktop and still linear on mobile.
- Save and publish buttons remain available without scrolling to the bottom.
- Media/variant links are visible after product creation.
- No server action, schema, SEO, ISR, or storefront code is changed.
