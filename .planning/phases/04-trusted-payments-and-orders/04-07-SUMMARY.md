---
phase: 04-trusted-payments-and-orders
plan: "07"
subsystem: vietqr-payments
tags: [payments, vietqr, admin-actions, zod, supabase, audit, security]

requires:
  - phase: 04-trusted-payments-and-orders
    provides: Server-only payment config, scoped guest order access, admin projections, and shared apply_payment_transition authority from Plans 04-02 and 04-03
provides:
  - Exact VietQR Quick Link instruction snapshots for eligible VN/VND/VietQR orders
  - Idempotent VietQR instruction recording through the shared payment transition ledger
  - Evidence schemas and exact bank reference, amount, and received-time comparison helpers
  - Authorized confirm/reject Server Actions that call applyPaymentTransition instead of direct state updates
  - Admin order projection fields for VietQR evidence and action availability
affects: [customer-vietqr-ui, admin-orders, payment-transition-rpc, fulfillment-gate, audit]

tech-stack:
  added: []
  patterns:
    - VietQR instructions are server-owned snapshots built from typed seller bank config and immutable order facts
    - VietQR admin decisions validate exact evidence before delegating to applyPaymentTransition
    - Admin payment actions require application authorization before parsing untrusted form input or creating clients

key-files:
  created:
    - src/payments/vietqr/instructions.ts
    - src/payments/vietqr/evidence.ts
    - src/payments/admin-actions.ts
  modified:
    - tests/unit/payments/vietqr.test.ts
    - src/payments/queries.ts
    - src/payments/schemas.ts
    - supabase/migrations/20260615034000_trusted_payments_orders.sql

key-decisions:
  - "VietQR customer instructions are generated only for vn+VND+vietqr_intent orders with positive integer amounts, ASCII order-number references, and active payment windows."
  - "Instruction snapshots use transition source vietqr_instruction with target pending so they can be audited without opening the paid gate or changing inventory."
  - "Admin confirm/reject actions never update payment, order, reservation, or inventory rows directly; they validate evidence then call applyPaymentTransition."
  - "DB-side transition validation now rejects VietQR admin paid transitions unless bank reference, received amount, and received time match expected payment facts."

patterns-established:
  - "Future VietQR UI should call getVietQrInstructions and display masked account data plus QR URL; it must not allow customer self-confirmation."
  - "Future admin VietQR UI should post only bounded evidence/rejection fields to confirmVietQrPaymentAction or rejectVietQrPaymentAction."
  - "VietQR evidence is stored as sanitized structured facts, with private receipt paths only and no public receipt URLs."

requirements-completed: [PAY-05, PAY-06, PAY-07, SEC-03]

duration: 11 min
completed: 2026-06-16
---

# Phase 04 Plan 07: VietQR Instructions and Admin Evidence Summary

**Exact VietQR bank-transfer instructions plus authorized evidence-based admin confirm/reject actions through the shared payment transition command**

## Performance

- **Duration:** 11 min
- **Started:** 2026-06-16T02:41:14Z
- **Completed:** 2026-06-16T02:51:45Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added `getVietQrInstructions()` for eligible Vietnam VND VietQR orders, including Quick Link URL generation, exact amount/reference/deadline, masked account projection, and typed unconfigured behavior.
- Added instruction snapshot recording through `applyPaymentTransition` using `vietqr_instruction` + `pending`, so instruction creation is auditable without paid-state mutation.
- Added evidence validation helpers for exact bank reference, integer received amount, ISO received time, idempotency key, bounded notes, and private receipt paths.
- Added `confirmVietQrPaymentAction()` and `rejectVietQrPaymentAction()` with `requireAdmin()` before parsing/client creation, stale/duplicate handling, and shared transition delegation.
- Extended admin order projection data with VietQR expected reference, expected amount, payment deadline, action availability, and evidence placeholder for later UI display.
- Aligned the SQL transition contract so runtime accepts VietQR instruction snapshots and DB-side confirm validation rejects reference/amount/time mismatches.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: VietQR instruction snapshot tests** - `9a7737aa` (test)
2. **Task 1 GREEN: VietQR instruction snapshots** - `57022212` (feat)
3. **Task 2 RED: VietQR admin evidence tests** - `6b30a3b9` (test)
4. **Task 2 GREEN: VietQR admin evidence actions** - `19c4e95e` (feat)
5. **SQL contract fix for runtime transition alignment** - `a7b8f3d6` (fix)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `tests/unit/payments/vietqr.test.ts` - Converts Wave 0 VietQR todos into executable instruction, evidence, admin-action, stale, duplicate, and non-admin tests.
- `src/payments/vietqr/instructions.ts` - Server-only Quick Link instruction adapter with eligibility checks, masked projection, and transition snapshot recording.
- `src/payments/vietqr/evidence.ts` - Zod evidence/rejection schemas, exact comparison helpers, and confirm/reject transition builders.
- `src/payments/admin-actions.ts` - Authorized VietQR confirm/reject Server Actions that delegate to `applyPaymentTransition`.
- `src/payments/queries.ts` - Adds VietQR evidence/action availability to admin order detail projection.
- `src/payments/schemas.ts` - Adds `vietqr_instruction` source and `pending` target so instruction snapshots pass adapter validation.
- `supabase/migrations/20260615034000_trusted_payments_orders.sql` - Allows pending VietQR instruction transitions and adds DB-side exact evidence validation for admin paid transitions.

