---
phase: 05
slug: fulfillment-and-purchase-access
status: draft
nyquist_compliant: true
wave_0_mode: tests_first_tasks
wave_0_complete: true
created: 2026-06-19
updated: 2026-06-19
---

# Phase 05 - Validation Strategy

> Per-phase validation contract for the revised tests-first Phase 5 plan set.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest, Playwright, Supabase database tests, Node security checks |
| **Config file** | `vitest.config.ts`, `playwright.config.ts`, `supabase/config.toml`, package scripts |
| **Quick run command** | `npm run test:unit && npm run db:test` |
| **Full suite command** | `npm run lint && npm run typecheck && npm run test:unit && npm run db:reset && npm run db:lint && npm run db:test && npm run db:types && git diff --exit-code src/types/supabase.ts && npm run build && npm run test:security && npm run test:e2e` |
| **Estimated runtime** | ~600 seconds |

## Tests-First Structure

There is no separate Wave 0 plan. Each implementation plan begins with a failing contract task that creates the relevant database, unit, browser, or security tests before production work. This replaces the stale Wave 0 map and keeps Nyquist validation attached to the exact implementation slice that must turn each contract green.

## Sampling Rate

- **After every task commit:** Run the focused command in that task's `<verify>` block.
- **After every plan:** Run the plan-level verification in the SUMMARY and record pass/fail evidence.
- **After every wave:** Run `npm run lint && npm run typecheck && npm run test:unit && npm run db:test && npm run test:security` when files changed in that wave make the command meaningful.
- **Before `$gsd-verify-work`:** Run the full suite. Real Resend delivery remains a provider setup check; the protected worker route, retry logic, and rendered email bodies are automated locally.
- **Max feedback latency:** 600 seconds.

## Per-Plan Verification Map

| Plan | Wave | Requirements | Secure Behavior | First Contract Task | Automated Command |
|------|------|--------------|-----------------|---------------------|-------------------|
| 05-01 | 1 | DIG-02, DIG-03, DIG-04, DIG-05, DIG-06, DIG-07, FUL-01, FUL-02, FUL-03, ACC-02, ACC-05, OPS-01, OPS-02 | Database foundation, RLS, token hashing, audit, revoke/reissue RPCs, physical states | DB and security contracts | `npm run db:test && npm run test:security` |
| 05-02 | 2 | DIG-04, DIG-06, FUL-01 | Download route validates entitlement before signed URL and denies cross-user/expired/revoked access | Download and guest-token contracts | `npm run test:unit -- tests/unit/fulfillment/downloads.test.ts && npm run test:security` |
| 05-03 | 1 | DIG-03, OPS-01 | Package legitimacy gate before `resend` install | Human package checkpoint | `npm view resend@6.14.0 version time dist-tags repository.url scripts.postinstall` |
| 05-04 | 2 | DIG-03, OPS-01 | Protected Vercel-compatible email worker, plain TS email rendering, retry/backoff | Renderer and worker contracts | `npm run test:unit -- tests/unit/fulfillment/email-outbox.test.ts` |
| 05-05 | 3 | DIG-03, DIG-07, OPS-02 | Admin failed queue, retry, and fresh-token download resend | Admin email contracts | `npm run test:unit -- tests/unit/fulfillment/email-outbox.test.ts && npm run test:security` |
| 05-06 | 4 | DIG-07 | Revoke/reissue service wrappers, admin actions/UI, stale-state handling, audit rows/events | Revoke/reissue contracts | `npm run test:unit -- tests/unit/fulfillment/downloads.test.ts && npm run test:security` |
| 05-07 | 3 | DIG-05, ACC-02 | Owner-only account order history and grouped pattern library | Account/library contracts | `npm run test:unit -- tests/unit/fulfillment/account-access.test.ts` |
| 05-08 | 4 | DIG-06, ACC-05 | Guest reopen, same-email claim, old guest-token revocation | Guest reopen/claim contracts | `npm run test:unit -- tests/unit/fulfillment/account-access.test.ts` |
| 05-09 | 5 | FUL-02, FUL-03 | Manual physical status flow, optional tracking, shipped email enqueue | Physical transition contracts | `npm run test:unit -- tests/unit/fulfillment/physical.test.ts` |
| 05-10 | 6 | FUL-01, FUL-03 | Split customer digital/physical status and safe tracking display | Split-status/tracking contracts | `npm run test:unit -- tests/unit/fulfillment/physical.test.ts && npm run test:security` |
| 05-11 | 7 | all Phase 5 requirements | Final cross-slice database, unit, browser, and security gate | Coverage closure contracts | full suite command above |

## Required Test Files

- `supabase/tests/database/05_fulfillment_entitlements.test.sql` - DIG-02, DIG-04, DIG-07, FUL-01, revoke/reissue/audit/stale-state.
- `supabase/tests/database/05_email_outbox.test.sql` - DIG-03, OPS-01, OPS-02, outbox claim/retry/resend.
- `supabase/tests/database/05_guest_claim.test.sql` - DIG-06, ACC-05, same-email claim and token revocation.
- `supabase/tests/database/05_physical_fulfillment.test.sql` - FUL-02, FUL-03, physical state and shipped email.
- `tests/unit/fulfillment/downloads.test.ts` - entitlement authorization, signed URL adapter, revoke/reissue wrappers.
- `tests/unit/fulfillment/email-outbox.test.ts` - rendering, worker, retry, admin email queue.
- `tests/unit/fulfillment/account-access.test.ts` - owner projections, pattern grouping, guest reopen, claim.
- `tests/unit/fulfillment/physical.test.ts` - physical state validation and customer display mapping.
- `tests/e2e/order-downloads.spec.ts` - signed-in/guest download, expired link, split status.
- `tests/e2e/account-purchases.spec.ts` - account orders, pattern library, guest claim.
- `tests/e2e/admin-fulfillment.spec.ts` - failed queue, resend, revoke/reissue, physical tracking.
- `tests/security/fulfillment-boundaries.test.mjs` - private PDF, service-role, token, signed URL, object path, unsafe metadata, and cross-user boundary scans.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real Resend delivery | DIG-03 / FUL-03 / OPS-01 | Local tests verify outbox state, rendered email bodies, and injected sender behavior; real delivery depends on seller/provider setup. | In a configured environment, trigger paid digital and shipped physical orders, then confirm delivered email content, links, localization, and provider message visibility. |
| Deployed worker schedule | OPS-01 | Local tests can call the protected route; hosted schedule configuration depends on deployment settings. | Confirm the Vercel Cron or deployment scheduler calls the protected route, processes due rows once, respects retry backoff, and leaves sanitized failure evidence. |

## Validation Sign-Off

- [x] All requirements have planned automated verification.
- [x] Tests-first tasks replace stale Wave 0 stubs.
- [x] Sampling continuity: no implementation plan lands without focused automated verification.
- [x] No watch-mode flags.
- [x] Feedback latency target is documented.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending