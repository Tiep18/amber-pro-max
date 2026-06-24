---
phase: 07-content-seo-and-launch-readiness
plan: "08"
subsystem: policies
tags: [supabase, rls, policies, admin, public-pages, playwright]
requires:
  - phase: 07-content-seo-and-launch-readiness
    plan: "01"
    provides: Phase 07 publish-check and public projection patterns
provides:
  - Admin-editable bilingual required policy pages
  - Policy publish blockers and public published projection RPC
  - Public localized policy routes for English and Vietnamese
  - E2E coverage for draft exclusion, publishing, public rendering, and admin denial
affects: [policies, admin, public-storefront, launch-readiness, seo]
tech-stack:
  added: []
  patterns:
    - Admin-only policy base tables with public projection functions
    - Locale-aware publish blocker mapping
    - Public pages fail closed for drafts and unpublished policies
key-files:
  created:
    - supabase/migrations/20260623070800_policies.sql
    - supabase/tests/database/07_policies.test.sql
    - src/policies/schemas.ts
    - src/policies/publish-checks.ts
    - src/policies/actions.ts
    - src/policies/queries.ts
    - src/app/admin/policies/page.tsx
    - src/components/admin/policies/policy-form.tsx
    - src/app/[locale]/policies/[policySlug]/page.tsx
    - src/app/[locale]/chinh-sach/[policySlug]/page.tsx
    - tests/e2e/policies.spec.ts
  modified:
    - src/auth/redirect.ts
    - src/types/supabase.ts
    - tests/unit/content/publish-checks.test.ts
key-decisions:
  - "Policy pages are first-party Supabase content with required bilingual metadata, not hardcoded static pages."
  - "Public policy pages read only published projection RPC output."
  - "Policy publishing mirrors blog/catalog blockers and never exposes raw database issue detail."
patterns-established:
  - "Required policies can be managed from one compact admin route with one form per policy kind."
  - "Vietnamese policy URLs use `/vi/chinh-sach/:slug`; English policy URLs use `/en/policies/:slug`."
requirements-completed: [LEGAL-01]
duration: 35 min
completed: 2026-06-24
---

# Phase 07 Plan 08: Bilingual Policy Publishing Summary

**Admin-editable bilingual policy publishing with blockers, public localized pages, and draft exclusion**

## Performance

- **Duration:** 35 min
- **Started:** 2026-06-24T08:13:00+07:00
- **Completed:** 2026-06-24T08:48:02+07:00
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments

- Added policy tables for required privacy, terms of sale, returns, and digital download policies.
- Added policy translation rows with localized slug, title, summary, body, SEO metadata, and social image fields.
- Added publish issue and publish functions with locale-aware blockers.
- Added safe public projection RPC that returns only published policy pages.
- Added protected `/admin/policies` with one form per required policy kind.
- Added public `/en/policies/[policySlug]` and `/vi/chinh-sach/[policySlug]` routes.
- Added pgtap, Vitest, and Playwright coverage for blockers, RLS/projections, draft exclusion, publishing, and admin denial.

## Task Commits

1. **Tasks 1-2: Policy schema, admin editor, public routes, and verification** - `640bc782` (`feat(07-08): add policy publishing`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] pgtap called an admin-only publish RPC without admin context**
- **Found during:** `npm run db:test`.
- **Issue:** `publish_policy_page` correctly depends on admin/RLS context, while the database projection test was not authenticated as admin.
- **Fix:** Kept pgtap focused on schema, blockers, and public projection behavior; Playwright covers the real admin publish path.
- **Files modified:** `supabase/tests/database/07_policies.test.sql`
- **Verification:** `npm run db:test` and `npm run test:e2e -- tests/e2e/policies.spec.ts` passed.
- **Committed in:** `640bc782`

**2. [Rule 3 - Blocking] Policy publish RPC used a direct private admin helper check**
- **Found during:** Playwright E2E.
- **Issue:** The public RPC returned a generic publish failure instead of following the established blog pattern.
- **Fix:** Removed the direct `private.is_admin()` call and let RLS plus server-side `requireAdmin` own authorization.
- **Files modified:** `supabase/migrations/20260623070800_policies.sql`
- **Verification:** Policy E2E passed.
- **Committed in:** `640bc782`

---

**Total deviations:** 2 auto-fixed issues.
**Impact on plan:** No scope change. The fixes aligned policy publishing with existing blog/catalog authorization patterns.

## Verification Evidence

- `npm run test:unit -- tests/unit/content/publish-checks.test.ts` - passed, 1 file / 4 tests.
- `npm run db:reset` - passed after applying the policy migration.
- `npm run db:test` - passed, 21 files / 515 tests.
- `npm run db:types` - passed.
- `git diff --exit-code src/types/supabase.ts` - passed after commit.
- `npm run test:e2e -- tests/e2e/policies.spec.ts` - passed, 3 tests.
- `npm run typecheck` - passed.

## User Setup Required

None for local development. Production launch still requires seller-approved final policy copy.

## Next Phase Readiness

Wave 2 is complete. Phase 07 can continue with Wave 3: public blog rendering, admin dashboard/navigation, or launch settings/readiness gates.

---
*Phase: 07-content-seo-and-launch-readiness*
*Completed: 2026-06-24*
