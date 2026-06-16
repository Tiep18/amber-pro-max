---
phase: 04-trusted-payments-and-orders
plan: "05"
subsystem: customer-paypal-order-ui
tags: [payments, paypal, orders, nextjs, i18n, security, vitest]

requires:
  - phase: 04-trusted-payments-and-orders
    provides: Server-owned PayPal create/capture routes, scoped guest order access, order/payment projection helpers, and shared payment status authority from Plans 04-03 and 04-04
provides:
  - Canonical customer payment lifecycle status mapper for awaiting, verifying, paid, terminal unpaid, refund, and review states
  - Authorized localized customer order routes at `/en/orders/[orderNumber]` and `/vi/don-hang/[orderNumber]`
  - Checkout handoff redirect to server-provided localized order paths after HttpOnly guest-cookie exchange
  - Hosted PayPal SDK control that calls only server-owned create/capture routes
  - Bounded verifying-state refresh controls with 5-second cooldown and 30-second visible-tab polling window
affects: [paypal-webhooks, customer-vietqr-ui, admin-orders, fulfillment-gate, order-history]

tech-stack:
  added: []
  patterns:
    - Customer payment pages render server projections only; URL/query/client callbacks cannot set paid state
    - PayPal UI submits only order/provider identifiers to server routes, never browser totals or terminal payment facts
    - Customer payment copy lives in `orders` and `payments` message namespaces

key-files:
  created:
    - src/payments/status.ts
    - src/components/payments/payment-state-panel.tsx
    - src/components/payments/order-payment-page.tsx
    - src/components/payments/paypal-buttons.tsx
    - src/app/[locale]/orders/[orderNumber]/page.tsx
    - src/app/[locale]/don-hang/[orderNumber]/page.tsx
    - tests/unit/payments/paypal-buttons.test.ts
  modified:
    - tests/unit/payments/status-mapping.test.ts
    - src/checkout/actions.ts
    - src/components/checkout/checkout-page.tsx
    - src/i18n/routing.ts
    - src/proxy.ts
    - src/messages/en.json
    - src/messages/vi.json

key-decisions:
  - "PayPal return/callback handling refreshes the server-authoritative order page instead of setting local paid state."
  - "Localized order paths are built by `getOrderPath`, with English under `/orders` and Vietnamese under `/don-hang`."
  - "Verifying status recheck is implemented as bounded server-projection refresh because PayPal capture/recheck authority remains in server routes."

patterns-established:
  - "Future customer payment methods should render from `OrderPaymentPage` projections and status mapping rather than component-local state enums."
  - "Future payment UI tests should include source assertions for server-route use, `aria-busy`, and absence of guest token/localStorage payment state."

requirements-completed: [ORD-01, PAY-01, PAY-02, PAY-08]

duration: 12 min
completed: 2026-06-16
---

# Phase 04 Plan 05: Customer PayPal Order Experience Summary

**Localized server-authorized order status pages with hosted PayPal initiation and bounded verifying refresh behavior**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-16T02:57:40Z
- **Completed:** 2026-06-16T03:09:40Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments

- Added executable status mapping coverage and `src/payments/status.ts` for all customer-visible PAY-08 states, including terminal unpaid, refund visibility, and review-required lock behavior.
- Created `/en/orders/[orderNumber]` and `/vi/don-hang/[orderNumber]` routes that validate locale/physical slug and render one shared server component through authorized order projections.
- Updated checkout handoff to redirect to `orderPath` returned by the Server Action after scoped HttpOnly guest cookie exchange, without exposing raw guest access tokens.
- Added a hosted PayPal SDK component that calls `/api/paypal/orders` and `/api/paypal/orders/[paypalOrderId]/capture`, then refreshes the server order projection rather than claiming paid from client callbacks.
- Added verifying-state recheck controls with a 5-second cooldown and a 30-second visible-tab polling window.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Customer payment status contract** - `8a6a9c82` (test)
2. **Task 1 GREEN: Localized order status routes** - `050010e8` (feat)
3. **Task 2 RED: PayPal button boundary contract** - `db085f79` (test)
4. **Task 2 GREEN: PayPal initiation and verifying controls** - `1f30d9b5` (feat)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `src/payments/status.ts` - Customer lifecycle mapper and presentation keys.
- `src/components/payments/payment-state-panel.tsx` - Server-rendered status panel with localized CTA/recheck slot.
- `src/components/payments/order-payment-page.tsx` - Shared authorized customer order/payment page.
- `src/components/payments/paypal-buttons.tsx` - Client hosted PayPal SDK control and bounded recheck control.
- `src/app/[locale]/orders/[orderNumber]/page.tsx` - English order route.
- `src/app/[locale]/don-hang/[orderNumber]/page.tsx` - Vietnamese order route.
- `src/checkout/actions.ts` - Uses `getOrderPath` for server-provided order handoff paths.
- `src/components/checkout/checkout-page.tsx` - Redirects to the server-provided order path after successful submit.
- `src/i18n/routing.ts` - Adds order path mapping and `getOrderPath`.
- `src/proxy.ts` - Allows localized physical order routes through session/market middleware.
- `src/messages/en.json` and `src/messages/vi.json` - Adds `orders` and `payments.paypal` namespaces.
- `tests/unit/payments/status-mapping.test.ts` - Converts Wave 0 status TODOs into executable tests.
- `tests/unit/payments/paypal-buttons.test.ts` - Adds PayPal client boundary source test.

