---
status: complete
completed: 2026-07-02
---

# Summary

Implemented a clearer homepage text color hierarchy without changing storefront logic, routes, metadata, product fetching, or SEO rendering.

## Changes

- Added a dedicated `--brand` token for Ambertinybear brown.
- Changed default `--foreground` to warm charcoal/taupe so general page text is not uniformly brown.
- Kept the primary homepage CTA and Ambertinybear hero wordmark on brand brown.
- Updated product cards so titles read in charcoal, prices stay brand brown, and badges use a softer accent surface.

## Verification

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npx playwright test tests/e2e/homepage.spec.ts` passed, 5/5.
- `npm run build` passed, including SSG generation for localized homepage routes.
