---
status: in-progress
created: 2026-06-27
slug: admin-remaining-pages-ux
---

# Admin Remaining Pages UX

Upgrade the remaining admin pages after the Phase 1 admin shell/dashboard/orders/catalog pass.

## Scope

- Add shared lightweight admin UI helpers for consistent page headers, metric cards, empty states, and status pills.
- Apply the shared admin page structure to reviews, discounts, shipping, exceptions, newsletter, blog, policies, operations, launch, forbidden, and selected catalog/order detail pages where low risk.
- Preserve existing routes, auth guards, server actions, query behavior, and form behavior.
- Keep this as a UI/UX pass only; no schema or data model changes.

## Verification

- Run formatter on changed files.
- Run `npm run lint`.
- Run `npm run typecheck`.
