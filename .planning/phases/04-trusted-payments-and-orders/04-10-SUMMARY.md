---
phase: 04-trusted-payments-and-orders
plan: "10"
subsystem: payments
tags: [supabase, postgres, paypal, vietqr, playwright, ci]

requires:
  - phase: 04-trusted-payments-and-orders
    provides: Payment state machine, PayPal/VietQR flows, customer order views, and admin order operations from Plans 04-01 through 04-09
provides:
  - Managed schema deployment evidence through migration 20260616093830
  - Final CI, payment concurrency, security, build, and browser validation evidence
  - Explicit manual provider UAT blockers for PayPal webhook delivery and real VietQR bank evidence
affects: [payments, orders, inventory, admin, validation, production-readiness]

tech-stack:
  added: []
  patterns:
    - Server-only service-role fixture grants are explicit migrations, not ad hoc local DB changes
    - Payment validation evidence records automated gates separately from manual provider readiness

key-files:
  created:
    - supabase/migrations/20260616092625_grant_payment_events_service_role_update.sql
    - supabase/migrations/20260616092934_grant_service_role_payment_concurrency_seed_tables.sql
    - supabase/migrations/20260616093830_grant_service_role_e2e_fixture_tables.sql
    - .planning/phases/04-trusted-payments-and-orders/04-10-SUMMARY.md
  modified:
    - .planning/phases/04-trusted-payments-and-orders/04-VALIDATION.md
    - src/types/supabase.ts
    - tests/integration/payment-concurrency.mjs
    - src/components/site-header.tsx
    - tests/e2e/foundation-ux.spec.ts
    - tests/e2e/localization.spec.ts

key-decisions:
  - "PayPal and VietQR env presence is sufficient for automated validation, but real PayPal HTTPS webhook delivery and seller bank evidence remain manual production-readiness gates."
  - "Local Playwright and payment concurrency fixtures use explicit service-role grants so tests exercise the PostgREST boundary without weakening anon/authenticated access."

patterns-established:
  - "Final validation summaries must distinguish green automated gates from provider UAT that cannot be proven without external sandbox/bank interaction."
  - "Supabase generated types are committed immediately after db:types so CI can use git diff as the drift detector."

requirements-completed:
  - INV-04
  - INV-05
  - ORD-01
  - ORD-02
  - ORD-03
  - PAY-01
  - PAY-02
  - PAY-03
  - PAY-04
  - PAY-05
  - PAY-06
  - PAY-07
  - PAY-08
  - SEC-03

duration: resumed validation
completed: 2026-06-16
---

# Phase 04 Plan 10: Final Payment Validation Summary

**Managed Supabase schema deployment plus green CI, concurrency, security, and browser validation with provider UAT kept explicit**

## Performance

- **Duration:** Resumed validation after env and local DB reset were provided
- **Started:** 2026-06-16T04:36:23Z
- **Completed:** 2026-06-16T09:46:45Z
- **Tasks:** 2/2
- **Files modified:** 9

## Accomplishments

- Pushed all Phase 4 schema migrations to managed Supabase and confirmed local/remote migration alignment through `20260616093830`.
- Restored final validation gates by fixing service-role fixture grants, generated Supabase type drift, VietQR concurrency fixture evidence, and a mobile header overflow regression.
- Ran the full final automated suite: `npm run ci` exited 0, payment concurrency exact-once scenarios passed, and schema drift verification returned false.
- Recorded PayPal/VietQR production-readiness boundaries without printing or storing secret values.

## Task Commits

1. **Task 1: Push schema and verify managed payment environment checkpoints** - `2639082d`, `b2196ae1`
2. **Task 2: Run final automated lifecycle, security and UI verification** - `2639082d`, `b2196ae1`

**Plan metadata:** pending docs commit for this summary and validation record.

## Files Created/Modified

- `supabase/migrations/20260616092625_grant_payment_events_service_role_update.sql` - grants the table-level update privilege required for payment event delivery counters.
- `supabase/migrations/20260616092934_grant_service_role_payment_concurrency_seed_tables.sql` - grants local trusted fixture access needed by payment concurrency tests.
- `supabase/migrations/20260616093830_grant_service_role_e2e_fixture_tables.sql` - grants local trusted fixture access needed by Playwright setup and cleanup.
- `src/types/supabase.ts` - refreshed generated Supabase types after schema reset.
- `tests/integration/payment-concurrency.mjs` - aligns VietQR confirm races with exact order-number bank references.
- `src/components/site-header.tsx` - lets the mobile header wrap controls without horizontal overflow.
- `tests/e2e/foundation-ux.spec.ts` - updates shell assertions for the implemented cart control.
- `tests/e2e/localization.spec.ts` - updates locale assertions for the implemented shop/cart navigation.
- `.planning/phases/04-trusted-payments-and-orders/04-VALIDATION.md` - records final schema, provider, CI, security, concurrency, and browser evidence.

