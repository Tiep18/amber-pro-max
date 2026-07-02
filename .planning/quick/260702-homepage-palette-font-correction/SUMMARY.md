# Summary: Homepage Palette and Font Correction

Date: 2026-07-02

## Completed

- Switched the app font from Be Vietnam Pro to Nunito, matching the `crochet-ecommerce` reference project while keeping Vietnamese and Latin subsets.
- Recalibrated global storefront tokens from near-black/sage toward the reference warm brown, cream, honey, and blush palette.
- Replaced homepage green-heavy sections with warmer cream, beige, honey, and blush surfaces.
- Preserved homepage SEO metadata, JSON-LD, product fetching, catalog links, CTA anchors, and existing test ids.
- Captured temporary desktop/mobile screenshots for visual review, then removed the temporary spec and screenshots.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npx playwright test tests/e2e/homepage.spec.ts`
- `npm run build`

## Notes

- Playwright dev logs still show existing local Supabase catalog/image warnings for product cards in the test environment, but the homepage tests passed and the local hero/category images rendered correctly.
