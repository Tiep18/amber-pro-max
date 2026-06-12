# Architecture Research

**Domain:** Bilingual ecommerce for digital patterns and handmade physical goods
**Researched:** 2026-06-12
**Confidence:** HIGH

## Standard Architecture

### System Overview

```text
+------------------------------------------------------------------+
| Next.js Application                                               |
|                                                                   |
| Storefront | Account | Admin | Blog | Route Handlers/Webhooks     |
+-----------------------------+------------------------------------+
                              |
                    Domain/Application Services
                              |
     +------------+-----------+-----------+-----------+------------+
     | Catalog    | Commerce  | Payments  | Fulfill.  | Content    |
     | Markets    | Cart      | PayPal    | Downloads | Blog/SEO   |
     | Inventory  | Orders    | VietQR    | Shipping  | Newsletter |
     +------------+-----------+-----------+-----------+------------+
                              |
            +-----------------+--------------------+
            | Supabase Postgres/Auth/Storage       |
            | RLS | SQL functions | private files  |
            +-----------------+--------------------+
                              |
             +----------------+----------------+
             | PayPal | Resend | Vercel Geo    |
             +----------------+----------------+
```

Use a modular monolith. All modules share one transactional database, but each domain owns its tables, services, and public operations. Payment and email side effects are processed through idempotent event/outbox records rather than being mixed into page rendering.

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Storefront | Localized catalog, market context, cart, checkout, blog | Next.js server components with small client islands. |
| Market service | Resolve suggested market, validate shipping destination, choose price/availability | Pure domain functions plus Vercel country header and address rules. |
| Catalog service | Products, translations, variants, taxonomy, collections, images | Postgres tables with localized child records. |
| Pricing service | Market price, discounts, shipping, integer totals | Server-only functions; never accepts client prices. |
| Inventory service | Stock, reservations, release, final decrement | Transactional SQL functions with row locks/atomic updates. |
| Order service | Draft checkout, immutable line snapshots, state transitions | Postgres transaction plus explicit state machine. |
| Payment service | PayPal order/capture/webhooks and VietQR instructions/manual confirmation | Route handlers, verified raw webhook body, idempotency table. |
| Entitlement service | Grant/revoke PDF rights and issue expiring links | Database entitlements plus private Supabase Storage signed URLs. |
| Fulfillment service | Digital email, physical preparation, tracking, completion | Outbox jobs and admin actions. |
| Identity service | Customer accounts, guest order access, admin role | Supabase Auth, SSR cookies, RLS, server-managed app metadata. |
| Content service | Blog, SEO, newsletter consent | Localized content tables and Resend integration. |

## Recommended Project Structure

```text
src/
|-- app/
|   |-- [locale]/
|   |   |-- (store)/        # Catalog, product, cart, checkout, blog
|   |   |-- account/        # Orders, downloads, addresses, wishlist
|   |   `-- admin/          # Protected administration
|   `-- api/
|       |-- paypal/         # Create/capture and webhook handlers
|       |-- downloads/      # Entitlement-checked redirect
|       `-- newsletter/     # Subscribe/unsubscribe endpoints
|-- domains/
|   |-- catalog/
|   |-- markets/
|   |-- inventory/
|   |-- cart/
|   |-- orders/
|   |-- payments/
|   |-- fulfillment/
|   |-- customers/
|   `-- content/
|-- lib/
|   |-- supabase/           # Browser/server/admin clients
|   |-- paypal/
|   |-- email/
|   |-- money/
|   `-- validation/
|-- components/
|   |-- ui/
|   |-- storefront/
|   `-- admin/
|-- i18n/
`-- tests/
    |-- unit/
    |-- integration/
    `-- e2e/

supabase/
|-- migrations/
|-- seed.sql
`-- tests/
```

### Structure Rationale

- **`domains/`:** Keeps commerce rules independent from pages and external SDKs.
- **`app/`:** Owns routing, rendering, and HTTP boundaries, not core business logic.
- **`lib/`:** Wraps providers so PayPal, email, and storage details do not leak into order logic.
- **`supabase/`:** Makes schema, RLS, functions, and database tests version-controlled.

## Architectural Patterns

### Pattern 1: Immutable Order Snapshot

**What:** Copy product title, selected variant, SKU, market, unit price, currency, discount allocation, shipping allocation, and tax fields into order lines at checkout.
**When to use:** Every finalized order.
**Trade-offs:** Duplicates catalog data, but preserves historical correctness when products or prices change.

```typescript
type Money = { amountMinor: bigint; currency: "VND" | "USD" };

type OrderLineSnapshot = {
  productId: string;
  variantId: string | null;
  title: string;
  sku: string | null;
  unitPrice: Money;
  quantity: number;
  fulfillmentType: "digital" | "physical";
};
```

### Pattern 2: Payment and Fulfillment State Machines

**What:** Track payment separately from digital and physical fulfillment.
**When to use:** Mixed orders and asynchronous payment events.
**Trade-offs:** More statuses, but prevents sending PDFs merely because an order record exists.

```text
Payment: pending -> paid -> partially_refunded/refunded
                    \-> failed/cancelled

