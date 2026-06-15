---
phase: 04
slug: trusted-payments-and-orders
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-15
---

# Phase 04 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.8, pgTAP through Supabase CLI, Playwright 1.60.0, Node test scripts |
| **Config file** | `vitest.config.ts`, `playwright.config.ts`, `supabase/config.toml` |
| **Quick run command** | `npx vitest run tests/unit/payments` plus the targeted pgTAP file |
| **Full suite command** | `npm run ci` |
| **Estimated runtime** | Targeted checks under 30 seconds where practical; full CI varies |

---

## Sampling Rate

- **After every task commit:** Run the relevant Vitest file and targeted pgTAP file.
- **After every plan wave:** Run `npm run test:unit && npm run db:reset && npm run db:lint && npm run db:test && npm run typecheck`.
- **Before `$gsd-verify-work`:** Run `npm run ci`, repeat the concurrency scenario, exercise PayPal sandbox create/capture with a real webhook, and complete VietQR/admin UAT.
- **Max feedback latency:** 30 seconds for targeted automated checks where practical.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | ORD-02, INV-04, INV-05, SEC-03 | T-04-01 | State transitions are monotonic, audited, and finalize or release inventory once | pgTAP | `supabase test db supabase/tests/database/04_payment_model.test.sql` | No - W0 | pending |
| 04-01-02 | 01 | 1 | INV-04, INV-05, PAY-04 | T-04-02 | Duplicate and racing terminal transitions cannot double-decrement or regress state | pgTAP + concurrency | `node tests/integration/payment-concurrency.mjs` | No - W0 | pending |
| 04-02-01 | 02 | 2 | PAY-01, PAY-02 | T-04-03 | Server creates and captures the exact authoritative USD amount with stable idempotency keys | unit + integration | `npx vitest run tests/unit/payments/paypal-client.test.ts` | No - W0 | pending |
| 04-03-01 | 03 | 3 | PAY-03, PAY-04 | T-04-04 | Webhook signature, merchant, order mapping, amount, and currency are verified before paid transition | unit + integration | `npx vitest run tests/unit/payments/paypal-webhook.test.ts` | No - W0 | pending |
| 04-04-01 | 04 | 2 | PAY-05, PAY-06 | T-04-05 | VietQR instructions use exact VND amount/reference and only an authorized admin can confirm or reject | unit + E2E + pgTAP | `npx playwright test tests/e2e/admin-vietqr.spec.ts` | No - W0 | pending |
| 04-05-01 | 05 | 4 | ORD-01, ORD-03, PAY-08 | T-04-06 | Customer and admin views expose only authorized order data and map detailed states safely | E2E + RLS | `npx playwright test tests/e2e/order-status.spec.ts tests/e2e/admin-orders.spec.ts` | No - W0 | pending |
| 04-05-02 | 05 | 4 | PAY-07, SEC-03 | T-04-07 | Fulfillment gates remain closed before full payment and audit records are append-only | security + pgTAP | `node --test tests/security/payment-boundaries.test.mjs` | No - W0 | pending |

---

## Wave 0 Requirements

- [ ] `tests/unit/payments/status-mapping.test.ts`
- [ ] `tests/unit/payments/paypal-client.test.ts`
- [ ] `tests/unit/payments/paypal-webhook.test.ts`
- [ ] `tests/unit/payments/vietqr.test.ts`
- [ ] `supabase/tests/database/04_payment_model.test.sql`
- [ ] `supabase/tests/database/04_payment_transitions.test.sql`
- [ ] `supabase/tests/database/04_payment_rls_audit.test.sql`
- [ ] `tests/integration/payment-concurrency.mjs`
- [ ] `tests/security/payment-boundaries.test.mjs`
- [ ] `tests/e2e/order-status.spec.ts`
- [ ] `tests/e2e/admin-orders.spec.ts`
- [ ] `tests/e2e/admin-vietqr.spec.ts`
- [ ] Provider HTTP seam or fixtures so unit tests never call live PayPal.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PayPal sandbox create/capture and real webhook delivery | PAY-01, PAY-02, PAY-03 | Provider sandbox and webhook delivery cannot be reproduced fully by local fixtures | Complete an international USD sandbox payment, verify the webhook signature path, and confirm exactly one paid transition and inventory finalization |
| VietQR customer instructions and admin evidence workflow | PAY-05, PAY-06 | Bank transfer remains external and manually verified in v1 | Open a VND order, verify exact amount/reference/deadline, then confirm and reject representative transfers through the protected admin workflow |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verification or Wave 0 dependencies.
- [ ] Sampling continuity: no 3 consecutive tasks without automated verification.
- [ ] Wave 0 covers all missing test references.
- [ ] No watch-mode flags.
- [ ] Targeted feedback latency is under 30 seconds where practical.
- [ ] `nyquist_compliant: true` is set after plan-task mapping is finalized.

**Approval:** pending
