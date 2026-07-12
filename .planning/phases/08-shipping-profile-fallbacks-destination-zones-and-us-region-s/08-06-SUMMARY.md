---
phase: 08-shipping-profile-fallbacks-destination-zones-and-us-region-s
plan: "06"
subsystem: admin-catalog-shipping-assignments
tags: [shipping, admin, catalog, variants, ui]
requires:
  - phase: 08-04
    provides: protected product and variant shipping-profile assignment actions
  - phase: 08-05
    provides: admin shipping management workspace
provides:
  - Product parcel-profile assignment control in the catalog editor
  - Variant parcel-profile override/inheritance control in the variant editor
  - Server-only assignment data projection for active profiles, default profile, product assignment, and variant overrides
  - Database trigger repair allowing product assignments to remain the variant inheritance layer
  - Assignment precedence and responsive e2e coverage
affects: [admin-catalog-editor, admin-variant-editor, shipping-profiles, e2e]
key-files:
  created:
    - src/app/admin/catalog/shipping-assignment-data.ts
    - src/components/admin/commerce/shipping-assignment-sheet.tsx
    - supabase/migrations/20260712080600_allow_product_shipping_profiles_with_variants.sql
    - tests/e2e/admin-shipping-assignments.spec.ts
  modified:
    - src/app/admin/catalog/[productId]/page.tsx
    - src/app/admin/catalog/[productId]/variants/page.tsx
    - src/components/admin/catalog/product-form.tsx
    - src/components/admin/catalog/variant-editor.tsx
    - tests/e2e/fixtures/authenticated-users.ts
decisions:
  - Product-level shipping profiles remain valid for products with variants because variants without overrides inherit product assignment before store default.
  - Assignment UI consumes server-projected state and Plan 08-04 actions only; no client database reads or writes were introduced.
  - Store default is represented by the explicit store_default sentinel and never auto-selects a concrete profile in the editor.
  - Product Store default preview uses the actual active store default profile, not the current product effective profile.
verification:
  - npm.cmd run lint
  - npm.cmd run typecheck
  - npm.cmd run test:e2e -- tests/e2e/admin-shipping-assignments.spec.ts
  - npm.cmd run test:e2e -- tests/e2e/admin-shipping.spec.ts
  - npm.cmd run test:security (expected pre-existing failures remain)
remote:
  supabase:
    pushed:
      - 20260712080300_checkout_shipping_quote_snapshot.sql
      - 20260712080600_allow_product_shipping_profiles_with_variants.sql
---

# Phase 08 Plan 06 Summary

Catalog editors now expose parcel-profile ownership without duplicating shipping
mutation logic. The product editor shows the effective parcel profile and source,
then lets admins switch between Store default and any active explicit profile through
a compact Sheet. The variant editor uses the same Sheet for explicit overrides and
shows the inherited Product or Store default profile when no variant override exists.

Assignment data is loaded server-side in the admin catalog pages through
`shipping-assignment-data.ts`. Client components receive only active profile options,
the active store default, current explicit owner rows, and the resulting effective
source text. Saves call only the existing Plan 08-04 server actions with either an
active profile UUID or the `store_default` sentinel.

During e2e verification, the legacy database trigger was found to reject product-level
shipping assignment when a product already had variants. That contradicted the Phase 08
precedence contract, where variant overrides win and missing variant overrides inherit
the product assignment before falling back to the store default. Migration
`20260712080600_allow_product_shipping_profiles_with_variants.sql` replaces the trigger
function so product assignments are still limited to physical products but remain valid
for products with variants.

Remote Supabase was brought in sync for this plan. `supabase db push --linked --yes`
applied the previously unpushed Plan 08-03 checkout shipping quote snapshot migration
and the Plan 08-06 trigger repair migration.

## Verification Notes

`admin-shipping-assignments.spec.ts` covers product assignment after variants exist,
Store default removal, product inheritance into variants, variant override precedence,
override removal back to product inheritance, persisted DB rows, mobile no-overflow,
and a 44px action target check.

`admin-shipping.spec.ts` remains green for the Plan 08-05 shipping workspace.

`npm.cmd run test:security` still fails only the two known unrelated baseline checks:
public catalog digital fulfillment wording and admin newsletter read-only consent
surface. Shipping-specific security checks passed.
