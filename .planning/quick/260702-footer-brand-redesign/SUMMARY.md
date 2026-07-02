---
status: complete
date: 2026-07-02
---

# Footer brand redesign summary

Completed a focused footer/header brand polish:

- Added shared brand and social constants in `src/lib/site.ts`.
- Copied logo and social icon assets from the legacy crochet-ecommerce project.
- Replaced text-only header and mobile-menu branding with the Ambertinybear logo.
- Reworked the footer into a warmer brand-led layout with social links, useful navigation, dynamic policy links, newsletter signup, and locale switcher.
- Refined the footer after visual review: removed the vertical stripe texture, softened the background palette, made the newsletter form balanced on mobile and desktop, and slimmed the language switcher.
- Updated the mobile menu sheet title to use the brand logo and expanded primary navigation with Blog and Guest order lookup.

Verification:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Playwright smoke checks against the existing local dev server at `http://localhost:3000/vi` and `/en`
