# Feature Research

**Domain:** Bilingual ecommerce for digital patterns and handmade physical goods
**Researched:** 2026-06-12
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Bilingual catalog and navigation | Vietnam and international buyers must understand product and policy content. | HIGH | Localize slugs, metadata, taxonomy, product content, transactional email, and formatting. |
| Market-aware availability and pricing | Products can be Vietnam-only, international-only, or both, with separate prices. | HIGH | IP suggests market; shipping country becomes authoritative for physical goods. |
| Search, filtering, categories, tags, and collections | Buyers need to discover a small but varied handmade catalog. | MEDIUM | Product type, category, technique, tags, and collections remain independent. |
| Product detail with variants | Doll clothing needs size, color, doll type, price, and inventory choices. | HIGH | Disable invalid or unavailable combinations clearly. |
| Mixed cart | Buyers must combine PDF patterns and physical products. | HIGH | Shipping applies only to physical lines; fulfillment waits for full payment. |
| Guest and account checkout | Guest checkout reduces friction; accounts support repeat buyers. | HIGH | Guest orders use verified email and secure order access. |
| Reliable payment states | Buyers and admin need unambiguous pending, paid, failed, refunded, and cancelled states. | HIGH | PayPal is automatic; VietQR is manually confirmed by admin. |
| Inventory and reservations | Handmade stock is limited and must not oversell. | HIGH | Reserve during checkout/payment windows and release expired reservations. |
| Shipping profiles | Physical goods need reusable destination-based rates. | HIGH | Profile rules should support country/region, first item, and additional item logic. |
| Secure PDF fulfillment | Paid customers expect immediate, repeatable access without public files. | HIGH | Entitlements plus expiring links; do not attach PDFs. |
| Order history and tracking | Signed-in buyers expect post-purchase visibility. | MEDIUM | Include order status, tracking link/number, and download library. |
| Admin operations | Owner must manage catalog, orders, payments, inventory, content, reviews, and subscribers. | HIGH | Audit sensitive admin actions. |
| SEO foundations | The site exists partly to grow brand discovery outside Etsy. | MEDIUM | Localized metadata, canonicals, `hreflang`, sitemap, Product/Article JSON-LD. |
| Reviews from verified purchasers | Reviews increase trust for handmade products and patterns. | MEDIUM | Eligibility is based on paid order lines; admin moderation and response. |
| Discount codes | Promotions are expected in ecommerce. | MEDIUM | Fixed/percentage, date, usage, market, product/category, minimum spend. |
| Newsletter consent and unsubscribe | Direct customer relationships are a strategic goal. | MEDIUM | Store consent evidence and support one-click unsubscribe. |
| Blog | Content supports education, brand authority, and SEO. | MEDIUM | Bilingual drafts, publishing, metadata, social image, categories/tags. |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| One checkout for patterns and handmade goods | Makes cross-selling natural and avoids separate purchases. | HIGH | Requires fulfillment to be decoupled from payment and shipping. |
| Admin-reviewed market exception request | Captures demand that rigid availability rules would reject. | MEDIUM | Request must not reserve stock or create a payable order until approved. |
| Pattern library for account customers | Gives repeat buyers a durable reason to create an account. | MEDIUM | Guest orders can later be claimed after email verification. |
| Bilingual content-to-commerce links | Blog tutorials can directly feature related patterns and finished products. | MEDIUM | Structured internal linking improves discovery and conversion. |
| Transparent handmade fulfillment status | Trust improves when buyers see preparation, shipped, tracking, and completed states. | MEDIUM | Keep customer-facing statuses simpler than internal state. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Live exchange-rate pricing | Appears easier than maintaining two prices. | Conflicts with deliberate market pricing and creates unstable totals. | Explicit VND and USD prices. |
| Permanent PDF links | Easy to implement and resend. | Links spread indefinitely and cannot express entitlement status. | Short-lived links generated after authorization. |
| Automatic approval of unavailable-market orders | Avoids losing a sale. | Shipping cost, legal limits, and product availability may be unknown. | Exception request reviewed by admin. |
| Full carrier automation in v1 | Looks professional. | Adds carrier contracts, APIs, labels, customs, and failure modes before core sales work. | Shipping profiles plus manual fulfillment/tracking. |
| Marketplace synchronization at launch | Avoids duplicate product entry. | Etsy inventory/order sync creates complex consistency and API dependencies. | Establish the independent store first. |
| Advanced recommendations/AI search | Appears modern. | Small catalog lacks enough behavior data to justify complexity. | Curated collections, related products, and structured filters. |

## Feature Dependencies

```text
Catalog + market prices + variants
    -> cart pricing
        -> checkout
            -> payment confirmation
                -> digital entitlement
                -> physical fulfillment

Inventory
    -> reservation
        -> checkout
            -> payment completion or expiry release

Shipping profiles + physical destination
    -> shipping quote
        -> order total

Auth + verified email
    -> account orders
    -> pattern library
    -> verified-purchase reviews

Localized content
    -> localized routes and metadata
        -> sitemap, hreflang, Product/Article structured data
```

