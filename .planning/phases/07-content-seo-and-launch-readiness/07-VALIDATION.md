---
phase: 07
slug: content-seo-and-launch-readiness
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-23
---

# Phase 07 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.8, Playwright 1.60.0, Supabase database tests, Node security tests |
| **Config file** | `vitest.config.ts`, `playwright.config.ts`, `supabase/tests/database/`, `tests/security/` |
| **Quick run command** | `npm run test:unit -- tests/unit/content/seo.test.ts tests/unit/content/publish-checks.test.ts tests/unit/operations/redaction.test.ts` |
| **Full suite command** | `npm run ci` |
| **Estimated runtime** | Targeted checks under 60 seconds; full CI varies by browser/database startup |

---

## Sampling Rate

- **After every task commit:** Run the targeted Vitest, database, security, or Playwright command for the touched slice.
- **After every plan wave:** Run `npm run lint && npm run typecheck && npm run test:unit && npm run db:test && npm run test:security`.
- **Before `$gsd-verify-work`:** `npm run ci` must be green and manual launch evidence must be recorded.
- **Max feedback latency:** 60 seconds for targeted checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | BLOG-01 | T-07-01 | Draft and future-scheduled posts never appear in public queries; preview requires admin authorization. | unit + db + e2e | `npm run test:unit -- tests/unit/content/blog.test.ts && npm run db:test` | No - W0 | pending |
| 07-01-02 | 01 | 1 | BLOG-02 | Category requirements are server enforced; optional tags and related products expose only public catalog facts. | unit + db + e2e | `npm run test:unit -- tests/unit/content/blog-taxonomy.test.ts` | No - W0 | pending |
| 07-02-01 | 02 | 2 | SEO-02 | Canonical and hreflang output use valid public localized URLs only. | unit + e2e | `npm run test:e2e -- tests/e2e/launch-seo.spec.ts` | No - W0 | pending |
| 07-02-02 | 02 | 2 | SEO-03 | JSON-LD is built from authoritative facts and serialized without stored-XSS injection. | unit + e2e | `npm run test:unit -- tests/unit/content/json-ld.test.ts` | No - W0 | pending |
| 07-02-03 | 02 | 2 | SEO-04 | Sitemap and robots output exclude admin, API, draft, private download, and operational URLs. | unit + e2e | `npm run test:e2e -- tests/e2e/sitemap-robots.spec.ts` | No - W0 | pending |
| 07-03-01 | 03 | 2 | ADM-01 | Dashboard and all linked admin operations require server-side admin authorization. | unit + e2e | `npm run test:e2e -- tests/e2e/admin-dashboard.spec.ts` | No - W0 | pending |
| 07-03-02 | 03 | 2 | OPS-03 | Operational errors are redacted before storage and display; raw secrets, signatures, tokens, addresses, and unnecessary PII are rejected. | unit + db + security | `npm run test:security && npm run test:unit -- tests/unit/operations/redaction.test.ts` | No - W0 | pending |
| 07-04-01 | 04 | 2 | LEGAL-01 | Required bilingual policy pages must pass publish checks before storefront/checkout links resolve publicly. | unit + e2e | `npm run test:e2e -- tests/e2e/policies.spec.ts` | No - W0 | pending |
| 07-04-02 | 04 | 2 | LEGAL-02 | Structured launch settings fail closed when countries, tax stance, policy state, or required approvals are unresolved. | unit + db + e2e | `npm run test:unit -- tests/unit/operations/launch-gates.test.ts` | No - W0 | pending |
| 07-05-01 | 05 | 3 | OPS-04 | Critical guest/account checkout, payment, download, tracking, localization, and authorization journeys remain green. | e2e + security + ci | `npm run ci` | Existing suite plus W0 additions | pending |

*Status: pending, green, red, or flaky.*

---

## Wave 0 Requirements

- [ ] `tests/unit/content/blog.test.ts` - BLOG-01 draft, preview, publish, schedule, unpublish, and scheduled visibility.
- [ ] `tests/unit/content/blog-taxonomy.test.ts` - BLOG-02 category, tags, and related-product behavior.
- [ ] `tests/unit/content/publish-checks.test.ts` - BLOG-01 and LEGAL-01 localized publish blockers.
- [ ] `tests/unit/content/seo.test.ts` - SEO-02 canonical and alternate URL helpers.
- [ ] `tests/unit/content/json-ld.test.ts` - SEO-03 structured-data builders and safe serialization.
- [ ] `tests/unit/operations/redaction.test.ts` - OPS-03 redaction schema and forbidden-value handling.
- [ ] `tests/unit/operations/launch-gates.test.ts` - LEGAL-02 and context decisions D-15/D-16.
- [ ] `tests/e2e/launch-seo.spec.ts` - SEO-02/SEO-03 localized metadata and JSON-LD.
- [ ] `tests/e2e/sitemap-robots.spec.ts` - SEO-04 public inclusion and private exclusion.
- [ ] `tests/e2e/admin-dashboard.spec.ts` - ADM-01 actionable dashboard and authorization.
- [ ] `tests/e2e/policies.spec.ts` - LEGAL-01 policy publishing, footer links, and checkout links.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PayPal sandbox webhook delivery and capture evidence | OPS-04 | Requires provider sandbox and externally delivered HTTPS webhook events. | Complete an international sandbox purchase, verify webhook authenticity/evidence, and confirm exactly one paid transition. |
| Seller-approved VietQR bank evidence | OPS-04 | Requires a real seller-approved bank-reference workflow outside automated tests. | Place a VND order, verify exact amount/reference/deadline, record approved evidence, and confirm/reject through protected admin UI. |
| Enabled destination countries and tax stance approval | LEGAL-02 | These are seller/business decisions, not facts the test suite can choose. | Record approved countries and tax stance in launch settings, then verify unresolved settings block launch readiness. |
| Production-like SEO crawl and rich-result review | SEO-02, SEO-03, SEO-04 | External crawler/search tooling and deployed origin behavior cannot be fully proven in local unit tests. | Crawl deployed localized URLs; verify canonical/hreflang, sitemap index, robots, and representative Product/Article JSON-LD. |
| Accessibility and performance launch review | OPS-04 | Browser/device and production-like performance require human review in addition to automated assertions. | Run representative mobile/desktop journeys, inspect focus/order/labels, and review agreed performance budgets. |

---

## Validation Sign-Off

- [ ] All tasks have automated verification or Wave 0 dependencies.
- [ ] Sampling continuity: no three consecutive tasks without automated verification.
- [ ] Wave 0 covers all missing references.
- [ ] No watch-mode flags.
- [ ] Targeted feedback latency is under 60 seconds.
- [ ] `nyquist_compliant: true` is set in frontmatter.

**Approval:** pending
