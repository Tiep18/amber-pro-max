---
phase: 04
slug: trusted-payments-and-orders
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-15
approved: 2026-06-15
---

# Phase 04 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

Wave 0 is Plan 04-01. It creates all payment, database, security, integration and browser test contracts before implementation plans run. Those contracts may begin as pending/red where production code does not exist yet; later plans own turning the relevant rows green.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.8, pgTAP through Supabase CLI, Playwright 1.60.0, Node test scripts |
| **Config file** | `vitest.config.ts`, `playwright.config.ts`, `supabase/config.toml` |
| **Quick run command** | Focused Vitest/pgTAP/source assertion per task |
| **Full suite command** | `npm run ci` |
| **Estimated runtime** | Targeted checks under 30 seconds where practical; full CI varies |

---

## Sampling Rate

- **After every task commit:** Run the task's focused verify command from PLAN.md.
- **After every implementation wave:** Run the relevant focused unit/security/database checks for that wave.
- **Before `$gsd-verify-work`:** Run `supabase db push`, `npm run ci`, payment concurrency scenarios, security boundaries, Playwright order/admin flows, PayPal sandbox webhook test and VietQR/admin manual UAT.
- **Max targeted feedback latency:** 30 seconds where practical. Playwright, full DB suite, `supabase db push`, PayPal sandbox and `npm run ci` are final/wave gates, not per-task quick checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | All Phase 4 IDs | T-04-01 | Unit/pgTAP contracts exist before implementation | unit + pgTAP | `npx vitest run tests/unit/payments/status-mapping.test.ts tests/unit/payments/paypal-client.test.ts tests/unit/payments/paypal-webhook.test.ts tests/unit/payments/vietqr.test.ts` | W0 creates | pending |
| 04-01-02 | 01 | 1 | All Phase 4 IDs | T-04-01 | Concurrency, security and browser seams exist before implementation | security + Playwright list | `node --test tests/security/payment-boundaries.test.mjs && npx playwright test --list tests/e2e/order-status.spec.ts tests/e2e/admin-orders.spec.ts tests/e2e/admin-vietqr.spec.ts` | W0 creates | pending |
| 04-02-01 | 02 | 2 | ORD-02, INV-04, INV-05, SEC-03 | T-04-02 | Payment/order/inventory/audit state machine is monotonic and separate | pgTAP | `supabase test db supabase/tests/database/04_payment_model.test.sql` | W0 owned | pending |
| 04-02-02 | 02 | 2 | INV-04, INV-05, PAY-04 | T-04-03 | Shared transition adapter proves exact-once and race safety | concurrency | `node tests/integration/payment-concurrency.mjs` | W0 owned | pending |
| 04-02-03 | 02 | 2 | SEC-03 | T-04-26 | Schema is pushed before final verification | schema gate | `supabase db push` | schema planned | manual/final |
| 04-03-01 | 03 | 3 | ORD-01, ORD-03, PAY-07, SEC-03 | T-04-05 | Guest/customer/admin projections and secrets stay scoped | typecheck | `npm run typecheck` | implementation owned | pending |
| 04-03-02 | 03 | 3 | PAY-06, PAY-07, SEC-03 | T-04-06 | Checkout handoff hides raw guest token and denies direct mutation | security | `node --test tests/security/payment-boundaries.test.mjs` | W0 owned | pending |
| 04-04-01 | 04 | 4 | PAY-01, PAY-02, PAY-04 | T-04-08 | PayPal client maps exact USD money and idempotency without network | unit | `npx vitest run tests/unit/payments/paypal-client.test.ts` | W0 owned | pending |
| 04-04-02 | 04 | 4 | PAY-01, PAY-02, PAY-04 | T-04-10 | PayPal routes authorize local order and delegate paid transition | unit | `npx vitest run tests/unit/payments/paypal-client.test.ts` | W0 owned | pending |
| 04-05-01 | 05 | 5 | ORD-01, PAY-08 | T-04-11 | Customer statuses and localized order routes are server-authoritative | unit | `npx vitest run tests/unit/payments/status-mapping.test.ts` | W0 owned | pending |
| 04-05-02 | 05 | 5 | PAY-01, PAY-02, PAY-08 | T-04-12 | PayPal UI never claims paid from client callback | source assertion | `node -e "const fs=require('fs');const s=fs.readFileSync('src/components/payments/paypal-buttons.tsx','utf8');for(const x of ['/api/paypal/orders','aria-busy'])if(!s.includes(x))throw new Error(x);if(/PAYPAL_CLIENT_SECRET|PAYPAL_WEBHOOK_ID/.test(s))throw new Error('secret leak')"` | implementation owned | pending |
| 04-06-01 | 06 | 5 | PAY-03, PAY-04, PAY-08 | T-04-14 | Raw webhook verification rejects forged/mismatched events | unit | `npx vitest run tests/unit/payments/paypal-webhook.test.ts` | W0 owned | pending |
| 04-06-02 | 06 | 5 | PAY-03, PAY-04, PAY-08 | T-04-15 | Webhook inbox records duplicates without repeated business effects | unit | `npx vitest run tests/unit/payments/paypal-webhook.test.ts` | W0 owned | pending |
| 04-07-01 | 07 | 4 | PAY-05, PAY-07 | T-04-17 | VietQR instructions snapshot exact VND amount/reference/deadline | unit | `npx vitest run tests/unit/payments/vietqr.test.ts` | W0 owned | pending |
| 04-07-02 | 07 | 4 | PAY-06, PAY-07, SEC-03 | T-04-18 | Admin confirm/reject uses shared idempotent transition | unit | `npx vitest run tests/unit/payments/vietqr.test.ts` | W0 owned | pending |
| 04-08-01 | 08 | 5 | ORD-01, PAY-05, PAY-08 | T-04-20 | Customer VietQR display has exact copy and no self-confirmation | source assertion | `node -e "const fs=require('fs');for(const f of ['src/components/payments/vietqr-instructions.tsx','src/messages/en.json','src/messages/vi.json']){const s=fs.readFileSync(f,'utf8'); if(!/VietQR|vietqr|transfer/i.test(s)) throw new Error(f+' missing VietQR copy')} "` | implementation owned | pending |
| 04-08-02 | 08 | 5 | ORD-01, PAY-05, PAY-08 | T-04-22 | Customer order browser journeys are listed for mobile/desktop | Playwright list | `npx playwright test --list tests/e2e/order-status.spec.ts tests/e2e/admin-vietqr.spec.ts` | W0 owned | pending |
| 04-09-01 | 09 | 6 | ORD-03, PAY-03, PAY-08, SEC-03 | T-04-23 | Admin queue/detail/timeline expose redacted provider evidence | source assertion | `node -e "const fs=require('fs');for(const f of ['src/app/admin/orders/page.tsx','src/app/admin/orders/[orderNumber]/page.tsx','src/components/admin/orders/payment-timeline.tsx']){const s=fs.readFileSync(f,'utf8'); if(!/admin|timeline|order/i.test(s)) throw new Error(f+' missing admin order contract')} "` | implementation owned | pending |
| 04-09-02 | 09 | 6 | PAY-06, ORD-03, SEC-03 | T-04-24 | Admin VietQR decisions are explicit, audited and idempotency-aware | Playwright list | `npx playwright test --list tests/e2e/admin-orders.spec.ts tests/e2e/admin-vietqr.spec.ts` | W0 owned | pending |
| 04-10-01 | 10 | 7 | All Phase 4 IDs | T-04-26 | Managed schema/provider readiness is proven or blocked explicitly | schema/provider gate | `supabase db push` | manual gate | manual |
| 04-10-02 | 10 | 7 | All Phase 4 IDs | T-04-28 | Full CI/lifecycle/security/UI verification is green before completion | final suite | `npm run ci` | final gate | pending |

