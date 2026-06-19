---
phase: 04-trusted-payments-and-orders
verified: 2026-06-16T09:56:02Z
status: human_needed
next_action: "Complete manual provider UAT: PayPal sandbox webhook delivery, seller-approved VietQR bank evidence, and managed Supabase Cron dashboard check before production readiness."
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Complete a PayPal sandbox USD create/capture through a public HTTPS webhook endpoint."
    expected: "PayPal delivers a verified webhook; the local order records exactly one paid transition, one inventory finalization, and no duplicate business effects after retry delivery."
    why_human: "Requires seller sandbox credentials, PayPal provider delivery, and a public webhook endpoint outside repo-only verification."
  - test: "Confirm seller-approved VietQR receiving bank facts and run representative real bank evidence checks."
    expected: "Customer instructions show the approved bank/account, exact VND amount, immutable order reference, and deadline; admin confirm accepts exact evidence and reject handles mismatch with audit and inventory release."
    why_human: "Bank account ownership and real transfer evidence are external seller/provider facts."
  - test: "Check managed Supabase Cron availability/job in the deployment dashboard."
    expected: "The payment-expiry job is scheduled or an operational blocker is recorded; direct deadline checks and expire RPC remain available as correctness fallback."
    why_human: "Managed pg_cron extension/job availability is deployment-dashboard state, not fully observable from local source files."
---

# Phase 04: Trusted Payments and Orders Verification Report

**Phase Goal:** PayPal and VietQR safely move orders through auditable, idempotent payment and inventory states.
**Verified:** 2026-06-16T09:56:02Z
**Status:** human_needed
**Re-verification:** No - initial verification

## Post-Verification Addendum: D-22..D-30 Address Snapshot and Address UX

**Updated:** 2026-06-19
**Status impact:** Phase 4 remains `human_needed` because provider/manual UAT is still outstanding. The checkout shipping-address delta and follow-up address UX fix are implemented and locally verified.

### Added Evidence

| Area | Evidence | Status |
| --- | --- | --- |
| Physical/mixed checkout address collection | Checkout now collects full shipping address for physical and mixed carts, while digital-only checkout continues without an address. | VERIFIED |
| Country selection UX | The country selector uses a broad localized country list, supports search, clear, and reselect behavior, and no longer traps customers after one selection. | VERIFIED |
| Address validation UX | Required address fields show inline validation messages; the update action no longer fails only through a silent disabled state. | VERIFIED |
| Immutable order snapshot | `checkout_orders.shipping_address` persists a JSONB snapshot with a shape constraint and immutability trigger; customer/admin order detail projections display it. | VERIFIED |
| Regression scope | Payment/webhook/VietQR/inventory/audit behavior was not re-executed except for the narrow order projection integration needed to expose the address snapshot. | VERIFIED |

### Addendum Verification Commands

| Command | Result | Status |
| --- | --- | --- |
| `npm run test:unit -- tests/unit/checkout/submit-checkout.test.ts tests/unit/payments/order-queries.test.ts` | Passed. | PASS |
| `npm run test:unit -- tests/unit/checkout/shipping-address-ui.test.ts tests/unit/checkout/submit-checkout.test.ts tests/unit/payments/order-queries.test.ts` | Passed. | PASS |
| `npm run typecheck` | Passed. | PASS |
| `npm run db:test` | Passed all 289 DB tests after the reset-applied schema was available. | PASS |
| `npm run db:lint` | Passed with no schema errors. | PASS |
| `npm run lint` | Passed with existing warnings only. | PASS |
| `npm run build` | Passed. | PASS |
| `npm run test:security` | Passed. | PASS |

### Remaining Human Verification

The original manual/provider UAT list below is unchanged: PayPal sandbox webhook delivery, seller-approved VietQR bank evidence, and managed Supabase Cron/dashboard checks remain required before marking Phase 4 complete.

## User Flow Coverage

