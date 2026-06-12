# Amigurumi Pattern & Handmade Store

## What This Is

A bilingual ecommerce website for selling downloadable crochet patterns and handmade physical goods, including crocheted stuffed animals, dolls, doll clothing, and accessories. The store serves customers in Vietnam and international customers, primarily in the United States, while allowing each product to have market-specific availability and pricing.

The website is a trusted, independent sales channel for the brand rather than relying entirely on Etsy or social media. Blog content, multilingual SEO, and direct customer relationships support long-term brand awareness and growth.

## Core Value

Customers in Vietnam and international markets can reliably discover, purchase, pay for, and receive eligible digital and physical products through one branded storefront.

## Requirements

### Validated

(None yet - ship to validate)

### Active

- [ ] Customers can browse a Vietnamese and English storefront with localized market availability, content, currency, and pricing.
- [ ] Products can be digital PDF patterns, physical handmade goods, or physical products with variants.
- [ ] A product can be sold only in Vietnam, only internationally, or in both markets, with optional market-specific prices.
- [ ] The storefront initially detects the customer's market from IP and validates physical-product eligibility against the shipping address.
- [ ] Customers can purchase digital and physical products together in one mixed cart and order.
- [ ] Customers can check out with or without an account.
- [ ] Vietnam customers can pay by manual bank transfer using VietQR, with fulfillment beginning only after admin confirmation.
- [ ] International customers can pay through PayPal.
- [ ] PDF download links are emailed only after the full order payment is confirmed, including for mixed orders.
- [ ] PDF delivery uses secure, expiring download links rather than email attachments.
- [ ] Physical products use admin-managed shipping profiles with destination-based fees similar to Etsy.
- [ ] Admin can fulfill physical orders manually and add tracking numbers after shipment.
- [ ] Customers can request an exception when a physical product is not normally available for their shipping market.
- [ ] Admin can approve or reject market-availability exception requests.
- [ ] Admin can manage product and variant inventory quantities.
- [ ] Physical product variants can have independent attributes, prices, and inventory, including doll type, size, and color.
- [ ] Signed-in customers can view order history and status, re-download purchased patterns, save shipping addresses, track physical shipments, and manage a wishlist.
- [ ] Products can be organized independently by product type, categories, techniques, tags, and collections.
- [ ] Product taxonomy names and descriptions can be managed in Vietnamese and English.
- [ ] Verified purchasers can submit product reviews, subject to admin moderation, and admin can respond.
- [ ] Admin can create percentage or fixed-value discount codes with time, usage, and market restrictions.
- [ ] Customers can explicitly subscribe to a newsletter and can unsubscribe through an email link.
- [ ] Admin can publish bilingual blog posts with SEO metadata, friendly URLs, and social sharing images.
- [ ] Admin can manage products, variants, inventory, PDF files, market rules, pricing, shipping profiles, orders, payments, tracking, exception requests, customers, discounts, reviews, newsletter subscribers, blog content, and site content.

### Out of Scope

- Automated Vietnamese payment gateways such as VNPay or MoMo - VietQR manual bank transfer is simpler for v1 and does not require business integration paperwork.
- Cash on delivery - payment must be confirmed before digital products can be released, and mixed orders need one consistent payment state.
- Custom-made commission ordering - not included in the agreed v1 scope.
- Native mobile applications - the initial product is a responsive web storefront.
- Automatic carrier label purchasing or fulfillment - the owner will arrange shipping and enter tracking manually.
- Marketplace synchronization with Etsy - the website is intended to establish an independent sales channel first.

## Context

The business sells both digital crochet-pattern PDFs and limited-inventory handmade goods. A single order may include both product kinds, but no PDF is released until the entire order has been paid successfully.

For Vietnam, the initial payment method should be straightforward for an individual seller and avoid business-registration requirements. Manual bank transfer with a VietQR payment instruction is the preferred v1 approach. International checkout uses PayPal.

Digital-only orders normally use a common price, but the system must still support separate Vietnam and international prices when needed. IP detection determines the market for digital-only purchases. Physical-product eligibility is checked again using the shipping destination.

When a physical product is unavailable in the customer's market, checkout should not silently remove it. The customer can submit an exception request for admin review.

Shipping costs are configured through reusable shipping profiles based on destinations. The owner handles packing and shipping outside the system, then updates the order with a tracking number.

Product organization separates commercial form from discovery metadata:

- Product type: PDF pattern or physical finished product
- Categories: stuffed animals, dolls, doll clothing, accessories, and future categories
- Technique: crochet, sewing, or mixed
- Tags: character, animal, size, pattern difficulty, holiday, and other flexible labels
- Collections: seasonal, best sellers, new arrivals, and curated groups

The website must strengthen brand credibility, reduce dependence on Etsy, support both domestic and international commerce, and improve discovery through bilingual blog content and SEO.

## Constraints

- **Markets**: Vietnam and international markets require different availability, pricing, payment, and shipping behavior.
- **Languages**: Customer-facing storefront, product taxonomy, products, and blog content must support Vietnamese and English.
- **Currencies**: Vietnam pricing is presented in VND and international pricing in USD.
- **Payments**: VietQR manual bank transfer for Vietnam and PayPal for international customers in v1.
- **Payment confirmation**: Digital fulfillment must never occur until the full order is confirmed paid.
- **Digital security**: Purchased PDFs are delivered through expiring, access-controlled links.
- **Guest checkout**: Purchasing cannot require account creation.
- **Mixed carts**: Digital and physical products must coexist in one cart and order.
- **Inventory**: Physical inventory and variant inventory are explicitly managed by admin.
- **Fulfillment**: Physical shipping and carrier arrangements remain manual; the system stores shipping fees, status, and tracking.
- **SEO**: Public product, category, collection, and blog pages must be indexable and support localized metadata.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build an independent bilingual storefront | Increase brand trust, reduce Etsy dependency, and sell directly in Vietnam and internationally | - Pending |
| Support mixed digital and physical orders | Customers should be able to buy patterns and handmade goods in one checkout | - Pending |
| Use IP detection plus shipping-address validation | Digital-only orders need a market without shipping data, while physical eligibility must reflect the destination | - Pending |
| Use VietQR manual bank transfer for Vietnam v1 | Easiest setup for an individual seller without requiring a business payment-gateway integration | - Pending |
| Use PayPal for international payments | Matches the primary international customer market and stated business preference | - Pending |
| Release PDFs only after full payment confirmation | Prevent unpaid digital delivery and keep mixed-order payment behavior consistent | - Pending |
| Deliver PDFs through expiring email links | Supports guest purchases while protecting downloadable files better than attachments | - Pending |
| Model shipping fees with reusable profiles | Matches the owner's Etsy-like shipping workflow across products and destinations | - Pending |
| Allow admin-reviewed market exceptions | Preserve sales opportunities without bypassing product availability controls automatically | - Pending |
| Separate type, category, technique, tags, and collections | Keeps product format, merchandising, and discovery concerns flexible and maintainable | - Pending |
| Allow both guest and account checkout | Minimize purchase friction while offering richer post-purchase features to registered customers | - Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? Move to Out of Scope with reason
2. Requirements validated? Move to Validated with phase reference
3. New requirements emerged? Add to Active
4. Decisions to log? Add to Key Decisions
5. "What This Is" still accurate? Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-12 after initialization*
