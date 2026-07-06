---
status: complete
completed: 2026-07-06
---

# Summary

Implemented targeted catalog UI/UX polish while preserving route structure, localized metadata, URL filter state, product query behavior, and the catalog page's `revalidate = 300` setting.

## Changes

- Fixed mobile catalog control overflow by making search/sort/apply stack on narrow viewports and switch to a row layout from `sm`.
- Removed the heavier storefront header trust/market cue band so customers reach products sooner.
- Reworked mobile controls into one compact row so search, sort, and filters no longer stack into multiple bulky lines.
- Replaced the native sort dropdown with the project's Radix/shadcn-style Select while preserving GET form submission and URL query state.
- Refined search/filter/sort into a single compact mobile commerce action bar inspired by lightweight marketplace product-list patterns: search pill, compact auto-apply sort, and a small filter trigger in one row.
- Removed the extra Apply control from the toolbar; search submits by Enter/icon, while sort submits immediately on selection.
- Added form submit cleanup so empty search does not create `search=` query noise.
- Added a controlled mobile filter sheet that closes immediately after choosing a filter link.
- Added active filter chips with individual removal links and a clear filters link.
- Simplified the desktop category sidebar into a flat text list with a thin active marker and quiet inline counts.
- Made the desktop category sidebar and search/sort toolbar sticky beneath the site header.
- Added a small client image leaf for product-card image fallback when a remote image URL exists but fails to load.
- Kept product cards minimal and did not add extra purchase buttons.

## Verification

- `npm run typecheck` passed.
- `npm run lint` passed.
- Mobile overflow check passed at 390px: `scrollWidth` matched viewport width.
- Manual Playwright check confirmed the mobile filter sheet closes after selecting a filter link.
- Manual Playwright check confirmed compact toolbar height is 40px and sort auto-apply produces a clean URL like `?sort=price_desc`.
- Desktop Playwright check at 1440px confirmed no horizontal overflow; after scrolling, the sidebar holds at 96px and the search/sort toolbar holds at 80px beneath the header.
- `npx playwright test tests/e2e/catalog-discovery.spec.ts -g "mobile shop"` passed.
- `npm run build` passed and generated 104 static pages successfully with SSG category, collection, product, homepage, and blog routes intact.
- A previous full `npx playwright test tests/e2e/catalog-discovery.spec.ts` run had 1/6 passing before the final mobile filter refinements. The failures were tied to current fixture/data mismatches (`International bear`, `Stuffed animals`, empty Vietnamese result text not present in the active dataset) and existing broad link locators colliding with product titles containing words like "Handmade" / "PDF patterns".