| Step | Expected | Evidence in Codebase | Status |
| --- | --- | --- | --- |
| PayPal customer pays USD order | Browser cannot set amount/currency/paid state; server creates/captures exact USD total. | `src/app/api/paypal/orders/route.ts` authorizes by order number and loads local `USD`/`paypal` facts; `src/payments/paypal/client.ts` formats integer USD and sends stable `PayPal-Request-Id`; capture route calls `applyPaymentTransition`. | VERIFIED |
| PayPal callback/webhook repeats | Duplicate callbacks/webhooks do not duplicate confirmation or inventory finalization. | `public.apply_payment_transition` locks transition keys/provider events, returns duplicate/stale outcomes, and finalizes active reservations once; webhook route records delivery counters and delegates to the same RPC. | VERIFIED |
| VietQR customer receives instructions | VN/VND/VietQR orders show exact amount, order reference, deadline, masked bank display, and no customer self-confirmation. | `src/payments/vietqr/instructions.ts` requires `vn` + `VND` + `vietqr_intent`, builds `transferReference` from order number, snapshots via `vietqr_instruction`; `VietQrInstructions` renders copy controls only. | VERIFIED |
| Admin verifies VietQR evidence | Only authorized admin can confirm exact full bank evidence or reject mismatch. | `src/payments/admin-actions.ts` calls `requireAdmin()` before loading facts and uses `applyPaymentTransition`; `src/payments/vietqr/evidence.ts` requires exact reference, amount, received time, and idempotency key. | VERIFIED |
| Customer/admin inspect state | Customer sees authorized status only; admin sees timeline/evidence/audit without raw secrets. | `get_order_payment_status` checks owner/guest/admin scope; admin routes call `requireAdmin`; `PaymentTimeline` allow-lists sanitized facts and `ProviderEvidencePanel` displays no raw payload/signature fields. | VERIFIED |

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | International customer can pay the exact authoritative USD total through PayPal and receive one confirmed order even when callbacks or webhooks repeat. | VERIFIED | PayPal create/capture routes derive order facts from DB, reject non-USD/non-PayPal, reconcile merchant/amount/currency, and transition through `applyPaymentTransition`; duplicate provider events and transition keys are handled in SQL. |
| 2 | Vietnam customer receives exact VietQR instructions and the order remains pending until an authorized admin records bank verification. | VERIFIED | VietQR instruction generation is server-only and records a `pending` snapshot; admin confirm/reject actions require `requireAdmin` and exact evidence before transition. |
| 3 | Failed, cancelled, rejected, or expired payments release reserved inventory, while a paid transition finalizes it exactly once. | VERIFIED | SQL RPC uses row locks, active-reservation updates, single-outcome reservation trigger, inventory `finalized/released/expired` effects, and final validation concurrency evidence. |
| 4 | Customer and admin can see accurate payment/order states, and digital or physical fulfillment cannot begin before full payment. | VERIFIED | Order projection exposes separate payment/gate/digital/physical states; paid opens gate and marks fulfillment eligible/awaiting, otherwise locked/blocked. Phase 5 owns actual entitlement/email/shipment creation. |
| 5 | Admin can inspect order history, payment evidence, state transitions, and audit records without exposing another customer's data. | VERIFIED | Admin routes require server admin authorization; DB timeline RPC re-checks `private.is_admin`; audit/events store sanitized facts and reject secret metadata. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `supabase/migrations/20260615034000_trusted_payments_orders.sql` | Payment model, transition RPC, audit, RLS, expiry | VERIFIED | Contains `payments`, `payment_events`, `payment_transitions`, `commerce_audit_events`, `apply_payment_transition`, `expire_due_payments`, RLS and grants. |
| `src/payments/transitions.ts` | Typed shared transition adapter | VERIFIED | Validates payloads with Zod and calls only `apply_payment_transition`. |
| `src/app/api/paypal/orders/route.ts` and capture route | Authorized PayPal create/capture | VERIFIED | Authorizes order access, uses local order/payment facts, and never accepts browser totals. |
| `src/app/api/webhooks/paypal/route.ts` | Verified idempotent webhook endpoint | VERIFIED | Reads raw body once, verifies PayPal signature, stores digest/sanitized facts, updates duplicate delivery history, delegates transitions. |
| `src/payments/vietqr/instructions.ts`, `evidence.ts`, `admin-actions.ts` | VietQR exact instruction and admin evidence backend | VERIFIED | Server-only instruction snapshots plus admin-only confirm/reject through shared transition. |
| `src/components/payments/*` | Customer order/payment states | VERIFIED | Renders server projection, PayPal route calls, VietQR instructions, locked fulfillment copy. |
| `src/app/admin/orders/*`, `src/components/admin/orders/*` | Admin queue/detail/timeline/evidence UI | VERIFIED | Admin authorization before load, timeline and evidence panels use redacted/sanitized facts. |
| Phase 4 tests and validation artifacts | Unit/security/DB/concurrency/browser contracts | VERIFIED | Payment unit suites, security harness, pgTAP contracts, concurrency script, Playwright contracts, and `04-VALIDATION.md` evidence are present. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| PayPal UI | `/api/paypal/orders` and capture route | `fetch` calls in `paypal-buttons.tsx` | WIRED | Client submits only order/provider IDs, then refreshes server state. |
| PayPal capture route | `applyPaymentTransition` | `paypal_recheck` transition | WIRED | Reconciles provider order/capture/merchant/amount/currency before transition. |
| PayPal webhook route | PayPal verification and transition RPC | `verifyPayPalWebhook`, `reconcilePayPalEvent`, `paypal_webhook` | WIRED | Raw-body verification precedes mutation; duplicate delivery history persists. |
| VietQR instructions | transition ledger | `vietqr_instruction` pending transition | WIRED | Instruction snapshot is audited without opening paid gate. |
| VietQR admin form | server actions and transition RPC | `confirmVietQrPaymentAction`, `rejectVietQrPaymentAction` | WIRED | Server Actions validate admin/evidence and call transition RPC. |
| Admin detail route | admin projection/timeline | `requireAdmin`, `getAdminOrderDetailByOrderNumber`, `get_admin_order_timeline` | WIRED | App and DB both enforce admin boundary. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `OrderPaymentPage` | `result.order` | `getAuthorizedOrderPayment` -> `get_order_payment_status` RPC | Yes - DB view joins checkout orders and payments with owner/guest/admin scope. | FLOWING |
| `PayPalButtons` | `orderNumber`, `clientId`, `amountLabel` | Server-rendered `OrderPaymentPage` after authorized projection and server env public client ID | Yes - no browser totals or secrets. | FLOWING |
| `VietQrInstructions` | instruction props | `getVietQrInstructions` from authorized order projection and typed server config | Yes - exact amount/reference/deadline are DB-derived; bank config remains manual UAT. | FLOWING |
| `AdminOrdersPage` / detail | queue/detail/timeline | `getAdminOrderQueue`, `getAdminOrderDetailByOrderNumber`, `get_admin_order_timeline` | Yes - DB projections and timeline RPC after admin auth. | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Payment unit behavior | `npx vitest run tests/unit/payments/status-mapping.test.ts tests/unit/payments/paypal-client.test.ts tests/unit/payments/paypal-webhook.test.ts tests/unit/payments/vietqr.test.ts tests/unit/payments/order-queries.test.ts tests/unit/payments/paypal-buttons.test.ts` | 6 files, 41 tests passed. | PASS |
| Payment boundary security | `node --test tests/security/payment-boundaries.test.mjs` | 7 tests passed. | PASS |
| Browser contract discovery | `npx playwright test --list tests/e2e/order-status.spec.ts tests/e2e/admin-orders.spec.ts tests/e2e/admin-vietqr.spec.ts` | 22 scenarios listed across 3 files. | PASS |
| Type safety | `npm run typecheck` | `tsc --noEmit` exited 0. | PASS |
| Full final gate evidence | `04-VALIDATION.md` final run | Records `npm run ci`, DB tests, payment concurrency, security, build, and Playwright automated gates as passed. | PASS (evidence reviewed) |

