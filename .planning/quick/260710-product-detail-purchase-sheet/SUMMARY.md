---
status: complete
completed: 2026-07-10
---

# Product Detail Purchase Sheet Polish Summary

## Completed

- Reworked the product detail hero from a boxed purchase card into a lighter purchase sheet.
- Kept metadata, static params, localized routes, Product JSON-LD, breadcrumb JSON-LD, market availability, wishlist, reviews, and add-to-cart behavior intact.
- Made price and CTA more prominent, with full-width desktop/mobile primary action.
- Reduced visual weight in purchase reassurance, trust badges, variant selector, unavailable-market notice, detail tabs, and reviews.
- Refined the product gallery frame, thumbnail density, active state, and no-image placeholder.
- Updated mobile sticky CTA behavior so it stays hidden initially and appears only after the main CTA has scrolled past.

## Verification

- `npm run typecheck` passed.
- `npm run lint` passed.
- Local product page smoke at `/en/product/garden-snail-pdf-pattern` returned 200.
- Playwright visual smoke checked desktop 1440x900 and mobile 390x844.
- Mobile smoke confirmed no horizontal overflow, two-line product title, sticky CTA hidden initially, and sticky CTA visible after scrolling past the main CTA.

## Notes

- Existing worktree changes to `.gitignore` and `next-env.d.ts` were present outside this polish scope and were left untouched.
