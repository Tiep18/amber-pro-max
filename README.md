# Amigurumi Pattern & Handmade Store

The store now includes the Phase 1-7 application surface: bilingual storefront routes, market-aware catalog, mixed checkout, PayPal and VietQR payment flows, secure digital fulfillment, customer retention features, blog and policy publishing, and launch-readiness admin tooling. Remaining launch work is limited to manual provider and production-readiness evidence recorded in the Phase 4 and Phase 7 UAT artifacts.

## Local Setup

Required public environment variables:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55431
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local-or-hosted-publishable-key>
```

Start local Supabase and run the app:

```bash
supabase start
npm install
npm run dev
```

Useful local checks:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run db:reset
npm run db:lint
npm run db:test
npm run build
npm run test:security
npm run test:e2e
```

## Current Surface

Implemented modules include:

- Catalog, search, product detail, category and collection discovery
- Mixed cart and checkout with market-aware pricing and shipping
- Trusted payments and orders for PayPal and VietQR
- Digital entitlements, downloads, transactional email, and physical fulfillment tracking
- Saved addresses, wishlist, verified reviews, and newsletter consent flows
- Blog publishing, public content SEO, policy publishing, operations queue, and launch gates

## Hosted Setup Checklist

Supabase:

- Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Configure Auth Site URL and redirect allowlist for `/auth/callback`, localized auth routes, localhost, and Vercel previews.
- Configure production SMTP before accepting production registration/password reset.
- Apply migrations and confirm RLS tests pass against the intended environment.

Vercel:

- Configure `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Run the CI gate before promoting a preview.

## Verification

The full local gate is:

```bash
npm run ci
```

Browser and security checks cover localized storefront, auth, checkout, order, account, admin, sitemap/robots, and secret-boundary flows. Phase 4 and Phase 7 still require separate manual UAT evidence for provider delivery and final production launch approvals.