Digital: blocked -> entitled -> email_queued -> delivered
Physical: not_required | awaiting_fulfillment -> shipped -> delivered
```

Only a validated `paid` transition can create digital entitlements.

### Pattern 3: Transactional Outbox

**What:** Write durable "send email", "grant entitlement", and similar tasks in the same transaction as the business state change.
**When to use:** Payment confirmation, download email, tracking email, newsletter operations.
**Trade-offs:** Requires a worker/cron retry loop, but avoids paid orders with missing emails because a provider call timed out.

### Pattern 4: Server-Owned Checkout Calculation

**What:** The browser sends IDs, quantities, coupon code, destination, and identity context. The server resolves current records and returns a signed/identified checkout draft.
**When to use:** Cart validation and order creation.
**Trade-offs:** More server requests, but prevents price tampering and stale availability.

## Data Flow

### Checkout and Payment Flow

```text
Cart submission
    -> resolve market
    -> validate product/variant availability
    -> calculate prices, discount, shipping
    -> reserve physical inventory
    -> create order + immutable lines
        -> PayPal: create/capture order
        -> VietQR: show transfer instructions, remain pending

Verified payment event or admin confirmation
    -> idempotent paid transition
    -> finalize inventory reservation
    -> create digital entitlements
    -> enqueue confirmation/download email
    -> physical lines enter awaiting_fulfillment
```

### Download Flow

```text
Email/account download request
    -> validate secure access token or authenticated ownership
    -> load paid, active entitlement
    -> record attempt/audit
    -> create short-lived Storage signed URL
    -> redirect
```

The signed URL is disposable. The entitlement is the durable source of truth.

### Market Resolution Flow

```text
Vercel IP country -> suggested market
User-visible market choice -> session preference
Shipping country -> authoritative physical eligibility at checkout
Digital-only order -> confirmed session/IP market
```

Never silently switch a customer's price after cart creation. If authoritative destination changes the market or eligibility, show a clear recalculation step before payment.

## Core Data Model

```text
products
  -> product_translations
  -> product_market_offers
  -> product_variants
       -> variant_market_prices
       -> inventory
  -> product_categories/tags/collections
  -> shipping_profile (physical only)
  -> digital_asset (digital only)

orders
  -> order_lines (snapshots)
  -> payments
  -> inventory_reservations
  -> shipments
  -> digital_entitlements
  -> discount_redemptions
  -> market_exception_requests

customers/auth.users
  -> addresses
  -> wishlist_items
  -> reviews
  -> newsletter_consents
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k customers | One Next.js app, one Supabase project, scheduled outbox processing, cached public pages. |
| 1k-100k customers | Add queue-backed workers, stronger observability, search indexes, image optimization, and targeted read caching. |
| 100k+ customers | Split high-volume jobs/payment processing only if measured bottlenecks justify it; retain Postgres as commerce authority. |

### Scaling Priorities

1. **First bottleneck:** Product images and public page latency; solve with optimized images, CDN, and controlled revalidation.
2. **Second bottleneck:** Admin list queries and order searching; add indexes and keyset pagination.
3. **Operational bottleneck:** Manual VietQR confirmation and shipping, likely before compute capacity.

## Anti-Patterns

### Treating IP as Authorization

**What people do:** Hide or expose products solely from an IP-derived country.
**Why it is wrong:** VPNs, travel, proxies, and stale cache can misclassify customers.
**Do this instead:** Treat IP as a suggestion; enforce physical rules against the submitted destination and record the final market.

### One Status Column for Everything

**What people do:** Use `pending`, `paid`, and `completed` for payment, downloads, and shipping.
**Why it is wrong:** Mixed orders need independent fulfillment progress and retries.
**Do this instead:** Separate order, payment, digital fulfillment, and physical fulfillment state.

### Direct Provider Calls Inside the Database Transaction

**What people do:** Hold a transaction open while calling PayPal or email.
**Why it is wrong:** Network latency and retries create locks and uncertain partial failures.
**Do this instead:** Persist state/outbox atomically, then perform external side effects with idempotent retries.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| PayPal | Server creates/captures Orders; webhook confirms/reconciles | Verify webhook signature using the raw body; deduplicate event IDs; validate currency, amount, merchant, and related order ID. |
| VietQR/bank transfer | Generate/store transfer instructions and unique order reference | Admin confirmation is privileged and audited; do not auto-fulfill from a customer screenshot. |
| Supabase Storage | Private buckets and signed URLs | Service/secret keys remain server-only; access is governed by entitlement. |
| Resend | Transactional templates and audience/newsletter operations | Use durable outbox, retries, provider message IDs, consent records, and unsubscribe tokens. |
| Vercel | Country request header and scheduled jobs | Country header is a hint; cron/outbox handlers require authentication. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Catalog -> Checkout | Domain service | Checkout consumes IDs and resolves current offers. |
| Checkout -> Inventory | Transactional function | Reservation must be atomic. |
| Payment -> Order | Idempotent command | Only valid transitions; duplicate events are harmless. |
| Order -> Fulfillment | Outbox event | Paid event creates entitlements and fulfillment tasks once. |
| Identity -> Customer data | RLS and server authorization | Guest access uses scoped tokens; account access uses ownership policies. |

## Sources

- https://nextjs.org/docs/app - App Router structure, server/client boundaries, route handlers, metadata, and caching.
- https://supabase.com/docs/guides/auth/server-side/creating-a-client - Next.js SSR Auth pattern.
- https://supabase.com/docs/guides/database/postgres/row-level-security - RLS and role security.
- https://supabase.com/docs/reference/javascript/storage-from-createsignedurl - signed download URLs.
- https://developer.paypal.com/docs/api/orders/v2/ - PayPal order/capture resources.
- https://developer.paypal.com/api/rest/webhooks/rest/ - HTTPS delivery, retries, raw-body signature verification.
- https://vercel.com/docs/headers/request-headers#x-vercel-ip-country - country signal at the request boundary.
- https://developers.google.com/search/docs/specialty/international/localized-versions - localized URL architecture.

---
*Architecture research for: bilingual mixed digital/physical ecommerce*
*Researched: 2026-06-12*
