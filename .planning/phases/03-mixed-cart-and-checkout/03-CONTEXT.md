# Phase 3: Mixed Cart and Checkout - Context

**Gathered:** 2026-06-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a bilingual mixed cart and checkout flow for guest and signed-in
customers. The phase covers cart persistence and merging, server-authoritative
pricing, destination-based market revalidation, reusable shipping rules,
discount validation, checkout drafts, immutable line snapshots, atomic
inventory reservations, and admin-reviewed market exception requests.

Payment capture and confirmation, final inventory consumption or release,
order lifecycle management, digital entitlements, and physical fulfillment
belong to later phases.

</domain>

<decisions>
## Implementation Decisions

### Cart Persistence and Identity
- **D-01:** Guest carts persist in the browser for 30 days.
- **D-02:** Browser storage contains only `productId`, optional `variantId`, quantity, added/updated timestamps, and the market active when the item was added.
- **D-03:** Browser storage must not contain authoritative price, product name, stock, validated discount state, address, email, or payment data. The server reloads current product data and recalculates the cart.
- **D-04:** Signed-in carts synchronize across devices.
- **D-05:** When a customer signs in, merge the guest cart into the account cart. Matching lines have their quantities combined, followed by server-side price, availability, and inventory validation.
- **D-06:** If a merged quantity exceeds available inventory, reduce it to the maximum available quantity and clearly notify the customer.
- **D-07:** Saved carts automatically refresh stale price and availability data and clearly identify each change before checkout.
- **D-08:** On sign-out, the current device retains the cart as a guest cart, but cross-device synchronization stops.
- **D-09:** If a different account signs in on a device containing a guest cart, ask before merging that cart into the account.

### Destination and Market Revalidation
- **D-10:** If the shipping country changes the effective market, price, currency, shipping, or eligibility, pause checkout and show a preview before changing the accepted checkout state.
- **D-11:** The preview shows old and new values for affected lines plus old and new totals. The customer confirms the complete change set once.
- **D-12:** A physical item unavailable in the destination market remains visible but is excluded from any payable order until resolved. The customer may submit a market exception request instead of having the item silently removed.
- **D-13:** Every later shipping-country change triggers a fresh server recalculation and a new confirmation when anything material changes.

### Shipping Calculation
- **D-14:** All physical units in the cart form one shipping calculation group, even when products use different shipping profiles.
- **D-15:** Among chargeable physical units, the unit with the highest first-item fee supplies the single first-item fee. Every other unit uses its own additional-item fee. Cart insertion order must not affect the result.
- **D-16:** Free-shipping eligibility applies per product or unit. Eligible units contribute no shipping fee; remaining physical units are calculated normally.
- **D-17:** Digital lines never contribute shipping fees.
- **D-18:** If no shipping rule supports the selected destination, checkout is blocked, the cart is preserved, and the customer can submit an exception request. A placeholder or later-confirmed shipping fee is not allowed.

### Inventory Reservations and Exceptions
- **D-19:** Physical inventory is not reserved while browsing, editing the cart, or merely opening checkout. Reservation starts atomically when the customer confirms the authoritative total and submits checkout.
- **D-20:** PayPal checkout reserves inventory for 15 minutes. VietQR checkout reserves inventory for 24 hours.
- **D-21:** Customer-visible availability and subsequent checkout validation subtract active reservations from on-hand inventory.
- **D-22:** An exception request is non-binding and does not reserve inventory.
- **D-23:** After admin approval, the customer receives a request-bound checkout link valid for 48 hours.
- **D-24:** The approved link grants only the specific exception permission. Opening it still requires fresh validation of price, market, shipping, variant, and inventory.
- **D-25:** The approved link does not reserve stock. Reservation begins only when the customer confirms the recalculated total and submits checkout.

### Agent's Discretion
- Exact cart, checkout, market-change preview, and exception-request layouts may follow existing responsive UI patterns.
- Exact notification copy, empty states, and how stale values are visually highlighted may be selected during UI specification and planning.
- The implementation may choose secure identifiers and storage mechanics for guest carts and approved exception links while preserving the behavior and data-minimization decisions above.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Scope and Requirements
- `.planning/PROJECT.md` - Defines mixed digital/physical commerce, guest checkout, market validation, shipping profiles, and exception requests.
- `.planning/REQUIREMENTS.md` - Phase 3 requirements are MKT-06, CART-01 through CART-05, SHIP-01 through SHIP-05, INV-02, INV-03, and DISC-01 through DISC-03.
- `.planning/ROADMAP.md` - Defines the Phase 3 goal, boundary, success criteria, dependency, and planned slices.

### Prior Phase Decisions
- `.planning/phases/01-secure-bilingual-foundation/01-CONTEXT.md` - Locks localized customer routes and server-enforced identity and admin boundaries.
- `.planning/phases/02-market-aware-catalog/02-CONTEXT.md` - Locks explicit market prices, product and variant availability, inventory ownership, and unavailable-market behavior.

### Architecture and Stack
- `.planning/research/STACK.md` - Defines integer money, server-side total calculation, Next.js, Supabase, Zod, Vitest, and Playwright constraints.
- `.planning/research/ARCHITECTURE.md` - Defines immutable order snapshots, transactional inventory, pricing, order draft, and exception-request domain boundaries.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/catalog/money.ts`: Existing integer-minor-unit money formatting and currency handling.
- `src/catalog/market.ts` and `src/catalog/page-context.ts`: Existing active-market resolution and persistence patterns.
- `src/catalog/queries.ts`: Server-side catalog projections already return market-safe product, price, variant, and availability data.
- `src/components/catalog/variant-selector.tsx`: Existing client-side valid/in-stock variant selection behavior to connect to add-to-cart.
- `src/components/catalog/unavailable-market.tsx`: Existing unavailable-market presentation that can lead into exception requests.
- `src/components/ui/alert.tsx`, `button.tsx`, `card.tsx`, `sheet.tsx`, `separator.tsx`, and `skeleton.tsx`: Existing UI primitives for cart, checkout, change previews, and validation states.
- `src/lib/supabase/server.ts` and `src/lib/supabase/client.ts`: Existing typed server and browser Supabase boundaries.

### Established Patterns
- Public customer routes use explicit `/vi` and `/en` locale prefixes.
- Market offers use explicit VND or USD integer prices; automatic currency conversion is forbidden.
- Catalog base tables remain private, with market-safe data exposed through server-oriented projections.
- Physical inventory belongs to either a product or its variants, never both.
- Admin authorization is enforced server-side and through database-owned role checks.

### Integration Points
- Product detail pages currently display prices and valid variants but do not yet expose add-to-cart behavior.
- The site header is the natural integration point for a cart indicator and mobile cart access.
- New Supabase migrations must add carts, shipping profiles and rules, discounts, checkout drafts and lines, reservations, and exception requests with RLS and transactional functions.
- Checkout must consume catalog IDs and quantities from the client while recalculating all prices, discounts, shipping, eligibility, and totals on the server.

</code_context>

<specifics>
## Specific Ideas

- Market-driven cart changes should feel like a reviewable proposal, never a silent mutation.
- Persisted guest carts deliberately store references rather than commercial snapshots.
- Shipping is calculated as one combined physical group across profiles, using one highest first-item fee and each remaining unit's own additional-item fee.
- Approved exception access is temporary and narrowly scoped, not a permanent market-availability override.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 3-Mixed Cart and Checkout*
*Context gathered: 2026-06-15*
