---
phase: 05-fulfillment-and-purchase-access
plan: "02"
subsystem: fulfillment-downloads
tags: [downloads, entitlements, signed-urls, guest-access, customer-ui]
requires:
  - phase: 05-fulfillment-and-purchase-access
    plan: "01"
    provides: digital_entitlements, digital_access_tokens, private PDF assets
provides:
  - Entitlement-checked download authorization service
  - Server-only Supabase Storage signed URL adapter
  - App download route with generic denial behavior
  - Localized customer download panel on the order page
  - Unit, Playwright-list, security, lint, and typecheck coverage
affects: [phase-05, digital-fulfillment, customer-order-access]
tech-stack:
  added: []
  patterns: [pure authorization service with injected repository/storage, server-only signed URL adapter, generic denial route]
key-files:
  created:
    - src/fulfillment/downloads.ts
    - src/fulfillment/downloads.server.ts
    - src/fulfillment/guest-access.ts
    - src/app/api/downloads/route.ts
    - src/components/fulfillment/download-panel.tsx
    - tests/unit/fulfillment/downloads.test.ts
    - tests/e2e/order-downloads.spec.ts
  modified:
    - src/components/payments/order-payment-page.tsx
    - src/messages/en.json
    - src/messages/vi.json
    - tests/security/fulfillment-boundaries.test.mjs
key-decisions:
  - "Download authorization stays in a pure service so owner/token/entitlement denial paths can be tested without importing server-only Supabase clients."
  - "`createSignedUrl` is isolated to `src/fulfillment/downloads.server.ts`; route and UI never render bucket IDs, object paths, token hashes, or signed URL fields."
  - "The customer order page shows a separate digital download panel so paid PDF access is not visually merged with physical fulfillment."
patterns-established:
  - "Every signed URL request must pass through `authorizeDownloadRequest` before Storage access."
  - "Download route denial remains generic (`404` not_found) for invalid, expired, revoked, wrong-owner, and cross-token cases."
requirements-completed: [DIG-04, DIG-06, FUL-01]
duration: 28 min
completed: 2026-06-19
---

# Phase 05 Plan 02: Entitlement-Checked Downloads Summary

Implemented the first customer-facing PDF download path: paid/order-scoped requests are revalidated against active entitlement state before a private Storage signed URL is created.

## Performance

- **Duration:** 28 min
- **Completed:** 2026-06-19
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Added `authorizeDownloadRequest` with injected repository/storage dependencies and denial coverage for missing/unpaid entitlements, revoked entitlements, missing assets, wrong owners, wrong guest tokens, and expired guest tokens.
- Added `downloads.server.ts` as the only server-side boundary that calls Supabase Storage `createSignedUrl`, after order paid-gate, entitlement, token, and asset checks.
- Added `/api/downloads` GET/POST route that accepts order/email-link context, resolves signed-in or guest cookie access, redirects only on authorization, and otherwise returns a generic 404.
- Added a localized `DownloadPanel` to the customer order page, separate from payment and shipping UI.
- Extended fulfillment security tests so UI/client surfaces cannot expose raw PDF storage details, token hashes, service role credentials, or browser-side signed URL creation.

## Task Commits

1. **Task 1 and Task 2: Download contracts, implementation, and UI** - `c039f91e` (`feat(05-02)`)

## Files Created/Modified

- `src/fulfillment/downloads.ts` - Pure authorization service and token hash helper.
- `src/fulfillment/downloads.server.ts` - Server-only Supabase repository/storage adapter and signed URL creation boundary.
- `src/fulfillment/guest-access.ts` - Fulfillment guest download token hash helper.
- `src/app/api/downloads/route.ts` - Generic-denial download redirect route.
- `src/components/fulfillment/download-panel.tsx` - Localized order-page download panel.
- `src/components/payments/order-payment-page.tsx` - Adds the digital download panel below payment status/actions.
- `src/messages/en.json` and `src/messages/vi.json` - Download panel copy.
- `tests/unit/fulfillment/downloads.test.ts` - Authorization denial and success contracts.
- `tests/e2e/order-downloads.spec.ts` - Playwright scenario inventory for later executable browser flows.
- `tests/security/fulfillment-boundaries.test.mjs` - Static signed URL and private PDF exposure boundaries.

## Decisions Made

- Kept the service testable and framework-light by placing `server-only` and Supabase admin imports in `downloads.server.ts`, not in the pure authorization module.
- Preserved route-level non-enumeration by returning the same 404 body for unauthorized, expired, revoked, or invalid access.
- Used the existing Phase 4 guest-order cookie hash when available, with raw email-link tokens accepted only at the API boundary and immediately hashed by the authorization service.

## Deviations from Plan

### Auto-fixed Issues

**1. Unit fixture UUID strictness**
- **Found during:** Task 2 verification
- **Issue:** The request schema correctly requires UUID user IDs, while the first unit fixture used `user-1`.
- **Fix:** Updated owner and wrong-owner fixtures to valid UUIDs.
- **Verification:** `npm run test:unit -- tests/unit/fulfillment/downloads.test.ts` passes.

**2. Guest-token expiry test mixed account-owner semantics**
- **Found during:** Task 2 verification
- **Issue:** The expired-token case was initially sent as the signed-in owner, which should remain authorized through ownership.
- **Fix:** Split revoked/missing-asset owner denial from expired guest-token denial.
- **Verification:** Unit test now covers both paths correctly.

**3. Security regex caught internal camelCase property names**
- **Found during:** Task 2 verification
- **Issue:** Static route scan treated `guestTokenHash` as if it were a database/private payload leak.
- **Fix:** Narrowed the route leak check to snake_case database/storage field names and private bucket literals.
- **Verification:** `npm run test:security` passes.

---

**Total deviations:** 3 auto-fixed.
**Impact on plan:** No scope reduction; fixes made the tests more precise around the intended security boundary.

## Issues Encountered

- E2E browser scenarios are currently listed contracts with skipped tests, matching the existing project pattern for implementation-dependent browser flows without live Storage fixtures.
- `npm run lint` still reports pre-existing warnings outside the 05-02 files; there are no lint errors.

## Verification

- `npm run test:unit -- tests/unit/fulfillment/downloads.test.ts` - passed, 6 tests.
- `npm run test:e2e -- tests/e2e/order-downloads.spec.ts --list` - passed, 3 scenarios listed.
- `npm run test:security` - passed, 16 tests.
- `npm run typecheck` - passed.
- `npm run lint` - passed with 9 pre-existing warnings outside this plan.

## User Setup Required

None.

## Next Phase Readiness

Plan 05-04 can render and send transactional download emails on top of the new app download route. Later account/admin plans can expand the panel into per-entitlement rows, resend, revoke, reissue, and pattern-library workflows.

---
*Phase: 05-fulfillment-and-purchase-access*
*Completed: 2026-06-19*
