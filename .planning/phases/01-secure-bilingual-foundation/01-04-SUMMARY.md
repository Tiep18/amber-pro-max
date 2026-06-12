---
phase: 01-secure-bilingual-foundation
plan: "04"
subsystem: database
tags: [supabase, postgres, rls, pgtap, auth, admin]

requires:
  - phase: 01-01
    provides: Approved package and script foundation
provides:
  - Supabase local project configuration on non-conflicting ports
  - Foundation identity migration with profiles, user_roles, private.is_admin(), grants, indexes, and RLS
  - pgTAP role-matrix tests for profile and admin role boundaries
  - Generated Supabase TypeScript database types
affects:
  - 01-05-auth-foundation
  - 01-07-account-admin-boundary
  - later commerce RLS plans

tech-stack:
  added:
    - Supabase CLI local config
    - pgTAP database tests
  patterns:
    - Private schema security-definer helpers with fixed search_path
    - No client-write policy for admin role rows
    - Database types generated from local migrations

key-files:
  created:
    - supabase/config.toml
    - supabase/seed.sql
    - supabase/migrations/20260612102801_foundation_identity.sql
    - supabase/tests/database/01_foundation_rls.test.sql
    - supabase/tests/database/01_roles_rls.test.sql
    - src/types/supabase.ts
  modified:
    - package.json

key-decisions:
  - "Local Supabase uses ports 55431-55439 to avoid conflict with another running Supabase project."
  - "Local Storage is disabled for this Phase 1 identity/RLS gate because Storage is outside Plan 01-04 scope and caused reset-time 502 failures on Windows."
  - "Admin authority is stored in `public.user_roles`, not user-editable metadata."

patterns-established:
  - "All exposed Phase 1 tables enable RLS in the first migration."
  - "RLS policies use session-bound `auth.uid()` plus database-owned `private.is_admin()`."
  - "Database verification runs through `supabase db reset`, `supabase db lint --local --fail-on error`, `supabase test db`, type generation, and app typecheck."

requirements-completed:
  - ADM-02
  - SEC-01
  - SEC-02

duration: 16 min
completed: 2026-06-12
---

# Phase 01 Plan 04: Foundation Identity RLS Summary

**Supabase profiles and admin-role schema with first-migration RLS, private admin helper, pgTAP role-matrix tests, and generated database types**

## Performance

- **Duration:** 16 min
- **Started:** 2026-06-12T10:26:15Z
- **Completed:** 2026-06-12T10:42:07Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Initialized local Supabase configuration and generated a timestamped `foundation_identity` migration through the CLI.
- Created `public.profiles` and `public.user_roles` with RLS enabled immediately.
- Added `private.is_admin()` as a security-definer helper with fixed `search_path`.
- Added pgTAP tests covering anonymous, customer A, customer B, metadata spoofing, and admin boundaries.
- Generated `src/types/supabase.ts` from the local schema.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the foundation identity schema with RLS tests** - `9ecc1eb` (feat)
2. **Task 2: Run the blocking Supabase schema reset, lint, test, and type-generation gate** - `9ecc1eb` (feat)

**Plan metadata:** committed after this summary.

## Files Created/Modified

- `supabase/config.toml` - local Supabase config using non-conflicting ports with Storage disabled for this DB-only phase.
- `supabase/seed.sql` - intentionally empty seed file; pgTAP tests create transactional fixtures.
- `supabase/migrations/20260612102801_foundation_identity.sql` - profiles, user_roles, private helper, grants, indexes, and RLS policies.
- `supabase/tests/database/01_foundation_rls.test.sql` - profile RLS matrix for anon/customer/admin behavior.
- `supabase/tests/database/01_roles_rls.test.sql` - role authority and private helper tests.
- `src/types/supabase.ts` - generated Supabase database types.
- `package.json` - database reset/lint/test/type-generation scripts.

## Decisions Made

- Kept admin authorization database-owned through `public.user_roles`; user metadata spoofing is tested and does not grant access.
- Revoked direct schema access to `private`, while granting function execution only as needed for RLS policy evaluation.
- Disabled local Storage in `supabase/config.toml` because Plan 01-04 does not touch Storage and the Windows local stack returned 502 during reset when Storage was enabled.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Moved local Supabase to non-default ports**
- **Found during:** Task 2 (Run the blocking Supabase schema reset, lint, test, and type-generation gate)
- **Issue:** Default DB port `54322` was already allocated by another local Supabase project.
- **Fix:** Configured this project on `55431`/`55432`/related ports.
- **Files modified:** `supabase/config.toml`
- **Verification:** `supabase start` and `supabase db reset` pass.
- **Committed in:** `9ecc1eb`

**2. [Rule 3 - Blocking] Disabled out-of-scope local Storage service**
- **Found during:** Task 2 (Run the blocking Supabase schema reset, lint, test, and type-generation gate)
- **Issue:** `supabase db reset` failed with a reset-time 502 from `/storage/v1/bucket` on Windows.
- **Fix:** Set `[storage].enabled = false` for this Phase 1 identity/RLS gate.
- **Files modified:** `supabase/config.toml`
- **Verification:** `supabase db reset` passes.
- **Committed in:** `9ecc1eb`

**3. [Rule 3 - Blocking] Adjusted pgTAP assertions for actual TAP output**
- **Found during:** Task 1 (Create the foundation identity schema with RLS tests)
- **Issue:** One test file declared one extra planned assertion; another compared `proconfig` text without Postgres array quoting.
- **Fix:** Corrected the plan count and expected fixed `search_path` value.
- **Files modified:** `supabase/tests/database/01_foundation_rls.test.sql`, `supabase/tests/database/01_roles_rls.test.sql`
- **Verification:** `supabase test db` passes with 2 files and 14 tests.
- **Committed in:** `9ecc1eb`

---

**Total deviations:** 3 auto-fixed (3 blocking)
**Impact on plan:** The schema, RLS, and type-generation goals are intact. Storage remains a later digital-fulfillment concern and was not introduced into the Phase 1 identity boundary.

## Issues Encountered

- Supabase CLI `2.58.5` reports a newer CLI (`2.106.0`) is available. The installed version is the project-researched local version and successfully completed the Plan 01-04 gate after config adjustments.
- Running Supabase reset/lint or individual pgTAP files in parallel caused transient container/pgTAP errors. The verified gate is sequential: reset, lint, test, generate types, typecheck.

## User Setup Required

None - no hosted Supabase credentials or dashboard changes were required for this local schema gate.

## Verification

Passed:

```bash
supabase db reset
supabase db lint --local --fail-on error
supabase test db
supabase gen types typescript --local > src/types/supabase.ts
npm run typecheck
npm run lint
```

## Next Phase Readiness

Ready for Plan 01-05. Auth helpers can now import `Database` from `src/types/supabase.ts` and rely on the RLS-backed `profiles`, `user_roles`, and `private.is_admin()` foundation.

---
*Phase: 01-secure-bilingual-foundation*
*Completed: 2026-06-12*