### Dependency Notes

- **Digital fulfillment requires confirmed payment:** No entitlement is created for pending VietQR or unconfirmed PayPal orders.
- **Checkout requires authoritative pricing:** Product IDs and quantities come from the client; price, discounts, market eligibility, shipping, and totals come from the server.
- **Reviews require paid order lines:** Review eligibility is an order-derived permission, not a user-selected flag.
- **Account library requires identity linking:** Guest purchase history can be claimed only after proving control of the order email.
- **Mixed carts require separate fulfillment state:** Payment is order-level, while digital and physical fulfillment progress independently afterward.

## MVP Definition

### Launch With (v1)

- [ ] Localized catalog, taxonomy, market selection, market prices, and product eligibility.
- [ ] Physical variants, inventory, reservation, and shipping profiles.
- [ ] Mixed cart and server-calculated checkout for guest and account customers.
- [ ] PayPal payment and manually confirmed VietQR payment.
- [ ] Order state machine, verified webhooks, idempotency, and admin payment controls.
- [ ] Private PDF entitlements, email delivery, expiring links, and account re-downloads.
- [ ] Manual physical fulfillment, tracking updates, and customer status pages.
- [ ] Account history, saved addresses, wishlist, and guest-order claiming.
- [ ] Admin catalog/order/content operations.
- [ ] Exception requests, verified reviews, discount codes, newsletter, blog, and SEO foundations.

These are all in v1 because the owner explicitly selected them. The roadmap should still deliver them vertically in phases rather than attempting one large launch build.

### Add After Validation (v1.x)

- [ ] Automated VietQR transaction reconciliation - add when manual confirmation volume becomes costly and provider eligibility is known.
- [ ] Refund automation - add after real refund patterns and PayPal/VietQR operational needs are understood.
- [ ] Advanced analytics dashboard - add when meaningful traffic and sales data exists.
- [ ] Low-stock and abandoned-checkout automations - add after baseline operations stabilize.

### Future Consideration (v2+)

- [ ] Etsy catalog/order synchronization - defer because two-way inventory consistency is a separate product.
- [ ] Carrier label purchasing and automated customs documents - defer until shipping volume justifies integrations.
- [ ] Custom commission ordering - requires quoting, deposits, specifications, and a different fulfillment flow.
- [ ] Native mobile apps - responsive web should validate the business first.
- [ ] Multiple international currencies - USD is sufficient for the initial international market.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Catalog, market pricing, variants | HIGH | HIGH | P1 |
| Mixed checkout and order calculation | HIGH | HIGH | P1 |
| PayPal/VietQR payment confirmation | HIGH | HIGH | P1 |
| Secure PDF entitlement and delivery | HIGH | HIGH | P1 |
| Inventory reservation and shipping profiles | HIGH | HIGH | P1 |
| Admin order/catalog operations | HIGH | HIGH | P1 |
| Accounts, history, downloads, tracking | HIGH | MEDIUM | P1 |
| SEO and bilingual blog | HIGH | MEDIUM | P1 |
| Reviews, discounts, newsletter | MEDIUM | MEDIUM | P1 |
| Exception requests | MEDIUM | MEDIUM | P1 |
| Marketplace sync | MEDIUM | HIGH | P3 |
| Carrier automation | MEDIUM | HIGH | P3 |

## Product Pattern Comparison

| Capability | Typical marketplace pattern | Typical hosted-store pattern | Recommended approach |
|------------|-----------------------------|------------------------------|----------------------|
| Guest purchase | Supported to reduce friction | Commonly supported | Guest-first checkout with optional account and later claiming. |
| Shipping rates | Reusable profiles/templates | Zones and rate tables | Reusable shipping profiles attached to physical products. |
| Digital delivery | Download after payment | App/plugin or platform delivery | First-party entitlement plus expiring private link. |
| International pricing | Marketplace/platform market tools | Market-specific catalogs/prices | Explicit Vietnam and international availability/price records. |
| Reviews | Purchase-linked | Purchase-linked or plugin | Only paid order-line purchasers can review. |
| Content/SEO | Limited seller content | Stronger store/blog control | First-party bilingual blog and structured product pages. |

## Sources

- https://nextjs.org/docs/app - server-rendered ecommerce and metadata capabilities.
- https://developers.google.com/search/docs/appearance/structured-data/product-snippet - Product structured data requirements.
- https://developers.google.com/search/docs/specialty/international/localized-versions - localized URLs and `hreflang`.
- https://supabase.com/docs/guides/storage/serving/downloads - public versus private asset delivery.
- https://supabase.com/docs/reference/javascript/storage-from-createsignedurl - time-limited download links.
- https://developer.paypal.com/docs/api/orders/v2/ - order creation/capture lifecycle.
- https://developer.paypal.com/api/rest/webhooks/rest/ - payment webhook delivery and verification.
- Project owner discovery interview - business-specific v1 scope and Etsy-like shipping model.

---
*Feature research for: bilingual mixed digital/physical ecommerce*
*Researched: 2026-06-12*
