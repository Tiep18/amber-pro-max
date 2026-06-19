# Phase 5: Fulfillment and Purchase Access - Context

**Gathered:** 2026-06-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Give paid customers durable, secure access to purchased PDF patterns and
transparent status for physical handmade fulfillment, including mixed orders.
This phase owns digital entitlements, short-lived download access, localized
download and shipping emails, transactional email retry/resend operations,
guest order reopening, order claiming into an account, customer order history
and pattern library access, admin digital access actions, and manual physical
fulfillment/tracking updates.

Payment confirmation, PayPal/VietQR verification, inventory finalization, and
the paid gate were established in Phase 4. Customer retention features such as
saved addresses, wishlists, reviews, newsletter relationships, blog content,
full launch operations, and policy/legal pages belong to later phases.

</domain>

<decisions>
## Implementation Decisions

### Digital Entitlements and Downloads
- **D-01:** Digital entitlements are granted per paid digital order line. Each paid digital line creates its own entitlement so mixed orders, duplicate purchases, refunds/revocations, and audits remain clear.
- **D-02:** The customer pattern library groups repeated purchases by pattern for a clean customer experience, while preserving the underlying order and entitlement history for audit and admin operations.
- **D-03:** Download links sent by email live for 24 hours.
- **D-04:** Expired links are regenerated from an authorized order page or signed-in pattern library action. The system must validate the entitlement before creating a new short-lived signed Storage URL or access token.
- **D-05:** Purchased PDFs must never be made public, attached directly to email, or exposed through durable public URLs. All download requests validate an active entitlement before issuing short-lived access.

### Guest Reopen and Order Claiming
- **D-06:** Guest customers reopen order/download access through an email magic token. The token must expire and must validate order email/access before any fresh download link is issued.
- **D-07:** Guest magic tokens live for 24 hours.
- **D-08:** Claiming a prior guest order into an account requires the customer to be signed in with the same email address as the order and to prove control through an email token.
- **D-09:** After a guest order is claimed into an account, old guest access tokens are revoked. Long-term access should flow through the signed-in account boundary.

### Transactional Email Outbox and Resend
- **D-10:** Transactional email requests are created durably in the same transaction that opens fulfillment or creates the entitlement-related work. Sending happens later through an outbox worker/job so provider failures do not lose email intent or corrupt paid transitions.
- **D-11:** Temporary email failures are retried automatically with backoff, while admins can inspect sanitized failure details and intervene.
- **D-12:** Admin resend of a download email creates a new email request with a new token/link and an audit record. It must not reuse expired links or expose public PDF URLs.
- **D-13:** Phase 5 admin UI needs a compact failed-email queue in admin orders/operations, showing order, email type, attempt count, sanitized error, next retry time, and controlled retry/resend actions.

### Physical Fulfillment and Mixed Orders
- **D-14:** Physical fulfillment uses the manual status flow `awaiting_fulfillment -> packing -> shipped -> delivered`.
- **D-15:** Carrier and tracking number are optional but encouraged when an order moves to `shipped`. The workflow must not block shipment status if the seller has no tracking number.
- **D-16:** Customer-facing mixed order status must clearly separate digital and physical progress, for example "Digital ready" and "Physical in progress", so a ready PDF does not imply the physical shipment is complete.
- **D-17:** Shipping update email is required when an order is marked `shipped`. A delivered email is optional when admin marks the order delivered.

### the agent's Discretion
- Exact database enum names, token table names, and job scheduling mechanics may be chosen during planning, provided they preserve the locked access-control, audit, retry, and mixed-fulfillment behavior above.
- Exact customer copy, empty states, and admin queue layout may follow existing bilingual UI and admin order patterns.
- Exact resend/rate-limit thresholds may be chosen during planning, provided guest token and download regeneration flows remain abuse-resistant and do not leak cross-user data.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Scope and Requirements
- `.planning/PROJECT.md` - Defines mixed digital/physical commerce, guest checkout, full-payment gating before digital delivery, expiring download links, and manual physical fulfillment constraints.
- `.planning/REQUIREMENTS.md` - Phase 5 requirements are DIG-02 through DIG-07, FUL-01 through FUL-03, ACC-02, ACC-05, OPS-01, and OPS-02.
- `.planning/ROADMAP.md` - Defines Phase 5 goal, success criteria, dependency on Phase 4, and planned slices 05-01 through 05-05.

