# Summary

Completed the first storefront SEO/ISR optimization slice.

- Home now has localized metadata, JSON-LD, and ISR output.
- Product pages now use locale-derived canonical market data, generate static params, emit aggregate rating JSON-LD, and avoid request auth/cookies in the public render path.
- Category pages now generate static params from facets and emit breadcrumb/item-list JSON-LD.
- Collection pages now use locale-derived market data, static rendering, and list JSON-LD.
- Catalog now has localized metadata, canonical/hreflang, noindex for faceted query URLs, and item-list JSON-LD. It remains dynamic because it still server-renders filter/search `searchParams`.
- Public media/review reads now use the public Supabase client instead of cookie-bound server clients.

Verification:

- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- Build route output improved: `/[locale]`, `/[locale]/product/[productSlug]`, and `/[locale]/category/[categorySlug]` are now SSG/ISR; collection is static on demand.
- Focused E2E SEO run had 3/4 passing; the localized sitemap test failed because the test web server pointed at local Supabase `127.0.0.1:55431`, which was not running.
