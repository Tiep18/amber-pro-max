---
phase: 07-content-seo-and-launch-readiness
plan: "06"
subsystem: operations
tags: [supabase, rls, redaction, admin, operations, playwright, security]
requires:
  - phase: 07-content-seo-and-launch-readiness
    plan: "01"
    provides: Phase 07 database and admin patterns
provides:
  - Sanitized operational error table with RLS and safety trigger
  - TypeScript redaction service for safe error ingestion
  - Protected admin operations queue with Mark error resolved CTA
  - Unit, database, E2E, and static security coverage for OPS-03
affects: [operations, admin, security, launch-readiness]
tech-stack:
  added: []
  patterns:
    - Redact before storage and before display
    - DB trigger rejects unsafe operational facts
    - Admin-only queue uses requireAdmin plus RLS
key-files:
  created:
    - supabase/migrations/20260623070600_operations_errors.sql
    - supabase/tests/database/07_operations_errors.test.sql
    - src/operations/redaction.ts
    - src/operations/errors.ts
    - src/operations/admin-queries.ts
    - src/app/admin/operations/page.tsx
    - src/components/admin/operations/error-queue.tsx
    - src/components/admin/operations/mark-error-resolved-button.tsx
    - tests/unit/operations/redaction.test.ts
    - tests/e2e/admin-operations.spec.ts
    - tests/security/operations-boundaries.test.mjs
  modified:
    - src/auth/redirect.ts
    - src/types/supabase.ts
key-decisions:
  - "Operational errors store only sanitized allowlisted facts; raw payloads, tokens, signatures, signed URLs, addresses, phone values, stack traces, and email-like values are rejected or dropped."
  - "The admin operations queue is separate at `/admin/operations` and protected by requireAdmin."
  - "Resolving an error uses the exact CTA `Mark error resolved`."
patterns-established:
  - "Operational error safety is enforced in both TypeScript and Postgres trigger logic."
  - "Admin operations rows expose sanitized facts behind a detail reveal while keeping raw evidence out of UI source."
requirements-completed: [OPS-03]
duration: 55 min
completed: 2026-06-24
---

# Phase 07 Plan 06: Operational Error Redaction Queue Summary

**Safe operational error capture, redaction, admin queue review, and resolution workflow**

## Performance

- **Duration:** 55 min
- **Started:** 2026-06-24T07:40:00+07:00
- **Completed:** 2026-06-24T08:35:40+07:00
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- Added `operational_errors` with admin-only RLS, service-role fixture access, and trigger-enforced sanitized JSON checks.
- Added a redaction service that allowlists safe operational facts and drops raw provider payloads, tokens, signatures, signed URLs, stack traces, emails, addresses, and phone fields.
- Added server-side error recording and admin-only resolution actions.
- Added `/admin/operations` with filters, sanitized fact detail reveal, and exact `Mark error resolved` CTA.
- Added safe redirect allowlist coverage for `/admin/operations`.
- Added unit, database, E2E, and static security tests for OPS-03 and D-11/D-12.

## Task Commits

1. **Tasks 1-2: Operational error storage, redaction, queue, and verification** - `5658ede6` (`feat(07-06): add operational error queue`)

## Files Created/Modified

- `supabase/migrations/20260623070600_operations_errors.sql` - Operational error table, RLS, grants, safe-json function, and trigger.
- `supabase/tests/database/07_operations_errors.test.sql` - pgtap coverage for safety, RLS grants, and resolve stamping.
- `src/operations/redaction.ts` - Redaction and normalization utilities.
- `src/operations/errors.ts` - Error recording and admin resolve actions.
- `src/operations/admin-queries.ts` - Admin-only queue query helper.
- `src/app/admin/operations/page.tsx` - Protected operations queue route.
- `src/components/admin/operations/error-queue.tsx` - Dense sanitized error queue UI.
- `src/components/admin/operations/mark-error-resolved-button.tsx` - Resolve CTA.
- `src/auth/redirect.ts` - Operations admin redirect allowlist.
- `src/types/supabase.ts` - Generated database types for operational errors.
- `tests/unit/operations/redaction.test.ts` - Sanitizer and admin action unit coverage.
- `tests/e2e/admin-operations.spec.ts` - Protected queue, sanitized display, resolve, and customer denial coverage.
- `tests/security/operations-boundaries.test.mjs` - Static boundary checks.

## Decisions Made

- Used first-party Postgres plus TypeScript redaction instead of introducing an observability SaaS dependency.
- Kept operational facts as allowlisted JSON rather than storing arbitrary error payloads.
- Used `security definer` trigger helpers so service-role inserts still pass the same safety enforcement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Trigger function blocked service-role E2E fixtures**
- **Found during:** Playwright E2E.
- **Issue:** Service-role REST inserts could not execute the `private` trigger helper and failed with `permission denied for schema private`.
- **Fix:** Marked the safe-json and trigger functions as `security definer`.
- **Files modified:** `supabase/migrations/20260623070600_operations_errors.sql`
- **Verification:** `npm run db:reset`, `npm run db:test`, and `npm run test:e2e -- tests/e2e/admin-operations.spec.ts` passed.
- **Committed in:** `5658ede6`

**2. [Rule 3 - Non-blocking] Tests initially treated safe warning copy as leaked raw data**
- **Found during:** Static security and Playwright E2E.
- **Issue:** Assertions matched warning copy such as "tokens are not shown" rather than actual raw values.
- **Fix:** Narrowed assertions to raw field identifiers or concrete forbidden values.
- **Files modified:** `tests/security/operations-boundaries.test.mjs`, `tests/e2e/admin-operations.spec.ts`
- **Verification:** Security and E2E checks passed.
- **Committed in:** `5658ede6`

---

**Total deviations:** 2 auto-fixed issues.
**Impact on plan:** No scope change. Fixes strengthened the same redaction and verification contract.

## Issues Encountered

- The operations fact details are hidden inside a disclosure until opened; E2E now opens `Sanitized facts` before asserting stored context.
- Running the Next dev server rewrote `next-env.d.ts` locally again; it was not staged or committed.

## Verification Evidence

- `npm run test:unit -- tests/unit/operations/redaction.test.ts` - passed, 1 file / 4 tests.
- `npm run db:reset` - passed after applying the operational error migration.
- `npm run db:test` - passed, 20 files / 499 tests.
- `npm run db:types` - passed.
- `git diff --exit-code src/types/supabase.ts` - passed after commit.
- `npm run test:e2e -- tests/e2e/admin-operations.spec.ts` - passed, 3 tests.
- `node --test tests/security/operations-boundaries.test.mjs` - passed, 5 tests.
- `npm run typecheck` - passed.
- `npm run lint` - passed with 0 errors and 8 pre-existing warnings outside this plan.

## User Setup Required

None - no external observability provider or secrets are required.

## Next Phase Readiness

Wave 2 can continue with 07-08 policy publishing. Later admin dashboard work in 07-07 can link to `/admin/operations` and count unresolved operational errors.

---
*Phase: 07-content-seo-and-launch-readiness*
*Completed: 2026-06-24*
