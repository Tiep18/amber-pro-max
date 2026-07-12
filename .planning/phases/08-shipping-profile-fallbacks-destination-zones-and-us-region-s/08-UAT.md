# Phase 08 UAT

Date: 2026-07-12
Environment: local Supabase with Playwright-managed Next.js server

| Journey | Result | Evidence |
| --- | --- | --- |
| Exact-country and fallback resolver precedence | Pass | 656 pgTAP assertions |
| Default profile, rules, adjustments, and assignments | Pass | Admin unit/E2E coverage from Plans 04-06 |
| Country-first quote and preserved accepted total | Pass | Lifecycle unit suite and checkout E2E |
| US controlled state/territory and postal validation | Pass | Address unit suite and checkout E2E |
| Material fee confirmation and review without silent acceptance | Pass | `checkout-market-change.spec.ts` |
| Discount regression | Pass | `checkout.spec.ts` |
| Mobile width and control visibility at 390x844 | Pass | Checkout market-change E2E |
| Browser pricing/configuration trust boundary | Pass | `shipping-ui-boundaries.test.mjs` |
| Production client/server bundle boundary | Pass | Next.js production build |

No shipping-critical test is skipped. The disposable forward-repair rehearsal remains intentionally skipped because it requires the explicit `phase8_disposable_non_production=true` guard on a disposable database.
