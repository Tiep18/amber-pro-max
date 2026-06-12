# Requirements: Amigurumi Pattern & Handmade Store

**Defined:** 2026-06-12
**Core Value:** Customers in Vietnam and international markets can reliably discover, purchase, pay for, and receive eligible digital and physical products through one branded storefront.

## v1 Requirements

### Localization and Markets

- [ ] **MKT-01**: Customer can browse storefront content in Vietnamese or English using localized URLs.
- [ ] **MKT-02**: Customer sees VND prices in the Vietnam market and USD prices in the international market.
- [ ] **MKT-03**: Admin can make each product available in Vietnam, internationally, or in both markets.
- [ ] **MKT-04**: Admin can assign independent Vietnam and international prices to a product or variant.
- [ ] **MKT-05**: Store suggests a market from the customer's IP country and shows the active market to the customer.
- [ ] **MKT-06**: Checkout validates physical-product eligibility against the shipping country and requires confirmation before applying any market-driven cart change.

### Catalog and Discovery

- [ ] **CAT-01**: Admin can create digital PDF products and physical handmade products.
- [ ] **CAT-02**: Admin can create physical variants with independent attributes, prices, SKUs, and inventory.
- [ ] **CAT-03**: Admin can manage localized product titles, descriptions, specifications, and SEO content.
- [ ] **CAT-04**: Admin can organize products by type, category, technique, tags, and collections independently.
- [ ] **CAT-05**: Customer can browse product, category, technique, tag, and collection pages.
- [ ] **CAT-06**: Customer can search, filter, and sort eligible products.
- [ ] **CAT-07**: Customer can clearly distinguish a PDF pattern from a physical finished product throughout browsing and checkout.
- [ ] **CAT-08**: Customer can view valid variant combinations and current availability before adding a physical product to cart.

### Cart, Pricing, and Shipping

- [ ] **CART-01**: Customer can add digital and physical products to one cart.
- [ ] **CART-02**: Customer can update quantities, variants, and remove cart items.
- [ ] **CART-03**: Server recalculates product prices, discounts, shipping fees, and order totals from authoritative records.
- [ ] **CART-04**: Customer can check out as a guest or while signed in.
- [ ] **CART-05**: System stores an immutable snapshot of product, variant, market, currency, price, discount, and shipping data on each order line.
- [ ] **SHIP-01**: Admin can create reusable shipping profiles with destination-based rules.
- [ ] **SHIP-02**: Shipping profiles can define first-item and additional-item fees for physical products.
- [ ] **SHIP-03**: Checkout calculates shipping only for physical order lines using the selected destination and attached profiles.
- [ ] **SHIP-04**: Customer can submit a non-binding exception request when a physical product is unavailable for the destination market.
- [ ] **SHIP-05**: Admin can approve or reject an exception request before the customer can place the exceptional order.

### Inventory and Orders

- [ ] **INV-01**: Admin can set and adjust inventory for each physical product or variant.
- [ ] **INV-02**: Checkout atomically reserves available physical inventory for a defined payment window.
- [ ] **INV-03**: System prevents checkout when requested inventory is unavailable or the variant combination is invalid.
- [ ] **INV-04**: System finalizes reserved inventory exactly once when payment is confirmed.
- [ ] **INV-05**: System releases inventory when an order is cancelled, payment fails, or the reservation expires.
- [ ] **ORD-01**: Customer receives an order number and can view a clear order summary after checkout.
- [ ] **ORD-02**: System tracks order, payment, digital fulfillment, and physical fulfillment states separately.
- [ ] **ORD-03**: Admin can view order history, status transitions, payment records, fulfillment records, and customer details.

### Payments

- [ ] **PAY-01**: International customer can pay an eligible USD order using PayPal.
- [ ] **PAY-02**: System creates and captures PayPal orders server-side using the authoritative order total.
- [ ] **PAY-03**: System verifies PayPal webhook authenticity and validates related order, merchant, amount, and currency.
- [ ] **PAY-04**: System processes each PayPal event and paid transition idempotently.
- [ ] **PAY-05**: Vietnam customer can place a VND order and receive VietQR bank-transfer instructions with exact amount, unique reference, and payment deadline.
- [ ] **PAY-06**: Authorized admin can confirm or reject a VietQR payment and the action is recorded in an audit trail.
- [ ] **PAY-07**: System does not grant digital access or begin fulfillment until the entire order is confirmed paid.
- [ ] **PAY-08**: Customer and admin can see whether payment is pending, paid, failed, cancelled, partially refunded, or refunded.

### Digital and Physical Fulfillment

