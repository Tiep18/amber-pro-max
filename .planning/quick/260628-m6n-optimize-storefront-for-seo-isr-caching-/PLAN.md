---
status: completed
created: 2026-06-28
slug: optimize-storefront-for-seo-isr-caching
---

# Storefront SEO and ISR Optimization

Optimize public storefront rendering while preserving market-specific pricing and availability.

## Scope

- Add public cached data facades for catalog, blog, policies, and sitemap reads.
- Keep catalog/product pages request-aware for market rules while caching public query payloads.
- Move header account/market personalization behind a no-store client context endpoint.
- Reduce root layout client payload by removing the full i18n client provider.
- Convert public storefront imagery to `next/image` with configured Supabase remote patterns.
- Add revalidation helpers and tags for admin/editorial mutations.
- Harden cart quoting by resolving market server-side and guarding stale client quote responses.

## Verification

- Run lint, typecheck, unit tests, security tests, and production build.
- Run focused E2E for product SEO where environment supports seeded Supabase data.
