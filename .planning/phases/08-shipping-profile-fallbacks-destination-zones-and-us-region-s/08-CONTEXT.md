---
phase: 08
status: discussed
created: 2026-07-12
---

# Phase 08 Context

## Decisions

- Keep the existing one-profile-per-product or one-profile-per-variant ownership model.
- Treat profiles as parcel templates and destination rules as the country/fallback fee layer.
- Add both a store-default profile and per-profile fallback destination rules; one default flag cannot represent both concepts safely.
- Preserve exact-country behavior and the current highest-first-item aggregation algorithm.
- Implement generic region adjustment storage but expose US states and territories first.
- Support additive surcharges and complete fee replacement.
- Requote on country and state changes, while preserving material-change confirmation.
- Require normalized US state/territory and postal code only at final submit, not for the first country quote.
- Keep all checkout calculations server-authoritative and snapshot the selected rule chain on submitted orders.

## Implementation Boundaries

- Database migration, constrained shipping lookup RPC, generated types, pure shipping domain logic, admin Shipping UI, product/variant assignment controls, checkout address behavior, immutable order evidence, and automated tests are in scope.
- Payment FX, payment-provider expansion, carrier integration, postal remote zones, and package splitting are separate future phases.

## Existing Patterns To Preserve

- Admin authorization through `requireAdmin` plus database RLS.
- Exact-money integer minor units and explicit currency codes.
- Quote hashes and material-change confirmation before replacing an accepted checkout quote.
- Guest/account checkout parity and saved-address reuse.
- Atomic order/reservation submission and immutable order snapshots.