- [ ] **DIG-01**: Admin can upload a PDF pattern to private storage and associate it with a digital product.
- [ ] **DIG-02**: System creates a digital entitlement only after the containing order is confirmed paid.
- [ ] **DIG-03**: Paid customer receives an email with an expiring link for each purchased PDF.
- [ ] **DIG-04**: Every download request validates an active entitlement before generating a short-lived signed storage URL.
- [ ] **DIG-05**: Signed-in customer can re-download purchased PDFs from a personal pattern library.
- [ ] **DIG-06**: Guest customer can securely reopen an order and request a fresh download link using an expiring access token.
- [ ] **DIG-07**: Admin can resend a download email or revoke/reissue digital access with an audit record.
- [ ] **FUL-01**: A mixed order releases eligible PDFs after full payment while physical lines remain awaiting fulfillment.
- [ ] **FUL-02**: Admin can update physical fulfillment status and add carrier and tracking information.
- [ ] **FUL-03**: Customer receives shipping updates by email and can view tracking on the order page.

### Customer Accounts

- [ ] **ACC-01**: Customer can register, sign in, sign out, and reset a password.
- [ ] **ACC-02**: Signed-in customer can view only their own order history, order details, payments, downloads, and tracking.
- [ ] **ACC-03**: Customer can save, edit, and delete shipping addresses.
- [ ] **ACC-04**: Customer can add and remove products from a wishlist.
- [ ] **ACC-05**: Guest customer can claim prior orders into an account after verifying control of the order email.

### Reviews, Discounts, and Newsletter

- [ ] **REV-01**: Customer can review a product only when a paid order line proves purchase eligibility.
- [ ] **REV-02**: Admin can approve, hide, and respond to product reviews.
- [ ] **DISC-01**: Admin can create percentage or fixed-value discount codes.
- [ ] **DISC-02**: Admin can restrict a discount by dates, usage count, customer, market, minimum spend, product, category, or collection.
- [ ] **DISC-03**: Checkout validates a discount server-side and records its allocation on the order.
- [ ] **NEWS-01**: Visitor can explicitly subscribe to the newsletter in Vietnamese or English.
- [ ] **NEWS-02**: System records consent source and timestamp and provides a secure unsubscribe link.
- [ ] **NEWS-03**: Admin can view subscribers and their subscription status.

### Blog and SEO

- [ ] **BLOG-01**: Admin can create, edit, preview, publish, unpublish, and schedule bilingual blog posts.
- [ ] **BLOG-02**: Admin can organize blog posts by categories and tags and link posts to related products.
- [ ] **SEO-01**: Admin can manage localized slugs, titles, descriptions, canonical URLs, and social sharing images.
- [ ] **SEO-02**: Public localized pages emit correct language alternates using `hreflang`.
- [ ] **SEO-03**: Product and blog pages emit valid Product and Article structured data.
- [ ] **SEO-04**: System publishes localized sitemaps and an appropriate robots file.

### Administration, Security, and Operations

- [ ] **ADM-01**: Authorized admin can manage catalog, markets, inventory, shipping, orders, payments, fulfillment, customers, reviews, discounts, newsletter, blog, and site content.
- [ ] **ADM-02**: Admin operations that affect payment, stock, access rights, or customer data require server-side authorization.
- [ ] **SEC-01**: Every exposed customer or commerce table has Row Level Security policies matching anonymous, customer, and admin access.
- [x] **SEC-02**: Privileged database and storage credentials are never exposed to the browser.
- [ ] **SEC-03**: Sensitive admin actions and important state transitions are recorded in an audit log.
- [ ] **OPS-01**: Transactional email requests are stored durably and retried safely after transient failures.
- [ ] **OPS-02**: Admin can inspect failed transactional emails and trigger a controlled resend.
- [ ] **OPS-03**: System captures and reports application, payment, email, and fulfillment errors without logging secrets or unnecessary personal data.
- [ ] **OPS-04**: Critical guest/account checkout, payment, inventory, download, tracking, localization, and authorization flows have automated verification.
- [ ] **LEGAL-01**: Store publishes Vietnamese and English privacy, terms of sale, physical return, and digital-download policies.
- [ ] **LEGAL-02**: Launch configuration explicitly records enabled destination countries and the seller-approved tax and consumer-policy decisions.

## v2 Requirements

### Payment and Operations

- **PAY-09**: System automatically reconciles eligible Vietnam bank transactions with pending VietQR orders.
- **OPS-05**: Admin can view advanced sales, conversion, product, and fulfillment analytics.
- **OPS-06**: System sends automated low-stock and abandoned-checkout campaigns.

### Shipping and Channels

- **SHIP-06**: Admin can purchase carrier labels and generate customs documents through integrated carriers.
- **CHAN-01**: System synchronizes products, inventory, and orders with Etsy.

### Products and Platforms

