# Phase 04 Gap Execution Summary

Date: 2026-06-18

Scope: Delta-only execution for the Phase 4 replan gaps D-22..D-30. Existing payment, webhook, VietQR, inventory, and audit work was not re-executed except for the narrow order-payment projection integration needed to expose the new immutable shipping-address snapshot.

## Completed

- Replaced the checkout destination country-code text input with a searchable country selector and full shipping-address form for physical and mixed carts.
- Kept digital-only checkout address-free by submitting `shippingAddress: null`.
- Added shared shipping-address validation and formatting helpers.
- Required full shipping address for physical checkout before the submit RPC boundary.
- Added `checkout_orders.shipping_address` JSONB snapshot, shape constraint, and an immutability trigger.
- Updated `submit_checkout`, `order_payment_statuses`, and `get_order_payment_status` to store and return the snapshot without regressing effective payment-status projection.
- Displayed the address snapshot on customer order payment pages and admin order detail pages.
- Added/updated unit and pgTAP tests for checkout validation, RPC forwarding, order projections, schema column, and immutability trigger.

## Verification

- `npm run test:unit -- tests/unit/checkout/submit-checkout.test.ts tests/unit/payments/order-queries.test.ts` passed.
- `npm run typecheck` passed.
- `npm run db:reset` applied the migration, but the final Supabase local readiness check intermittently returned 502 after restart.
- `npm run db:test` passed all 289 DB tests after the reset-applied schema was available.
- `npm run db:lint` passed with no schema errors.
- `npm run lint` passed with existing warnings only.
- `npm run build` passed.
- `npm run test:security` passed.

## Known Non-Delta Observation

- Full `npm run test:unit` currently has 2 VietQR failures because the tests use a fixed reservation deadline of 2026-06-15 while the current date is 2026-06-18, so the action availability guard returns stale. This is outside the D-22..D-30 address-snapshot delta and was not changed.