## Decisions Made

- Used the official VietQR Quick Link URL shape with existing Web APIs and no new package dependency.
- Kept account number masking in the returned projection while the generated QR image URL contains the configured receiving account data needed by the VietQR service.
- Treated existing instruction snapshots as idempotent: callers can pass a prior snapshot and avoid repeated transition writes.
- Mapped admin duplicates to `duplicate`, stale terminal actions to `stale`, and exact successful confirmation/rejection to `confirmed` or `rejected` without exposing raw SQL/provider errors.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Aligned runtime transition contract for VietQR instruction snapshots**
- **Found during:** Task 1 GREEN
- **Issue:** The plan required instruction snapshots to persist through source `vietqr_instruction` without paid mutation, but the existing transition schema/RPC only accepted terminal targets and did not know that source.
- **Fix:** Added `vietqr_instruction` and `pending` to the TypeScript transition schema, then aligned the SQL RPC to accept only `vietqr_instruction` + `pending` for instruction recording.
- **Files modified:** `src/payments/schemas.ts`, `supabase/migrations/20260615034000_trusted_payments_orders.sql`
- **Verification:** `npx vitest run tests/unit/payments/vietqr.test.ts`, `npm run typecheck`, `npm run test:security`, and source assertion for `vietqr_instruction` passed.
- **Committed in:** `57022212`, `a7b8f3d6`

**2. [Rule 2 - Missing Critical] Added DB-side exact VietQR evidence checks**
- **Found during:** Task 2 GREEN
- **Issue:** App helpers validated exact bank reference, amount, and received time, but the shared DB transition command did not independently reject mismatched VietQR admin paid evidence.
- **Fix:** Updated `apply_payment_transition` to reject `vietqr_admin` paid transitions unless `bankReference` equals the order number, `receivedAmountMinor` equals payment amount, and `receivedAt` is present.
- **Files modified:** `supabase/migrations/20260615034000_trusted_payments_orders.sql`
- **Verification:** Static source assertion confirmed the DB checks; focused Vitest, typecheck, and security suite passed. Local pgTAP execution was blocked by local Supabase Postgres being unavailable.
- **Committed in:** `a7b8f3d6`

**3. [Rule 1 - Bug] Corrected typed RPC fixture arity in VietQR unit tests**
- **Found during:** Task 2 verification
- **Issue:** Typecheck failed because the test fixture RPC mock was inferred as a zero-argument function while the admin action mock called it with RPC name and payload.
- **Fix:** Annotated the fixture RPC arguments so tests model the real `apply_payment_transition` call shape.
- **Files modified:** `tests/unit/payments/vietqr.test.ts`
- **Verification:** `npm run typecheck` and focused VietQR Vitest passed.
- **Committed in:** `19c4e95e`

---

**Total deviations:** 3 auto-fixed (2 missing critical, 1 bug).  
**Impact on plan:** The deviations closed correctness/security gaps required by the plan. No new package, UI, fulfillment, refund, or automatic bank reconciliation scope was added.

## Issues Encountered

- `npm run db:test` could not run because local Supabase Postgres was not listening on `127.0.0.1:55432`. This matches the local Supabase health issue already recorded in Plan 04-03. No destructive Docker or database reset was performed.
- The repository still has unrelated dirty `next-env.d.ts` and untracked `.codegraph/`; they were not staged or modified by this plan.

## Verification

- `npx vitest run tests/unit/payments/vietqr.test.ts` - passed, 8 tests.
- `npm run typecheck` - passed.
- `npm run test:security` - passed, 10 Node security tests.
- `rg -n "vietqr_instruction|invalid_vietqr_evidence|vietqr_instruction_recorded" supabase/migrations/20260615034000_trusted_payments_orders.sql src/payments/schemas.ts src/payments/vietqr/instructions.ts` - passed, confirming source/schema/RPC alignment.
- `npm run db:test` - attempted but blocked by local Supabase Postgres connection refusal on `127.0.0.1:55432`.

## Known Stubs

None. Empty/default values found during scanning were type fallbacks, Zod schemas, or test fixture defaults rather than UI-rendered stubs or placeholder production behavior.

## Threat Flags

None open. The plan-intended server config -> customer instruction and admin browser -> Server Action trust boundaries were introduced with typed server config, masked projection, evidence schemas, `requireAdmin`, shared transition delegation, idempotency keys, sanitized facts, and DB-side evidence checks.

## User Setup Required

None for this plan. Real seller-approved VietQR bank values remain controlled by existing server-only env configuration and later readiness work.

## Next Phase Readiness

Ready for Plan 04-08 customer VietQR instruction/status UI and Plan 04-09 admin order/VietQR decision UI. Those plans can use the backend adapter/actions without adding customer self-confirmation or direct terminal state mutations.

## Self-Check: PASSED

- Key files exist: VietQR instruction adapter, evidence helper, admin actions, updated query projection, transition schema, migration, and focused VietQR tests.
- Task/fix commits exist: `9a7737aa`, `57022212`, `6b30a3b9`, `19c4e95e`, and `a7b8f3d6`.
- Fresh verification passed for the plan command, typecheck, security suite, and source assertions. DB test remains environment-blocked as noted above.

---
*Phase: 04-trusted-payments-and-orders*
*Completed: 2026-06-16*
