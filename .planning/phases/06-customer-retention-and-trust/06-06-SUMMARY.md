---
phase: 06-customer-retention-and-trust
plan: "06"
subsystem: review-moderation
tags: [reviews, moderation, admin, optimistic-concurrency, rls, shop-reply]
requires:
  - phase: 06-customer-retention-and-trust
    provides: Verified product review schema, eligibility, submission, and approved public projection
provides:
  - Protected stale-state-safe review approve/hide actions
  - One admin shop reply per approved review
  - Dense admin review queue with status filters and inline action feedback
affects: [reviews, product-detail, admin, auth-redirect, supabase-types, phase-06]
tech-stack:
  added: []
  patterns:
    - Expected-version and expected-status moderation RPCs
    - Admin-only security-definer queue and mutation functions
key-files:
  created:
    - src/app/admin/reviews/page.tsx
    - src/components/admin/reviews/review-moderation-list.tsx
    - src/components/admin/reviews/review-actions.tsx
  modified:
    - supabase/migrations/20260620102618_customer_retention_trust.sql
    - supabase/tests/database/06_customer_retention.test.sql
    - src/types/supabase.ts
    - src/reviews/actions.ts
    - src/reviews/queries.ts
    - src/reviews/eligibility.ts
    - src/components/reviews/product-reviews.tsx
    - src/app/[locale]/product/[productSlug]/page.tsx
    - src/auth/guards.ts
    - src/auth/redirect.ts
key-decisions:
  - "Authenticated customers receive SELECT only on raw review rows; all customer and admin writes pass through evidence/authorization RPCs."
  - "Moderation and reply mutations require expected review version and status, returning stale unions instead of overwriting newer state."
  - "One shop reply is keyed directly by review id and appears publicly only through the approved-review projection."
patterns-established:
  - "Privileged admin queues use security-definer RPCs that check private.is_admin rather than granting broad table reads."
  - "Admin forms carry expected version/status and render persistent inline mutation results."
requirements-completed: [REV-02]
duration: 204 min
completed: 2026-06-21
---

# Phase 06 Plan 06: Review Moderation and Shop Reply Summary

**Stale-safe admin moderation with one managed shop reply and approved-only public visibility**

## Performance

- **Duration:** 204 min
- **Started:** 2026-06-21T10:29:00+07:00
- **Completed:** 2026-06-21T13:53:00+07:00
- **Tasks:** 2
- **Files modified:** 18

## Accomplishments

- Added RED database, unit, and browser contracts for admin authorization, expected-state moderation, one shop reply, queue filters, and public visibility changes.
- Added `review_admin_replies`, admin moderation/reply RPCs, and a protected admin queue RPC with `private.is_admin()` checks.
- Removed direct authenticated review insert/update grants so customers cannot bypass verified submission or set moderation columns themselves.
- Added `/admin/reviews` with compact filters, dense review rows, approve/hide actions, reply create/edit/remove, pending controls, and inline stale/error feedback.
- Extended approved public reviews with one localized shop reply block while preserving masked customer identity.
- Added safe deep-link return to `/admin/reviews` after authentication.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add admin moderation and reply contracts** - `23582ad` (test)
2. **Task 2: Implement moderation queue and one shop reply** - `19b2a67` (feat)

**Plan metadata:** this summary commit

## Files Created/Modified

- `supabase/migrations/20260620102618_customer_retention_trust.sql` - Added reply table, admin queue/moderation/reply RPCs, grants, and public reply projection.
- `supabase/tests/database/06_customer_retention.test.sql` - Added 20 moderation/reply authorization and state contracts.
- `src/types/supabase.ts` - Regenerated types for reply table, projection columns, and admin RPCs.
- `src/reviews/actions.ts` - Added safe result unions, moderation/reply helpers, and protected server actions.
- `src/reviews/queries.ts` - Added protected admin review queue loading and public reply fields.
- `src/reviews/eligibility.ts` - Extended mapped public review shape with optional shop reply.
- `src/app/admin/reviews/page.tsx` - Added protected review moderation route.
- `src/components/admin/reviews/review-moderation-list.tsx` - Added dense filtered admin queue.
- `src/components/admin/reviews/review-actions.tsx` - Added approve/hide/reply forms with expected-state fields and inline feedback.
- `src/components/reviews/product-reviews.tsx` - Rendered one public shop reply inside approved review items.
- `src/auth/guards.ts` - Preserved optional admin deep-link return paths.
- `src/auth/redirect.ts` - Allowlisted `/admin/reviews` safely.
- `src/messages/en.json` - Added English shop reply label.
- `src/messages/vi.json` - Added Vietnamese shop reply label.
- `tests/unit/reviews/eligibility.test.ts` - Added moderation/reply result mapping contracts.
- `tests/unit/auth/redirect.test.ts` - Added admin reviews deep-link contract.
- `tests/e2e/reviews.spec.ts` - Added skipped Plan 06-10 moderation/reply browser contracts.

