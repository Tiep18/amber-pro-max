---
quick_id: 260801-e9i
status: complete
completed: 2026-08-01
implementation_commit: cb377799
---

# Animated product image carousel — Summary

Upgraded the product-detail image gallery into a lightweight carousel without adding a runtime dependency.

## Implementation

- Replaced single-image swapping with a transform-based image track that animates between adjacent images in 260ms.
- Added previous/next controls, direct thumbnail selection, ArrowLeft/ArrowRight support, a visible position counter, and a polite screen-reader position announcement.
- Added horizontal pointer dragging with axis detection, real-time drag feedback, a bounded swipe threshold, edge resistance, and no wrapping past the first or last image.
- Preserved a simple control-free layout for one or zero images.
- Added English and Vietnamese gallery labels and reduced-motion transition fallbacks.
- Added pure, unit-tested gallery boundary and swipe helpers.

## Verification

- `npm run test:unit -- tests/unit/catalog/product-gallery.test.ts tests/unit/content/storefront-performance.test.ts` — 23 tests passed.
- Product loading-boundary contract — 4 relevant tests passed.
- Gallery helper tests — 4 tests passed.
- Catalog security boundary — 11 tests passed.
- `npm run typecheck`, targeted ESLint, Prettier, `git diff --check`, and `npm run build` passed.
- Read-only remote check found real products with 2–3 media images.
- Browser verification on `/en/product/teacup-bunny-pin` confirmed button navigation, keyboard navigation, mobile-width horizontal dragging, updated accessible state, and no horizontal overflow at 390×844.

The broader `loading-boundaries.test.ts` file still has one unrelated pre-existing homepage/skeleton height-contract mismatch; its product-specific contract passes and no homepage files were changed by this task.