- **PROD-01**: Customer can request and pay for custom-made commission work.
- **APP-01**: Customer can shop through native mobile applications.
- **MKT-07**: International customers can check out in additional configured currencies.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cash on delivery | Mixed orders require confirmed payment before releasing digital goods. |
| Automated VNPay or MoMo integration | VietQR manual transfer is the simplest individual-seller v1 method. |
| Permanent public PDF URLs or email attachments | They do not provide durable access control for paid files. |
| Automatic approval of market exceptions | Shipping feasibility and cost require admin review. |
| Live exchange-rate pricing | The business needs intentional, independent market prices. |
| Microservices | A modular monolith is simpler and sufficient for the expected launch scale. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MKT-01 | Phase 1 | Pending |
| MKT-02 | Phase 2 | Pending |
| MKT-03 | Phase 2 | Pending |
| MKT-04 | Phase 2 | Pending |
| MKT-05 | Phase 2 | Pending |
| MKT-06 | Phase 3 | Pending |
| CAT-01 | Phase 2 | Pending |
| CAT-02 | Phase 2 | Pending |
| CAT-03 | Phase 2 | Pending |
| CAT-04 | Phase 2 | Pending |
| CAT-05 | Phase 2 | Pending |
| CAT-06 | Phase 2 | Pending |
| CAT-07 | Phase 2 | Pending |
| CAT-08 | Phase 2 | Pending |
| CART-01 | Phase 3 | Pending |
| CART-02 | Phase 3 | Pending |
| CART-03 | Phase 3 | Pending |
| CART-04 | Phase 3 | Pending |
| CART-05 | Phase 3 | Pending |
| SHIP-01 | Phase 3 | Pending |
| SHIP-02 | Phase 3 | Pending |
| SHIP-03 | Phase 3 | Pending |
| SHIP-04 | Phase 3 | Pending |
| SHIP-05 | Phase 3 | Pending |
| INV-01 | Phase 2 | Pending |
| INV-02 | Phase 3 | Pending |
| INV-03 | Phase 3 | Pending |
| INV-04 | Phase 4 | Pending |
| INV-05 | Phase 4 | Pending |
| ORD-01 | Phase 4 | Pending |
| ORD-02 | Phase 4 | Pending |
| ORD-03 | Phase 4 | Pending |
| PAY-01 | Phase 4 | Pending |
| PAY-02 | Phase 4 | Pending |
| PAY-03 | Phase 4 | Pending |
| PAY-04 | Phase 4 | Pending |
| PAY-05 | Phase 4 | Pending |
| PAY-06 | Phase 4 | Pending |
| PAY-07 | Phase 4 | Pending |
| PAY-08 | Phase 4 | Pending |
| DIG-01 | Phase 2 | Pending |
| DIG-02 | Phase 5 | Pending |
| DIG-03 | Phase 5 | Pending |
| DIG-04 | Phase 5 | Pending |
| DIG-05 | Phase 5 | Pending |
| DIG-06 | Phase 5 | Pending |
| DIG-07 | Phase 5 | Pending |
| FUL-01 | Phase 5 | Pending |
| FUL-02 | Phase 5 | Pending |
| FUL-03 | Phase 5 | Pending |
| ACC-01 | Phase 1 | Pending |
| ACC-02 | Phase 5 | Pending |
| ACC-03 | Phase 6 | Pending |
| ACC-04 | Phase 6 | Pending |
| ACC-05 | Phase 5 | Pending |
| REV-01 | Phase 6 | Pending |
| REV-02 | Phase 6 | Pending |
| DISC-01 | Phase 3 | Pending |
| DISC-02 | Phase 3 | Pending |
| DISC-03 | Phase 3 | Pending |
| NEWS-01 | Phase 6 | Pending |
| NEWS-02 | Phase 6 | Pending |
| NEWS-03 | Phase 6 | Pending |
| BLOG-01 | Phase 7 | Pending |
| BLOG-02 | Phase 7 | Pending |
| SEO-01 | Phase 2 | Pending |
| SEO-02 | Phase 7 | Pending |
| SEO-03 | Phase 7 | Pending |
| SEO-04 | Phase 7 | Pending |
| ADM-01 | Phase 7 | Pending |
| ADM-02 | Phase 1 | Pending |
| SEC-01 | Phase 1 | Pending |
| SEC-02 | Phase 1 | Complete |
| SEC-03 | Phase 4 | Pending |
| OPS-01 | Phase 5 | Pending |
| OPS-02 | Phase 5 | Pending |
| OPS-03 | Phase 7 | Pending |
| OPS-04 | Phase 7 | Pending |
| LEGAL-01 | Phase 7 | Pending |
| LEGAL-02 | Phase 7 | Pending |

**Coverage:**

- v1 requirements: 80 total
- Mapped to phases: 80
- Unmapped: 0

---
*Requirements defined: 2026-06-12*
*Last updated: 2026-06-12 after roadmap creation*
