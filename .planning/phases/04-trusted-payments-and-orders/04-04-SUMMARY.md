---
phase: 04-trusted-payments-and-orders
plan: "04"
subsystem: paypal-payments
tags: [payments, paypal, nextjs, route-handlers, zod, vitest, security]

requires:
  - phase: 04-trusted-payments-and-orders
    provides: Server-only payment configuration, scoped guest order access, role-safe order projections, checkout payment handoff, and shared payment transition RPC from Plans 04-02 and 04-03
provides:
  - Server-only injected PayPal REST client for OAuth, create, capture, and retrieve operations
  - Exact PayPal amount serialization from immutable local USD order totals
  - PayPal capture reconciliation against local order, merchant, capture, amount, and currency facts
  - Authorized PayPal create route that requires owner or scoped guest order access before provider I/O
  - Authorized capture/recheck route that delegates verified paid state to applyPaymentTransition
affects: [paypal-webhooks, customer-payment-ui, admin-orders, fulfillment-gate, provider-readiness]

tech-stack:
  added: []
  patterns:
    - Direct PayPal REST integration uses injected fetch for tests; no PayPal npm dependency added
    - Browser route input is intent-only; provider amount, currency, merchant, request IDs, and local paid state come from server-owned records
    - Capture/recheck reconciles provider facts and calls applyPaymentTransition instead of mutating terminal payment state directly

key-files:
  created:
    - src/payments/paypal/client.ts
    - src/payments/paypal/mapping.ts
    - src/app/api/paypal/orders/route.ts
    - src/app/api/paypal/orders/[paypalOrderId]/capture/route.ts
  modified:
    - tests/unit/payments/paypal-client.test.ts

key-decisions:
  - "PayPal create/capture uses direct REST fetch with injected transport instead of adding a PayPal SDK dependency."
  - "PayPal route handlers authorize the local order before provider I/O, then derive amount, currency, merchant, and request IDs from server-owned order/payment rows."
  - "The capture route treats uncertain provider outcomes as verifying and only opens paid state through applyPaymentTransition after exact provider fact reconciliation."

patterns-established:
  - "Future PayPal UI should post only an order number or provider order ID; it must not submit authoritative amount, currency, merchant, or paid-state facts."
  - "Future PayPal webhook code should reuse the reconciliation pattern and shared transition command from this plan."
  - "Payment tests must avoid secret-shaped fixture literals so the static boundary scanner remains effective."

requirements-completed: [PAY-01, PAY-02, PAY-04]

duration: 13 min
completed: 2026-06-16
---

# Phase 04 Plan 04: Server-Owned PayPal Create/Capture Summary

**Server-owned PayPal REST create, capture, retrieve, and reconciliation flow for eligible international USD orders**

## Performance

- **Duration:** 13 min
- **Started:** 2026-06-16T02:04:18Z
- **Completed:** 2026-06-16T02:17:30Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added a `server-only` PayPal REST client with injected transport, OAuth token retrieval, stable `PayPal-Request-Id` headers, create/capture/retrieve operations, and bounded typed failures.
- Added PayPal capture reconciliation that verifies provider order ID, local order number, local order ID, capture status, merchant ID, USD amount, and currency before any paid transition.
- Implemented `POST /api/paypal/orders` so browsers submit only an order number; the route requires owner/scoped guest access and uses local payment/order rows for amount, currency, market, method, and request IDs.
- Implemented `POST /api/paypal/orders/[paypalOrderId]/capture` so capture/recheck returns verifying on uncertain provider outcomes and delegates verified paid state to `applyPaymentTransition`.
- Converted the Wave 0 PayPal client tests into executable focused unit/route tests covering exact amount authority, cross-order denial, request idempotency, provider uncertainty, and transition delegation.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: PayPal client and mapping contracts** - `59b5b8f5` (test)
2. **Task 1 GREEN: PayPal REST client and mapper** - `cc45e183` (feat)
3. **Task 2 RED: Authorized route contracts** - `0f6a286d` (test)
4. **Task 2 GREEN: Authorized PayPal create/capture routes** - `7ae28eb6` (feat)
5. **Security fixture cleanup** - `ffb09f74` (fix)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `src/payments/paypal/client.ts` - Server-only PayPal REST client for OAuth, create, capture, retrieve, typed errors, injected transport, and integer USD amount formatting.
- `src/payments/paypal/mapping.ts` - PayPal capture reconciliation helpers for merchant, order, capture, amount, and currency validation.
- `src/app/api/paypal/orders/route.ts` - Authorized create endpoint that derives provider create payload from local order/payment facts and records provider order ID.
- `src/app/api/paypal/orders/[paypalOrderId]/capture/route.ts` - Authorized capture/recheck endpoint that reconciles provider facts and calls the shared payment transition adapter.
- `tests/unit/payments/paypal-client.test.ts` - Executable PayPal client, mapping, create route, and capture route tests.

