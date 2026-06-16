---
phase: 04-trusted-payments-and-orders
plan: "09"
subsystem: admin-order-operations
tags: [admin, orders, payments, vietqr, audit, accessibility, security]

requires:
  - phase: 04-trusted-payments-and-orders
    provides: PayPal webhook receipts, VietQR admin actions, customer VietQR journey contracts, and admin-safe payment projections from Plans 04-06, 04-07, and 04-08
provides:
  - Server-authorized admin order queue and detail routes
  - Dense payment/fulfillment state cards for admin order operations
  - Redacted provider evidence panel with no raw payload, signature, PII, or secret display
  - Payment timeline list for provider, transition, actor, source, and sanitized audit facts
  - VietQR evidence confirm/reject form using existing Server Actions with disabled submit states and inline result feedback
  - Admin browser journey contracts for queue, detail, VietQR evidence, duplicate/stale, responsive, and non-admin denial cases
affects: [admin-orders, admin-vietqr, payment-timeline, provider-evidence, audit-review]

tech-stack:
  added: []
  patterns:
    - Admin payment pages call requireAdmin before creating privileged clients or loading evidence
    - Admin provider evidence renders only sanitized operational facts, never raw webhook payloads, signature headers, payer data, or secrets
    - VietQR decision UI posts to Server Actions only and does not mutate payment/order rows directly

key-files:
  created:
    - src/components/admin/orders/format.ts
    - src/components/admin/orders/order-queue.tsx
    - src/components/admin/orders/order-detail.tsx
    - src/components/admin/orders/payment-timeline.tsx
    - src/components/admin/orders/provider-evidence-panel.tsx
    - src/components/admin/orders/vietqr-evidence-form.tsx
    - src/app/admin/orders/page.tsx
    - src/app/admin/orders/[orderNumber]/page.tsx
  modified:
    - src/payments/queries.ts
    - tests/e2e/admin-vietqr.spec.ts

key-decisions:
  - "Admin order detail URLs use public order numbers while the server-side query resolves privileged order IDs only after requireAdmin."
  - "Provider evidence is deliberately redacted to sanitized source, status, review, and digest-like facts; raw provider payload and signature fields stay out of UI."
  - "VietQR rejection requires an explicit checkbox acknowledging inventory release and same-order non-retry consequences."

patterns-established:
  - "Future admin payment views should keep operational density but load privileged evidence only after server-side admin authorization."
  - "Future admin evidence forms should call payment Server Actions rather than Supabase table mutations from UI code."

requirements-completed: [ORD-03, PAY-03, PAY-06, PAY-08, SEC-03]

duration: 18 min
completed: 2026-06-16
---

# Phase 04 Plan 09: Admin Order Operations Summary

**Admin payment queue, order detail, redacted provider evidence, audit timeline, and VietQR evidence decision UI**

## Performance

- **Duration:** 18 min
- **Started:** 2026-06-16T04:39:00Z
- **Completed:** 2026-06-16T05:03:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Added `/admin/orders` and `/admin/orders/[orderNumber]` routes that call `requireAdmin()` before privileged payment evidence loads.
- Added `OrderQueue`, `OrderDetail`, `PaymentTimeline`, and `ProviderEvidencePanel` components for dense admin payment operations.
- Added `getAdminOrderDetailByOrderNumber()` so detail routes can use public order numbers while privileged UUID lookup remains server-only.
- Added `VietQrEvidenceForm` with confirm/reject controls, disabled pending states, inline result feedback, idempotency keys, and explicit reject consequence acknowledgment.
- Extended admin VietQR E2E contracts with a non-admin denial scenario and confirmed Playwright lists queue/detail/VietQR responsive scenarios.

## Task Commits

1. **Task 1: Admin order queue, detail and timeline** - `ce1c9ada` (feat)
2. **Task 2: Admin VietQR decision coverage** - `3bea4fb8` (test)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `src/app/admin/orders/page.tsx` - Server-authorized admin order queue route.
- `src/app/admin/orders/[orderNumber]/page.tsx` - Server-authorized order detail route using public order numbers.
- `src/components/admin/orders/order-queue.tsx` - Dense queue cards for payment state, method, amount, deadline and gate state.
- `src/components/admin/orders/order-detail.tsx` - Admin order detail shell for payment, fulfillment, evidence, form, and timeline sections.
- `src/components/admin/orders/payment-timeline.tsx` - Sanitized audit/provider timeline list.
- `src/components/admin/orders/provider-evidence-panel.tsx` - Redacted provider evidence summary.
- `src/components/admin/orders/vietqr-evidence-form.tsx` - VietQR confirm/reject Server Action forms.
- `src/components/admin/orders/format.ts` - Admin money/date/status formatting helpers.
- `src/payments/queries.ts` - Admin detail-by-order-number helper.
- `tests/e2e/admin-vietqr.spec.ts` - Additional non-admin VietQR denial contract.

