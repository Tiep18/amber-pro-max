---
status: complete
date: 2026-07-09
---

# Secure Approved Review Projection

Replaced the public `approved_product_reviews` security-definer view with a sanitized RLS table projection of the same name. The projection keeps the storefront API contract stable while avoiding direct public view access to `auth.users`.

Verification:

- `npm run db:test -- supabase/tests/database/06_customer_retention.test.sql`
- `npm run db:lint`
- `supabase test db`
- `npm run test:unit -- tests/unit/reviews/eligibility.test.ts`
- `npm run typecheck`
- `npm run lint`

Note: local `supabase db reset` initially hit a Supabase local Realtime stale-entry issue, and normal `supabase start` hit the known local Storage healthcheck issue. Restarting local Supabase with `--ignore-health-check` applied all migrations and allowed DB tests to pass.
