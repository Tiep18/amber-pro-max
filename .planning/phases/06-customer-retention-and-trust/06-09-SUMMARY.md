---
phase: 06-customer-retention-and-trust
plan: "09"
subsystem: newsletter-admin
tags: [newsletter, admin, consent, read-only, search, filters, pii-minimization]
requires:
  - phase: 06-customer-retention-and-trust
    provides: Newsletter subscriber state, consent history, and unsubscribe flow
provides:
  - Read-only protected admin subscriber inspection
  - Subscriber status, locale, market, search, and consent evidence filters
  - Static retention boundary checks for no admin consent override controls
affects: [newsletter, admin, security-tests, phase-06]
tech-stack:
  added: []
  patterns:
    - Guard admin page with requireAdmin before server-side admin-client reads
    - Convert request evidence hashes into booleans before UI rendering
    - Keep consent mutation customer-controlled in Phase 6 admin surfaces
key-files:
  created:
    - src/newsletter/admin-queries.ts
    - src/app/admin/newsletter/page.tsx
    - src/components/admin/newsletter/subscriber-list.tsx
    - tests/unit/newsletter/admin.test.ts
    - tests/e2e/admin-newsletter.spec.ts
    - tests/security/retention-boundaries.test.mjs
  modified:
    - package.json
    - supabase/tests/database/06_customer_retention.test.sql
    - src/auth/redirect.ts
key-decisions:
  - "The admin newsletter page is read-only: it can inspect state and history but cannot subscribe or unsubscribe customers."
  - "Admin query reads full subscriber email only after requireAdmin, while raw IP, user-agent, token, and token hash material stays out of UI output."
  - "Because newsletter RLS grants no direct authenticated reads, protected admin inspection uses the existing server-side admin client after the app-level guard."
patterns-established:
  - "Security tests distinguish server-side hash reads from UI rendering, allowing query helpers to read hash columns only to return boolean evidence indicators."
  - "Admin safe redirects explicitly whitelist `/admin/newsletter` without adding nested subscribe/unsubscribe routes."
requirements-completed: [NEWS-03]
duration: 48 min
completed: 2026-06-21
---

# Phase 06 Plan 09: Newsletter Admin Inspection Summary

**Read-only newsletter subscriber administration with minimized consent evidence**

## Performance

- **Duration:** 48 min
- **Started:** 2026-06-21T23:20:00+07:00
- **Completed:** 2026-06-21T23:59:00+07:00
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Added RED database, unit, E2E-list, and static security contracts for NEWS-03, D-15, and D-16.
- Added `getAdminNewsletterSubscribers` with status, locale, market, and email search filters.
- Added `/admin/newsletter` protected by `requireAdmin({next: '/admin/newsletter'})`.
- Added a dense read-only subscriber table with filter controls and consent evidence indicators.
- Added retention boundary security tests to ensure no admin subscribe/unsubscribe controls or raw token/request metadata render.
- Added safe redirect support for `/admin/newsletter`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add subscriber admin and boundary contracts** - `bf3446e` (test)
2. **Task 2: Implement read-only subscriber inspection** - `06f57dc` (feat)

**Plan metadata:** this summary commit

## Decisions Made

- The page does not add admin navigation or mutation controls in this plan; it only exposes the protected inspection route.
- The query helper returns `hasIpEvidence` and `hasUserAgentEvidence` booleans rather than hash values.
- Static security checks read UI files separately from server query files so server-side hash reads are allowed while raw/hash rendering remains blocked.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Corrected service-role privilege assertion**
- **Found during:** RED database verification.
- **Issue:** `table_privs_are` was too strict for `service_role` because Postgres reported additional owner-level privileges.
- **Fix:** Replaced exact privilege equality with focused `has_table_privilege(..., 'SELECT')` checks.
- **Files modified:** `supabase/tests/database/06_customer_retention.test.sql`
- **Verification:** `npm run db:test`
- **Committed in:** `bf3446e`

**2. [Rule 3 - Blocking] Scoped static security checks to UI rendering**
- **Found during:** Security verification after implementation.
- **Issue:** The initial static test treated any server-side `ip_hash` read or `AdminNewsletterSubscriber` type name as an admin override/raw-render violation.
- **Fix:** Split UI-only rendering checks from server query checks and narrowed override-control patterns to forms/buttons/actions.
- **Files modified:** `tests/security/retention-boundaries.test.mjs`
- **Verification:** `npm run test:security`
- **Committed in:** `06f57dc`

**3. [Rule 3 - Blocking] Regenerated corrupted Next dev type cache**
- **Found during:** Typecheck.
- **Issue:** `.next/dev/types/validator.ts` contained invalid generated code after prior dev-server interruptions.
- **Fix:** Removed only generated `.next/dev/types` inside the workspace and reran typecheck.
- **Files modified:** None
- **Verification:** `npm run typecheck`

---

**Total deviations:** 3 auto-fixed (blocking)
**Impact on plan:** No product scope changed; fixes made tests precise and restored generated framework cache.

## Issues Encountered

- `npm run build` changed `next-env.d.ts` to production route types; it was restored to `.next/dev/types/routes.d.ts` and normalized before commit.

## Validation Evidence

- `npm run test:unit -- tests/unit/newsletter/admin.test.ts` - RED before implementation; missing `@/newsletter/admin-queries`.
- `npm run test:security` - RED before implementation; missing admin newsletter files and redirect whitelist.
- `npm run test:e2e -- tests/e2e/admin-newsletter.spec.ts --list` - passed, 3 listed contracts.
- `npm run db:test` - passed after test correction, 18 files / 464 tests.
- `npm run test:unit -- tests/unit/newsletter/admin.test.ts tests/unit/newsletter/consent.test.ts` - passed, 13 tests.
- `npm run test:security` - passed, 27 tests.
- `npm run typecheck` - passed.
- `npm run build` - passed and `/admin/newsletter` appeared in the route manifest.
- `git diff --check` - passed.

## User Setup Required

None for this plan beyond the existing admin account/role setup and deployed Phase 06 database migration.

## Next Phase Readiness

Plan 06-10 can focus on final Phase 06 fixtures, browser verification, and any remaining customer-retention trust polish with NEWS-03 complete.

---
*Phase: 06-customer-retention-and-trust*
*Completed: 2026-06-21*

## Self-Check: PASSED

All required files exist, referenced task commits are in git history, plan verification commands passed, and NEWS-03 is marked complete.
