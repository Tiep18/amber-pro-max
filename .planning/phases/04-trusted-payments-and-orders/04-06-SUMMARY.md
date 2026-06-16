---
phase: 04-trusted-payments-and-orders
plan: "06"
subsystem: paypal-webhooks
tags: [payments, paypal, webhooks, nextjs, supabase, security, vitest]

requires:
  - phase: 04-trusted-payments-and-orders
    provides: Server-owned PayPal create/capture, payment transition RPC, payment event inbox, and customer verifying UI from Plans 04-02, 04-04, and 04-05
provides:
  - Raw-body PayPal webhook verification using official verify-webhook-signature postback with injected transport for tests
  - PayPal event reconciliation for completed, declined, pending, duplicate, late, mismatch, and refund visibility cases
  - `POST /api/webhooks/paypal` route with body cap, required transmission headers, duplicate delivery history, sanitized receipts, and shared transition delegation
  - Additive payment event delivery history columns for duplicate webhook retries
affects: [provider-readiness, admin-orders, fulfillment-gate, payment-audit, phase-04-verification]

tech-stack:
  added: []
  patterns:
    - Webhook handlers read `request.text()` once, verify authenticity before mutation, and never store raw provider payloads
    - Supported PayPal paid/failed effects delegate to `applyPaymentTransition` with source `paypal_webhook`
    - Duplicate webhook deliveries update receipt counters without repeating business effects

key-files:
  created:
    - src/payments/paypal/verification.ts
    - src/app/api/webhooks/paypal/route.ts
    - supabase/migrations/20260616035039_paypal_webhook_delivery_history.sql
  modified:
    - src/payments/paypal/client.ts
    - src/payments/paypal/mapping.ts
    - tests/fixtures/payments/paypal-events.ts
    - tests/unit/payments/paypal-webhook.test.ts
    - src/types/supabase.ts
    - supabase/tests/database/04_payment_model.test.sql
    - supabase/tests/database/04_payment_rls_audit.test.sql

key-decisions:
  - "PayPal webhook verification uses the official postback endpoint with exact request body digesting and required transmission headers; tests inject transport so no live PayPal call is made."
  - "Webhook route lets applyPaymentTransition create transition-bearing receipts, while duplicate/no-op/refund events are stored directly as sanitized payment_events evidence."
  - "payment_events received additive delivery_count and last_received_at fields because the plan threat model requires durable duplicate delivery history."

patterns-established:
  - "Webhook routes should return bounded public responses and record only digests plus sanitized provider facts."
  - "PayPal completed capture is accepted only after signature verification plus local order, merchant, amount, and USD currency reconciliation."
  - "Out-of-order pending/unsupported events are durable no-op receipts; late completed captures are delegated as paid transitions with review evidence so the DB keeps the gate locked."

requirements-completed: [PAY-03, PAY-04, PAY-08]

duration: 24 min
completed: 2026-06-16
---

# Phase 04 Plan 06: PayPal Webhook Verification Summary

**Verified PayPal webhook intake with raw-body authenticity checks, exact provider fact reconciliation, duplicate delivery history, and shared transition delegation**

## Performance

- **Duration:** 24 min
- **Started:** 2026-06-16T03:41:14Z
- **Completed:** 2026-06-16T04:05:12Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Converted the Wave 0 PayPal webhook contract into executable Vitest coverage for valid, forged, malformed, oversized, mismatch, duplicate, pending, late, declined, and refund scenarios.
- Added `verifyPayPalWebhook` and `reconcilePayPalEvent` in a server-only module. Verification uses PayPal transmission headers, the configured webhook ID, the official verify-webhook-signature endpoint, and a SHA-256 raw-body digest without storing raw payloads.
- Extended PayPal mapping/client code so webhook capture resources reuse exact local order, merchant, amount, and USD currency reconciliation.
- Implemented `POST /api/webhooks/paypal` with a body cap, one raw-body read, duplicate event detection, delivery counter update, no-op receipt persistence, refund visibility persistence, and `applyPaymentTransition` for paid/failed effects.
- Added an additive migration for `payment_events.delivery_count` and `payment_events.last_received_at`, plus generated type and pgTAP contract updates.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: PayPal webhook verification contract** - `6ee1bed5` (test)
2. **Task 1 GREEN: Verify and reconcile PayPal webhooks** - `f11fa92a` (feat)
3. **Task 2 RED: PayPal webhook route contract** - `66a54c8b` (test)
4. **Task 2 GREEN: Persist PayPal webhook receipts** - `6bb4613b` (feat)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `src/payments/paypal/verification.ts` - Server-only raw-body verification, digesting, event parsing, and PayPal event reconciliation.
- `src/app/api/webhooks/paypal/route.ts` - PayPal webhook endpoint with duplicate receipt handling and transition delegation.
- `supabase/migrations/20260616035039_paypal_webhook_delivery_history.sql` - Delivery count and latest receipt timestamp for payment events.
- `src/payments/paypal/client.ts` - Official PayPal verify-webhook-signature postback helper.
- `src/payments/paypal/mapping.ts` - Reconciliation helper for webhook capture resources.
- `tests/fixtures/payments/paypal-events.ts` - Additional sanitized PayPal pending, currency mismatch, and refund fixtures.
- `tests/unit/payments/paypal-webhook.test.ts` - Executable service and route webhook tests.
- `src/types/supabase.ts` - Payment event delivery history types.
- `supabase/tests/database/04_payment_model.test.sql` - Model contract for delivery history fields and index.
- `supabase/tests/database/04_payment_rls_audit.test.sql` - Service-role grant expectation for duplicate delivery counter updates.

