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
| 06-01-01 | 01 | 1 | ACC-03 | T-06-01 | Customers can manage only their own saved addresses; default uniqueness holds; order snapshots stay immutable. | db + unit + e2e list | `npm run db:test`; `npm run test:unit -- tests/unit/account/addresses.test.ts`; `npm run test:e2e -- tests/e2e/account-retention.spec.ts --list` | No - W0 | pending |
| 06-02-01 | 02 | 2 | ACC-03 | T-06-02 | Saved-address checkout selection refreshes quote facts and shows material-change confirmation before accepted quote changes. | unit + e2e list | `npm run test:unit -- tests/unit/account/addresses.test.ts tests/unit/checkout/shipping-address-ui.test.ts tests/unit/checkout/quote-diff.test.ts`; `npm run test:e2e -- tests/e2e/account-retention.spec.ts --list` | No - W0 | pending |
| 06-03-01 | 03 | 3 | ACC-04 | T-06-03 | Wishlist rows are customer-owned, product-level only, and hydrate current catalog facts without stored commercial snapshots. | db + unit + e2e list | `npm run db:test`; `npm run test:unit -- tests/unit/account/wishlist.test.ts`; `npm run test:e2e -- tests/e2e/account-retention.spec.ts --list` | No - W0 | pending |
| 06-04-01 | 04 | 4 | ACC-04 | T-06-04 | Product card/detail hearts mutate signed-in wishlist state and guests return through localized sign-in without guest wishlist storage. | unit + e2e list | `npm run test:unit -- tests/unit/account/wishlist.test.ts`; `npm run test:e2e -- tests/e2e/account-retention.spec.ts --list` | No - W0 | pending |
| 06-05-01 | 05 | 5 | REV-01 | T-06-05 | Review submission eligibility is derived from paid order lines and cannot be forged by browser input. | db + unit + e2e list | `npm run db:test`; `npm run test:unit -- tests/unit/reviews/eligibility.test.ts`; `npm run test:e2e -- tests/e2e/reviews.spec.ts --list` | No - W0 | pending |
| 06-06-01 | 06 | 6 | REV-02 | T-06-06 | Admin moderation controls public visibility, customer edits remain pending, and each review has at most one shop reply. | db + unit + e2e list | `npm run db:test`; `npm run test:unit -- tests/unit/reviews/eligibility.test.ts`; `npm run test:e2e -- tests/e2e/reviews.spec.ts --list` | No - W0 | pending |
| 06-07-01 | 07 | 7 | NEWS-01, NEWS-02 | T-06-07 | Visitors explicitly subscribe in either locale and consent history avoids raw PII-heavy metadata. | db + unit + e2e list | `npm run db:test`; `npm run test:unit -- tests/unit/newsletter/consent.test.ts`; `npm run test:e2e -- tests/e2e/newsletter.spec.ts --list` | No - W0 | pending |
| 06-08-01 | 08 | 8 | NEWS-02 | T-06-08 | Subscribe confirmation email contains a one-click unsubscribe link backed by hash-only expiring/consumed token records. | db + unit + e2e list | `npm run db:test`; `npm run test:unit -- tests/unit/newsletter/consent.test.ts tests/unit/fulfillment/email-outbox.test.ts`; `npm run test:e2e -- tests/e2e/newsletter.spec.ts --list` | No - W0 | pending |
| 06-09-01 | 09 | 9 | NEWS-03 | T-06-09 | Admin can inspect/search/filter subscribers without consent override actions or raw token/request metadata rendering. | unit + security + e2e list | `npm run test:unit -- tests/unit/newsletter/admin.test.ts`; `npm run test:security`; `npm run test:e2e -- tests/e2e/admin-newsletter.spec.ts --list` | No - W0 | pending |
| 06-10-01 | 10 | 10 | ACC-03, ACC-04, REV-01, REV-02, NEWS-01, NEWS-02, NEWS-03 | T-06-10 | Authenticated customer/admin Playwright fixtures exercise account, review, newsletter, unsubscribe, and admin flows before full-suite completion. | fixtures + full suite + human | `npm run test:e2e -- tests/e2e/account-retention.spec.ts tests/e2e/reviews.spec.ts tests/e2e/newsletter.spec.ts tests/e2e/admin-newsletter.spec.ts`; full suite command below | No - W0 | pending |

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
- [ ] `tests/e2e/fixtures/authenticated-users.ts` - reusable signed-in customer/admin storage states for active Phase 6 E2E coverage.
- [ ] `tests/e2e/fixtures/phase-6-seed.ts` - deterministic data setup for saved addresses, wishlist, paid review eligibility, moderation, newsletter subscribers, and unsubscribe tokens.

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
