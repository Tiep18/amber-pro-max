---
status: completed
quick_id: 260629-pat
slug: compact-catalog-page-above-the-fold-with
date: 2026-06-29
---

# Summary: Compact Catalog Above The Fold

## Completed

- Reduced catalog page vertical spacing, mobile breadcrumb height, title sizing, tab padding, and content gaps so product cards appear earlier.
- Changed catalog controls to use a compact two-column mobile layout with the apply button below both fields, preserving usable touch targets.
- Kept catalog metadata, JSON-LD, localized routing, data fetching, search params, and static/ISR-related code unchanged.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:unit -- tests/unit/i18n/routing.test.ts tests/unit/catalog/list-state.test.ts`
- Playwright smoke checks for `http://localhost:3000/vi/cua-hang` and `http://localhost:3000/en/catalog`

## Notes

- Production build still generates static pages successfully and the catalog route retains its existing dynamic rendering behavior from search params; this change did not introduce new dynamic data dependencies.
- Playwright screenshots were saved under `output/playwright/` for local inspection and are intentionally not part of this task artifact.
