# Phase 4: Trusted Payments and Orders - Context

**Gathered:** 2026-06-15
**Updated:** 2026-06-18 - Added checkout shipping-address correction for physical/mixed orders.
**Status:** Ready for planning

<domain>
## Phase Boundary

Turn checkout orders from Phase 3 into trustworthy payment-backed orders through
PayPal for international USD orders and manually confirmed VietQR for Vietnam
VND orders. This phase owns payment records and events, idempotent paid/fail/
cancel/reject/expire transitions, inventory reservation finalization or release,
audit records for money and stock transitions, and customer/admin order status
views.

Digital entitlements, download emails, transactional email retry, physical
shipment tracking, customer order history beyond the payment/order view, and
full refund operations belong to later phases.

</domain>

<decisions>
## Implementation Decisions

### Payment Lifecycle and Order State
- **D-01:** Payment records and payment events are the source of truth for paid transitions. An order does not become paid merely because a callback returns or an admin action is submitted; it must pass through a verified, idempotent payment transition.
- **D-02:** Customer-facing payment status stays simple: awaiting payment, verifying payment, paid, payment failed or cancelled, expired, partially refunded, and refunded.
- **D-03:** Admin-facing payment status includes provider event details, VietQR evidence, reservation deadline, actor/source, duplicate or retry history, and audit records.
- **D-04:** Phase 4 models and displays `partially_refunded` and `refunded`, but does not build a full refund initiation workflow.
- **D-05:** A valid paid transition opens the paid gate for later fulfillment and finalizes inventory, but Phase 4 does not create digital entitlements, download emails, or physical shipping tasks.
- **D-06:** If the payment window or reservation deadline expires, the order/payment becomes `expired`, inventory is released, and the customer must create a new checkout/order to buy again.
- **D-07:** If PayPal fails or is cancelled, or if VietQR is rejected by admin, inventory is released immediately and the order is no longer payable.
- **D-08:** Customers cannot retry payment on the same order after `failed`, `cancelled`, `rejected`, or `expired`. A new checkout/order must recalculate current price, stock, shipping, and discounts.

### PayPal and VietQR Confirmation
- **D-09:** PayPal webhook verification is the primary confirmation path for paid status. The PayPal return/callback page may trigger a server-side recheck, but it should not claim the order is paid before the verified payment transition succeeds.
- **D-10:** When a customer returns from PayPal before the webhook has confirmed payment, the order page should show a verifying-payment state with the order number, remaining reservation/payment window, and a refresh or recheck affordance.
- **D-11:** A PayPal event may mark an order paid only after validating webhook authenticity/signature, provider order mapping, merchant or receiver identity, amount, currency, and event deduplication.
- **D-12:** VietQR admin confirmation is manual: the customer transfers outside the app, then an authorized admin checks the bank account and confirms or rejects payment in the admin UI.
- **D-13:** VietQR confirmation must store the bank reference, received amount, and received date/time. Admin note and screenshot/receipt attachment are optional.
- **D-14:** If a VietQR transfer has the wrong amount or wrong reference, admin rejects the payment, records the reason, releases inventory immediately, and the order is no longer payable.
- **D-15:** PayPal webhook events, PayPal rechecks, VietQR admin confirmation/rejection, duplicate webhooks, delayed events, and admin double-submits must all flow through one idempotent state-machine command for payment and inventory transitions.

### Inventory Finalization and Audit
- **D-16:** A paid transition finalizes or consumes each active reservation exactly once and permanently reflects sold stock. Duplicate paid events must not decrement inventory again.
- **D-17:** Failed, cancelled, rejected, and expired orders change reservations to `released` or `expired` and keep the reservation records for audit. Reservations are not deleted.
- **D-18:** Released or expired reservations must record when they were released and why or which transition/source caused the release.
- **D-19:** Phase 4 audit trail is required for important money, stock, and paid-gate transitions, including order created, payment event received, payment verified paid, payment failed/cancelled/rejected/expired, inventory finalized, inventory released, and admin VietQR confirmed/rejected.
- **D-20:** Phase 4 audit does not need to log every customer view, refresh, or admin click; focus on state transitions that affect payment, stock, access rights, or customer-visible order status.
- **D-21:** Admin order detail should show an order timeline with payment events, VietQR evidence, inventory finalization/release, actor/source, amount/reference, customer email, and immutable line snapshots.

