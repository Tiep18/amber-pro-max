---
phase: 08
status: ready
ambiguity: 0.10
created: 2026-07-12
---

# Phase 08 Specification

## Outcome

Physical checkout can always resolve a deliberate shipping policy when an exact destination rule or approved fallback exists, can apply transparent state-level adjustments for US addresses, and preserves immutable evidence of the rules used. Admins can configure the entire flow from protected interfaces.

## Locked Requirements

1. A shipping profile represents parcel characteristics, not a destination. Products and variants may explicitly attach a profile.
2. `shipping_profiles` supports one active store-default profile. The database prevents multiple active defaults.
3. A profile may contain many exact-country rules and at most one fallback destination rule per currency.
4. Rule lookup precedence is deterministic:
   - explicit variant profile, exact country then fallback;
   - explicit product profile, exact country then fallback;
   - store-default profile, exact country then fallback;
   - otherwise unsupported destination.
5. Variant-level profile ownership continues to override product-level ownership for products with variants.
6. Region adjustments belong to a destination rule, use normalized codes, and support `surcharge` or `replace` modes. Admin UI supports US state and territory codes in v1; the schema may remain country-agnostic.
7. Country selection immediately requests a server quote using the base country or fallback rule. Selecting an applicable region requests another quote. Material market, currency, availability, shipping, or total changes remain blocked behind explicit confirmation.
8. US physical orders require region and postal code at final submit. Country-only quote preview must not require the complete delivery address.
9. Existing first-item/additional-item aggregation remains unchanged: the highest first-item fee is charged once and remaining chargeable units use additional-item fees.
10. Existing exact-country rows migrate without semantic changes. Migration must not silently mark any existing profile or rule as default.
11. Submitted orders retain immutable rule evidence sufficient to explain the shipping total after later admin edits.
12. All admin mutations require server-side admin authorization and database policies. Public checkout reads only constrained RPC projections.

## Admin Experience

- Profile create/edit Sheet manages name, description, active state, and store-default toggle.
- Profile detail manages multiple destination rules rather than creating one new profile per country.
- A destination rule is either an exact country or “Other countries”, with currency, first-item fee, and additional-item fee.
- US rules can manage state/territory adjustments with mode and fee values.
- Product and variant editors expose “Use store default” or an active profile assignment.
- Deactivation/default changes show impact and fail if they would create an invalid ambiguous state.

## Checkout Experience

- Country is selected before the rest of the address and triggers quote calculation immediately.
- US state uses a controlled two-letter option list; postal code becomes required.
- State selection recalculates shipping and explains any changed amount.
- Customers see only the final supported fee, not internal fallback terminology.
- Unsupported state/destination errors preserve the cart and provide a clear recovery path.

## Compatibility And Failure Rules

- No automatic migration of a profile to store default.
- No automatic creation of fallback rules.
- Inactive profiles, rules, and adjustments never participate in checkout.
- Missing or ambiguous rule resolution fails closed and returns sanitized diagnostics.
- Concurrent admin edits cannot alter a quote already accepted for submit; stale checkout uses the existing quote revalidation boundary.

## Acceptance Criteria

- Database tests prove uniqueness, precedence, inactive filtering, exact-over-fallback behavior, and immutable snapshot evidence.
- Unit tests cover fallback resolution, region surcharge and replacement, mixed-profile carts, free shipping, and deterministic insertion order.
- Browser tests cover country-only quote, US state change, fallback country, unsupported destination, default saved address, and mobile no-overflow behavior.
- Existing checkout, market-change, inventory reservation, discount, and payment gates remain green.

## Explicitly Out Of Scope

- Dual-market payment methods and foreign-exchange conversion.
- Carrier APIs, live rates, labels, customs documents, and tracking creation.
- ZIP/postal-prefix remote-area pricing.
- Multiple parcel/package optimization.

