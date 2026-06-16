---
phase: 04-trusted-payments-and-orders
plan: "08"
subsystem: customer-vietqr-order-ui
tags: [payments, vietqr, orders, nextjs, i18n, accessibility, playwright]

requires:
  - phase: 04-trusted-payments-and-orders
    provides: Customer PayPal/order status shell from Plan 04-05 and server-owned VietQR instruction/evidence adapters from Plan 04-07
provides:
  - Customer VietQR instruction card with exact server-projected amount, transfer reference, QR image, masked account display, deadline, copy controls, and fulfillment lock copy
  - Method-specific localized customer copy for VietQR awaiting, admin review, rejected, expired, review-required, and paid-gate states
  - Customer order projection fields needed for server-side VietQR status interpretation without exposing internal payment UUIDs
  - Playwright journey contracts for Vietnamese and English VietQR order pages, 375px mobile, 1280px desktop, and admin VietQR decision flows
affects: [customer-order-status, admin-vietqr-ui, payment-projection, phase-04-verification, fulfillment-gate]

tech-stack:
  added: []
  patterns:
    - Customer VietQR UI renders only server projection props and has no self-confirmation or paid mutation affordance
    - Customer payment status headers use icon plus text so state is not communicated by color alone
    - Browser journey specs remain skipped with explicit seeded-helper reasons until Plan 04-10 full execution

key-files:
  created:
    - src/components/payments/vietqr-instructions.tsx
  modified:
    - src/components/payments/payment-state-panel.tsx
    - src/components/payments/order-payment-page.tsx
    - src/payments/queries.ts
    - src/messages/en.json
    - src/messages/vi.json
    - supabase/migrations/20260615034000_trusted_payments_orders.sql
    - tests/e2e/order-status.spec.ts
    - tests/e2e/admin-vietqr.spec.ts

key-decisions:
  - "Customer VietQR instructions are rendered from server-created instruction data and expose no customer confirmation action."
  - "The customer status RPC returns provider/payment facts needed for status interpretation, but not internal order/payment UUIDs."
  - "Plan 04-08 keeps Playwright journeys listed but skipped until Plan 04-10 provides seeded payment fixtures and browser auth helpers."

patterns-established:
  - "VietQR customer UI should treat order number as the public transfer reference and keep server-owned payment status as the only source of paid/locked state."
  - "Future order-status browser tests should include both localized physical routes and mobile no-overflow checks before they become executable."

requirements-completed: [ORD-01, PAY-05, PAY-06, PAY-07, PAY-08]

duration: 12 min
completed: 2026-06-16
---

# Phase 04 Plan 08: Customer VietQR Status Journey Summary

**Server-projected VietQR instructions with localized customer status copy, locked fulfillment messaging, and responsive browser journey contracts**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-16T04:10:16Z
- **Completed:** 2026-06-16T04:22:30Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Added `VietQrInstructions`, a customer-facing instruction card that displays exact formatted VND amount, QR image, masked account number, immutable transfer reference, deadline, and copy controls with 44px minimum interactive targets.
- Integrated VietQR instructions into the shared localized order page only for server-projected VND/VietQR awaiting-payment orders; no customer self-confirmation or paid-state mutation is rendered.
- Added icon-plus-text status presentation to `PaymentStatePanel` so payment state is not color-only.
- Added English and Vietnamese VietQR-specific awaiting/review/rejected/expired copy that keeps the fulfillment gate closed until server-paid status.
- Extended customer payment projection with non-sensitive provider, market, payment intent, and payment status facts needed for server-side VietQR rendering.
- Expanded Playwright order/admin specs to list localized VietQR customer journeys, terminal/review states, mobile 375px checks, desktop 1280px checks, and admin evidence paths while explicitly skipping full execution pending Plan 04-10 fixtures.

## Task Commits

Each task was committed atomically:

1. **Task 1: Render exact VietQR instructions and customer status copy** - `d7925225` (feat)
2. **Task 2: Cover customer VietQR and responsive order journeys** - `2140809e` (test)
3. **Security projection fix** - `58467cec` (fix)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `src/components/payments/vietqr-instructions.tsx` - Customer instruction card with exact amount/reference/deadline display, QR image, masked account details, copy buttons, and lock copy.
- `src/components/payments/payment-state-panel.tsx` - Adds Lucide status icons to every customer payment state.
- `src/components/payments/order-payment-page.tsx` - Calls the VietQR instruction adapter server-side and renders the instruction card for eligible VND/VietQR pending orders.
- `src/payments/queries.ts` - Adds non-sensitive customer projection facts for provider/method/status interpretation.
- `supabase/migrations/20260615034000_trusted_payments_orders.sql` - Adds payment intent/provider/payment status to the authorized customer status projection without returning internal UUIDs.
- `src/messages/en.json` and `src/messages/vi.json` - Adds VietQR instruction labels and payment-state copy.
- `tests/e2e/order-status.spec.ts` - Adds customer VietQR localized route, status, copy, and responsive journey contracts.
- `tests/e2e/admin-vietqr.spec.ts` - Adds admin VietQR evidence and responsive journey contracts.