### Prior Phase Decisions
- `.planning/phases/04-trusted-payments-and-orders/04-CONTEXT.md` - Locks payment verification, paid-gate behavior, idempotent `apply_payment_transition`, separate payment/order/digital/physical states, and shipping-address snapshots.
- `.planning/phases/03-mixed-cart-and-checkout/03-CONTEXT.md` - Locks mixed carts, immutable order line snapshots, guest/account checkout, reservations, and the separation between checkout/payment and later fulfillment.
- `.planning/phases/02-market-aware-catalog/02-CONTEXT.md` - Locks digital products as private PDFs, physical products/variants, explicit market prices, inventory ownership, and private storage expectations.
- `.planning/phases/01-secure-bilingual-foundation/01-CONTEXT.md` - Locks localized `/vi` and `/en` routes plus server-enforced user/admin authorization boundaries.

### Architecture and Stack
- `.planning/research/STACK.md` - Defines Next.js App Router, Supabase Postgres/Auth/Storage, private buckets, `@supabase/ssr`, Zod, Resend, Vitest, and Playwright constraints.
- `.planning/research/ARCHITECTURE.md` - Defines separate payment and fulfillment state machines, transactional data ownership, secure storage/download expectations, and operational job/outbox patterns.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `public.checkout_orders` and `public.checkout_order_lines`: Existing order shell and immutable line snapshots already distinguish `fulfillment_type`, which is the natural source for per-order-line entitlements.
- `public.apply_payment_transition(jsonb)`: Existing paid transition function already opens the fulfillment gate, finalizes inventory, and sets `digital_fulfillment_status` to `eligible` or `not_required` and `physical_fulfillment_status` to `awaiting_fulfillment` or `not_required`.
- `public.order_payment_statuses` and `public.get_order_payment_status(text, text)`: Existing projections/RPCs provide customer and admin order status access and should be extended rather than bypassed.
- `src/payments/guest-access.ts`: Existing guest order cookie hashing and HttpOnly cookie helpers can inform, but not replace, durable email magic-token reopen flows.
- `src/components/payments/order-payment-page.tsx`: Existing customer order page already renders payment status, paid-gate messaging, total, deadline, and shipping address snapshots; Phase 5 should extend it with download and fulfillment sections after payment.
- `src/components/admin/orders/order-detail.tsx`: Existing admin detail page already shows payment state, digital/physical fulfillment statuses, shipping address, provider evidence, VietQR action, and timeline.
- `src/components/ui/alert.tsx`, `button.tsx`, `card.tsx`, `separator.tsx`, and existing admin order components: Existing UI primitives and patterns for customer status panels, admin operations, and queue-like views.

### Established Patterns
- Server actions, route handlers, and Supabase RPCs own commerce mutations; browsers never submit authoritative price, access, payment, or fulfillment facts.
- Admin operations require server-side authorization and database-backed policies/private helpers.
- Guest access is scoped to a specific order and should use hashed secret material rather than exposing raw durable identifiers.
- Payment, digital fulfillment, and physical fulfillment states are separate; UI must not collapse them into one misleading state.
- Sensitive provider/customer evidence is sanitized before admin display. Email provider failures should follow the same sanitized evidence principle.
- Private PDF files remain in Supabase Storage private buckets; signed URLs are generated only after server-side authorization.

### Integration Points
- Add Supabase migrations for entitlements, download tokens/events, guest reopen tokens, order-claim records, transactional email outbox, email attempts, and physical fulfillment/tracking records.
- Extend paid-transition or post-paid fulfillment orchestration so entitlement creation and outbox email requests are idempotent and occur after the paid gate opens exactly once.
- Add localized customer account pages for order history and pattern library, plus guest reopen and claim flows under existing locale-aware routing.
- Extend admin order detail and add a compact failed-email queue under admin orders/operations.
- Extend customer order detail to show secure downloads for digital lines, physical tracking for physical lines, and split mixed-order progress.
- Add unit, database, and Playwright coverage for entitlement idempotency, expired/regenerated links, cross-user access denial, guest token expiry/revocation, email retry/resend, and physical fulfillment state transitions.

</code_context>

<specifics>
## Specific Ideas

- Pattern library should feel clean to the customer by grouping repeated purchases by pattern while keeping order-line entitlement records behind the scenes.
- Guest reopen and download token lifetimes should both be 24 hours for a consistent customer expectation.
- Admin resend always creates a fresh token/link and audit record.
- Manual shipping should fit the seller's real workflow: tracking is useful but not mandatory for every shipment.
- Mixed order UI should explicitly show that digital access can be ready while physical fulfillment is still in progress.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 5-Fulfillment and Purchase Access*
*Context gathered: 2026-06-19*
