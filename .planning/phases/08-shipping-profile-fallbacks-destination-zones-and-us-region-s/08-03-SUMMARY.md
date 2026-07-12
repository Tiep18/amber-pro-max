---
phase: 08-shipping-profile-fallbacks-destination-zones-and-us-region-s
plan: "03"
subsystem: checkout-shipping
tags: [shipping, checkout, supabase, security]
requires:
  - phase: 08-02
    provides: canonical private shipping resolver and public v2 quote boundary
provides:
  - Versioned, typed checkout shipping quote boundary using canonical resolver allocations
  - Final-submit US address validation and shipping evidence material-diff detection
  - Authoritative shipping re-resolution wrapper and immutable order allocation snapshots
affects: [checkout, shipping, order-history]
tech-stack:
  added: []
  patterns: [server-authoritative quote revalidation, immutable shipping allocation snapshot]
key-files:
  created:
    - supabase/migrations/20260712080300_checkout_shipping_quote_snapshot.sql
  modified:
    - src/checkout/quote.ts
    - src/checkout/schemas.ts
    - src/checkout/market-revalidation.ts
    - src/checkout/types.ts
    - src/components/checkout/destination-form.tsx
decisions:
  - Browser shipping evidence is accepted only when it exactly matches a transaction-local resolver result.
  - US country-only quote remains valid; physical final submit requires a two-letter state/territory code and postal code.
  - Shipping source/rule/region evidence is material even when the monetary amount is unchanged.
verification:
  - npm.cmd run typecheck
  - npm.cmd run test:unit -- tests/unit/checkout/quote-diff.test.ts tests/unit/checkout/submit-checkout.test.ts tests/unit/checkout/shipping-resolution.test.ts tests/unit/checkout/shipping.test.ts
  - npm.cmd run db:lint
  - node --test tests/security/checkout-boundaries.test.mjs
commits:
  - ee6ea27 feat(08-03): enforce authoritative shipping quotes
---

# Phase 08 Plan 03 Summary

The checkout quote path now calls `get_checkout_shipping_quote_v2` with a bounded
physical-cart intent, normalized country/currency, and optional region. It maps the
canonical allocation output into owned types, calculates deterministic highest-first
fees, and hashes canonical shipping evidence rather than only a shipping total.

The final checkout schema rejects a physical US address without a two-letter state or
territory code and postal code. The destination and saved-address quote refresh paths
now carry the optional region and explicitly request quote version 2.

Migration `20260712080300_checkout_shipping_quote_snapshot.sql` redefines the public
quote RPC with a versioned sanitized result, moves the prior submit function behind a
non-public legacy name, and wraps final submit with authoritative resolver comparison.
It rejects stale shipping before order writes and writes one immutable allocation
snapshot per physical order line after a successful legacy order transaction.

## Verification Notes

Focused checkout unit tests, TypeScript typecheck, SQL lint, and the checkout security
boundary test passed. `npm.cmd run db:test` could not exercise this migration because
the local Supabase reset recreated only the base auth schema, leaving every application
migration table absent; the resulting failures begin in Phase 01 and are unrelated to
this plan. The remote non-production migration has not been pushed from this checkpoint.