## Decisions Made

- Kept customer paid state entirely server-authoritative: PayPal SDK callbacks trigger route calls and page refresh only.
- Used localized physical routes instead of a generic `/order` slug so `/vi/don-hang/...` and `/en/orders/...` remain separated.
- Treated PayPal unconfigured state as a non-terminal unavailable control state; real credentials remain Plan 04-10 provider readiness.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added a focused PayPal boundary test not listed in plan files**
- **Found during:** Task 2
- **Issue:** Task 2 was marked `tdd="true"` but only source files were declared.
- **Fix:** Added `tests/unit/payments/paypal-buttons.test.ts` to prove server-route use, `aria-busy`, cooldown/polling constants, and no localStorage or secret env names in the client component.
- **Files modified:** `tests/unit/payments/paypal-buttons.test.ts`
- **Verification:** RED failed for missing component, GREEN passed `npx vitest run tests/unit/payments/paypal-buttons.test.ts tests/unit/payments/status-mapping.test.ts`.
- **Committed in:** `db085f79`, `1f30d9b5`

**2. [Rule 1 - Bug] Cast the Supabase client at the narrow RPC adapter boundary**
- **Found during:** Task 1 GREEN typecheck
- **Issue:** The typed Supabase client generic was narrower than the lightweight `RpcClient` interface used by `getAuthorizedOrderPayment`.
- **Fix:** Cast at the server page boundary, matching existing payment route patterns, without changing runtime behavior.
- **Files modified:** `src/components/payments/order-payment-page.tsx`
- **Verification:** `npm run typecheck` passed.
- **Committed in:** `050010e8`

---

**Total deviations:** 2 auto-fixed (1 missing critical test coverage, 1 typing bug).  
**Impact on plan:** Both fixes were required to keep TDD and type verification meaningful. No new package, schema, fulfillment, refund, or webhook scope was added.

## Issues Encountered

- Project-local `docs/ai/...` files referenced by ambertinybear skills are not present in this workspace, so AGENTS.md and Phase 04 artifacts remained the source of truth.
- Additional unsafe-source assertion initially failed twice because PowerShell mangled nested quote characters passed to `node -e`; the plan's source assertion passed, and the extra guest-token/localStorage/query scan was rerun with native `Select-String`.
- `npm run lint` passed with 9 pre-existing warnings in files outside this plan's touched set, including catalog/checkout/cart/payment query and prior VietQR test files. They were left untouched per scope rules.
- Existing unrelated dirty files remain: `next-env.d.ts` and untracked `.codegraph/`.

## Verification

- `npx vitest run tests/unit/payments/status-mapping.test.ts` - passed, 8 tests.
- `npx vitest run tests/unit/payments/paypal-buttons.test.ts tests/unit/payments/status-mapping.test.ts` - passed, 9 tests.
- Plan source assertion for `/api/paypal/orders`, `aria-busy`, and no PayPal secret env names in `paypal-buttons.tsx` - passed.
- Additional source scan for `guestAccessToken`, `localStorage`, and `searchParams.get` in payment/checkout client surfaces - passed.
- `npm run typecheck` - passed.
- `npm run test:security` - passed, 10 Node security tests.
- `npm run lint` - passed with warnings only.
- `npm run build` - passed; Next.js built both localized order routes and PayPal API routes.

## Known Stubs

None. The PayPal unavailable copy is an intentional configured/unconfigured runtime state until provider readiness in Plan 04-10, not a UI placeholder.

## Threat Flags

None open. The plan-intended PayPal SDK callback and customer route trust boundaries were mitigated with server projections, scoped guest cookie lookup, generic denial, server-owned create/capture route calls, no browser totals, no client-set paid state, and static token/secret scans.

## User Setup Required

None for this plan. PayPal sandbox/live credentials and seller receiver identity remain Plan 04-10 provider readiness work.

## Next Phase Readiness

Ready for Plan 04-06. Webhook verification can rely on customer PayPal UI already treating callback/capture outcomes as verifying until the server projection changes.

## Self-Check: PASSED

- Created files exist: SUMMARY, status mapper, PayPal button, shared order page, English order route, and Vietnamese order route.
- Task commits exist: `8a6a9c82`, `050010e8`, `db085f79`, and `1f30d9b5`.
- Fresh verification passed: focused payment Vitest suites, plan source assertion, token/localStorage scan, typecheck, security suite, lint, and production build.

---
*Phase: 04-trusted-payments-and-orders*
*Completed: 2026-06-16*