### Checkout Shipping Address Correction
- **D-22:** The current country-code-only checkout destination is not acceptable for physical or mixed orders. Physical and mixed checkout must collect a full shipping address before creating a payable order, reservation, PayPal order, or VietQR instruction.
- **D-23:** Digital-only checkout must not ask for a shipping address. It should collect only the information needed for digital purchase/payment, such as contact email and payment method.
- **D-24:** Physical and mixed checkout require recipient name, recipient phone number, shipping country, province/state/region when applicable, city/district/locality when applicable, address line 1, optional address line 2, and postal code according to the destination country's normal requirements.
- **D-25:** The shipping country UI must not be a free text two-letter-code input. Use a searchable country select that displays localized country names and stores the ISO country code internally.
- **D-26:** The country selector should default from the active market/locale where reasonable, but it remains distinct from `locale`, `market`, and `currency`. Changing the shipping country can still trigger the Phase 3 market/price/shipping revalidation flow.
- **D-27:** Checkout submission and the order database model must store an immutable shipping-address snapshot for any physical or mixed order. The snapshot is part of the order evidence and must not be replaced by later customer edits.
- **D-28:** Customer order detail in Phase 4 must show the shipping address snapshot for physical and mixed orders so the customer can verify the destination attached to the pending or paid order.
- **D-29:** Admin order detail in Phase 4 must show the full shipping address snapshot together with payment/order evidence so manual fulfillment in Phase 5 has a reliable destination.
- **D-30:** PayPal/VietQR payment initiation must use the server-owned order/address snapshot, not client-submitted country text, as the source of truth for physical shipment destination context.

### the agent's Discretion
- Exact database enum/status names may be chosen during planning, provided they preserve separate payment state, order summary state, and fulfillment gate semantics.
- Exact customer copy for verifying payment, expired payment windows, and rejected payments may follow existing bilingual UI patterns.
- Exact admin timeline layout and filtering may follow existing admin table/detail patterns as long as the required audit evidence remains inspectable.
- Exact country list package/source, address field labels, and country-specific postal-code validation details may be selected during planning, provided the UI remains localized, accessible, and does not regress to raw country-code text entry.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Scope and Requirements
- `.planning/PROJECT.md` - Defines PayPal for international customers, VietQR manual bank transfer for Vietnam, full-payment gating before digital delivery, mixed carts, and manual fulfillment constraints.
- `.planning/REQUIREMENTS.md` - Phase 4 requirements are INV-04, INV-05, ORD-01, ORD-02, ORD-03, PAY-01 through PAY-08, and SEC-03.
- `.planning/ROADMAP.md` - Defines Phase 4 goal, success criteria, dependencies, and planned slices 04-01 through 04-05.
- `.planning/phases/04-trusted-payments-and-orders/04-UI-SPEC.md` - Must be updated or interpreted with D-22 through D-30 so customer/admin order detail includes the physical shipping address snapshot.

### Prior Phase Decisions
- `.planning/phases/03-mixed-cart-and-checkout/03-CONTEXT.md` - Locks checkout order creation, immutable line snapshots, PayPal 15-minute reservation windows, VietQR 24-hour reservation windows, and non-binding exception grants.
- `.planning/phases/02-market-aware-catalog/02-CONTEXT.md` - Locks explicit market prices, product/variant availability, and inventory ownership rules that payment finalization must respect.
- `.planning/phases/01-secure-bilingual-foundation/01-CONTEXT.md` - Locks localized routes and server-enforced admin authorization boundaries.