## Decisions Made

- Used PayPal postback signature verification instead of local certificate verification to avoid adding a CRC32/certificate dependency in this plan.
- Kept terminal paid/failed effects in `applyPaymentTransition`; the route only writes direct payment/order updates for refund visibility, which is modeled in Phase 4 but does not open fulfillment.
- Added delivery history as an additive migration because existing `payment_events` could dedupe provider IDs but could not record at-least-once retry history required by the threat model.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added payment event delivery history schema**
- **Found during:** Task 2
- **Issue:** The plan and threat model required duplicate webhook delivery history, but `payment_events` only had `received_at` and service-role insert/select grants.
- **Fix:** Added `delivery_count`, `last_received_at`, an index, narrow service-role update grants, generated type updates, and pgTAP expectation updates.
- **Files modified:** `supabase/migrations/20260616035039_paypal_webhook_delivery_history.sql`, `src/types/supabase.ts`, `supabase/tests/database/04_payment_model.test.sql`, `supabase/tests/database/04_payment_rls_audit.test.sql`
- **Verification:** Focused webhook route test proves duplicate delivery increments history without calling transition; DB reset/test could not run because local Supabase DB container is unhealthy.
- **Committed in:** `6bb4613b`

---

**Total deviations:** 1 auto-fixed (1 missing critical functionality).
**Impact on plan:** The deviation completes a threat-model mitigation already required by the plan. No new payment provider, package, fulfillment, or refund initiation scope was added.

## Issues Encountered

- Project-specific `docs/ai/...` and `docs/ambertinybear-*` files referenced by optional skills are not present in this workspace; AGENTS.md and Phase 04 artifacts remained authoritative.
- `npm run db:reset` timed out twice, and `supabase status` reports `supabase_db_Test_GSD container is not ready: unhealthy`. Focused Vitest, typecheck, security, lint, and build passed; local pgTAP/database reset remains unverified for this plan due to environment health.
- `npm run lint` passes with 9 pre-existing warnings outside this plan's edited source.
- A generated `.gitignore` side-effect adding `.codegraph/` was discarded to keep scope tight. Existing unrelated dirty `next-env.d.ts` and `.codegraph/` were left untouched.

## Verification

- `npx vitest run tests/unit/payments/paypal-webhook.test.ts` - passed, 10 tests.
- `npm run typecheck` - passed.
- `npm run test:security` - passed, 10 Node security tests.
- `npm run build` - passed; Next.js built `/api/webhooks/paypal`.
- `npm run lint` - passed with warnings only.
- `npm run db:reset` - not completed; timed out twice because local Supabase DB container is unhealthy.
- `supabase status` - failed with unhealthy local DB container.

## Known Stubs

None. PayPal sandbox/live credentials and real webhook delivery remain Plan 04-10 provider readiness scope.

## Threat Flags

None open. The planned internet-to-webhook and verified-event-to-transition trust boundaries were implemented with body cap, required headers, official signature postback, local provider fact reconciliation, duplicate event idempotency, sanitized facts, no raw payload storage, and shared transition delegation.

## User Setup Required

None for this plan. PayPal sandbox/live credentials, webhook ID, and real provider delivery verification remain Plan 04-10.

## Next Phase Readiness

Ready for Plan 04-08 and later admin/provider readiness work. PayPal webhooks now have a local route and focused tests; the remaining provider gap is real sandbox webhook delivery once credentials and public HTTPS routing are available.

## Self-Check: PASSED

- Key files exist: `src/payments/paypal/verification.ts`, `src/app/api/webhooks/paypal/route.ts`, and `supabase/migrations/20260616035039_paypal_webhook_delivery_history.sql`.
- Task commits exist: `6ee1bed5`, `f11fa92a`, `66a54c8b`, and `6bb4613b`.
- Fresh focused verification passed after commits: `npx vitest run tests/unit/payments/paypal-webhook.test.ts`.
- Residual verification gap is documented: local Supabase DB is unhealthy, so DB reset/pgTAP could not run in this environment.

---
*Phase: 04-trusted-payments-and-orders*
*Completed: 2026-06-16*
