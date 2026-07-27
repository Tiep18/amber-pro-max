---
status: resolved
trigger: "Signed-in checkout with prefilled email and default address returned a stale quote when the customer only clicked Create order."
created: 2026-07-27T13:34:07+07:00
updated: 2026-07-27T13:47:50+07:00
---

# Debug Session: Prefilled Checkout Stale Submit

## Symptoms

- Expected behavior: A signed-in customer with a default email and address can open checkout and create an order without editing prefilled fields.
- Actual behavior: Clicking Create order immediately returned "Báo giá đã thay đổi. Hãy xem lại tổng tiền và thử lại."
- Reproduction: The affected remote cart contained two units of a physical variant and one non-variant physical product. Email and the default Vietnam address were already filled.

## Evidence

- A fresh remote customer with the same prefilled-email/default-address flow created an order successfully, eliminating prefill identity and address normalization as the general cause.
- The affected cart reproduced the stale warning in the customer's existing Chrome session.
- The affected variant had `quantity_on_hand = 3`, while an active unexpired checkout reservation held 2 units. Authoritative availability was therefore 1, but the checkout quote still presented quantity 2.
- `get_catalog_product_by_slug` exposed raw `quantity_on_hand > 0`; `quoteCartIntent` received no reservation-aware quantity and did not cap the line.
- `submit_checkout` correctly called `checkout_available_inventory`, computed quantity 1, and rejected the browser quote as `stale_commercial_quote`.

## Eliminated

- Prefilled customer email or authenticated identity mismatch.
- Default-address country/state normalization.
- Market/currency/payment-method mismatch.
- Shipping quote drift.
- The previously fixed difference between cart intent lines and accepted quote intent lines.

## Resolution

- root_cause: Quote generation and order submission used different inventory authorities. The quote used raw stock, while submission subtracted active unexpired reservations.
- fix: Added a bounded public checkout inventory projection backed by `checkout_available_inventory`, then applied it to product and variant catalog facts before quoting. Product-level and variant-level quantities now cap consistently, and the quote path fails closed if the availability RPC fails.
- files_changed:
  - `src/checkout/quote.ts`
  - `src/types/supabase.ts`
  - `supabase/migrations/20260727140000_checkout_quote_available_inventory.sql`
  - `tests/unit/checkout/quote-diff.test.ts`
  - `tests/security/checkout-boundaries.test.mjs`
- verification:
  - Remote migration applied and linked migration history synchronized.
  - Remote database lint returned no schema errors.
  - Exact affected browser flow reloaded to quantity 1, recalculated Vietnam shipping, and created VietQR order `ATB-FB95643FEB` without a stale warning.
  - The verification order was immediately cancelled through `apply_payment_transition`; inventory was released.
  - Synthetic VN prefill flow also created order `ATB-8726B56826`; it was cancelled and its inventory released.
  - `npm run lint`, `npm run typecheck`, `npm run test:unit` (735 tests), and `npm run test:security` (53 tests) passed.