### Probe Execution

| Probe | Command | Result | Status |
| --- | --- | --- | --- |
| Conventional probes | `find scripts -path '*/tests/probe-*.sh'` equivalent not applicable on this repo | No Phase 4 probe scripts declared; validation uses npm/Supabase/Playwright gates instead. | SKIPPED |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| INV-04 | 04-02, 04-10 | Finalizes reserved inventory exactly once when payment is confirmed. | SATISFIED | SQL transition locks rows, decrements stock on paid, consumes active reservations; concurrency evidence covers duplicate paid. |
| INV-05 | 04-02, 04-10 | Releases inventory when cancelled, failed, or expired. | SATISFIED | SQL release/expiry paths update active reservations and audit inventory release/expired; expire RPC exists with Cron fallback. |
| ORD-01 | 04-03, 04-05, 04-08 | Customer receives order number and summary after checkout. | SATISFIED | Checkout redirects to localized order path; `OrderPaymentPage` renders order number, total, deadline. |
| ORD-02 | 04-02, 04-05 | Tracks order, payment, digital fulfillment, and physical fulfillment separately. | SATISFIED | Migration adds separate state columns; status tests cover state families. |
| ORD-03 | 04-03, 04-09 | Admin can view order history, transitions, payment records, and customer details. | SATISFIED | Admin order queue/detail and timeline projections are implemented behind admin auth. |
| PAY-01 | 04-04, 04-05, 04-10 | International customer can pay eligible USD order using PayPal. | SATISFIED + HUMAN UAT | Code and tests support server PayPal flow; real sandbox payment remains manual provider UAT. |
| PAY-02 | 04-04, 04-10 | Creates/captures PayPal orders server-side from authoritative total. | SATISFIED + HUMAN UAT | Server route and client use local integer USD totals; sandbox create/capture remains manual UAT. |
| PAY-03 | 04-06, 04-10 | Verifies PayPal webhook authenticity and validates order, merchant, amount, currency. | SATISFIED + HUMAN UAT | Webhook verification/reconciliation implemented and unit-tested; live PayPal delivery remains manual UAT. |
| PAY-04 | 04-02, 04-06, 04-10 | Processes PayPal events and paid transitions idempotently. | SATISFIED | Unique transition/provider event handling, duplicate delivery history, and concurrency evidence. |
| PAY-05 | 04-07, 04-08, 04-10 | Vietnam customer receives VietQR exact amount/reference/deadline. | SATISFIED + HUMAN UAT | Instruction generator/UI implemented; seller-approved real bank facts remain manual UAT. |
| PAY-06 | 04-07, 04-09 | Authorized admin confirms/rejects VietQR with audit. | SATISFIED + HUMAN UAT | Server Actions require admin and exact evidence; real bank evidence workflow remains manual UAT. |
| PAY-07 | 04-02, 04-07, 04-08 | No digital access or fulfillment before full paid order. | SATISFIED | Paid gate locked until `paid`; fulfillment statuses blocked until full paid. Phase 5 owns actual fulfillment release. |
| PAY-08 | 04-05, 04-06, 04-08, 04-09 | Customer/admin can see payment states including refunds. | SATISFIED | Status mapper, DB projection, localized copy, admin queue/detail/timeline cover pending/paid/failed/cancelled/refund/review states. |
| SEC-03 | 04-02, 04-03, 04-07, 04-09 | Sensitive admin actions and state transitions are audited. | SATISFIED | `commerce_audit_events`, append-only trigger, payment event/transition audit writes, admin timeline. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| None blocking | - | No unreferenced TODO/FIXME/XXX markers in Phase 4 payment surfaces. | - | `return null`, raw body variables, env-name scans, and input placeholders were reviewed as legitimate guard/test/UI patterns. |

