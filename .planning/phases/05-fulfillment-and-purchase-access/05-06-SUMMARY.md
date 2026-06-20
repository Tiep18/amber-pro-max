---
phase: 05-fulfillment-and-purchase-access
plan: "06"
subsystem: admin-entitlement-controls
tags: [admin, digital-entitlements, revoke, reissue, audit, stale-state]
requires:
  - phase: 05-fulfillment-and-purchase-access
    plan: "02"
    provides: entitlement-checked download authorization
  - phase: 05-fulfillment-and-purchase-access
    plan: "05"
    provides: admin email recovery patterns and sanitized admin UI
provides:
  - Typed revoke and reissue RPC wrappers
  - Admin server actions protected by requireAdmin
  - Admin entitlement action panel with confirmation controls
  - Admin entitlement audit list
  - Admin order detail entitlement and audit projections
  - Unit, e2e-list, security, typecheck, and lint coverage
affects: [phase-05, admin-ops, digital-fulfillment, entitlement-audit]
tech-stack:
  added: []
  patterns: [RPC wrapper mapping, expected-version stale checks, confirmation-gated admin forms, sanitized audit display]
key-files:
  created:
    - src/fulfillment/entitlements.ts
    - src/fulfillment/admin-entitlement-actions.ts
    - src/components/admin/fulfillment/entitlement-actions.tsx
    - src/components/admin/fulfillment/entitlement-audit-list.tsx
  modified:
    - src/components/admin/orders/order-detail.tsx
    - src/payments/queries.ts
    - tests/unit/fulfillment/downloads.test.ts
    - tests/e2e/admin-fulfillment.spec.ts
    - tests/security/fulfillment-boundaries.test.mjs
key-decisions:
  - "Domain wrapper remains named reissueDigitalEntitlement, but calls the migration's existing reissue_digital_access_token RPC."
  - "Server actions lazy-load requireAdmin and the Supabase admin client so unit tests can exercise pure wrappers without server-only imports."
  - "Admin UI displays masked contact email, status, version, timestamps, and sanitized reason only; no token, storage, or signed URL material is rendered."
patterns-established:
  - "Admin entitlement mutations use expectedVersion to fail safely when state changes after render."
  - "Reissue passes only a hash into the database RPC and never returns generated secret material from the wrapper."
requirements-completed: [DIG-07]
duration: 40 min
completed: 2026-06-20
---

# Phase 05 Plan 06: Admin Entitlement Controls Summary

Implemented admin digital entitlement controls for revoke and reissue, including typed RPC wrappers, protected server actions, confirmation UI, and audit display on admin order detail.

## Performance

- **Duration:** 40 min
- **Completed:** 2026-06-20
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Added `revokeDigitalEntitlement` and `reissueDigitalEntitlement` wrappers with input validation and discriminated results.
- Added admin server actions that require admin authorization, submit expected entitlement version, sanitize notes, and revalidate admin order routes.
- Added admin entitlement action panel with revoke and reissue confirmations.
- Added admin entitlement audit list for append-only digital access events.
- Extended admin order detail queries to include entitlement rows and fulfillment audit events.
- Added unit coverage for RPC success, stale responses, forbidden responses, invalid input, and reissue hash-only behavior.
- Extended admin fulfillment e2e-list coverage with revoke and reissue UI scenarios.
- Extended static security coverage for admin entitlement action boundaries.

## Task Commits

1. **Task 1 and Task 2: Entitlement revoke/reissue wrappers, admin actions, UI, and tests** - `85ce2d09` (`feat(05-06)`)

## Files Created/Modified

- `src/fulfillment/entitlements.ts` - Typed revoke/reissue RPC wrapper mapping.
- `src/fulfillment/admin-entitlement-actions.ts` - Admin-protected server actions for revoke and reissue.
- `src/components/admin/fulfillment/entitlement-actions.tsx` - Confirmation-gated admin revoke/reissue UI.
- `src/components/admin/fulfillment/entitlement-audit-list.tsx` - Sanitized entitlement audit display.
- `src/components/admin/orders/order-detail.tsx` - Renders entitlement actions and audit list.
- `src/payments/queries.ts` - Loads admin entitlement rows and audit events for order detail.
- `tests/unit/fulfillment/downloads.test.ts` - Adds revoke/reissue wrapper contracts.
- `tests/e2e/admin-fulfillment.spec.ts` - Adds admin revoke/reissue route-list scenarios.
- `tests/security/fulfillment-boundaries.test.mjs` - Adds admin entitlement boundary scanner coverage.

## Decisions Made

- Reissue wrapper calls `reissue_digital_access_token`, matching the existing migration, while preserving the domain-level TypeScript name `reissueDigitalEntitlement`.
- Reissue creates fresh secret material only inside the wrapper, sends only its hash to the RPC, and does not return that material.
- Admin forms carry only entitlement id, expected version, order id, and optional sanitized reason.
- The audit list intentionally omits raw metadata rendering to avoid leaking internal provider, token, or storage details.

## Deviations from Plan

### Auto-fixed Issues

**1. RPC name differed from plan text**
- **Found during:** Migration review before implementation
- **Issue:** The plan referenced `reissue_digital_entitlement`, but the migration provides `reissue_digital_access_token`.
- **Fix:** Kept the TypeScript domain API as `reissueDigitalEntitlement` and called the actual migration RPC.
- **Automated check:** Unit test asserts the wrapper calls `reissue_digital_access_token` with `p_new_token_hash`.

---

**Total deviations:** 1 auto-fixed.
**Impact on plan:** No scope reduction; implementation follows the committed database contract.

## Issues Encountered

- None blocking.
- `npm run lint` passes with pre-existing warnings outside this plan.

## Automated Checks

- `npm run test:unit -- tests/unit/fulfillment/downloads.test.ts` - passed, 9 tests.
- `npm run test:e2e -- tests/e2e/admin-fulfillment.spec.ts --list` - passed, 4 scenarios listed.
- `npm run test:security` - passed, 19 tests.
- `npm run typecheck` - passed.
- `npm run lint` - passed with 8 pre-existing warnings.
- `git diff --check` - passed.

## User Setup Required

None.

## Next Phase Readiness

Plan 05-08 can proceed with guest reopen and same-email order claim using the account access, transactional email, and entitlement control foundations now in place.

---
*Phase: 05-fulfillment-and-purchase-access*
*Completed: 2026-06-20*
