---
phase: 09
slug: independent-locale-and-market-commerce-projection-with-seo-s
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-22
---

# Phase 09 — Validation Strategy

> Per-phase validation contract for preserving SEO/ISR, cache isolation, storefront convergence, and checkout authority while locale and market become independent.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.8, Node test runner, Playwright 1.60.0, Supabase pgTAP, Next.js 16.2.9 production build |
| **Config file** | `vitest.config.ts`, `playwright.config.ts`, `package.json`, `supabase/tests/` |
| **Quick run command** | `npm run test:unit -- tests/unit/i18n/routing.test.ts tests/unit/catalog/market.test.ts tests/unit/storefront-context-lifecycle.test.ts tests/unit/catalog/storefront-projection.test.ts tests/unit/catalog/product-commerce.test.ts tests/unit/cart/market-sync.test.ts tests/unit/checkout/quote-lifecycle.test.ts` |
| **Full suite command** | `npm run ci` |
| **Estimated runtime** | Quick target under 30 seconds; full CI runtime environment-dependent |

---

## Sampling Rate

- **After every task commit:** Run the task's narrow Vitest/Node/pgTAP/Playwright command plus `npm run typecheck` for contract changes.
- **After every plan wave:** Run `npm run lint && npm run typecheck && npm run test:unit`, adding database, security, build, or focused Playwright gates for the affected boundary.
- **Before `$gsd-verify-work`:** `npm run ci` must be green, production build route classification must satisfy the ISR gate, and cookie/IP response-invariance probes must pass.
- **Max feedback latency:** 30 seconds for unit-contract sampling; slower build/database/browser gates run at wave boundaries.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-W0-01 | Wave 0 | 0 | MKT-01, MKT-05 | T-09-01, T-09-04 | URL/cookie/header precedence is deterministic; invalid preferences fail safely | unit + E2E | `npm run test:unit -- tests/unit/i18n/routing.test.ts tests/unit/catalog/market.test.ts && npx playwright test tests/e2e/localization.spec.ts` | ✅ update existing | ⬜ pending |
| 09-W0-02 | Wave 0 | 0 | MKT-02, MKT-03, MKT-04, CAT-06 | T-09-02, T-09-03 | Projection inputs are bounded; every shaping argument and market is isolated; response is private/no-store | unit + security | `npm run test:unit -- tests/unit/catalog/storefront-projection.test.ts && npm run test:security` | ❌ W0 | ⬜ pending |
| 09-W0-03 | Wave 0 | 0 | CAT-08 | T-09-03, T-09-05 | Stale/mismatched product projection cannot enable Add to Cart | unit | `npm run test:unit -- tests/unit/catalog/product-commerce.test.ts` | ❌ W0 | ⬜ pending |
| 09-W0-04 | Wave 0 | 0 | CART-03 | T-09-03, T-09-06 | Market commit invalidates stale quote state and latest authoritative requote wins | unit | `npm run test:unit -- tests/unit/cart/market-sync.test.ts tests/unit/cart/quote-cache.test.ts` | ❌ W0 | ⬜ pending |
| 09-W0-05 | Wave 0 | 0 | MKT-01, MKT-02, OPS-04 | T-09-03, T-09-06 | Resolving/error/rapid-switch/focus/cross-tab lifecycle converges on server context | unit | `npm run test:unit -- tests/unit/storefront-context-lifecycle.test.ts` | ❌ W0 | ⬜ pending |
| 09-SEO-01 | Final gate | final | SEO-02, SEO-03, SEO-04 | T-09-02 | Public HTML, metadata, JSON-LD, sitemap, and robots are identical across cookie/IP variants | unit + build + E2E | `npm run build && npm run test:unit -- tests/unit/content/seo.test.ts tests/unit/content/json-ld.test.ts && npx playwright test tests/e2e/launch-seo.spec.ts tests/e2e/catalog-detail-seo.spec.ts` | ✅ extend existing | ⬜ pending |
| 09-SEO-02 | Final gate | final | SEO-02, SEO-03, SEO-04 | T-09-02 | Home/catalog/category/collection/product are static or ISR and never request-time dynamic | build assertion | `npm run build` plus the phase build-route assertion | ❌ W0 assertion | ⬜ pending |
| 09-CAT-01 | Surface waves | mixed | MKT-02, MKT-03, MKT-04, CAT-05, CAT-06, CAT-08 | T-09-02, T-09-03 | All four locale/market combinations show complete correct products, facets, variants, currency, and availability | E2E | `npx playwright test tests/e2e/catalog-market.spec.ts tests/e2e/catalog-discovery.spec.ts` | ✅ rewrite/extend | ⬜ pending |
| 09-CART-01 | Cart wave | mixed | CART-03 | T-09-03, T-09-06 | Market change requotes and visibly reports removed/repriced/currency-changed lines | unit + E2E | `npm run test:unit -- tests/unit/cart/market-sync.test.ts && npx playwright test tests/e2e/cart.spec.ts` | ❌ W0 + ✅ extend | ⬜ pending |
| 09-CHK-01 | Checkout gate | final | MKT-06, CART-03, CART-05 | T-09-03, T-09-05 | Destination overrides browsing market; material changes block; submit revalidates immutable authoritative evidence | unit + DB + E2E | `npm run test:unit -- tests/unit/checkout/quote-lifecycle.test.ts tests/unit/checkout/submit-checkout.test.ts && npm run db:test && npx playwright test tests/e2e/checkout.spec.ts tests/e2e/checkout-market-change.spec.ts` | ✅ extend existing | ⬜ pending |
| 09-OPS-01 | Final gate | final | OPS-04 | All | Guest/account, digital/physical/mixed, PayPal/VietQR, races, failure, reload, focus, and multi-tab matrix passes | full CI | `npm run ci` | ✅ infrastructure + ❌ cases | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Threat References

