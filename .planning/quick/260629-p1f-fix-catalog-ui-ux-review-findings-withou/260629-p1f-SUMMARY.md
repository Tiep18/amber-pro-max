---
status: complete
quick_id: 260629-p1f
slug: fix-catalog-ui-ux-review-findings-withou
date: 2026-06-29
---

# Summary

Fixed catalog storefront UI/UX findings while preserving the existing server-rendered catalog route, localized metadata, and ISR/static generation behavior.

## Changes

- Verified `http://localhost:3000/vi/cua-hang` under a fresh `npm run dev` run with `.env.local`; it returned 200, so route behavior was not changed.
- Changed product-type tabs from a labelled `div` to a semantic `nav`.
- Added `transitionTypes` to catalog type/category links without adding layout-level ViewTransition wrappers or dynamic route dependencies.
- Added search input `autoComplete="off"` and `spellCheck={false}`.
- Raised category filter links to 44px touch targets and added hover feedback.
- Changed the catalog product grid to one column below 480px, preserving 2 columns for wider mobile/tablet and 3 columns on desktop.
- Improved image placeholders with brand + status text.

## Verification

- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed; production build generated static pages successfully and retained existing route classifications.
- `npm run test:unit -- tests/unit/i18n/routing.test.ts tests/unit/catalog/list-state.test.ts` passed.
- Playwright smoke checks passed for:
  - `http://localhost:3000/vi/cua-hang`
  - `http://localhost:3000/en/catalog`
  - `http://localhost:3000/en/catalog?search=zzzz-no-results`
