# Requirements: Amigurumi Pattern & Handmade Store

**Defined:** 2026-06-12
**Core Value:** Customers in Vietnam and international markets can reliably discover, purchase, pay for, and receive eligible digital and physical products through one branded storefront.

## v1 Requirements

### Localization and Markets

- [x] **MKT-01**: Customer can browse storefront content in Vietnamese or English using localized URLs.
- [x] **MKT-02**: Customer sees VND prices in the Vietnam market and USD prices in the international market.
- [x] **MKT-03**: Admin can make each product available in Vietnam, internationally, or in both markets.
- [x] **MKT-04**: Admin can assign independent Vietnam and international prices to a product or variant.
- [x] **MKT-05**: Store suggests a market from the customer's IP country and shows the active market to the customer.
- [x] **MKT-06**: Checkout validates physical-product eligibility against the shipping country and requires confirmation before applying any market-driven cart change.

### Catalog and Discovery

- [x] **CAT-01**: Admin can create digital PDF products and physical handmade products.
- [x] **CAT-02**: Admin can create physical variants with independent attributes, prices, SKUs, and inventory.
- [x] **CAT-03**: Admin can manage localized product titles, descriptions, specifications, and SEO content.
- [x] **CAT-04**: Admin can organize products by type, category, technique, tags, and collections independently.
- [x] **CAT-05**: Customer can browse product, category, technique, tag, and collection pages.
- [x] **CAT-06**: Customer can search, filter, and sort eligible products.
- [x] **CAT-07**: Customer can clearly distinguish a PDF pattern from a physical finished product throughout browsing and checkout.
- [x] **CAT-08**: Customer can view valid variant combinations and current availability before adding a physical product to cart.

### Cart, Pricing, and Shipping

- [x] **CART-01**: Customer can add digital and physical products to one cart.
- [x] **CART-02**: Customer can update quantities, variants, and remove cart items.
- [x] **CART-03**: Server recalculates product prices, discounts, shipping fees, and order totals from authoritative records.
- [x] **CART-04**: Customer can check out as a guest or while signed in.
- [x] **CART-05**: System stores an immutable snapshot of product, variant, market, currency, price, discount, and shipping data on each order line.
- [x] **SHIP-01**: Admin can create reusable shipping profiles with destination-based rules.
- [x] **SHIP-02**: Shipping profiles can define first-item and additional-item fees for physical products.
- [x] **SHIP-03**: Checkout calculates shipping only for physical order lines using the selected destination and attached profiles.
- [x] **SHIP-04**: Customer can submit a non-binding exception request when a physical product is unavailable for the destination market.
- [x] **SHIP-05**: Admin can approve or reject an exception request before the customer can place the exceptional order.

### Inventory and Orders

- [x] **INV-01**: Admin can set and adjust inventory for each physical product or variant.
- [x] **INV-02**: Checkout atomically reserves available physical inventory for a defined payment window.
- [x] **INV-03**: System prevents checkout when requested inventory is unavailable or the variant combination is invalid.
- [x] **INV-04**: System finalizes reserved inventory exactly once when payment is confirmed.
- [x] **INV-05**: System releases inventory when an order is cancelled, payment fails, or the reservation expires.
- [x] **ORD-01**: Customer receives an order number and can view a clear order summary after checkout.
- [x] **ORD-02**: System tracks order, payment, digital fulfillment, and physical fulfillment states separately.
- [x] **ORD-03**: Admin can view order history, status transitions, payment records, fulfillment records, and customer details.

### Payments

- [x] **PAY-01**: International customer can pay an eligible USD order using PayPal.
- [x] **PAY-02**: System creates and captures PayPal orders server-side using the authoritative order total.
- [x] **PAY-03**: System verifies PayPal webhook authenticity and validates related order, merchant, amount, and currency.
- [x] **PAY-04**: System processes each PayPal event and paid transition idempotently.
- [x] **PAY-05**: Vietnam customer can place a VND order and receive VietQR bank-transfer instructions with exact amount, unique reference, and payment deadline.
- [x] **PAY-06**: Authorized admin can confirm or reject a VietQR payment and the action is recorded in an audit trail.
- [x] **PAY-07**: System does not grant digital access or begin fulfillment until the entire order is confirmed paid.
- [x] **PAY-08**: Customer and admin can see whether payment is pending, paid, failed, cancelled, partially refunded, or refunded.

