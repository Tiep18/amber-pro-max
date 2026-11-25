# Amigurumi Pattern & Handmade Store

Bilingual ecommerce storefront selling digital crochet patterns and handmade physical goods across Vietnam (VND) and international (USD) markets.

## Language

### Checkout & Orders

**Cart**:
A customer's mutable shopping intent persisted before checkout, holding desired products, variants, and quantities.
_Avoid_: Basket, bag, checkout draft

**Quote**:
A server-calculated, hashed commercial snapshot of prices, stock availability, discounts, shipping fees, and currency for a specific market and destination.
_Avoid_: Estimate, pricing response, cart totals

**Proposal**:
An unaccepted newer **Quote** whose material commercial terms (price, availability, market, currency, or non-expected shipping) differ from the **Quote** the customer last saw and requires explicit confirmation before placing an **Order**.
_Avoid_: Pending quote, quote diff

**Checkout Session**:
A single customer's active checkout attempt from entering the checkout page, negotiating a **Quote** against contact details, destination, and discounts, through placing an **Order**.
_Avoid_: Checkout lifecycle, checkout state, checkout form

**Destination Authority**:
The rule that once a customer supplies or confirms a shipping country for physical intent, that destination overrides browsing market guesses for subsequent **Quote** refreshes.
_Avoid_: Market override, sticky country

**Editable Draft**:
Temporary tab-scoped form input (contact email and shipping address) saved in browser session storage so accidental reloads do not erase typing; carries no pricing or credential authority.
_Avoid_: Checkout cache, saved checkout

**Guest Recovery**:
A server-held, cookie-backed retry proof linking an anonymous checkout attempt to its resulting **Order** so a guest can safely retry after an interrupted submission without exposing credentials to browser scripts.
_Avoid_: Guest token, session proof

**Order**:
An immutable commercial record created upon successful checkout submission, locking line snapshots, totals, shipping address, and inventory reservations.
_Avoid_: Purchase, transaction, checkout submission

### Payments

**PayPal Order**:
Provider-side payment session created from authoritative server USD totals and linked to one local **Order** via `provider_order_id`, `invoice_id`, and `custom_id`.
_Avoid_: Provider checkout, PayPal session

**Capture**:
Server-initiated settlement of an approved **PayPal Order**, reconciled against local order ID, merchant ID, USD currency, and exact minor-unit amount before changing payment state.
_Avoid_: Charge, settlement call

**Payment Transition**:
An atomic, idempotent, audited state change executed exclusively through Postgres `apply_payment_transition` (`paid`, `failed`, `cancelled`, `rejected`, `expired`, `review_required`).
_Avoid_: Status update, payment patch

**Late Settlement**:
Verified payment arriving after an **Order**'s reservation deadline that Postgres may still settle as `paid` within the 7-day late window if inventory covers the **Order**, or park as `review_required` otherwise.
_Avoid_: Late capture, grace period

**Refund Visibility**:
Read-only recording of PayPal `PAYMENT.CAPTURE.REFUNDED` events (`partially_refunded` or `refunded`, plus refunded minor amount) surfaced to customers and admins without altering fulfillment authority.
_Avoid_: Refund transition, refund sync

**Webhook Verification**:
Cryptographic validation of PayPal transmission headers and raw JSON payload via PayPal's signature verification endpoint before any persistence read, receipt write, or **Payment Transition**.
_Avoid_: Signature check, webhook parse

### Order Access

**Order Access**:
The cross-domain authority governing how signed-in customers and anonymous guests authenticate, read, reopen, or claim an **Order** across checkout, payment, and fulfillment.
_Avoid_: Guest auth, order session helper, token helper

**Guest Order Session**:
An order-scoped, `HttpOnly` browser cookie (`atb_guest_order_<ORDER_NUMBER>`) holding a raw secret whose SHA-256 hash matches `checkout_orders.guest_secret_hash`, lasting at least 24 hours (or until the reservation deadline) while unpaid and 30 days once settled (`paid`, `partially_refunded`, or `refunded`).
_Avoid_: Guest login, order cookie

**Order Reopen**:
Single-shot redemption of an emailed `reopen_order` link that atomically rotates `guest_secret_hash` via `redeem_guest_order_reopen_token` and mints a fresh **Guest Order Session** before redirecting with `Referrer-Policy: no-referrer`.
_Avoid_: Order link login, magic link

**Order Claim**:
Same-email transfer of an unowned guest **Order** to a signed-in customer account using an active `claim_order` token, revoking all prior guest access tokens for that **Order** and recording an append-only audit event.
_Avoid_: Account merge, order transfer

### Operations & Monitoring

**Operational Monitoring**:
Cross-domain server telemetry (`reportOperationalFailure`, `runMonitoredAction`, `runMonitoredQuery`, `runMonitoredThrowingQuery`) that captures sanitized diagnostics into `operational_errors` without altering customer-facing outcomes when storage fails.
_Avoid_: Error wrapper, fake monitored action, log helper

**Operational Redaction**:
Allowlist-based filtering and pattern stripping (`sanitizeOperationalErrorInput`, `maskEmailForAdmin`, `sanitizeEmailFailureCode`) ensuring credentials, raw payloads, tokens, signatures, emails, addresses, and stack traces never persist to logs or admin queues.
_Avoid_: Error cleaning, string masking
