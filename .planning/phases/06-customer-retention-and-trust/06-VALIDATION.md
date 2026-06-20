---
phase: 06
slug: customer-retention-and-trust
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-20
---

# Phase 06 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest `4.1.8`, Playwright `1.60.0`, Supabase pgTAP via `supabase test db`, Node security harness |
| **Config file** | `vitest.config.ts`, `playwright.config.ts`, `supabase/config.toml`, `package.json` scripts |
| **Quick run command** | `npm run test:unit` |
| **Full suite command** | `npm run lint && npm run typecheck && npm run test:unit && npm run db:reset && npm run db:lint && npm run db:test && npm run db:types && git diff --exit-code src/types/supabase.ts && npm run build && npm run test:security && npm run test:e2e` |
| **Estimated runtime** | ~900 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit` plus the touched domain's targeted database/security test when schema or authorization changed.
- **After every plan wave:** Run `npm run db:reset && npm run db:test && npm run test:security` for schema/security waves; add the relevant Playwright spec for UI waves.
- **Before `$gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 900 seconds for the full suite; targeted feedback should stay under 180 seconds where feasible.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | ACC-03 | T-06-01 | Customers can manage only their own saved addresses; default uniqueness holds; order snapshots stay immutable. | db + unit + e2e | `npm run db:test`; `npm run test:unit -- tests/unit/account/addresses.test.ts`; `npm run test:e2e -- tests/e2e/account-retention.spec.ts` | No - W0 | pending |
| 06-01-02 | 01 | 1 | ACC-04 | T-06-02 | Wishlist rows are customer-owned, product-level only, and hydrate current catalog facts without stored commercial snapshots. | db + unit + e2e | `npm run db:test`; `npm run test:unit -- tests/unit/account/wishlist.test.ts`; `npm run test:e2e -- tests/e2e/account-retention.spec.ts` | No - W0 | pending |
| 06-02-01 | 02 | 2 | REV-01 | T-06-03 | Review submission eligibility is derived from paid order lines and cannot be forged by browser input. | db + unit + e2e | `npm run db:test`; `npm run test:unit -- tests/unit/reviews/eligibility.test.ts`; `npm run test:e2e -- tests/e2e/reviews.spec.ts` | No - W0 | pending |
| 06-02-02 | 02 | 2 | REV-02 | T-06-04 | Admin moderation controls public visibility; customer edits return reviews to pending; public identity is masked. | db + unit + security + e2e | `npm run db:test`; `npm run test:security`; `npm run test:e2e -- tests/e2e/reviews.spec.ts` | No - W0 | pending |
| 06-03-01 | 03 | 3 | NEWS-01 | T-06-05 | Visitors can explicitly subscribe in Vietnamese or English without requiring an account. | unit + e2e | `npm run test:unit -- tests/unit/newsletter/consent.test.ts`; `npm run test:e2e -- tests/e2e/newsletter.spec.ts` | No - W0 | pending |
| 06-03-02 | 03 | 3 | NEWS-02 | T-06-06 | Consent history is retained, unsubscribe uses scoped token flow, and stored evidence avoids raw PII-heavy logs. | db + unit + security + e2e | `npm run db:test`; `npm run test:unit -- tests/unit/newsletter/consent.test.ts`; `npm run test:security`; `npm run test:e2e -- tests/e2e/newsletter.spec.ts` | No - W0 | pending |
| 06-03-03 | 03 | 3 | NEWS-03 | T-06-07 | Admin can inspect/search/filter subscribers without subscribe/unsubscribe override actions. | unit + security + e2e | `npm run test:unit -- tests/unit/newsletter/admin.test.ts`; `npm run test:security`; `npm run test:e2e -- tests/e2e/admin-newsletter.spec.ts` | No - W0 | pending |
| 06-04-01 | 04 | 4 | ACC-03, ACC-04, REV-01, REV-02, NEWS-01, NEWS-02, NEWS-03 | T-06-01..T-06-07 | End-to-end ownership, review eligibility, moderation, consent, unsubscribe, and account UX remain integrated and regression-safe. | full suite | `npm run lint && npm run typecheck && npm run test:unit && npm run db:reset && npm run db:lint && npm run db:test && npm run db:types && git diff --exit-code src/types/supabase.ts && npm run build && npm run test:security && npm run test:e2e` | Existing harnesses; Phase 6 specs W0 | pending |

*Status: pending - green - red - flaky*

---

## Wave 0 Requirements

- [ ] `supabase/tests/database/06_customer_retention.test.sql` - address/wishlist model, RLS, review eligibility, moderation, newsletter consent, unsubscribe token constraints.
- [ ] `tests/unit/account/addresses.test.ts` - saved address parsing, default behavior, and checkout copy/revalidation helpers.
- [ ] `tests/unit/account/wishlist.test.ts` - product-level wishlist hydration, unavailable status, and guest sign-in routing.
- [ ] `tests/unit/reviews/eligibility.test.ts` - paid-order-line eligibility, one-review-per-customer-product, edit-to-pending moderation behavior.
- [ ] `tests/unit/newsletter/consent.test.ts` - subscribe/resubscribe/unsubscribe state transitions and consent evidence shaping.
- [ ] `tests/unit/newsletter/admin.test.ts` - subscriber list/search/filter behavior and no override mutation surface.
- [ ] `tests/security/retention-boundaries.test.mjs` - rejects full public emails, raw IP/user-agent, raw tokens, service-role use in public/customer UI, and admin consent override actions.
- [ ] `tests/e2e/account-retention.spec.ts` - saved address and wishlist account/product-card/product-detail flows.
- [ ] `tests/e2e/reviews.spec.ts` - verified review submission, moderation, public approved-only display, masked identity, and admin reply behavior.
- [ ] `tests/e2e/newsletter.spec.ts` - localized subscribe and one-click unsubscribe.
- [ ] `tests/e2e/admin-newsletter.spec.ts` - admin subscriber status inspection without consent override.

---

## Manual-Only Verifications

All Phase 6 behaviors should have automated verification. Manual visual review is still recommended for bilingual copy fit, review badge clarity, wishlist heart affordances, address form ergonomics, and newsletter confirmation pages across mobile and desktop.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all missing references
- [ ] No watch-mode flags
- [ ] Feedback latency < 900s
- [ ] `nyquist_compliant: true` set in frontmatter after Wave 0 test infrastructure exists

**Approval:** pending