### Digital and Physical Fulfillment

- [x] **DIG-01**: Admin can upload a PDF pattern to private storage and associate it with a digital product.
- [x] **DIG-02**: System creates a digital entitlement only after the containing order is confirmed paid.
- [x] **DIG-03**: Paid customer receives an email with an expiring link for each purchased PDF.
- [x] **DIG-04**: Every download request validates an active entitlement before generating a short-lived signed storage URL.
- [x] **DIG-05**: Signed-in customer can re-download purchased PDFs from a personal pattern library.
- [x] **DIG-06**: Guest customer can securely reopen an order and request a fresh download link using an expiring access token.
- [x] **DIG-07**: Admin can resend a download email or revoke/reissue digital access with an audit record.
- [x] **FUL-01**: A mixed order releases eligible PDFs after full payment while physical lines remain awaiting fulfillment.
- [x] **FUL-02**: Admin can update physical fulfillment status and add carrier and tracking information.
- [x] **FUL-03**: Customer receives shipping updates by email and can view tracking on the order page.

### Customer Accounts

- [x] **ACC-01**: Customer can register, sign in, sign out, and reset a password.
- [x] **ACC-02**: Signed-in customer can view only their own order history, order details, payments, downloads, and tracking.
- [x] **ACC-03**: Customer can save, edit, and delete shipping addresses.
- [x] **ACC-04**: Customer can add and remove products from a wishlist.
- [x] **ACC-05**: Guest customer can claim prior orders into an account after verifying control of the order email.

### Reviews, Discounts, and Newsletter

- [x] **REV-01**: Customer can review a product only when a paid order line proves purchase eligibility.
- [x] **REV-02**: Admin can approve, hide, and respond to product reviews.
- [x] **DISC-01**: Admin can create percentage or fixed-value discount codes.
- [x] **DISC-02**: Admin can restrict a discount by dates, usage count, customer, market, minimum spend, product, category, or collection.
- [x] **DISC-03**: Checkout validates a discount server-side and records its allocation on the order.
- [ ] **NEWS-01**: Visitor can explicitly subscribe to the newsletter in Vietnamese or English.
- [ ] **NEWS-02**: System records consent source and timestamp and provides a secure unsubscribe link.
- [ ] **NEWS-03**: Admin can view subscribers and their subscription status.

### Blog and SEO

- [ ] **BLOG-01**: Admin can create, edit, preview, publish, unpublish, and schedule bilingual blog posts.
- [ ] **BLOG-02**: Admin can organize blog posts by categories and tags and link posts to related products.
- [x] **SEO-01**: Admin can manage localized slugs, titles, descriptions, canonical URLs, and social sharing images.
- [ ] **SEO-02**: Public localized pages emit correct language alternates using `hreflang`.
- [ ] **SEO-03**: Product and blog pages emit valid Product and Article structured data.
- [ ] **SEO-04**: System publishes localized sitemaps and an appropriate robots file.

### Administration, Security, and Operations

