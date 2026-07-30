---
phase: quick
plan: 260731-2pm
subsystem: catalog-ui
status: complete
tags: [catalog, filters, scrolling, responsive, seo, isr]
completed: 2026-07-31
---

# Catalog Result Scroll Summary

Catalog query changes now bring the product result section into view instead of preserving an arbitrary document position.

## Accomplishments

- Detects real query-key changes after filter, search, sort, product-type, chip-removal, Clear, Back, and Forward navigation.
- Smoothly scrolls the result count and product grid to a sticky-safe viewport offset.
- Uses separate mobile and desktop offsets so the storefront header and desktop sticky controls do not cover the results.
- Respects `prefers-reduced-motion`, does not scroll on initial render, and does not affect Load more.
- Preserves the stable sidebar facet snapshots and pending product safety boundary.

## Task Commit

1. **Scroll filtered catalog results into view** - `26a6f34`

## Verification

- `npm run typecheck` - passed
- `npm run lint` - passed
- Targeted Playwright desktop/mobile coverage - 2 scenarios passed
- `npm run build` - passed; `/[locale]/catalog` remained SSG with five-minute revalidation and 127 static pages generated
- `git diff --check` - passed

## SEO/ISR Boundary

No metadata, canonical, JSON-LD, server product projection, static route, or revalidation setting changed. The behavior is a client-only response to URL query changes.

---

*Quick task: 260731-2pm*
*Completed: 2026-07-31*
