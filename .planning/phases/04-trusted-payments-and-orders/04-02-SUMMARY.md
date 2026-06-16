---
phase: 04-trusted-payments-and-orders
plan: "02"
subsystem: payments-database
tags: [payments, postgres, supabase, rls, inventory, audit, concurrency, zod]

requires:
  - phase: 03-mixed-cart-and-checkout
    provides: Pending-payment checkout orders, immutable order lines, active inventory reservations, and exception-aware submit_checkout
  - phase: 04-trusted-payments-and-orders
    provides: Wave 0 payment unit, pgTAP, security, integration, and browser contracts from Plan 04-01
provides:
  - Additive trusted payments migration with payment records, event inbox, transition ledger, audit trail, state projections, RLS, grants, and expiry command
  - Idempotent apply_payment_transition RPC for provider, admin, cron, and system payment state changes
  - Exact-once inventory finalization and terminal release/expiry behavior tied to payment transitions
  - Typed Zod schemas, transition types, and applyPaymentTransition adapter
  - Real local Supabase concurrency script for paid/paid, expiry/paid, confirm/confirm, and confirm/reject races
  - Remote Supabase schema bootstrap and migration alignment for project kpnazmkprosboeiuhgea
affects: [paypal-integration, vietqr-admin-confirmation, order-status-pages, admin-orders, digital-fulfillment, physical-fulfillment]

tech-stack:
  added: []
  patterns:
    - One database command owns payment, order gate, inventory outcome, and audit writes
    - Payment and audit facts store sanitized structured fields and digests, not raw provider bodies or secrets
    - Race verification uses local Supabase REST/RPC calls with the test service role key to avoid Node 20 realtime transport requirements

key-files:
  created:
    - supabase/migrations/20260615034000_trusted_payments_orders.sql
    - src/payments/types.ts
    - src/payments/schemas.ts
    - src/payments/transitions.ts
  modified:
    - supabase/tests/database/04_payment_transitions.test.sql
    - supabase/tests/database/04_payment_rls_audit.test.sql
    - tests/integration/payment-concurrency.mjs
    - src/types/supabase.ts

key-decisions:
  - "Payment state authority lives in public.apply_payment_transition(jsonb), which updates payment/order gate, reservation outcome, inventory, transition ledger, and audit rows in one transaction."
  - "Remote project kpnazmkprosboeiuhgea was approved for full migration-history bootstrap because dry-run showed no prior remote migration history."
  - "Task 3 is represented by an empty outcome commit because it changed only remote Supabase state; supabase/.temp link artifacts were intentionally not committed."

patterns-established:
  - "Future PayPal webhook, PayPal recheck, VietQR admin confirmation, and expiry paths must call applyPaymentTransition instead of updating terminal payment/order tables directly."
  - "Late completed money after terminal release becomes review_required with late_payment_detected and keeps fulfillment locked."
  - "Payment concurrency verification should assert business effects, not just SQL source strings."

requirements-completed: [INV-04, INV-05, ORD-02, PAY-04, PAY-07, SEC-03]

duration: 2 days elapsed across checkpoint
completed: 2026-06-16
---

# Phase 04 Plan 02: Trusted Payment Authority Summary

**Transactional payment/order state authority with exact-once inventory outcomes, append-only audit, typed transition adapter, race verification, and remote Supabase schema alignment**

## Performance

