# Amigurumi Pattern & Handmade Store

Phase 1 delivers a secure bilingual foundation for Vietnamese and English routes, Supabase Auth, RLS-backed roles, localized auth pages, and protected account/admin shells.

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

## Phase Boundary

This foundation intentionally does not include catalog, cart, checkout, payments, orders, fulfillment, reviews, newsletter, shipping, or blog features. Those belong to later phases.

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

Browser checks cover `/vi`, `/en`, localized auth routes, localized account routes, and `/admin`. Secret checks scan source and `.next/static` for privileged Supabase indicators.
