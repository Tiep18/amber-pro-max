---
phase: 05
slug: fulfillment-and-purchase-access
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-19
---

# Phase 05 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest, Playwright, Supabase database tests, Node security checks |
| **Config file** | `vitest.config.ts`, `playwright.config.ts`, `supabase/config.toml`, package scripts |
| **Quick run command** | `npm run test:unit && npm run db:test` |
| **Full suite command** | `npm run lint && npm run typecheck && npm run test:unit && npm run db:test && npm run test:security && npm run build && npm run test:e2e` |
| **Estimated runtime** | ~600 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit` plus the nearest database test when migrations or RLS change.
- **After every plan wave:** Run `npm run lint && npm run typecheck && npm run test:unit && npm run db:test && npm run test:security`.
- **Before `$gsd-verify-work`:** Full suite must be green, with manual provider checks noted where real email delivery or managed Supabase Cron is unavailable locally.
- **Max feedback latency:** 600 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-W0-01 | TBD | 0 | DIG-02 / DIG-04 / FUL-01 / ACC-02 | T-05-01 / T-05-02 | Paid digital lines create entitlements once; downloads validate entitlement before signed URL; mixed order states remain separate. | database + unit + e2e | `npm run db:test && npm run test:unit -- downloads && npm run test:e2e -- order-downloads` | no W0 | pending |
| 05-W0-02 | TBD | 0 | DIG-03 / DIG-07 / OPS-01 / OPS-02 | T-05-03 / T-05-05 | Outbox rows are durable, retry safely, sanitize failures, and resend creates fresh tokens plus audit. | database + unit + e2e | `npm run db:test && npm run test:unit -- email-outbox && npm run test:e2e -- admin-fulfillment` | no W0 | pending |
| 05-W0-03 | TBD | 0 | DIG-06 / ACC-05 | T-05-01 / T-05-04 | Guest reopen tokens are hashed, expiring, scoped, same-email claim is required, and old guest tokens are revoked after claim. | database + unit + e2e | `npm run db:test && npm run test:unit -- guest && npm run test:e2e -- order-downloads` | no W0 | pending |
| 05-W0-04 | TBD | 0 | FUL-02 / FUL-03 | T-05-06 | Admin physical fulfillment follows the manual state flow, tracking is optional, shipped email is queued, and customer tracking is visible. | unit + e2e | `npm run test:unit -- fulfillment && npm run test:e2e -- admin-fulfillment && npm run test:e2e -- order-status` | no W0 | pending |
| 05-W0-05 | TBD | 0 | all Phase 5 access boundaries | T-05-01 / T-05-02 / T-05-04 / T-05-05 | No public PDF URL, no service-role browser import, no raw token leak, and no cross-user order/download access. | security | `npm run test:security` | no W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `supabase/tests/database/05_fulfillment_entitlements.test.sql` - stubs for DIG-02, DIG-04, FUL-01, ACC-02.
- [ ] `supabase/tests/database/05_email_outbox.test.sql` - stubs for DIG-03, DIG-07, OPS-01, OPS-02.
- [ ] `supabase/tests/database/05_guest_claim.test.sql` - stubs for DIG-06, ACC-05.
- [ ] `tests/unit/fulfillment/downloads.test.ts` - token validation and signed URL adapter behavior.
- [ ] `tests/unit/fulfillment/email-outbox.test.ts` - retry/backoff/idempotency and sanitized errors.
- [ ] `tests/unit/fulfillment/physical.test.ts` - manual status flow and shipping notification enqueue.
- [ ] `tests/e2e/order-downloads.spec.ts` - signed-in/guest download and expired-link regeneration.
- [ ] `tests/e2e/admin-fulfillment.spec.ts` - failed email queue, resend, revoke/reissue, and physical tracking updates.
- [ ] `tests/security/fulfillment-boundaries.test.mjs` - public PDF URL exposure, service-role browser imports, raw token leakage, and cross-user helper boundaries.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real Resend delivery | DIG-03 / FUL-03 / OPS-01 | Local tests can verify outbox state and injected send adapters, but real provider delivery depends on seller/provider setup. | In a configured environment, trigger paid digital and shipped physical orders, confirm delivered email content, links, localization, and provider event visibility. |
| Managed Supabase Cron/job execution | OPS-01 | Local execution can test worker functions, but hosted scheduler configuration may require dashboard/provider confirmation. | Confirm the deployed retry worker runs on schedule, processes due rows once, respects retry backoff, and leaves sanitized failure evidence. |

---

## Validation Sign-Off

- [x] All requirements have planned automated verification or Wave 0 dependencies.
- [x] Sampling continuity: no three consecutive implementation tasks should land without automated verification.
- [x] Wave 0 covers all currently missing Phase 5 test files.
- [x] No watch-mode flags.
- [x] Feedback latency target is documented.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending
