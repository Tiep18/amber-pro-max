# Storefront SEO and ISR Optimization Summary

## Completed

- Added `unstable_cache` facades and cache tags for catalog, blog, policy, and sitemap reads.
- Marked blog and policy routes for static/ISR behavior and confirmed blog index builds as SSG with 5 minute revalidation.
- Kept market-sensitive catalog/product routes dynamic while caching public Supabase RPC payloads.
- Split header personalization into a no-store `/api/storefront-context` fetch so the locale layout no longer blocks static rendering on auth/market reads.
- Removed the full root `NextIntlClientProvider` from the locale layout.
- Switched product, gallery, blog, and wishlist imagery to `next/image` and configured Supabase image remote patterns.
- Added cache invalidation calls to catalog, media, variant, blog, and policy mutations.
- Hardened cart quote actions to derive market on the server and ignore stale client quote responses.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm run test:unit`
- `npm run test:security`
- `npm run build`
- `npm run test:e2e -- tests/e2e/launch-seo.spec.ts` with `.env.local` plus `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3210`

## Notes

- Full focused E2E using default Playwright env still expects local Supabase at `127.0.0.1:55431`; that service was not running in this session.
- Broader catalog/localization E2E specs have fixture/copy drift unrelated to this optimization pass.