### Human Verification Required

### 1. PayPal Sandbox Webhook Delivery

**Test:** Complete a sandbox USD order through PayPal with a public HTTPS webhook URL.
**Expected:** PayPal delivery verifies signature, validates merchant/amount/currency, and results in exactly one paid transition and one inventory finalization even if the event is retried.
**Why human:** Requires external PayPal sandbox delivery and seller-owned provider configuration.

### 2. VietQR Seller Bank Evidence

**Test:** Confirm seller-approved bank values and run representative real transfer evidence through admin confirm/reject.
**Expected:** Exact evidence confirms payment; wrong amount/reference rejects with audit and releases inventory.
**Why human:** Bank account approval and transfer evidence are external facts.

### 3. Managed Supabase Cron Dashboard

**Test:** Verify managed `pg_cron` extension/job availability in the deployment dashboard.
**Expected:** Expiry job is scheduled or an operational blocker is recorded; direct deadline checks and `expire_due_payments` remain fallback correctness paths.
**Why human:** Managed extension/job state is provider dashboard state.

### Gaps Summary

No codebase gaps block Phase 4 goal achievement. Automated gates are green by committed `04-VALIDATION.md` evidence and focused verifier spot-checks. The phase is not production-ready until the three manual provider/dashboard UAT items above are completed.

---

_Verified: 2026-06-16T09:56:02Z_
_Verifier: the agent (gsd-verifier)_
