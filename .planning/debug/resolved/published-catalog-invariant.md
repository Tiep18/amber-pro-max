---
status: resolved
trigger: "Begin implementing the accepted audit items, starting with the P0 published catalog invariant and missing digital asset checkout defense."
created: 2026-07-14
updated: 2026-07-14
---

# Debug Session: Published Catalog Invariant

## Symptoms

- Expected behavior: Every product marked `published` remains eligible for its product type, and checkout never accepts a digital product without a private PDF asset.
- Actual behavior: Product, media, PDF, variant, and inventory mutations can leave the product status as `published` after required data becomes invalid or disappears.
- Error messages: No stable UI error is emitted; the invalid state is silent until storefront, checkout, or fulfillment observes it.
- Timeline: Present in the Phase 02 catalog lifecycle and confirmed by the 2026-07-14 read-only admin product-flow audit.
- Reproduction: Publish a valid PDF product, then remove its private PDF or change its product type; the product remains published and checkout authority checks status/offers without requiring the digital asset.

## Current Focus

- hypothesis: Confirmed. Publish requirements existed only at explicit publish time; later mutations did not preserve eligibility, and checkout did not require a private PDF asset.
- test: Database regressions cover PDF deletion demotion, type-owned data blockers, late variant demotion, and digital checkout rejection without an asset.
- expecting: Resolved; focused pgTAP, schema lint, unit coverage, and TypeScript checks pass.
- next_action: resolved
- reasoning_checkpoint: The invariant now lives at the database mutation boundary, with checkout defense in depth and no public access to the legacy issue implementation.
- tdd_checkpoint: Regression coverage was added alongside the fix because project TDD mode is disabled.

## Evidence

- timestamp: 2026-07-14
  checked: `src/catalog/actions.ts`, `src/catalog/media-actions.ts`, `src/catalog/variant-actions.ts`
  found: Existing product saves and destructive child mutations do not demote published products or re-run publish checks.
  implication: Published state can drift away from the catalog eligibility contract.

- timestamp: 2026-07-14
  checked: `supabase/migrations/20260612230000_market_catalog.sql` and latest checkout authority migration
  found: Publish checks execute only in the explicit publish RPC, while checkout validates product status and offer but not the required PDF asset.
  implication: A published PDF with a removed asset can still reach order creation and later fail fulfillment.

- timestamp: 2026-07-14
  checked: `supabase/migrations/20260714180000_preserve_published_catalog_invariant.sql`
  found: A database-owned post-mutation invariant now demotes only published products that fail publish checks; incompatible data from a prior product type is a first-class publish blocker.
  implication: Admin actions, direct database writes, and future mutation callers share the same lifecycle enforcement.

- timestamp: 2026-07-14
  checked: Checkout commercial verifier and focused pgTAP fixtures
  found: Digital lines now require private PDF metadata before the existing authoritative verifier accepts the quote.
  implication: Missing digital fulfillment metadata is rejected before order creation even if a stale published status is present.

- timestamp: 2026-07-14
  checked: Focused verification
  found: `02_catalog_model`, `08_checkout_shipping_submit_hardening`, and `08_checkout_guest_retry_concurrency` passed 104 tests; database lint reported no schema errors; catalog unit tests passed 15/15; TypeScript passed.
  implication: The lifecycle, checkout, existing guest concurrency boundary, and typed UI blocker mapping remain valid.

## Eliminated

- hypothesis: Client-only authorization is the cause.
  reason: Catalog, media, and variant Server Actions call `requireAdmin()` internally; the defect is lifecycle/data integrity, not missing admin authentication.

## Resolution

- root_cause: Catalog eligibility was a point-in-time publish check rather than a maintained database invariant. Product type changes and destructive child mutations could preserve `published`, and the checkout verifier trusted that status without independently requiring the private PDF asset.
- fix: Added a migration that wraps publish issues with incompatible type-owned data checks, demotes published products after eligibility-breaking product/translation/offer/media/asset/variant/inventory mutations, keeps the legacy issue implementation private, and rejects digital checkout lines without private PDF metadata. Added a stable admin blocker mapping and regression fixtures.
- verification: Fresh local migration reset succeeded. Focused pgTAP passed 104/104, `supabase db lint --local --fail-on error` passed, catalog unit tests passed 15/15, and `tsc --noEmit` passed. A pre-fix full DB run exposed and led to correction of cascade-delete handling; the final full suite remains delegated to the parent after handoff because a focused concurrency fixture commits by design.
- files_changed: supabase/migrations/20260714180000_preserve_published_catalog_invariant.sql; supabase/tests/database/02_catalog_model.test.sql; supabase/tests/database/08_checkout_shipping_submit_hardening.test.sql; supabase/tests/database/08_checkout_guest_retry_concurrency.test.sql; src/catalog/types.ts; src/catalog/publish-checks.ts; src/components/admin/catalog/product-form.tsx; tests/unit/catalog/publish-checks.test.ts
