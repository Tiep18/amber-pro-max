---
phase: 05-fulfillment-and-purchase-access
plan: "08"
subsystem: guest-order-access-claim
tags: [guest-access, order-claim, transactional-email, account, token-boundary]
requires:
  - phase: 05-fulfillment-and-purchase-access
    plan: "02"
    provides: entitlement-checked download route and token hashing pattern
  - phase: 05-fulfillment-and-purchase-access
    plan: "04"
    provides: transactional email outbox and guest token email rendering
  - phase: 05-fulfillment-and-purchase-access
    plan: "07"
    provides: signed-in account routes and owner-scoped access patterns
provides:
  - Generic guest order reopen request flow
  - Guest order claim email request flow
  - Same-email signed-in order claim flow
  - Guest token denial for wrong email, expired token, replayed token, and claimed orders
  - Localized English and Vietnamese guest reopen and claim routes
  - Unit, e2e-list, security, typecheck, and lint coverage
affects: [phase-05, guest-checkout, account, transactional-email, digital-fulfillment]
tech-stack:
  added: []
  patterns: [generic non-enumerating responses, hashed guest token proof, same-email account claim, localized route aliases]
key-files:
  created:
    - src/fulfillment/order-claim.ts
    - src/components/fulfillment/guest-reopen-form.tsx
    - src/components/fulfillment/order-claim-panel.tsx
    - src/app/[locale]/guest-order/guest-order-page.tsx
    - src/app/[locale]/guest-order/page.tsx
    - src/app/[locale]/don-hang-khach/page.tsx
    - src/app/[locale]/orders/[orderNumber]/claim/order-claim-page.tsx
    - src/app/[locale]/orders/[orderNumber]/claim/page.tsx
    - src/app/[locale]/don-hang/[orderNumber]/claim/page.tsx
  modified:
    - src/fulfillment/guest-access.ts
    - src/messages/en.json
    - src/messages/vi.json
    - tests/unit/fulfillment/account-access.test.ts
    - tests/e2e/account-purchases.spec.ts
    - tests/security/fulfillment-boundaries.test.mjs
key-decisions:
  - "Guest reopen and claim-email requests always return generic sent status, even when no matching order/email exists."
  - "Claim requires a signed-in same-email account and hashed claim token proof before assigning owner_user_id."
  - "Successful claim revokes guest order access tokens and writes a fulfillment audit event."
  - "Raw token values are accepted only from the clicked claim link/form and are immediately hashed for lookup."
patterns-established:
  - "Guest access logic lives in fulfillment/order-claim.ts with pure-testable helpers and lazy admin-client adapters."
  - "English and Vietnamese guest routes share server-rendered modules while preserving localized URL aliases."
requirements-completed: [DIG-06, ACC-05]
duration: 45 min
completed: 2026-06-20
---

# Phase 05 Plan 08: Guest Reopen And Order Claim Summary

Implemented guest order recovery and same-email account claiming. Guests can request non-enumerating reopen or claim emails, and signed-in customers can claim a guest order only with same-email token proof.

## Performance

- **Duration:** 45 min
- **Completed:** 2026-06-20
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments

- Added `requestGuestOrderReopen`, `requestGuestOrderClaimEmail`, and `claimGuestOrder` fulfillment helpers.
- Added server actions for reopen email, claim email, and signed-in claim submission.
- Added guest reopen page for `/guest-order` and Vietnamese `/don-hang-khach`.
- Added order claim page for `/orders/[orderNumber]/claim` and Vietnamese `/don-hang/[orderNumber]/claim`.
- Added reusable `GuestReopenForm` and `OrderClaimPanel` components.
- Added English and Vietnamese guest access copy.
- Extended unit tests for generic responses, same-email claim, wrong-email denial, expired/replayed token denial, audit insert, and guest token revocation.
- Extended e2e-list contracts for guest reopen and claim routes.
- Extended security scanner coverage for guest claim token boundaries.

## Task Commits

1. **Task 1 and Task 2: Guest reopen, claim email, same-email claim, routes, and tests** - `3921b836` (`feat(05-08)`)

## Files Created/Modified

- `src/fulfillment/order-claim.ts` - Guest reopen, claim email, and same-email claim helpers/actions.
- `src/fulfillment/guest-access.ts` - Fulfillment namespace export for guest access helpers.
- `src/components/fulfillment/guest-reopen-form.tsx` - Generic reopen/claim email form UI.
- `src/components/fulfillment/order-claim-panel.tsx` - Same-email claim panel UI.
- `src/app/[locale]/guest-order/guest-order-page.tsx` - Shared guest reopen page module.
- `src/app/[locale]/guest-order/page.tsx` - English guest reopen route.
- `src/app/[locale]/don-hang-khach/page.tsx` - Vietnamese guest reopen route.
- `src/app/[locale]/orders/[orderNumber]/claim/order-claim-page.tsx` - Shared order claim page module.
- `src/app/[locale]/orders/[orderNumber]/claim/page.tsx` - English order claim route.
- `src/app/[locale]/don-hang/[orderNumber]/claim/page.tsx` - Vietnamese order claim route.
- `src/messages/en.json` - English guest access copy.
- `src/messages/vi.json` - Vietnamese guest access copy.
- `tests/unit/fulfillment/account-access.test.ts` - Guest reopen and claim contracts.
- `tests/e2e/account-purchases.spec.ts` - Guest reopen and claim route-list contracts.
- `tests/security/fulfillment-boundaries.test.mjs` - Guest claim boundary scanner coverage.

## Decisions Made

- Reopen and claim-email requests intentionally return the same success result for missing and matching order/email pairs.
- Claim checks order email, token email, signed-in account email, active token status, and expiry before assigning ownership.
- On successful claim, guest tokens for the order are revoked and the claim is recorded in `fulfillment_audit_events`.
- The first implementation performs app-layer sequenced writes against the existing schema; a future database RPC can tighten this into a single database transaction without changing the UI contract.

## Deviations from Plan

### Auto-fixed Issues

**1. No existing claim transaction RPC in the Phase 5 migration**
- **Found during:** Migration and schema review
- **Issue:** The plan expected database transaction actions, but the existing migration only defined the guest token table and outbox event types.
- **Fix:** Implemented app-layer helper functions using the admin client and covered the expected state transitions in unit tests.
- **Automated check:** Unit tests assert owner assignment, guest token revocation, and fulfillment audit insert.

---

**Total deviations:** 1 auto-fixed.
**Impact on plan:** No user-facing scope reduction; a future RPC can harden atomicity behind the same helper contract.

## Issues Encountered

- PowerShell path handling for folders containing `[locale]` required using Node filesystem APIs for route creation.
- `npm run lint` passes with pre-existing warnings outside this plan.

## Automated Checks

- `npm run test:unit -- tests/unit/fulfillment/account-access.test.ts` - passed, 6 tests.
- `npm run test:e2e -- tests/e2e/account-purchases.spec.ts --list` - passed, 5 scenarios listed.
- `npm run test:security` - passed, 20 tests.
- `npm run typecheck` - passed.
- `npm run lint` - passed with 8 pre-existing warnings.
- `git diff --check` - passed.

## User Setup Required

None beyond the transactional email outbox/worker setup from 05-04.

## Next Phase Readiness

Wave 4 is complete. Plan 05-09 can proceed with physical fulfillment status, shipment tracking, and customer/admin visibility using the existing account and admin order foundations.

---
*Phase: 05-fulfillment-and-purchase-access*
*Completed: 2026-06-20*