### Architecture and Stack
- `.planning/research/ARCHITECTURE.md` - Defines separate payment and fulfillment state machines, idempotent payment commands, inventory reservation/finalization, PayPal webhook validation, and VietQR manual confirmation patterns.
- `.planning/research/STACK.md` - Defines Next.js route handlers, Supabase Postgres/RLS, PayPal Orders API/webhooks, integer money, Zod validation, Vitest, and Playwright constraints.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `public.checkout_orders`: Existing order shell with order number, owner/guest access fields, contact email, locale, market, currency, payment intent, totals, accepted quote hash, snapshots, idempotency key, and reservation deadline.
- `public.checkout_order_lines`: Existing immutable order line snapshots with product/variant, localized title, fulfillment type, market, currency, quantity, price, discount, shipping, and quote line snapshot.
- `public.checkout_inventory_reservations`: Existing reservation table with active/released/expired status, reserved quantity, expiration, and release timestamp.
- `public.submit_checkout(jsonb)`: Existing RPC boundary that creates pending-payment orders and active reservations from an accepted server quote.
- `src/checkout/schemas.ts`: Existing payment intents are `paypal_intent` and `vietqr_intent`.
- `src/checkout/submit-checkout.ts` and `src/checkout/actions.ts`: Existing checkout submit action and typed result mapping for pending-payment handoff.
- `src/components/checkout/checkout-page.tsx`: Existing customer checkout UI stops at "Order is awaiting payment" and reservation deadline.
- `src/components/checkout/destination-form.tsx`: Current destination UI is a two-letter country-code text input; this must be replaced for physical/mixed checkout by a localized searchable country selector plus full address fields.
- `public.submit_checkout(jsonb)` and `src/checkout/schemas.ts`: Current submit payload does not validate or persist a full shipping address snapshot; planning must add this before physical/mixed orders can become payable.
- `src/components/ui/alert.tsx`, `button.tsx`, `card.tsx`, `separator.tsx`, and admin commerce components: Existing UI primitives and admin form patterns for order/payment views.

### Established Patterns
- Server actions and Supabase RPCs own checkout mutations; the browser never submits authoritative prices.
- Orders and order lines store immutable commercial snapshots for later admin/customer review.
- Active reservations are subtracted from available inventory and have provider-specific deadlines.
- Admin operations are server-authorized and backed by RLS/private admin checks.
- Money is integer minor units with explicit `VND` or `USD`; no floating point or exchange-rate conversion.

### Integration Points
- New migrations should extend the checkout/payment schema with payment records/events, state transition/audit records, and reservation finalization/release mechanics.
- PayPal route handlers should integrate under the Next.js API route handler layer and call the same idempotent state-machine command as other payment sources.
- VietQR admin confirmation should integrate into protected admin order/payment screens.
- Customer order status pages should reuse locale-aware routing and simple customer-facing payment states.
- Customer and admin order detail projections need to include the immutable shipping-address snapshot for physical/mixed orders.
- Database and application tests should cover duplicate webhooks, delayed webhook after expiry/cancel, admin double-submit, amount/currency mismatch, wrong VietQR reference, paid finalization exactly once, and release on fail/cancel/reject/expired.
- Checkout/address tests should cover digital-only no-address checkout, physical/mixed address-required checkout, country picker storing ISO country code, country changes triggering quote revalidation, order snapshot immutability, and customer/admin visibility of the saved destination.

</code_context>

<specifics>
## Specific Ideas

- The customer should never see "paid" just because PayPal returned them to the site; if verification is still pending, show a calm verifying-payment state.
- VietQR is intentionally manual in v1: the seller checks the bank account, then confirms or rejects payment in the admin UI.
- Keeping reservation rows after release/expiry matters because stock and payment disputes need an audit trail.
- Refund visibility is needed for PAY-08, but full refund tooling should not distract Phase 4 from confirmed payment and inventory correctness.
- The user explicitly rejected raw country-code text entry because it is poor UX and does not capture the actual delivery destination.
- The desired checkout behavior is conditional: digital-only stays lightweight, while physical/mixed orders require a complete delivery address before payment.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 4-Trusted Payments and Orders*
*Context gathered: 2026-06-15*