## Decisions Made

- Used the existing Plan 04-07 `getVietQrInstructions` adapter for customer rendering instead of duplicating Quick Link logic in UI code.
- Used the public order number as the render-only instruction identifier in the customer page, avoiding exposure of internal order/payment UUIDs through the customer status RPC.
- Kept browser journeys skipped with explicit fixture-helper reasons, matching the plan boundary that full browser execution belongs to Plan 04-10.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Extended the customer payment projection for server-side VietQR rendering**
- **Found during:** Task 1
- **Issue:** The declared UI files could not safely decide whether an order was VietQR/VND or call the server instruction adapter from amount/deadline alone.
- **Fix:** Added provider, market, payment intent, and payment status to the authorized customer projection and parser.
- **Files modified:** `src/payments/queries.ts`, `supabase/migrations/20260615034000_trusted_payments_orders.sql`
- **Verification:** Focused payment Vitest, typecheck, security suite, build, and source assertion passed.
- **Committed in:** `d7925225`

**2. [Rule 2 - Information Disclosure] Removed internal payment identifiers from the customer status RPC**
- **Found during:** Threat surface scan before SUMMARY
- **Issue:** The first projection extension returned internal `orderId`/`paymentId` values that were not needed by the customer UI.
- **Fix:** Removed those fields from the customer status RPC and used the public order number as the render-only identifier for VietQR instruction display.
- **Files modified:** `src/components/payments/order-payment-page.tsx`, `src/payments/queries.ts`, `supabase/migrations/20260615034000_trusted_payments_orders.sql`
- **Verification:** Source assertion confirmed the customer RPC no longer returns `orderId` or `paymentId`; focused payment Vitest, typecheck, security suite, lint, and build passed.
- **Committed in:** `58467cec`

---

**Total deviations:** 2 auto-fixed (2 missing/security-critical projection issues).  
**Impact on plan:** Both fixes were required to keep VietQR instructions server-owned without introducing customer self-confirmation or unnecessary identifier disclosure. No new package, refund, fulfillment, or automatic bank reconciliation scope was added.

## Issues Encountered

- The `ui-ux-pro-max` skill search script was not present at the local skill path, so no generated design-system artifact was produced. The Phase 04 UI-SPEC remained the design authority.
- `npm run lint` passed with 9 warnings. Eight warnings are from prior/out-of-scope files; one warning is the existing unused `Database` type import in touched `src/payments/queries.ts`. It is non-blocking and was left unchanged to avoid broad lint cleanup outside the plan.
- Browser execution remains intentionally skipped until Plan 04-10 supplies seeded payment fixtures and authenticated guest/admin browser helpers.
- Existing unrelated dirty files remain: `next-env.d.ts` and untracked `.codegraph/`.

## Verification

- `node -e "..."` VietQR copy assertion for component and both locale JSON files - passed.
- Source assertion for no customer self-confirmation/payment mutation and prop-rendered amount/reference/deadline - passed.
- Source assertion for locale VietQR awaiting/rejected/expired messages - passed.
- Source assertion that `get_order_payment_status` does not return `orderId` or `paymentId` - passed.
- `npx vitest run tests/unit/payments/order-queries.test.ts tests/unit/payments/vietqr.test.ts tests/unit/payments/status-mapping.test.ts` - passed, 18 tests.
- `npx playwright test --list tests/e2e/order-status.spec.ts tests/e2e/admin-vietqr.spec.ts` - passed, 16 listed scenarios.
- `npm run typecheck` - passed.
- `npm run test:security` - passed, 10 Node security tests.
- `npm run lint` - passed with 9 warnings, 0 errors.
- `npm run build` - passed.

## Known Stubs

None. The `unavailable` copy in `src/messages/en.json` is an intentional runtime state for unconfigured PayPal/VietQR providers, not placeholder UI.

## Threat Flags

None open. The plan-intended server projection to customer browser boundary was mitigated with server-only rendering, no customer confirmation action, no direct paid mutation, masked account display, text-plus-icon status labels, and removal of internal payment UUIDs from the customer status RPC.

## Authentication Gates

None.

## User Setup Required

None for this plan. Real VietQR bank configuration remains controlled by existing server-only environment variables and later provider readiness work.

## Next Phase Readiness

Ready for Plan 04-09 admin order queue/detail UI. The admin plan can rely on the customer-facing VietQR journey contracts and the existing Plan 04-07 admin evidence actions without adding customer self-confirmation.

## Self-Check: PASSED

- Created/modified key files exist: SUMMARY, VietQR instruction component, shared order payment page, and both Playwright specs.
- Task/fix commits exist: `d7925225`, `2140809e`, and `58467cec`.
- Fresh verification passed: focused payment Vitest, Playwright list, typecheck, security suite, lint, production build, and source assertions.

---
*Phase: 04-trusted-payments-and-orders*
*Completed: 2026-06-16*
