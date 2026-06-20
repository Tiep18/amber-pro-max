---
phase: 05-fulfillment-and-purchase-access
plan: "09"
subsystem: physical-fulfillment-admin
subjects: [physical-fulfillment, admin, tracking, shipping-email, stale-state]
requires:
  - phase: 05-fulfillment-and-purchase-access
    plan: "04"
    provides: transactional email outbox and physical shipped renderer
  - phase: 05-fulfillment-and-purchase-access
    plan: "06"
    provides: admin action patterns with expected-state checks
provides:
  - Admin physical fulfillment transition service/action
  - Admin physical fulfillment form on order detail
  - Physical status indicator on admin queue
  - Optional carrier/tracking fields with HTTPS URL validation
  - Required shipped email enqueue
  - Unit, e2e-list, security, typecheck, and lint coverage
affects: [phase-05, admin-ops, physical-fulfillment, transactional-email]
tech-stack:
  added: []
  patterns: [expected-version stale checks, optional tracking facts, shipped email outbox, admin-only physical note]
key-files:
  created:
    - src/fulfillment/physical.ts
    - src/components/admin/fulfillment/physical-fulfillment-form.tsx
    - supabase/migrations/20260620090900_allow_shipped_without_tracking.sql
    - tests/unit/fulfillment/physical.test.ts
  modified:
    - src/fulfillment/schemas.ts
    - src/components/admin/orders/order-detail.tsx
    - src/components/admin/orders/order-queue.tsx
    - src/payments/queries.ts
    - supabase/tests/database/05_physical_fulfillment.test.sql
    - tests/e2e/admin-fulfillment.spec.ts
    - tests/security/fulfillment-boundaries.test.mjs
key-decisions:
  - "Shipped status is allowed without tracking facts; tracking URL is validated as HTTPS when present."
  - "Delivered email is intentionally not queued by default; shipped email is required."
  - "Admin physical updates use expected status and version to reject stale submissions."
patterns-established:
  - "Physical fulfillment action is pure-testable and server action authorization is lazy-loaded."
  - "Physical tracking facts are stored as customer-safe fields; admin note stays admin-only."
requirements-completed: [FUL-02, FUL-03]
duration: 40 min
completed: 2026-06-20
---

# Phase 05 Plan 09: Physical Fulfillment Admin Summary

Implemented admin physical fulfillment controls for manual handmade shipment status, optional tracking facts, stale-state protection, and shipped email enqueue.

## Performance

- **Duration:** 40 min
- **Completed:** 2026-06-20
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Added `updatePhysicalFulfillment` service and `updatePhysicalFulfillmentAction` server action.
- Added allowed forward transitions for awaiting, packing, shipped, delivered, and cancelled states.
- Added optional carrier/tracking fields with HTTPS-only tracking URL validation.
- Added required `physical_shipped` transactional email outbox row when status becomes shipped.
- Added physical fulfillment form to admin order detail with expected status/version hidden fields.
- Added physical status indicator to admin order queue.
- Extended admin order detail query with physical fulfillment row data.
- Added migration to allow shipped status without tracking while preserving HTTPS validation when tracking URL is present.
- Added unit, e2e-list, and security coverage for physical fulfillment boundaries.

## Task Commits

1. **Task 1 and Task 2: Physical fulfillment action, admin form, shipped email, and tests** - `17c0eebb` (`feat(05-09)`)

## Files Created/Modified

- `src/fulfillment/physical.ts` - Physical transition validation, service, and server action.
- `src/components/admin/fulfillment/physical-fulfillment-form.tsx` - Admin status/tracking update form.
- `src/components/admin/orders/order-detail.tsx` - Renders physical fulfillment form.
- `src/components/admin/orders/order-queue.tsx` - Shows physical status badge.
- `src/payments/queries.ts` - Loads physical fulfillment row for admin detail and queue projection.
- `src/fulfillment/schemas.ts` - Allows shipped without required tracking facts.
- `supabase/migrations/20260620090900_allow_shipped_without_tracking.sql` - Drops old shipped tracking requirement and adds HTTPS tracking URL constraint.
- `supabase/tests/database/05_physical_fulfillment.test.sql` - Updates contract to match optional tracking.
- `tests/unit/fulfillment/physical.test.ts` - Physical transition, tracking, stale, and email enqueue contracts.
- `tests/e2e/admin-fulfillment.spec.ts` - Adds admin physical fulfillment route-list scenario.
- `tests/security/fulfillment-boundaries.test.mjs` - Adds physical fulfillment boundary scanner coverage.

## Decisions Made

- Shipped without carrier/tracking is valid because handmade fulfillment can be marked shipped before formal carrier details are known.
- Tracking URL validation is enforced at the service layer and DB constraint level when URL is present.
- Delivered transition does not enqueue email automatically in v1; shipped email remains the required customer notification.

## Deviations from Plan

### Auto-fixed Issues

**1. Existing DB constraint contradicted shipped-without-tracking requirement**
- **Found during:** Schema review before implementation
- **Issue:** The existing `physical_fulfillments` check required both tracking number and HTTPS tracking URL for shipped rows.
- **Fix:** Added migration `20260620090900_allow_shipped_without_tracking.sql` to allow shipped without tracking and require HTTPS only when tracking URL exists.
- **Automated check:** Unit test covers shipped without tracking; typecheck/security pass.

---

**Total deviations:** 1 auto-fixed.
**Impact on plan:** No scope reduction; DB now matches the Phase 5 requirement.

## Issues Encountered

- None blocking.
- `npm run lint` passes with pre-existing warnings outside this plan.

## Automated Checks

- `npm run test:unit -- tests/unit/fulfillment/physical.test.ts` - passed, 4 tests.
- `npm run test:e2e -- tests/e2e/admin-fulfillment.spec.ts --list` - passed, 5 scenarios listed.
- `npm run test:security` - passed, 21 tests.
- `npm run typecheck` - passed.
- `npm run lint` - passed with 8 pre-existing warnings.
- `git diff --check` - passed.

## User Setup Required

None.

## Next Phase Readiness

Plan 05-10 can render customer-facing split digital and physical fulfillment progress using the physical status and tracking facts now managed by admin.

---
*Phase: 05-fulfillment-and-purchase-access*
*Completed: 2026-06-20*
