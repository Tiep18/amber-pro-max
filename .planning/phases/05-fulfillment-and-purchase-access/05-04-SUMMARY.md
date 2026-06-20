---
phase: 05-fulfillment-and-purchase-access
plan: "04"
subsystem: transactional-email
tags: [resend, email-outbox, worker-route, localized-email, retries]
requires:
  - phase: 05-fulfillment-and-purchase-access
    plan: "01"
    provides: transactional_email_outbox, digital_entitlements, token tables
  - phase: 05-fulfillment-and-purchase-access
    plan: "03"
    provides: human approval for resend@6.14.0
provides:
  - Exact `resend@6.14.0` dependency installation
  - Server-only transactional email env parsing and example variables
  - Plain TypeScript localized HTML/text transactional email renderer
  - Protected Vercel Cron-compatible email outbox worker route
  - Injected sender/repository worker service with retry/backoff handling
  - Best-effort immediate outbox trigger after verified paid transitions
affects: [phase-05, email-worker, digital-fulfillment, operations]
tech-stack:
  added: [resend@6.14.0]
  patterns: [plain TypeScript email rendering, protected worker route, injected sender tests, raw token generated only at send time]
key-files:
  created:
    - src/emails/transactional.ts
    - src/fulfillment/email-outbox.ts
    - src/fulfillment/email-outbox.server.ts
    - src/app/api/fulfillment/email-outbox/route.ts
    - tests/unit/fulfillment/email-outbox.test.ts
    - tests/e2e/admin-fulfillment.spec.ts
  modified:
    - package.json
    - package-lock.json
    - .env.example
    - src/lib/env/server.ts
    - tests/security/fulfillment-boundaries.test.mjs
key-decisions:
  - "Installed the exact approved `resend@6.14.0` version from 05-03, with no floating caret in package.json or package-lock root dependency."
  - "Raw download and guest tokens are generated at send time, hashed into token tables, and used only in the outbound email body; outbox payloads remain free of raw token material."
  - "The worker route lazy-imports server-only Resend/Supabase adapters only after the worker secret is accepted, keeping route denial unit tests lightweight."
  - "Verified paid transitions trigger the email worker immediately; the hosted scheduler remains the retry/fallback path rather than the primary customer wait path."
patterns-established:
  - "Outbox processing uses a pure service with injected repository/sender and a separate server adapter for Supabase and Resend."
  - "Provider failures leave durable outbox intent intact; retry updates status/available_at without overwriting payload."
requirements-completed: [DIG-03, OPS-01]
duration: 35 min
completed: 2026-06-19
---

# Phase 05 Plan 04: Transactional Email Outbox Worker Summary

Implemented localized transactional email rendering and a protected outbox worker route for durable download, guest access, and shipping emails.

## Performance

