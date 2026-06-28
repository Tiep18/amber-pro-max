# Storefront SEO/ISR Optimization

## Goal

Move public storefront pages toward static/ISR SEO rendering while preserving market-specific product availability and pricing.

## Scope

- Home, catalog, product, category, and collection public pages.
- Metadata, canonical/hreflang, JSON-LD, and route rendering mode.
- Keep account, checkout, admin, cart, and payment routes dynamic.

## Approach

- Use locale as the canonical SEO market (`vi -> vn`, `en -> intl`) for public pages.
- Remove request cookies/auth from public page rendering.
- Keep personalized header, cart, and wishlist behavior in client-side islands.
- Add missing metadata and structured data for home/catalog/listing pages.
- Verify with lint, typecheck, production build route output, and focused E2E SEO checks.
