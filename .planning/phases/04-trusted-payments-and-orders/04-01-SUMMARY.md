---
phase: 04-trusted-payments-and-orders
plan: "01"
subsystem: payments-testing
tags: [payments, paypal, vietqr, postgres, rls, vitest, pgtap, playwright, security]

requires:
  - phase: 03-mixed-cart-and-checkout
    provides: Checkout orders, immutable order lines, inventory reservations, payment intents, and pending-payment handoff
provides:
  - Wave 0 payment unit contracts for status mapping, PayPal client, PayPal webhook, and VietQR instructions
  - pgTAP contracts for payment model, idempotent transitions, inventory finalization/release, RLS, and append-only audit
  - Sanitized PayPal fixture events and headers for provider tests without live credentials
  - Executable security, concurrency, and Playwright journey contracts for later Phase 4 plans
affects: [payment-state-machine, paypal-integration, vietqr-admin-confirmation, order-status-pages, admin-orders, fulfillment-gate]

tech-stack:
  added: []
  patterns:
    - Implementation-dependent Phase 4 behavior starts as explicit Vitest test.todo or Playwright test.skip contracts
    - Payment provider fixtures are sanitized deterministic facts, not live seller credentials or secrets
    - Security contract scans future payment surfaces for server-only secret leaks and mutation shortcuts

key-files:
  created:
    - tests/unit/payments/status-mapping.test.ts
    - tests/unit/payments/paypal-client.test.ts
    - tests/unit/payments/paypal-webhook.test.ts
    - tests/unit/payments/vietqr.test.ts
    - tests/fixtures/payments/paypal-events.ts
    - supabase/tests/database/04_payment_model.test.sql
    - supabase/tests/database/04_payment_transitions.test.sql
    - supabase/tests/database/04_payment_rls_audit.test.sql
    - tests/integration/payment-concurrency.mjs
    - tests/security/payment-boundaries.test.mjs
    - tests/e2e/order-status.spec.ts
    - tests/e2e/admin-orders.spec.ts
    - tests/e2e/admin-vietqr.spec.ts
  modified: []

key-decisions:
  - "Wave 0 records Phase 4 requirement coverage as executable contracts only; payment, order, inventory, and fulfillment behavior remains owned by later implementation plans."
  - "Provider fixtures use sanitized deterministic PayPal IDs, merchant placeholders, amounts, and headers, with no live seller identity or secrets."
  - "Playwright journey contracts are skipped with implementation-dependent bodies so later plans can turn them green without losing scenario ownership."

patterns-established:
  - "High-risk payment behavior must have a named unit, pgTAP, security, integration, or browser owner before production code is added."
  - "Duplicate, stale, race, late-capture, forged-signature, IDOR, and fulfillment-gate scenarios stay visible in test names and source assertions."
  - "Boundary tests prefer static assertions until the corresponding production payment modules exist."

requirements-completed: [INV-04, INV-05, ORD-01, ORD-02, ORD-03, PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, PAY-07, PAY-08, SEC-03]

duration: 6 min
completed: 2026-06-15
---

# Phase 04 Plan 01: Wave 0 Payment Test Contracts Summary

**Executable payment, database, security, concurrency, and browser contracts for PayPal, VietQR, order state, inventory finalization, and audit before production payment code**

## Performance

- **Duration:** 6 min
- **Started:** 2026-06-15T09:18:46Z
- **Completed:** 2026-06-15T09:24:59Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- Added Vitest contract files for customer status mapping, PayPal server create/capture behavior, PayPal webhook verification, and VietQR instruction/evidence behavior.
- Added sanitized deterministic PayPal fixture events for completed, declined, merchant mismatch, and amount mismatch cases.
- Added pgTAP contracts for the future payment model, idempotent transition command, exact-once inventory outcomes, RLS, narrow RPCs, and append-only audit semantics.
- Added an executable integration seam that asserts the race and idempotency cases remain represented before later payment implementation.
- Added a Node security harness for no secret leaks, no direct mutation shortcuts, no raw guest/provider payload exposure, and no Phase 5 fulfillment/download scope creep.
- Added skipped Playwright journey contracts for customer order status, admin order queue/detail, and admin VietQR decisions so later plans can make them pass.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define unit and database payment contracts** - `a6e5b3f4` (test)
2. **Task 2: Define concurrency, security and browser journey contracts** - `2057b9d3` (test)

**Plan metadata:** pending in docs commit

## Files Created/Modified

