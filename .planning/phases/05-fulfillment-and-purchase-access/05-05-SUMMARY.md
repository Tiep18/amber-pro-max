---
phase: 05-fulfillment-and-purchase-access
plan: "05"
subsystem: admin-email-recovery
tags: [admin, email-outbox, retry, resend, sanitized-ui]
requires:
  - phase: 05-fulfillment-and-purchase-access
    plan: "04"
    provides: transactional email renderer, worker service, protected route
provides:
  - Sanitized failed transactional email queue on admin order detail
  - Admin retry server action for failed or due pending email rows
  - Admin download-resend intent builder with fresh outbox and audit rows
  - Failed-email count indicator on admin order queue
  - Unit, e2e-list, security, typecheck, and lint coverage
affects: [phase-05, admin-ops, email-worker, digital-fulfillment]
tech-stack:
  added: []
  patterns: [server action with requireAdmin, masked email display, sanitizer allowlisted in static security tests]
key-files:
  created:
    - src/fulfillment/admin-email-actions.ts
    - src/components/admin/fulfillment/failed-email-queue.tsx
  modified:
    - src/components/admin/orders/order-detail.tsx
    - src/components/admin/orders/order-queue.tsx
    - src/payments/queries.ts
    - tests/unit/fulfillment/email-outbox.test.ts
    - tests/security/fulfillment-boundaries.test.mjs
key-decisions:
  - "Admin queue displays masked recipient and sanitized status only; raw provider details, token values, signed URLs, and storage paths stay out of UI."
  - "Download resend does not post a full recipient email through the admin form; the server action resolves contact email from the entitlement."
  - "The existing outbox schema has no attempt-history table yet, so retry recovery preserves durable outbox intent and uses status/available_at for controlled retry."
patterns-established:
  - "Admin email recovery helpers are pure-testable; server-only auth and Supabase clients are lazy-loaded inside server actions."
  - "Security scanner strips the sanitizer implementation before checking for forbidden leaked material so denylist literals do not create false positives."
requirements-completed: [DIG-03, DIG-07, OPS-02]
duration: 30 min
completed: 2026-06-20
---

# Phase 05 Plan 05: Admin Email Recovery Queue Summary

Implemented the admin-facing recovery path for transactional email failures: admins can inspect sanitized failed/due rows, queue retries, and request a fresh download email without reusing stale links.

## Performance

- **Duration:** 30 min
- **Completed:** 2026-06-20
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added admin helper/action module for masked email presentation, sanitized error codes, retry eligibility, and download resend intent creation.
- Added `FailedEmailQueue` component to admin order detail with retry and resend forms.
- Extended admin order detail query to load failed/pending transactional email rows for the selected order.
- Extended admin order queue items with failed-email counts for lightweight visibility.
- Added unit contracts for masking, sanitization, retry stale/no-op handling, and resend intent safety.
- Extended security scanner to cover admin email actions and queue UI.

## Task Commits

1. **Task 1 and Task 2: Admin failed-email queue, retry, resend, and tests** - `41872c7f` (`feat(05-05)`)

## Files Created/Modified

- `src/fulfillment/admin-email-actions.ts` - Admin retry/resend helpers and server actions.
- `src/components/admin/fulfillment/failed-email-queue.tsx` - Sanitized failed email queue UI.
- `src/components/admin/orders/order-detail.tsx` - Renders failed email queue on order detail.
- `src/components/admin/orders/order-queue.tsx` - Shows failed email count badge.
- `src/payments/queries.ts` - Adds failed email row and count projections.
- `tests/unit/fulfillment/email-outbox.test.ts` - Adds admin recovery helper contracts.
- `tests/security/fulfillment-boundaries.test.mjs` - Adds admin email recovery static coverage.

## Decisions Made

- Resend download actions resolve recipient email server-side from `digital_entitlements`, avoiding full email exposure in hidden form fields.
- Retry recovery checks current row status before queuing and rejects stale sent/sending rows.
- This plan avoids adding a new migration for attempt history; later admin/email queue plans can add richer attempt audit tables if needed.

## Deviations from Plan

### Auto-fixed Issues

**1. Unit tests imported server-only auth through admin actions**
- **Found during:** Task 2 verification
- **Issue:** Top-level `requireAdmin` import pulled `server-only` into Vitest.
- **Fix:** Lazy-loaded `requireAdmin` and Supabase admin client inside server actions while keeping helper functions pure-testable.
- **Verification:** `npm run test:unit -- tests/unit/fulfillment/email-outbox.test.ts` passes.

**2. Full recipient email appeared in hidden resend form field**
- **Found during:** Security self-review
- **Issue:** The first resend form passed recipient email through a hidden input.
- **Fix:** Removed hidden recipient email and made the server action resolve contact email from the entitlement.
- **Verification:** `npm run test:security` passes.

**3. Static scanner caught sanitizer denylist literals**
- **Found during:** Security verification
- **Issue:** Security test matched forbidden terms inside the sanitizer implementation itself.
- **Fix:** Scanner removes the sanitizer function body before checking source for leaked provider/token/storage material.
- **Verification:** `npm run test:security` passes.

---

**Total deviations:** 3 auto-fixed.
**Impact on plan:** No scope reduction; fixes improved testability and reduced admin UI data exposure.

## Issues Encountered

- The Phase 5 database foundation does not yet include a separate email-attempt history table or attempt counter. The queue therefore exposes sanitized current outbox state, next retry, and action controls, with richer attempt history deferred to future schema work if required.
- `npm run lint` passes with pre-existing warnings outside this plan.

## Automated Checks

- `npm run test:unit -- tests/unit/fulfillment/email-outbox.test.ts` - passed, 8 tests.
- `npm run test:e2e -- tests/e2e/admin-fulfillment.spec.ts --list` - passed, 2 scenarios listed.
- `npm run test:security` - passed, 17 tests.
- `npm run typecheck` - passed.
- `npm run lint` - passed with pre-existing warnings.

## User Setup Required

None beyond the Resend/worker environment variables already listed in 05-04.

## Next Phase Readiness

Plan 05-07 can proceed independently on signed-in order history and grouped pattern library. Plan 05-06 can use the resend/audit patterns established here for entitlement revoke and reissue operations.

---
*Phase: 05-fulfillment-and-purchase-access*
*Completed: 2026-06-20*