- [ ] **ADM-01**: Authorized admin can manage catalog, markets, inventory, shipping, orders, payments, fulfillment, customers, reviews, discounts, newsletter, blog, and site content.
- [x] **ADM-02**: Admin operations that affect payment, stock, access rights, or customer data require server-side authorization.
- [x] **SEC-01**: Every exposed customer or commerce table has Row Level Security policies matching anonymous, customer, and admin access.
- [x] **SEC-02**: Privileged database and storage credentials are never exposed to the browser.
- [x] **SEC-03**: Sensitive admin actions and important state transitions are recorded in an audit log.
- [x] **OPS-01**: Transactional email requests are stored durably and retried safely after transient failures.
- [x] **OPS-02**: Admin can inspect failed transactional emails and trigger a controlled resend.
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
| MKT-01 | Phase 1 | Complete |
| MKT-02 | Phase 2 | Complete |
| MKT-03 | Phase 2 | Complete |
| MKT-04 | Phase 2 | Complete |
| MKT-05 | Phase 2 | Complete |
| MKT-06 | Phase 3 | Complete |
| CAT-01 | Phase 2 | Complete |
| CAT-02 | Phase 2 | Complete |
| CAT-03 | Phase 2 | Complete |
| CAT-04 | Phase 2 | Complete |
| CAT-05 | Phase 2 | Complete |
| CAT-06 | Phase 2 | Complete |
| CAT-07 | Phase 2 | Complete |
| CAT-08 | Phase 2 | Complete |
| CART-01 | Phase 3 | Complete |
| CART-02 | Phase 3 | Complete |
| CART-03 | Phase 3 | Complete |
| CART-04 | Phase 3 | Complete |
| CART-05 | Phase 3 | Complete |
| SHIP-01 | Phase 3 | Complete |
| SHIP-02 | Phase 3 | Complete |
| SHIP-03 | Phase 3 | Complete |
| SHIP-04 | Phase 3 | Complete |
| SHIP-05 | Phase 3 | Complete |
| INV-01 | Phase 2 | Complete |
| INV-02 | Phase 3 | Complete |
| INV-03 | Phase 3 | Complete |
| INV-04 | Phase 4 | Complete |
| INV-05 | Phase 4 | Complete |
| ORD-01 | Phase 4 | Complete |
| ORD-02 | Phase 4 | Complete |
| ORD-03 | Phase 4 | Complete |
| PAY-01 | Phase 4 | Complete |
| PAY-02 | Phase 4 | Complete |
| PAY-03 | Phase 4 | Complete |
| PAY-04 | Phase 4 | Complete |
| PAY-05 | Phase 4 | Complete |
| PAY-06 | Phase 4 | Complete |
| PAY-07 | Phase 4 | Complete |
| PAY-08 | Phase 4 | Complete |
| DIG-01 | Phase 2 | Complete |
| DIG-02 | Phase 5 | Complete |
| DIG-03 | Phase 5 | Complete |
| DIG-04 | Phase 5 | Complete |
| DIG-05 | Phase 5 | Complete |
| DIG-06 | Phase 5 | Complete |
| DIG-07 | Phase 5 | Complete |
| FUL-01 | Phase 5 | Complete |
| FUL-02 | Phase 5 | Complete |
| FUL-03 | Phase 5 | Complete |
| ACC-01 | Phase 1 | Complete |
| ACC-02 | Phase 5 | Complete |
| ACC-03 | Phase 6 | Complete |
| ACC-04 | Phase 6 | Complete |
| ACC-05 | Phase 5 | Complete |
| REV-01 | Phase 6 | Complete |
| REV-02 | Phase 6 | Complete |
| DISC-01 | Phase 3 | Complete |
| DISC-02 | Phase 3 | Complete |
| DISC-03 | Phase 3 | Complete |
| NEWS-01 | Phase 6 | Pending |
| NEWS-02 | Phase 6 | Pending |
| NEWS-03 | Phase 6 | Pending |
| BLOG-01 | Phase 7 | Pending |
| BLOG-02 | Phase 7 | Pending |
| SEO-01 | Phase 2 | Complete |
| SEO-02 | Phase 7 | Pending |
| SEO-03 | Phase 7 | Pending |
| SEO-04 | Phase 7 | Pending |
| ADM-01 | Phase 7 | Pending |
| ADM-02 | Phase 1 | Complete |
| SEC-01 | Phase 1 | Complete |
| SEC-02 | Phase 1 | Complete |
| SEC-03 | Phase 4 | Complete |
| OPS-01 | Phase 5 | Complete |
| OPS-02 | Phase 5 | Complete |
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
