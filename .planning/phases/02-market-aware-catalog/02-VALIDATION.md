---
phase: 2
slug: market-aware-catalog
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-12
approved: 2026-06-12
---

# Phase 2 - Validation Strategy

> Nyquist validation contract for the market-aware bilingual catalog.

## Test Infrastructure

| Property | Value |
|----------|-------|
| Frameworks | Vitest 4.x, pgTAP through Supabase CLI, Playwright 1.x, Node static security tests |
| Config files | `vitest.config.ts`, `playwright.config.ts`, `supabase/config.toml` |
| Quick command | `npm run test:unit -- tests/unit/catalog && npm run db:test` |
| Full command | `npm run ci` |
| Execution constraint | Run Supabase reset, lint, test, and type generation sequentially on Windows |

## Risk Map

| Risk ID | Failure Mode | Impact | Primary Evidence |
|---------|--------------|--------|------------------|
| V-02-01 | VN and international offers or prices leak across markets | Shopper sees an ineligible product or wrong currency | pgTAP query tests, Vitest market/query tests, isolated Playwright contexts |
| V-02-02 | Catalog tables or mutations bypass RLS/admin authorization | Unauthorized catalog, inventory, or PDF access | pgTAP role matrix plus non-admin E2E |
| V-02-03 | Product/variant inventory exists at the wrong ownership level | Incorrect availability and future oversell risk | DB constraints, unit tests, admin E2E |
| V-02-04 | PDF object or metadata becomes public | Paid digital asset can be shared before purchase | Storage RLS tests, static scan, DOM/network assertions |
| V-02-05 | Published localized page lacks slug/SEO/social metadata | Broken indexing, duplicate URLs, weak sharing previews | publish-gate tests and SEO E2E |
| V-02-06 | Phase 2 creates customer PDF fulfillment before payment | Violates the full-payment invariant | static source scan and absence assertions |
| V-02-07 | Market cookie/header creates cache or redirect abuse | Cross-market disclosure or unsafe navigation | unit tests plus Playwright switch/refresh/locale cases |

## Sample Dimensions

Every automated matrix must sample the dimensions below instead of relying on one happy-path product.

| Dimension | Required Samples |
|-----------|------------------|
| Role | anonymous, customer A, customer B, database-owned admin |
| Locale | `vi`, `en`, wrong-locale slug |
| Market | `vn`, `intl`, invalid value, missing choice with VN/non-VN country signal |
| Availability | VN-only, INTL-only, both markets, disabled offer |
| Product type | `pdf_pattern`, physical without variants, physical with variants |
| State | draft, published, archived |
| Inventory | product-level in stock/out of stock; variant-level in stock/out of stock; invalid mixed ownership |
| Media | public primary/gallery/social image, optional variant image, private PDF metadata |
| Routing | listing, category, collection, product detail, unavailable direct URL |
| SEO | Vietnamese and English title/description/slug/canonical/alternate/social image |

## Validation Matrix

| Capability | Plans | Test Layer | Automated Command | Required Proof |
|------------|-------|------------|-------------------|----------------|
| Catalog schema and RLS | 02-01 | pgTAP | `npm run db:reset && npm run db:lint && npm run db:test` | Invalid type, currency, slug, variant, inventory, and role operations are rejected |
| Admin product basics | 02-02 | Vitest + Playwright | `npm run test:unit -- tests/unit/catalog/publish-checks.test.ts && npm run test:e2e -- tests/e2e/admin-product.spec.ts` | Draft save works; publish remains blocked until bilingual content, offers, SEO, and type data are complete |
| Private PDF metadata | 02-03, 02-08 | Storage pgTAP + E2E + static | `npm run db:test && npm run test:e2e -- tests/e2e/admin-media.spec.ts && npm run test:security` | Public images load; PDF bucket/path is private; only admin can manage PDF objects |
| Variants and inventory | 02-04 | pgTAP + Vitest + Playwright | `npm run test:unit -- tests/unit/catalog/variants.test.ts && npm run test:e2e -- tests/e2e/admin-variants.spec.ts` | Explicit variants, SKU, overrides, effective price, and exactly one inventory level are enforced |
| Market resolution/isolation | 02-05, 02-06 | Vitest + pgTAP + Playwright | `npm run test:unit -- tests/unit/catalog/market.test.ts tests/unit/catalog/money.test.ts tests/unit/catalog/queries.test.ts && npm run test:e2e -- tests/e2e/catalog-market.spec.ts` | IP is suggestion only; manual choice persists; VN/INTL assortment and currency never cross |
| Listing/search/discovery | 02-07 | Playwright | `npm run test:e2e -- tests/e2e/catalog-discovery.spec.ts` | Listing, category, collection, search, filters, sort, and type badges use active-market data |
| Product detail/localized SEO | 02-08 | Playwright | `npm run test:e2e -- tests/e2e/catalog-detail-seo.spec.ts` | Unavailable detail remains visible without price/action; variants disable correctly; canonical/alternates/social metadata are localized |
| No fulfillment before payment | 02-03, 02-08 | Static security | `npm run test:security` | No customer PDF URL, entitlement, download email, or fulfillment route exists in Phase 2 |
| Integrated phase gate | 02-08 | Full suite | `npm run ci` | Clean DB/Storage reset through lint, tests, type generation, build, security, and browser journeys passes |

## Sampling Rate

- After each task: run the narrow command named in that task.
- After each wave: run typecheck plus all tests created or modified in that wave.
- Before `$gsd-verify-work`: run `npm run ci` from a clean local Supabase state.
- Browser market tests use separate contexts for VN and international sessions to detect shared cache/cookie leakage.
- Database tests use transactional fixtures and the complete role matrix.

## Wave 0 Coverage

- [x] Plan 02-01 owns catalog model/RLS pgTAP files.
- [x] Plan 02-03 owns Storage enablement and private PDF policy tests.
- [x] Plans 02-05 and 02-06 own market, money, and query unit tests.
- [x] Plans 02-02 through 02-08 own focused Playwright specs without RED-only completion gates.
- [x] Plan 02-08 owns static fulfillment/PDF boundary checks and the full CI gate.

`wave_0_complete: true` means each missing validation artifact has a plan owner before execution.

## Verify-Work Evidence

`$gsd-verify-work 02` should review:

1. CI output proving all validation-matrix commands pass.
2. Browser evidence for `/vi` and `/en` under both market choices.
3. Network/DOM evidence that unavailable pages expose no wrong-market price or private PDF path.
4. Admin evidence for PDF upload association, physical variant editing, and inventory ownership.
5. Metadata evidence for localized canonical URLs, `hreflang`, and public social images.
6. Static scan evidence that no digital entitlement, customer download, or fulfillment-before-payment path exists.

## Validation Sign-Off

- [x] Every implementation task has an automated command that returns exit code 0 when complete.
- [x] No task completion depends on an intentionally failing RED command.
- [x] Market isolation, RLS, variants/inventory, private PDF metadata, localized SEO, and payment-before-fulfillment boundaries have multi-layer evidence.
- [x] `nyquist_compliant: true`.