- **Duration:** 2 days elapsed across checkpoint
- **Started:** 2026-06-15
- **Completed:** 2026-06-16T08:39:28+07:00
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Added the trusted payment schema: `payments`, `payment_events`, `payment_transitions`, `commerce_audit_events`, order/payment/gate/fulfillment state fields, refund visibility fields, RLS, grants, projections, and audit triggers.
- Implemented `public.apply_payment_transition(jsonb)` with fixed search path, deterministic locks, provider/admin/cron sources, duplicate/stale/review outcomes, exact-once inventory finalization/release/expiry, and append-only audit rows.
- Implemented `public.expire_due_payments(integer)` and optional `pg_cron` scheduling when the extension exists, while keeping each transition deadline-aware so cron is not correctness-critical.
- Added typed payment transition schemas, discriminated types, and `applyPaymentTransition` as the application RPC adapter.
- Replaced the Wave 0 concurrency seam with a real local Supabase race script that proves one business effect for paid/paid, expiry/paid, confirm/confirm, and confirm/reject cases.
- Linked Supabase project `kpnazmkprosboeiuhgea`, applied the full local migration history after explicit approval, and confirmed local/remote migration alignment.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Tighten payment transition expiry contract** - `05a60fed` (test)
2. **Task 1 GREEN: Implement payment state authority** - `806f5f6d` (feat)
3. **Task 2 RED: Add failing payment concurrency races** - `81919915` (test)
4. **Task 2 GREEN: Add payment transition adapter and races** - `2dd0a36a` (feat)
5. **Task 3: Validate remote payment schema push** - `fd82bcf4` (chore, empty outcome commit)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `supabase/migrations/20260615034000_trusted_payments_orders.sql` - Payment model, transition RPC, expiry RPC, audit, views, triggers, grants, and RLS.
- `supabase/tests/database/04_payment_model.test.sql` - Existing Wave 0 model contract now targets implemented artifacts.
- `supabase/tests/database/04_payment_transitions.test.sql` - Transition contract aligned to `expire_due_payments` and exact assertion count.
- `supabase/tests/database/04_payment_rls_audit.test.sql` - RLS/audit contract assertion count fixed after implemented artifacts were exercised.
- `src/payments/types.ts` - Payment, provider fact, VietQR evidence, status-family, and transition types.
- `src/payments/schemas.ts` - Zod schemas for transition inputs, sanitized facts, lifecycle states, and bounded RPC results.
- `src/payments/transitions.ts` - `applyPaymentTransition(input, client)` RPC adapter.
- `tests/integration/payment-concurrency.mjs` - Real Supabase race scenarios against the shared transition command.
- `src/types/supabase.ts` - Regenerated Supabase database and RPC types.

## Decisions Made

- Kept one order aggregate by extending `checkout_orders`, `checkout_order_lines`, and `checkout_inventory_reservations` instead of creating a second order model.
- Used `service_role` execute access for the transition and expiry RPCs; anonymous/authenticated users cannot execute arbitrary payment transitions.
- Used security-invoker views plus narrow status/timeline RPCs for future customer/admin reads.
- Recorded Task 3 with an empty commit because the verified outcome was remote schema state, not local file content.
- Bootstrapped all migrations to remote project `kpnazmkprosboeiuhgea` only after user approval, because dry-run showed the remote had no migration history.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Aligned expiry RPC contract name**
- **Found during:** Task 1 RED
- **Issue:** Wave 0 transition contract expected `expire_due_payment_orders`, while the plan and key links required `expire_due_payments`.
- **Fix:** Updated the pgTAP contract to target `expire_due_payments`.
- **Files modified:** `supabase/tests/database/04_payment_transitions.test.sql`
- **Verification:** RED failed for missing implementation, then GREEN passed `npm run db:test`.
- **Committed in:** `05a60fed`, `806f5f6d`

**2. [Rule 1 - Bug] Tightened service-role grants and pgTAP counts**
- **Found during:** Task 1 GREEN verification
- **Issue:** `service_role` retained broad default table privileges on event/audit tables, and two pgTAP plan counts no longer matched real assertions.
- **Fix:** Revoked all service-role table privileges before granting narrow privileges; corrected pgTAP assertion counts.
- **Files modified:** `supabase/migrations/20260615034000_trusted_payments_orders.sql`, `supabase/tests/database/04_payment_rls_audit.test.sql`, `supabase/tests/database/04_payment_transitions.test.sql`
- **Verification:** `npm run db:reset` and `npm run db:test` passed.
- **Committed in:** `806f5f6d`

**3. [Rule 1 - Bug] Removed PL/pgSQL variable shadowing**
- **Found during:** Task 1/2 verification
- **Issue:** `transition_key`, `provider_event_id`, `order_number`, and `review_reason` variables shadowed column names under real RPC execution.
- **Fix:** Renamed payload variables and qualified column references.
- **Files modified:** `supabase/migrations/20260615034000_trusted_payments_orders.sql`
- **Verification:** `npm run db:test` and `node tests/integration/payment-concurrency.mjs` passed.
- **Committed in:** `806f5f6d`, `2dd0a36a`

