---
phase: 08-shipping-profile-fallbacks-destination-zones-and-us-region-s
plan: "04"
subsystem: admin-shipping
tags: [shipping, admin, authorization, catalog]
requires:
  - phase: 08-03
    provides: profile/default/rule/region database model and authoritative checkout boundary
provides:
  - Authorized, sanitized admin actions for profiles, defaults, rules, and US adjustments
  - Explicit product and variant shipping-profile assignment actions
affects: [admin-shipping-ui, catalog-editor]
key-files:
  modified:
    - src/checkout/admin-shipping-actions.ts
    - src/catalog/actions.ts
    - src/catalog/variant-actions.ts
    - tests/unit/checkout/admin-commerce-actions.test.ts
decisions:
  - A fallback rule persists a null country; a specific-country rule requires a normalized country.
  - store_default removes only the owner-specific assignment row.
  - Generated Supabase types are bridged narrowly for Phase 8 tables/RPCs until non-production migration types are regenerated.
verification:
  - npm.cmd run test:unit -- tests/unit/checkout/admin-commerce-actions.test.ts
  - npm.cmd run lint
  - npm.cmd run typecheck
commits:
  - 3c2f082 feat(08-04): add validated shipping admin actions
  - 1f0bb9e feat(08-04): add explicit shipping profile assignments
  - aa5d3d6 test(08-04): cover shipping admin action contracts
---

# Phase 08 Plan 04 Summary

Shipping administration mutations now authorize before any privileged client is created.
Profiles are saved independently from destination rules; rules distinguish exact-country
from fallback destinations, and US adjustments accept only normalized state or territory
codes with separate surcharge/replace fees.

Store-default selection calls the single atomic RPC. Product and variant assignments keep
their independent owner rows: selecting the store default deletes only that owner’s row,
so variant overrides and product inheritance retain their established precedence.

Focused unit tests cover invalid fallback/US-region input before database access and the
single default-selection RPC. Lint and TypeScript typecheck passed. The global security
suite retains two unrelated pre-existing catalog/newsletter failures.
