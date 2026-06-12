---
phase: 01-secure-bilingual-foundation
plan: "08"
subsystem: foundation-gate
tags: [ci, security, playwright, supabase, readiness]

requires:
  - phase: 01-02
  - phase: 01-03
  - phase: 01-04
  - phase: 01-05
  - phase: 01-06
  - phase: 01-07
provides:
  - Full local CI gate
  - Secret-boundary source and build-output scan
  - Responsive foundation UX coverage
  - README local and hosted setup runbook

key-files:
  created:
    - scripts/check-secrets.mjs
    - tests/security/secret-boundary.test.mjs
    - tests/e2e/foundation-ux.spec.ts
    - README.md
  modified:
    - package.json
    - eslint.config.mjs
    - .github/workflows/ci.yml
    - src/types/supabase.ts
    - next-env.d.ts

requirements-completed:
  - MKT-01
  - ACC-01
  - ADM-02
  - SEC-01
  - SEC-02

duration: 18 min
completed: 2026-06-12
---

# Phase 01 Plan 08: Foundation Gate Summary

**Full local verification gate for the secure bilingual foundation**

## Accomplishments

- Added `scripts/check-secrets.mjs` and a Node security regression test.
- Added `tests/e2e/foundation-ux.spec.ts` for responsive shell, auth form, and anonymous admin-flash checks.
- Hardened `npm run ci` to run lint, typecheck, unit, Supabase reset/lint/pgTAP/type generation, build, security, and Playwright.
- Updated GitHub Actions to use Node 22, Supabase CLI setup, local Supabase, and the full CI script.
- Added README setup, local verification, hosted Supabase/Vercel checklist, and Phase 1 boundary.
- Normalized generated Supabase types by removing the previous BOM drift.

## Verification

Passed:

```bash
npm run ci
```

The full gate included:

- `npm run lint`
- `npm run typecheck`
- `npm run test:unit` with 35 tests passing
- `npm run db:reset`
- `npm run db:lint`
- `npm run db:test` with 14 pgTAP tests passing
- `npm run db:types` plus `git diff --exit-code src/types/supabase.ts`
- `npm run build`
- `npm run test:security`
- `npm run test:e2e` with 20 Playwright tests passing

## Operator Checkpoint

Hosted production readiness still requires operator-owned setup:

- Supabase hosted project URL and publishable key.
- Supabase Auth Site URL and redirect allowlist for `/auth/callback`, localhost, previews, and localized routes.
- Production SMTP status for registration and password reset.
- Vercel environment values for `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Visual review of `/vi`, `/en`, auth pages, localized account pages, and `/admin` in the hosted environment.

Local verification is complete; hosted deployment remains pending external credentials/configuration.

## Notes

- Playwright teardown emitted a Next dev-server `Connection closed` log after all 20 tests passed; command exit code was 0.
- `supabase test db supabase/tests/database/01_roles_rls.test.sql` is unreliable on Windows due path translation, so the verified command is `supabase test db`, which runs the roles test.

## Phase Readiness

Phase 1 local implementation and verification are complete. The next milestone work can start after hosted/operator checklist confirmation or with hosted deployment explicitly deferred.

---
*Phase: 01-secure-bilingual-foundation*
*Completed: 2026-06-12*