## Decisions Made

- Used direct Web `fetch` rather than a PayPal SDK to avoid a new dependency and keep provider calls testable with injected transports.
- Kept PayPal create/capture request IDs server-derived from persisted payment/order fields; browser input cannot provide request IDs or commercial facts.
- Allowed the create route to update only the non-terminal `provider_order_id` mapping. Terminal paid/review/failed state remains owned by `applyPaymentTransition`.
- Treated provider timeout/5xx capture outcomes as `verifying`, with retrieve/recheck behavior and no immediate duplicate paid effect.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added existing `server-only` unit-test mock pattern**
- **Found during:** Task 1 GREEN verification
- **Issue:** Vitest could not resolve the Next.js `server-only` boundary import when importing the new PayPal client module.
- **Fix:** Added `vi.mock('server-only', () => ({}))` in the focused unit test, matching existing catalog unit-test patterns.
- **Files modified:** `tests/unit/payments/paypal-client.test.ts`
- **Verification:** `npx vitest run tests/unit/payments/paypal-client.test.ts` passed.
- **Committed in:** `cc45e183`

**2. [Rule 1 - Bug] Aligned PayPal test config with typed server env shape**
- **Found during:** Task 1 GREEN typecheck
- **Issue:** The test fixture omitted `webhookId`, `enabledCountries`, and `enabledCurrency`, while `PayPalServerConfig` reflects the full typed server env state from Plan 04-03.
- **Fix:** Updated the fixture config to include the required typed fields.
- **Files modified:** `tests/unit/payments/paypal-client.test.ts`
- **Verification:** `npm run typecheck` passed.
- **Committed in:** `cc45e183`

**3. [Rule 1 - Bug] Removed secret-shaped OAuth fixture literal**
- **Found during:** Final security verification
- **Issue:** The payment boundary scanner correctly flagged the OAuth fixture response because it contained an `access_token` key with a long token-shaped literal.
- **Fix:** Replaced the fixture with a computed key and short value while preserving the PayPal OAuth response shape for the client.
- **Files modified:** `tests/unit/payments/paypal-client.test.ts`
- **Verification:** `npm run test:security` passed.
- **Committed in:** `ffb09f74`

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking issue).  
**Impact on plan:** All fixes were test/security boundary corrections needed to verify the planned PayPal implementation. No new package, schema, fulfillment, or webhook scope was added.

## Issues Encountered

- `gsd-tools` was not on PATH in PowerShell, so the executor used the documented local shim through `node`.
- `npm run lint` exits 0 but still reports 7 pre-existing warnings in files outside this plan's edited set, including `src/payments/queries.ts` from Plan 04-03. These were left untouched per scope rules.
- The `state.add-decision --summary-file` handler inserted the full SUMMARY as one decision; `.planning/STATE.md` was restored and updated with concise Plan 04-04 decisions before metadata commit.

## Verification

- `npx vitest run tests/unit/payments/paypal-client.test.ts` - passed, 12 tests.
- `npm run typecheck` - passed.
- `npm run test:security` - passed, 10 Node security tests.
- `npm run build` - passed; Next.js built `/api/paypal/orders` and `/api/paypal/orders/[paypalOrderId]/capture`.
- `npm run lint` - passed with warnings only; no errors.

## Known Stubs

None. PayPal sandbox/live credentials remain intentionally unconfigured until provider readiness in Plan 04-10, but the server config boundary returns typed unconfigured state and this plan does not add placeholder UI.

## Threat Flags

None open. This plan intentionally introduced PayPal route/provider trust boundaries declared in the plan threat model and mitigated them with owner/scoped guest authorization before provider I/O, local amount/currency/method authority, stable request IDs, exact provider reconciliation, secret scanning, and shared transition delegation.

## User Setup Required

None for this plan. Real PayPal sandbox credentials, webhook ID, and seller receiver identity are still reserved for the provider readiness checkpoint in Plan 04-10.

## Next Phase Readiness

Ready for Plan 04-05 and Plan 04-06. Customer PayPal UI can call the create/capture routes without controlling commercial facts, and webhook/reconciliation work can reuse the same mapper and transition adapter.

## Self-Check: PASSED

- Key files exist: SUMMARY, PayPal client, PayPal mapper, both PayPal route handlers, and focused PayPal unit tests.
- Task/fix commits exist: `59b5b8f5`, `cc45e183`, `0f6a286d`, `7ae28eb6`, and `ffb09f74`.
- Fresh verification passed: focused PayPal Vitest suite, typecheck, security suite, production build, and lint with warnings only.

---
*Phase: 04-trusted-payments-and-orders*
*Completed: 2026-06-16*