- **Duration:** 35 min
- **Completed:** 2026-06-19
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Installed exact `resend@6.14.0` after the 05-03 human approval checkpoint.
- Added server-only env parsing for `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `TRANSACTIONAL_EMAIL_WORKER_SECRET`, plus `.env.example` documentation.
- Added plain TypeScript email renderer for English/Vietnamese digital download, guest reopen/claim, and physical shipped emails.
- Added pure `processTransactionalEmailBatch` service with injected repository and sender for unit coverage.
- Added server adapter for Supabase outbox claim/update, send-time token issuance, and Resend `emails.send(..., {idempotencyKey})`.
- Added protected POST route at `/api/fulfillment/email-outbox` with bearer or `x-worker-secret` authorization, body-size guard, typed unconfigured response, and bounded batch size.
- Added a server-only immediate trigger path so PayPal paid capture/recheck, verified PayPal webhook, and VietQR admin confirmation drain due outbox work right after the paid transition commits.
- Extended fulfillment security tests to cover email worker secrets, provider payloads, signed URLs, PDF paths, and attachment avoidance.

## Task Commits

1. **Task 1 and Task 2: Email renderer, worker, route, dependency, and tests** - `a3070558` (`feat(05-04)`)

## Files Created/Modified

- `src/emails/transactional.ts` - Localized subject/html/text renderer with app links only.
- `src/fulfillment/email-outbox.ts` - Pure worker service and sender/repository contracts.
- `src/fulfillment/email-outbox.server.ts` - Server-only Supabase and Resend adapters.
- `src/app/api/fulfillment/email-outbox/route.ts` - Protected worker endpoint.
- `src/app/api/paypal/orders/[paypalOrderId]/capture/route.ts`, `src/app/api/webhooks/paypal/route.ts`, and `src/payments/admin-actions.ts` - Immediate paid-transition outbox triggers.
- `src/lib/env/server.ts` and `.env.example` - Transactional email configuration.
- `package.json` and `package-lock.json` - Exact `resend@6.14.0` dependency.
- `tests/unit/fulfillment/email-outbox.test.ts` - Renderer, worker, and route-secret contracts.
- `tests/e2e/admin-fulfillment.spec.ts` - Admin fulfillment scenario inventory.
- `tests/security/fulfillment-boundaries.test.mjs` - Static email-worker boundary coverage.

## Decisions Made

- Send-time token generation avoids storing raw download or guest tokens in durable outbox payloads while still allowing email links with 24-hour scoped tokens.
- Retry and failed transitions preserve the original payload intent so provider failure cannot corrupt or erase pending work.
- Real Resend configuration is optional at runtime: missing config returns typed unconfigured results and unit tests use an injected sender.
- Successful paid transitions do not depend on the hosted scheduler interval in the happy path; if the immediate trigger is unconfigured or fails, durable outbox state remains available for the protected scheduler/manual worker route.

## Deviations from Plan

### Auto-fixed Issues

**1. Unit runner could not import server-only adapters**
- **Found during:** Task 2 verification
- **Issue:** A first implementation placed `server-only`, Supabase admin, and Resend imports in the same module as the pure worker service.
- **Fix:** Split `email-outbox.ts` into pure service and `email-outbox.server.ts` for production adapters. The route lazy-imports server adapters after secret validation.
- **Verification:** `npm run test:unit -- tests/unit/fulfillment/email-outbox.test.ts` passes.

**2. Root dependency initially retained npm caret range**
- **Found during:** Package verification
- **Issue:** `npm install resend@6.14.0` installed the approved version but wrote `^6.14.0` in the root dependency range.
- **Fix:** Re-ran `npm install --save-exact resend@6.14.0`; both `package.json` and `package-lock.json` now pin `6.14.0`.
- **Verification:** Node lockfile check showed root dependency and installed package version both equal `6.14.0`.

**3. Outbox retry update risked overwriting durable intent**
- **Found during:** Self-review before security verification
- **Issue:** Initial production status updates wrote provider/failure metadata into `payload`, which could remove the original order/email intent needed for retries.
- **Fix:** Status updates now leave payload intact and update only status, sent_at, available_at, and updated_at fields.
- **Verification:** `npm run test:security` passes and worker logic keeps retry intent intact.

---

**Total deviations:** 3 auto-fixed.
**Impact on plan:** No scope reduction; changes tightened testability and durable outbox safety.

## Issues Encountered

- The existing database schema has no separate email-attempt table, so this plan records retry state through outbox status/backoff while preserving the durable payload. Detailed admin attempt history can be added in later admin/email queue work.
- `npm audit --audit-level=high` passed, but npm reports 3 moderate advisories through Next/PostCSS with a breaking `npm audit fix --force` suggestion. Not changed in this plan.
- `npm run lint` passes with 9 pre-existing warnings outside the 05-04 files.

## Automated Checks

- `npm run test:unit -- tests/unit/fulfillment/email-outbox.test.ts` - passed, 5 tests.
- `npm run test:e2e -- tests/e2e/admin-fulfillment.spec.ts --list` - passed, 2 scenarios listed.
- `npm run test:security` - passed, 17 tests.
- `npm run typecheck` - passed.
- `npm run lint` - passed with pre-existing warnings.
- `npm audit --audit-level=high` - passed; moderate advisories noted above.

## User Setup Required

Before real email delivery:

- Set `RESEND_API_KEY`.
- Set `RESEND_FROM_EMAIL` to a verified sender/domain.
- Set `TRANSACTIONAL_EMAIL_WORKER_SECRET` for Vercel Cron or manual worker calls.
- Verify sender domain or identity in the Resend dashboard.

## Next Phase Readiness

Plan 05-05 can build the admin failed-email queue and retry UI on top of the protected worker endpoint and preserved outbox retry state.

---
*Phase: 05-fulfillment-and-purchase-access*
*Completed: 2026-06-19*