**4. [Rule 3 - Blocking] Reworked concurrency script for Node 20**
- **Found during:** Task 2 GREEN verification
- **Issue:** `@supabase/supabase-js` tried to initialize realtime and required a WebSocket transport on Node 20; adding `ws` was out of scope and package installs are not auto-fixable.
- **Fix:** Used REST/RPC `fetch` with the existing local test service-role key and retained source assertions that the TypeScript adapter calls the shared RPC.
- **Files modified:** `tests/integration/payment-concurrency.mjs`
- **Verification:** `node tests/integration/payment-concurrency.mjs` passed.
- **Committed in:** `2dd0a36a`

**5. [Rule 1 - Bug] Preserved append-only audit during race cleanup**
- **Found during:** Task 2 GREEN verification
- **Issue:** Test cleanup attempted to delete checkout orders, which would cascade into append-only audit rows and correctly failed.
- **Fix:** Removed destructive cleanup; seeded rows use unique order numbers and remain valid audit evidence.
- **Files modified:** `tests/integration/payment-concurrency.mjs`
- **Verification:** `node tests/integration/payment-concurrency.mjs` passed.
- **Committed in:** `2dd0a36a`

---

**Total deviations:** 5 auto-fixed (4 bugs, 1 blocking issue).  
**Impact on plan:** All fixes tightened correctness/security or made the required verification executable without adding external packages or Phase 5 fulfillment scope.

## Issues Encountered

- `supabase migration new trusted_payments_orders` generated `20260615093058_trusted_payments_orders.sql`, but the plan and downstream assertions targeted `20260615034000_trusted_payments_orders.sql`. The generated empty file was removed and the plan-declared migration path was used.
- Initial `supabase db push --dry-run` showed every local migration pending remotely. The user explicitly approved full remote bootstrap before `supabase db push --yes` ran.
- Supabase CLI reported a newer CLI version is available, but the installed CLI successfully reset, linted, tested, generated types, linked, pushed, and listed migrations.

## Verification

- `node -e "...apply_payment_transition...expire_due_payments..."` - passed.
- `npm run db:reset` - passed.
- `npm run db:lint` - passed with no schema errors.
- `npm run db:test` - passed, 281 pgTAP tests.
- `node tests/integration/payment-concurrency.mjs` - passed.
- `npm run db:types` - passed.
- `npm run typecheck` - passed.
- `supabase link --project-ref kpnazmkprosboeiuhgea` - passed.
- `supabase db push --dry-run` - passed, showing full migration history pending.
- `supabase db push --yes` - passed after user approved full remote bootstrap.
- `supabase migration list` - passed, all 10 local migrations aligned with remote.

## Known Stubs

None. This plan intentionally models refund visibility and paid eligibility only; refund initiation, digital entitlements, email, and shipment artifacts remain later-phase work by plan scope.

## Threat Flags

None open. This plan intentionally introduced the provider/admin/cron transition trust boundary and mitigated it with input validation, restricted grants, RLS, deterministic locks, unique event/transition keys, append-only audit, and sanitized facts.

## User Setup Required

None for this plan. Provider credentials and seller-approved PayPal/VietQR production values remain later provider/UI readiness tasks.

## Next Phase Readiness

Ready for Plan 04-03. The local and remote schemas now contain the payment authority that later PayPal, VietQR, customer status, and admin order views must call rather than reimplementing terminal payment mutations.

## Self-Check: PASSED

- Key files exist: migration, payment types/schemas/adapter, concurrency script, and generated Supabase types.
- Task commits exist: `05a60fed`, `806f5f6d`, `81919915`, `2dd0a36a`, `fd82bcf4`.
- Fresh verification passed locally and remotely: database reset/lint/tests, concurrency, type generation, typecheck, remote push, and migration alignment.

---
*Phase: 04-trusted-payments-and-orders*
*Completed: 2026-06-16*