---

## Wave 0 Requirements

- [x] `tests/unit/payments/status-mapping.test.ts`
- [x] `tests/unit/payments/paypal-client.test.ts`
- [x] `tests/unit/payments/paypal-webhook.test.ts`
- [x] `tests/unit/payments/vietqr.test.ts`
- [x] `supabase/tests/database/04_payment_model.test.sql`
- [x] `supabase/tests/database/04_payment_transitions.test.sql`
- [x] `supabase/tests/database/04_payment_rls_audit.test.sql`
- [x] `tests/integration/payment-concurrency.mjs`
- [x] `tests/security/payment-boundaries.test.mjs`
- [x] `tests/e2e/order-status.spec.ts`
- [x] `tests/e2e/admin-orders.spec.ts`
- [x] `tests/e2e/admin-vietqr.spec.ts`
- [x] `tests/fixtures/payments/paypal-events.ts`

Plan 04-01 owns creating the files above before production implementation. The checkboxes mean "assigned to Wave 0 contract", not "already executed green in this planning turn."

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PayPal sandbox create/capture and real webhook delivery | PAY-01, PAY-02, PAY-03 | Provider sandbox and webhook delivery cannot be reproduced fully by local fixtures | Complete an international USD sandbox payment, verify the webhook signature path, and confirm exactly one paid transition and inventory finalization |
| VietQR seller bank configuration and evidence workflow | PAY-05, PAY-06 | Bank transfer remains external and manually verified in v1 | Confirm seller-approved bank values, open a VND order, verify exact amount/reference/deadline, then confirm and reject representative transfers through protected admin workflow |
| Managed Supabase Cron availability | INV-05, PAY-04 | Managed extension/job availability is deployment-specific | Verify `pg_cron` extension/job or record operational blocker; read/transition deadline checks remain correctness fallback |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verification or explicit manual/final gate.
- [x] Sampling continuity: no 3 consecutive tasks without automated verification.
- [x] Wave 0 covers all missing test references.
- [x] No watch-mode flags.
- [x] Targeted feedback latency stays under 30 seconds where practical; long checks are wave/final gates.
- [x] `nyquist_compliant: true` is set after the 10-plan, 21-task mapping was finalized.

**Approval:** approved 2026-06-15
