---
status: resolved
trigger: "Implement the accepted P0 audit item: physical variants without a market override must inherit the parent product market price end to end."
created: 2026-07-14
updated: 2026-07-14
---

# Debug Session: Variant Parent Price Fallback

## Symptoms

- Expected behavior: Per Phase 02 decision D-09, a physical variant uses its market-specific override only when present; otherwise storefront and checkout use the enabled parent product price for that market.
- Actual behavior: The admin pricing helper reports parent fallback, but the public catalog projection marks a variant without a `variant_market_offers` row as disabled with no price, and checkout rejects the same line.
- Error messages: Storefront exposes the variant as unavailable/disabled and checkout cannot produce an accepted ready quote even though the parent market offer is valid.
- Timeline: Present since the public catalog detail projection and checkout authority were implemented after the Phase 02 pricing decision.
- Reproduction: Publish a physical product with an enabled parent USD offer and a variant that has inventory but no USD override; inspect the public detail projection or add that variant to an international cart.

## Current Focus

- hypothesis: Confirmed: public SQL projections and the authoritative checkout verifier treated the existence of a variant offer row as required instead of optional override data.
- test: Database regression coverage now proves parent inheritance, explicit override precedence, stale quote rejection, and explicit-disable blocking.
- expecting: Resolved behavior is consistent across catalog list/detail, wishlist projection, storefront parsing, admin effective-price display, and authoritative checkout.
- next_action: None; full schema reset, lint, unit/type checks, and all 746 database tests pass.
- reasoning_checkpoint: The accepted audit and explicit Phase 02 decision provide expected behavior and a deterministic reproduction; no additional user symptom questions are required.
- tdd_checkpoint: TDD mode is disabled globally, but regression coverage is required alongside the fix.

## Evidence

- timestamp: 2026-07-14
  checked: `.planning/phases/02-market-aware-catalog/02-CONTEXT.md` and `src/catalog/variant-pricing.ts`
  found: D-09 and the admin helper both define parent price inheritance when a market-specific variant override is absent.
  implication: Parent fallback is the intended domain rule, not a new behavior choice.

- timestamp: 2026-07-14
  checked: `supabase/migrations/20260703102053_catalog_detail_media_images.sql` and latest checkout authority migration
  found: Public projection and checkout eligibility require a matching enabled variant offer row, so a missing override becomes disabled rather than inherited.
  implication: Storefront display and checkout authority disagree with admin behavior and the product pricing contract.

- timestamp: 2026-07-14
  checked: `src/components/catalog/add-to-cart.tsx`, `src/checkout/quote.ts`, and `src/catalog/variant-pricing.ts`
  found: Storefront and TypeScript checkout consumers already honor parent fallback when the SQL projection marks the variant enabled and supplies the effective price; the admin helper incorrectly ignored an explicit disabled row.
  implication: SQL must project the effective offer, while the admin helper must treat any explicit row as authoritative.

- timestamp: 2026-07-14
  checked: Clean local schema after `npm run db:reset`, `npm run db:lint`, and `npm run db:test`
  found: The new migration applies without error, schema lint reports no errors, and all 746 database assertions pass including 8 focused fallback assertions.
  implication: Projection, RLS-facing RPCs, and authoritative checkout remain compatible with the full database model.

## Eliminated

- hypothesis: The variant override row should be auto-created for every market.
  reason: D-09 explicitly models overrides as optional and parent prices as defaults; requiring duplicated rows would undermine that decision and create drift.

## Resolution

- root_cause: Optional `variant_market_offers` rows were implemented as mandatory in public projections and checkout eligibility. Missing rows therefore disabled variants instead of inheriting the enabled parent offer. The admin helper also skipped disabled rows and accidentally fell back to the parent.
- fix: Added an append-only migration that uses override-first/parent-fallback selection in catalog list/detail, customer wishlist, and checkout authority. Missing rows inherit; enabled rows override; explicit disabled rows block. Updated the admin effective-price helper to the same semantics.
- verification: `npm run db:reset`; `npm run db:lint`; `npm run db:test` (746 assertions); `npx vitest run tests/unit/catalog/variants.test.ts` (15 tests); `npx tsc --noEmit --incremental false`; focused ESLint; `git diff --check`.
- files_changed: `supabase/migrations/20260714190000_inherit_parent_variant_market_price.sql`, `supabase/tests/database/02_variant_price_fallback.test.sql`, `supabase/tests/database/02_catalog_queries.test.sql`, `src/catalog/variant-pricing.ts`, `tests/unit/catalog/variants.test.ts`.
