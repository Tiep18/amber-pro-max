---
status: testing
phase: 07-content-seo-and-launch-readiness
source: [07-10-PLAN.md, 07-VALIDATION.md]
started: 2026-06-24T02:44:28Z
updated: 2026-06-24T02:59:00Z
---

## Current Test

number: 1
name: Complete an international PayPal sandbox purchase through the public HTTPS webhook endpoint.
expected: |
  PayPal delivers a verified webhook, the order records exactly one paid transition,
  inventory finalizes once, and a duplicate delivery creates no duplicate business effect.
awaiting: user response

## Automated Evidence

### Final CI

command: `npm run ci`
result: [passed]
evidence: 43 unit files / 250 tests; 22 database files / 527 tests; 34 security tests; production build; 97 Playwright tests passed and 37 provider/fixture-dependent tests skipped; exit code 0.

### Covered Launch Contracts

- BLOG-01/BLOG-02: published bilingual blog visibility and taxonomy.
- SEO-02/SEO-03/SEO-04: localized metadata, JSON-LD, sitemap index, localized sitemaps, and robots exclusions.
- ADM-01: protected admin dashboard and launch/operations surfaces.
- OPS-03: sanitized operational error storage and display boundaries.
- OPS-04: checkout, payment, order, download, tracking, localization, and authorization journeys.
- LEGAL-01/LEGAL-02: bilingual policy publishing and fail-closed launch settings.

## Manual Tests

### 1. PayPal Sandbox Webhook Delivery

expected: A sandbox USD purchase reaches exactly one verified paid transition through an externally delivered HTTPS webhook, including safe duplicate delivery handling.
evidence_required: Provider order ID, sanitized webhook event ID, local order number, transition timestamp, and duplicate-delivery result. Do not record payer PII, signatures, access tokens, or raw payloads.
result: [pending]

### 2. VietQR Seller Bank Evidence

expected: VND instructions show the seller-approved account, exact amount, immutable order reference, and deadline; protected admin confirmation or rejection records sanitized evidence and correct inventory effects.
evidence_required: Local order number, masked bank account, amount, reference, decision, actor, and timestamp. Do not record full bank credentials or customer private evidence.
result: [pending]

### 3. Policy, Destination, and Tax Approval

expected: The seller approves all enabled destination countries, tax stance, and the published bilingual privacy, sale, return, and digital-download policies; unresolved facts keep launch readiness blocked.
evidence_required: Approval owner, date, enabled country codes, tax stance summary, and published policy versions.
result: [pending]

### 4. Production-Like SEO Crawl

expected: A deployed-origin crawl confirms canonical and hreflang links, sitemap index and locale sitemaps, robots exclusions, and representative Product and Article structured data without private URLs.
evidence_required: Deployed origin, crawl date, representative URLs, crawler/rich-result report references, and reviewer.
result: [pending]

### 5. Accessibility and Performance Review

expected: Representative mobile and desktop storefront, checkout, account, and admin journeys have usable keyboard focus, labels, responsive layout, no 375px horizontal overflow, and accepted performance results.
evidence_required: Browser/device, tested routes, accessibility findings, performance report references, reviewer, and approval date.
result: [pending]

### 6. Monitoring and Redaction Readiness

expected: Operational errors are visible to admins only with sanitized facts, the resolution workflow works, and production monitoring ownership/escalation is approved.
evidence_required: Sanitized test error ID, resolution timestamp, monitoring owner, escalation path, and reviewer. Do not include raw provider payloads, secrets, tokens, signatures, addresses, or unnecessary PII.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps

- All six manual launch approvals remain pending and must be recorded before Phase 07 can be marked complete.
