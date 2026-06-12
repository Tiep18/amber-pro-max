---
phase: 01-secure-bilingual-foundation
plan: "07"
subsystem: protected-shells
tags: [auth, rls, admin, account, playwright, pgtap]

requires:
  - phase: 01-04
    provides: Profiles, user_roles, RLS, and pgTAP role tests
  - phase: 01-05
    provides: Supabase SSR clients, auth actions, and safe redirects
  - phase: 01-06
    provides: Localized auth pages and browser auth coverage
provides:
  - `requireUser()` and `requireAdmin()` server-only guards
  - Localized protected account overview and sign-out control
  - Server-protected `/admin` shell and `/admin/forbidden`
  - Browser coverage for anonymous, customer, and database-admin boundaries

key-files:
  created:
    - src/auth/guards.ts
    - src/app/[locale]/account/account-overview.tsx
    - src/app/[locale]/account/layout.tsx
    - src/app/[locale]/account/page.tsx
    - src/app/[locale]/tai-khoan/page.tsx
    - src/app/admin/layout.tsx
    - src/app/admin/page.tsx
    - src/app/admin/forbidden/page.tsx
    - tests/e2e/admin-boundary.spec.ts
  modified:
    - src/auth/redirect.ts
    - src/messages/en.json
    - src/messages/vi.json
    - src/proxy.ts
    - tests/unit/auth/redirect.test.ts
    - next-env.d.ts

requirements-completed:
  - ACC-01
  - ADM-02
  - SEC-01
  - SEC-02

duration: 24 min
completed: 2026-06-12
---

# Phase 01 Plan 07: Protected Shells Summary

**Server-side account and admin boundaries backed by Supabase sessions, RLS role checks, and browser tests**

## Accomplishments

- Added server-only `requireUser()` and `requireAdmin()` guards.
- Added localized account overview at `/en/account` and `/vi/tai-khoan`.
- Added admin-only `/admin` shell and server-rendered `/admin/forbidden`.
- Updated safe redirects to allow `/admin` as a known internal route.
- Updated proxy bypasses so admin and physical protected slugs are not localized incorrectly.
- Added Playwright boundary tests for anonymous redirects, customer account access/sign-out, non-admin denial, and database-owned admin access.

## Deviations

- `supabase test db supabase/tests/database/01_roles_rls.test.sql` failed on Windows path translation inside the container; running `supabase test db` executed both database test files, including `01_roles_rls.test.sql`, and passed.
- Admin E2E uses the local Supabase service-role token in the Node test process only to create/delete fixture users and role rows. No service-role or secret key is imported into `src` or browser code.

## Verification

Passed:

```bash
npm run test:unit
npm run lint
npm run typecheck
npm run build
npm run test:e2e -- tests/e2e/admin-boundary.spec.ts
npm run test:e2e -- tests/e2e/auth.spec.ts tests/e2e/localization.spec.ts
supabase test db
rg -n "service_role|SUPABASE_SECRET|sb_secret|SERVICE_ROLE" src .env.example
```

The source secret scan returned no matches.

## Next Phase Readiness

Ready for Plan 01-08 to run foundation verification across role boundaries, secret handling, CI, and UX readiness.

---
*Phase: 01-secure-bilingual-foundation*
*Completed: 2026-06-12*