| ID | Threat | Required proof |
|----|--------|----------------|
| T-09-01 | Forged geo header or invalid market/locale preference | Suggestion-only semantics, strict enum validation, destination/database remain order authority |
| T-09-02 | Shared-cache cross-market leakage or cache poisoning | Request APIs absent from static/cache scopes, complete cache arguments, private/no-store personalized responses, invariance/isolation tests |
| T-09-03 | Stale response or stale offer after rapid market transition | Monotonic generation/abort, context-projection agreement, fail-closed purchase controls, server requote |
| T-09-04 | Open redirect or unsafe query propagation | Equivalent localized internal paths and route-specific allowlists only |
| T-09-05 | Projection fingerprint treated as purchase authority | Fingerprint gates UI only; quote/submit/database recalculate and validate authoritative facts |
| T-09-06 | Cross-tab/focus divergence or optimistic mutation failure | Broadcast invalidation only, server refetch, rollback/error state, latest-request-wins requote |

---

## Wave 0 Requirements

- [ ] `tests/unit/storefront-context-lifecycle.test.ts` — lifecycle, generation, abort, action failure, focus, and cross-tab notification contracts.
- [ ] `tests/unit/catalog/storefront-projection.test.ts` — strict inputs, complete result/facet replacement, cache argument isolation, and private response headers.
- [ ] `tests/unit/catalog/product-commerce.test.ts` — projection identity and context/market/generation agreement before purchase.
- [ ] `tests/unit/cart/market-sync.test.ts` — quote-cache invalidation, latest-request-wins requote, and material diffs.
- [ ] Build-route assertion script/test — home, catalog, category, collection, and product must report static/ISR rather than dynamic rendering.
- [ ] Rewrite stale market/locale assertions in `tests/unit/i18n/routing.test.ts`, `tests/unit/catalog/market.test.ts`, `tests/e2e/localization.spec.ts`, and `tests/e2e/catalog-market.spec.ts`.
- [ ] Extend `tests/security/catalog-boundaries.test.mjs` for validated projection inputs, private/no-store delivery, cache isolation, forbidden request APIs in static paths, and non-authoritative projection fingerprints.
- [ ] Add Playwright fixtures/cases for four locale/market combinations, rapid A→B→A switching, delayed stale response, action failure rollback, reload/navigation, focus, and multi-tab convergence.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Vercel deployment country suggestion | MKT-05 | Local development does not supply the trusted platform header | On a Vercel preview with no `ACTIVE_MARKET`, verify a VN request resolves `vn`, a non-VN request resolves `intl`, the cookie persists, and explicit user choice wins thereafter. Do not use this result as checkout authority. |
| Search-engine validation after deployment | SEO-02, SEO-03, SEO-04 | External crawler/rendering behavior and rich-result tooling are outside normal deterministic CI | Inspect canonical/hreflang/JSON-LD/robots/sitemap in the preview, run the official rich-results/URL inspection tooling, and confirm locale-default offers remain stable while non-default market UI hydrates. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verification or Wave 0 dependencies.
- [ ] Sampling continuity: no three consecutive tasks lack automated verification.
- [ ] Wave 0 covers every missing test reference.
- [ ] No watch-mode flags are used.
- [ ] Unit-contract feedback latency remains under 30 seconds.
- [ ] Production build proves public route static/ISR classification.
- [ ] Cookie/IP variants prove SEO/public response determinism and private projection cache isolation.
- [ ] Full checkout/payment/inventory regression gate passes without weakening server/database authority.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending execution
