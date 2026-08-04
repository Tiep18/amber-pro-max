---
status: testing
phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
source: [09-15-PLAN.md, 09-VALIDATION.md]
started: 2026-08-04T03:27:46Z
updated: 2026-08-04T03:27:46Z
---

## Current Test

number: 1
name: Verify Vercel country suggestion without weakening destination-owned checkout authority.
expected: |
  VN origin suggests vn, non-VN origin suggests intl, missing or invalid signals fail to intl,
  and explicit user choice persists. A physical shipping destination remains final checkout authority.
awaiting: Vercel preview URL and user verification

## Automated Evidence

### Final Local CI

command: `npm run ci`
result: [passed]
evidence: 463.5 seconds; 101 unit files / 889 tests; 41 database files / 942 assertions with only documented conditional rehearsals skipped; 58 security checks; Playwright with no failed test IDs; production build and static/ISR route classification green.

### Phase 09 Storefront Matrix

command: `npm run test:e2e -- tests/e2e/localization.spec.ts tests/e2e/catalog-market.spec.ts tests/e2e/catalog-discovery.spec.ts tests/e2e/storefront-state.spec.ts tests/e2e/storefront-market-convergence.spec.ts tests/e2e/cart.spec.ts`
result: [passed]
evidence: 46/46 current-code browser cases passed.

## Manual Tests

### 1. Vercel Country Suggestion

expected: Without `ACTIVE_MARKET`, VN origin suggests `vn`, non-VN origin suggests `intl`, and missing or invalid signals fall back to `intl`; explicit user choice wins after refresh; a physical destination still determines final checkout market and payment pair.
evidence_required: Preview origin, sanitized origin condition (VN, non-VN, missing, or invalid), active market result, refresh result, destination-authority result, reviewer, and date. Do not record raw cookies, full headers, customer data, tokens, credentials, or provider secrets.
result: [pending]

### 2. External SEO Rendering

expected: Representative `/vi` and `/en` product, catalog, category, collection, technique, and tag pages expose deterministic canonical and `hreflang` links, Product JSON-LD, robots, and sitemap output across market/geo conditions while visible commerce hydrates to the selected market.
evidence_required: Preview origin, representative paths, sanitized market/geo matrix, crawler or rich-result tool name, pass/fail report reference, reviewer, and date. Do not record raw cookies, full headers, customer data, tokens, credentials, or provider secrets.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps

- No Vercel preview exists yet, so both deployment-only checks are pending by explicit user decision.
- Phase 09 must remain awaiting deployment geo/SEO UAT even though all 15 plan artifacts have been executed and local CI is green.