## Decisions Made

- Kept admin UI copy in the existing admin-shell style instead of introducing a new admin translation layer in this plan; customer-facing bilingual payment copy remains in the message files from prior plans.
- Rendered no contact email in queue/detail to satisfy provider evidence redaction and minimize operational PII exposure.
- Used skipped Playwright journey contracts because Plan 04-10 owns seeded payment/admin browser helpers and full browser execution.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added detail lookup by public order number**
- **Found during:** Task 1 route implementation
- **Issue:** The plan route path uses `{orderNumber}`, while the existing admin detail query accepted only internal order IDs.
- **Fix:** Added `getAdminOrderDetailByOrderNumber()` that resolves the internal order ID after admin authorization.
- **Files modified:** `src/payments/queries.ts`
- **Verification:** Source assertions, typecheck, lint, and build passed.
- **Committed in:** `ce1c9ada`

**2. [Rule 2 - Missing Critical] Added explicit non-admin VietQR decision coverage**
- **Found during:** Task 2 source assertion
- **Issue:** `admin-vietqr.spec.ts` covered confirm/reject/duplicate/stale but did not contain a VietQR-specific non-admin denial scenario.
- **Fix:** Added skipped browser contract for non-admin evidence denial.
- **Files modified:** `tests/e2e/admin-vietqr.spec.ts`
- **Verification:** `npx playwright test --list tests/e2e/admin-orders.spec.ts tests/e2e/admin-vietqr.spec.ts` listed 13 scenarios including non-admin denial.
- **Committed in:** `3bea4fb8`

**3. [Rule 1 - Bug] Added explicit reject consequence acknowledgment**
- **Found during:** Task 2 UX review
- **Issue:** Reject copy explained inventory release, but the form did not require an explicit acknowledgement.
- **Fix:** Added required checkbox before reject submit.
- **Files modified:** `src/components/admin/orders/vietqr-evidence-form.tsx`
- **Verification:** Source assertions and typecheck passed.
- **Committed in:** `3bea4fb8`

---

**Total deviations:** 3 auto-fixed (2 missing critical, 1 bug).  
**Impact on plan:** Fixes tightened admin authorization, evidence safety, and explicit decisioning without adding payment mutation, fulfillment, refund, or provider scope.

## Issues Encountered

- A fresh 04-09 subagent could not run due the Codex usage limit, so execution continued inline in the orchestrator with the same GSD plan gates.
- `src/messages/en.json` and `src/messages/vi.json` already contained the customer payment/VietQR copy needed by this plan; admin routes follow the existing English admin shell pattern, so no new message keys were required.
- `npm run lint` passed with 9 warnings that were already present in prior/out-of-scope files, including the existing unused `Database` import in `src/payments/queries.ts`.
- Existing unrelated dirty files remain: `next-env.d.ts` and untracked `.codegraph/`.

## Verification

- Plan source assertion for admin routes and timeline files - passed.
- Source assertion that admin routes import/call `requireAdmin` before privileged rendering - passed.
- Source assertion that provider evidence panel does not contain `rawBody`, `transmission_sig`, `PAYPAL_CLIENT_SECRET`, or customer email display - passed.
- Source assertion that VietQR form calls `confirmVietQrPaymentAction` and `rejectVietQrPaymentAction` and does not perform direct DB mutation - passed.
- `npx playwright test --list tests/e2e/admin-orders.spec.ts tests/e2e/admin-vietqr.spec.ts` - passed, 13 listed scenarios.
- `npm run typecheck` - passed.
- `npm run test:security` - passed, 10 Node security tests.
- `npm run lint` - passed with 9 warnings, 0 errors.
- `npm run build` - passed, including `/admin/orders` and `/admin/orders/[orderNumber]`.

## Known Stubs

Admin browser scenarios remain skipped until Plan 04-10 supplies seeded payment fixtures and authenticated admin browser helpers.

## Threat Flags

None open. The plan-intended admin evidence and decision trust boundaries were mitigated with server-side admin authorization, redacted provider evidence, no customer email display, Server Action-only VietQR decisions, disabled pending states, and explicit rejection acknowledgment.

## User Setup Required

None.

## Next Phase Readiness

Ready for Plan 04-10 final validation and provider readiness gates.

## Self-Check: PASSED

- Key files exist: admin routes, queue/detail/timeline/provider/evidence components, summary, and admin VietQR specs.
- Task commits exist: `ce1c9ada` and `3bea4fb8`.
- Fresh verification passed: source assertions, Playwright list, typecheck, security suite, lint, and production build.

---
*Phase: 04-trusted-payments-and-orders*
*Completed: 2026-06-16*
