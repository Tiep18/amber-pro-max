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
- Complete the scheduled-work setup below before applying migrations, then confirm RLS
  tests pass against the intended environment.

Vercel:

- Configure `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and a stable
  `TRANSACTIONAL_EMAIL_TOKEN_SECRET` of at least 32 random characters for
  transactional email. Store the token secret only as an encrypted Vercel
  environment variable; it does not require Supabase Vault or a paid service.
- Run the CI gate before promoting a preview.

Scheduled work setup (in this order):

1. Enable Supabase Cron (`pg_cron`), `pg_net`, and Vault from the Supabase
   Dashboard integrations and database extensions screens.
2. In Vault, create `transactional_email_site_url` with the deployed HTTPS site URL
   (the same value as `NEXT_PUBLIC_SITE_URL`) and
   `transactional_email_worker_secret` with a long random worker secret. The database
   reads only these two specifically named secrets; it never stores a URL or credential
   in source control.
3. Configure `TRANSACTIONAL_EMAIL_WORKER_SECRET` on Vercel with exactly the same
   worker-secret value from step 2. Keep `TRANSACTIONAL_EMAIL_TOKEN_SECRET`
   stable across deployments and environments with pending outbox rows; rotating
   it changes the derived bearer link and must be coordinated after the queue drains.
4. Apply migrations. If the extensions were enabled or repaired after migrations were
   applied, run `select private.repair_scheduled_jobs();` from the Supabase SQL editor.
   The repair is idempotent: it leaves one `trusted-payment-expiry` job running every
   minute and one `transactional-email-outbox` job running every five minutes. Supabase
   Cron calls the protected outbox endpoint; no Vercel Cron or Vercel Pro plan is needed.
5. Visit `/admin/launch` as an admin and confirm the payment expiry job gate is ready,
   then confirm both named jobs appear in the Supabase Cron dashboard.

Free Plan Supabase projects can auto-pause after a week of low activity. Scheduled work
and the storefront are unavailable while a project is paused, so monitor Supabase pause
warnings and resume the project before relying on launch-readiness results.

## Verification

The full local gate is:

```bash
npm run ci
```

Browser and security checks cover localized storefront, auth, checkout, order, account, admin, sitemap/robots, and secret-boundary flows. Phase 4 and Phase 7 still require separate manual UAT evidence for provider delivery and final production launch approvals.