## Decisions Made

- Provider env values are treated as present after local non-empty checks, but production readiness still requires real PayPal sandbox webhook delivery and seller-approved VietQR evidence.
- Service-role privileges required for local integration/E2E setup are represented as migrations so local reset, managed schema, and CI use the same schema history.
- Obsolete Phase 1 E2E assertions that forbade cart/catalog text were updated to validate the Phase 4 commerce navigation instead.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Payment event delivery grant mismatch**
- **Found during:** Task 2 final DB tests
- **Issue:** pgTAP expected service-role table-level `UPDATE` on `payment_events`, while the previous migration only granted column-level update.
- **Fix:** Added `20260616092625_grant_payment_events_service_role_update.sql`.
- **Files modified:** `supabase/migrations/20260616092625_grant_payment_events_service_role_update.sql`
- **Verification:** `npm run db:test`, `npm run ci`
- **Committed in:** `2639082d`

**2. [Rule 3 - Blocking] Local validation fixture grants were incomplete**
- **Found during:** Task 2 payment concurrency and Playwright validation
- **Issue:** Local service-role REST setup could not seed products, inventory, user roles, taxonomy, and admin fixture data.
- **Fix:** Added explicit service-role fixture grants in migrations `20260616092934` and `20260616093830`.
- **Files modified:** `supabase/migrations/20260616092934_grant_service_role_payment_concurrency_seed_tables.sql`, `supabase/migrations/20260616093830_grant_service_role_e2e_fixture_tables.sql`
- **Verification:** focused Playwright rerun, `node tests/integration/payment-concurrency.mjs`, `npm run ci`
- **Committed in:** `2639082d`, `b2196ae1`

**3. [Rule 2 - Missing Critical] VietQR concurrency fixture used invalid bank references**
- **Found during:** Task 2 payment concurrency validation
- **Issue:** Admin VietQR confirm races used arbitrary `BANK-*` references even though the payment transition requires the exact order number as reference.
- **Fix:** Updated the fixture to use `fixture.order.order_number` for valid confirmation paths.
- **Files modified:** `tests/integration/payment-concurrency.mjs`
- **Verification:** `node tests/integration/payment-concurrency.mjs`
- **Committed in:** `2639082d`

**4. [Rule 3 - Blocking] Full E2E exposed stale shell assertions and mobile overflow**
- **Found during:** Task 2 full CI
- **Issue:** Foundation/localization tests still treated cart/catalog text as invalid, and the mobile header overflowed at 320px after commerce controls were added.
- **Fix:** Updated assertions to check current commerce nav and allowed the header controls to wrap on narrow screens.
- **Files modified:** `src/components/site-header.tsx`, `tests/e2e/foundation-ux.spec.ts`, `tests/e2e/localization.spec.ts`
- **Verification:** focused Playwright rerun and `npm run ci`
- **Committed in:** `b2196ae1`

---

**Total deviations:** 4 auto-fixed (1 missing critical, 3 blocking)
**Impact on plan:** All fixes were required to make the final validation gate meaningful. No provider secrets were committed and no public/customer access grants were added.

## Issues Encountered

- The first validation attempt was blocked by an unhealthy local Supabase container and missing local env values. The user reran `npm run db:reset` successfully and filled env locally.
- `npm run ci` initially failed on generated Supabase type drift; committing `src/types/supabase.ts` restored the intended drift check.
- Full Playwright validation revealed Phase 1 assertions that no longer matched the implemented commerce navigation.

## User Setup Required

No new setup file was generated. Before production use, the seller still needs to complete:

- PayPal sandbox create/capture with a public HTTPS webhook endpoint.
- Verification that the configured PayPal webhook ID and expected merchant identity match the seller account.
- VietQR seller bank approval and representative real-bank evidence checks for admin confirm/reject.
- Managed Supabase Cron job availability check in the deployment dashboard.

## Next Phase Readiness

Phase 4 automated validation is ready for phase-level verification. Production payment readiness remains gated on external provider/bank UAT, which is recorded in `04-VALIDATION.md`.

---
*Phase: 04-trusted-payments-and-orders*
*Completed: 2026-06-16*