- `tests/unit/payments/status-mapping.test.ts` - Customer status and separated state-family contract for PAY-08, ORD-02, and PAY-07.
- `tests/unit/payments/paypal-client.test.ts` - PayPal server-owned create/capture and idempotency contract.
- `tests/unit/payments/paypal-webhook.test.ts` - Raw webhook verification, reconciliation, duplicate, failure, and late-capture contract.
- `tests/unit/payments/vietqr.test.ts` - Exact VND VietQR instruction and admin evidence contract.
- `tests/fixtures/payments/paypal-events.ts` - Sanitized deterministic PayPal event fixtures and transmission headers.
- `supabase/tests/database/04_payment_model.test.sql` - pgTAP model contract for payments, events, transitions, audit, and reservation outcome columns.
- `supabase/tests/database/04_payment_transitions.test.sql` - pgTAP transition contract for exact-once paid, release/expiry, late capture review, and VietQR admin decisions.
- `supabase/tests/database/04_payment_rls_audit.test.sql` - pgTAP RLS, grants, narrow projection/RPC, and append-only audit contract.
- `tests/integration/payment-concurrency.mjs` - Executable source assertion seam for duplicate, race, late capture, and admin double-submit coverage.
- `tests/security/payment-boundaries.test.mjs` - Static boundary harness for secrets, mutation shortcuts, fulfillment scope, and contract coverage.
- `tests/e2e/order-status.spec.ts` - Skipped Playwright contract for authorized/non-enumerating customer order journeys.
- `tests/e2e/admin-orders.spec.ts` - Skipped Playwright contract for admin queue/detail/timeline journeys.
- `tests/e2e/admin-vietqr.spec.ts` - Skipped Playwright contract for VietQR confirm/reject evidence and stale/duplicate outcomes.

## Decisions Made

- Wave 0 intentionally stops at test contracts. It does not add payment tables, provider routes, order pages, admin screens, inventory finalization logic, entitlement creation, download links, shipment records, or refund initiation.
- `test.todo` and `test.skip` are intentional contract markers for implementation-dependent behavior. Later plans own converting the relevant cases from pending/skipped to passing.
- PayPal fixtures include only sanitized test IDs, placeholder merchant identity, fixture signatures, and exact provider facts needed for deterministic tests.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope changes. All created artifacts are within the plan-declared file set.

## Issues Encountered

- `gsd-tools` was not on PATH in PowerShell, so the executor used the documented direct shim path `C:/Users/HNBV12714/.codex/gsd-core/bin/gsd-tools.cjs` through `node`.
- Project-specific ambertinybear skill references to `docs/ai/...` and related `docs/ambertinybear-*` files were unavailable in this workspace; AGENTS.md and Phase 4 planning artifacts remained the source of truth.

## Verification

- `npx vitest run tests/unit/payments/status-mapping.test.ts tests/unit/payments/paypal-client.test.ts tests/unit/payments/paypal-webhook.test.ts tests/unit/payments/vietqr.test.ts` - passed, 4 files, 6 tests, 23 todo.
- `node --test tests/security/payment-boundaries.test.mjs` - passed, 5 tests.
- `node tests/integration/payment-concurrency.mjs` - passed, payment concurrency contract seams verified.
- `npx playwright test --list tests/e2e/order-status.spec.ts tests/e2e/admin-orders.spec.ts tests/e2e/admin-vietqr.spec.ts` - passed, listed 16 tests in 3 files.
- Final wave gate re-ran all commands above successfully before close-out.

## Known Stubs

- `tests/unit/payments/status-mapping.test.ts`, `tests/unit/payments/paypal-client.test.ts`, `tests/unit/payments/paypal-webhook.test.ts`, and `tests/unit/payments/vietqr.test.ts` contain 23 intentional `test.todo` cases. These are the Wave 0 contract surface for later Phase 4 implementation plans.
- `tests/e2e/order-status.spec.ts`, `tests/e2e/admin-orders.spec.ts`, and `tests/e2e/admin-vietqr.spec.ts` contain 16 intentional `test.skip` journeys because customer/admin payment UI does not exist yet.

## Threat Flags

None. This plan created test and fixture artifacts only; no new production endpoint, schema migration, auth path, file access path, or trust-boundary implementation was introduced.

## User Setup Required

None - no external service configuration required for Wave 0 contracts.

## Next Phase Readiness

Ready for Plan 04-02. Later implementation plans can now add payment schema and state-machine behavior against named contracts instead of discovering high-risk payment scenarios ad hoc.

## Self-Check: PASSED

- Created files exist for all 13 Wave 0 unit, fixture, pgTAP, integration, security, and Playwright contract artifacts.
- Task commits exist: `a6e5b3f4`, `2057b9d3`.
- Fresh final verification passed: Vitest payment contracts, Node security harness, integration seam, and Playwright `--list`.

---
*Phase: 04-trusted-payments-and-orders*
*Completed: 2026-06-15*