## Decisions Made

- Admin actions use the authenticated server client after `requireAdmin`, allowing both application and database authorization checks to evaluate the same admin identity.
- Review moderation increments review version; reply edits increment reply version without changing review version.
- Operational customer email is visible only in the protected admin queue; public pages continue using masked identity.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Security] Removed direct customer review writes**
- **Found during:** Task 2 schema design
- **Issue:** Existing authenticated `INSERT`/`UPDATE` grants allowed owners to bypass the verified submit RPC and potentially mutate moderation columns.
- **Fix:** Reduced direct authenticated privileges to `SELECT`; customer submit/update and all moderation now use guarded security-definer RPCs.
- **Files modified:** `supabase/migrations/20260620102618_customer_retention_trust.sql`, `supabase/tests/database/06_customer_retention.test.sql`
- **Verification:** `npm run db:test`
- **Committed in:** `19b2a67`

**2. [Rule 3 - Blocking] Corrected admin queue function return type**
- **Found during:** Task 2 database lint
- **Issue:** `auth.users.email` returned `varchar` while the RPC table contract declared `text`.
- **Fix:** Added an explicit `::text` cast in the admin queue query.
- **Files modified:** `supabase/migrations/20260620102618_customer_retention_trust.sql`
- **Verification:** `npm run db:lint`
- **Committed in:** `19b2a67`

**3. [Rule 3 - Blocking] Made pgTAP review fixture RLS-safe**
- **Found during:** Task 2 database tests
- **Issue:** The admin fixture attempted to discover the customer's review id through owner RLS and directly inspect the reply table despite intentional grant restrictions.
- **Fix:** Captured the review id while authenticated as the owner and asserted reply uniqueness through the approved public projection.
- **Files modified:** `supabase/tests/database/06_customer_retention.test.sql`
- **Verification:** `npm run db:test`
- **Committed in:** `19b2a67`

---

**Total deviations:** 3 auto-fixed (1 security, 2 blocking)
**Impact on plan:** All fixes strengthened the intended authorization and stale-state guarantees without expanding scope.

## Issues Encountered

- `npm run db:reset` applied all migrations and seed, then local Supabase Storage restart failed with the known `UNION types text and uuid cannot be matched` 500 response. Database lint, pgTAP, generated types, and application gates passed against the applied schema.
- The reset wrapper first timed out without output while services were restarting; direct `supabase db reset` exposed the known Storage error and confirmed migration application.

## Verification

- `supabase db reset` - migrations/seed applied; local Storage restart failed with the known text/uuid union issue.
- `npm run db:lint` - passed with no schema errors.
- `npm run db:test` - passed, 18 files / 423 tests.
- `npm run db:types` - passed.
- `git diff --exit-code src/types/supabase.ts` - passed after generated types were committed.
- `npm run test:unit -- tests/unit/reviews/eligibility.test.ts tests/unit/auth/redirect.test.ts` - passed, 34 tests.
- `npm run test:e2e -- tests/e2e/reviews.spec.ts --list` - passed, 7 listed contracts.
- `npm run typecheck` - passed.
- `npm run build` - passed and emitted `/admin/reviews` as a dynamic route.
- `npm run test:security` - passed, 22 tests.
- `npm run lint` - passed with 0 errors and 8 pre-existing warnings.

## User Setup Required

None - no new external service configuration required.

## Next Phase Readiness

Plan 06-07 can proceed from completed review trust workflows. Plan 06-10 still owns activating authenticated admin/customer Playwright fixtures for the seven review browser contracts.

---
*Phase: 06-customer-retention-and-trust*
*Completed: 2026-06-21*
