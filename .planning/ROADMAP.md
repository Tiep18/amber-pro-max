# Roadmap: Amigurumi Pattern & Handmade Store

## Overview

The project grows through seven vertical MVP phases. Each phase leaves a usable end-to-end capability: a secure bilingual application, a browsable market-aware catalog, a trustworthy mixed checkout, confirmed payments, complete digital and physical fulfillment, customer-retention tools, and finally a launch-ready content and SEO system. Commerce correctness and access control are established before traffic-building features.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions marked `INSERTED`

- [ ] **Phase 1: Secure Bilingual Foundation** - Customers and admins can enter a localized application with correctly protected identities and data.
- [ ] **Phase 2: Market-Aware Catalog** - Admin can publish products and customers can discover eligible products with correct market prices and variants.
- [ ] **Phase 3: Mixed Cart and Checkout** - Customers can build a mixed order with authoritative pricing, shipping, discounts, inventory reservation, and exception handling.
- [ ] **Phase 4: Trusted Payments and Orders** - PayPal and VietQR safely move orders through auditable, idempotent payment and inventory states.
- [ ] **Phase 5: Fulfillment and Purchase Access** - Paid customers receive secure PDFs and can follow physical fulfillment without conflating the two workflows.
- [ ] **Phase 6: Customer Retention and Trust** - Customers can manage repeat-purchase data, wishlists, reviews, and newsletter relationships.
- [ ] **Phase 7: Content, SEO, and Launch Readiness** - The bilingual store is discoverable, operable, policy-complete, monitored, and verified for launch.

## Phase Details

### Phase 1: Secure Bilingual Foundation

**Goal**: Deliver a deployable Vietnamese/English application where customers can authenticate and admin/customer data boundaries are enforced from the first schema.
**Mode:** mvp
**UI hint:** yes
**Depends on**: Nothing (first phase)
**Requirements**: MKT-01, ACC-01, ADM-02, SEC-01, SEC-02
**Success Criteria**:

  1. Visitor can switch between localized Vietnamese and English routes without losing navigation context.
  2. Customer can register, sign in, sign out, and reset a password.
  3. Anonymous users, customers, and admins can access only the records and operations permitted to their role.
  4. Privileged credentials and admin operations remain server-only in production and automated security checks.

**Plans**: 8 plans
Plans:
**Wave 1**

- [x] 01-01: Create package, dependency, and configuration foundation

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02: Implement locale routing, translated slugs, and localization tests
- [x] 01-04: Establish Supabase migrations, generated types, and RLS test harness

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03: Build public UI shell, design tokens, and route-preserving language switcher
- [ ] 01-05: Implement Supabase SSR clients, auth actions, callbacks, and safe redirects

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 01-06: Build localized authentication pages and auth E2E coverage

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 01-07: Implement protected account and admin shells with server authorization

**Wave 6** *(blocked on Wave 5 completion)*

- [ ] 01-08: Verify role boundaries, secret handling, foundation UX, CI, and deployment readiness

### Phase 2: Market-Aware Catalog

**Goal**: Let admin publish bilingual digital and physical products while customers browse the right assortment, price, currency, and variants for their market.
**Mode:** mvp
**UI hint:** yes
**Depends on**: Phase 1
**Requirements**: MKT-02, MKT-03, MKT-04, MKT-05, CAT-01, CAT-02, CAT-03, CAT-04, CAT-05, CAT-06, CAT-07, CAT-08, INV-01, DIG-01, SEO-01
**Success Criteria**:

  1. Admin can create a translated PDF or physical product with taxonomy, market offers, media, and physical variants/inventory where applicable.
  2. Customer sees the active suggested market and only eligible VND or USD product offers.
  3. Customer can browse, search, filter, sort, and open localized product and merchandising pages.
  4. Product pages clearly distinguish patterns from finished goods and prevent invalid or unavailable variant selection.
  5. Digital assets are stored privately and localized product metadata is ready for indexing and sharing.

**Plans**: 5 plans

Plans:

- [ ] 02-01: Model catalog, translations, taxonomy, market offers, variants, and inventory
- [ ] 02-02: Build protected product/PDF media management and catalog administration
- [ ] 02-03: Implement IP market suggestion, currency presentation, and market-aware queries
- [ ] 02-04: Build localized catalog, discovery, collection, and product-detail experiences
- [ ] 02-05: Verify catalog RLS, market isolation, variants, inventory editing, and product metadata

### Phase 3: Mixed Cart and Checkout

**Goal**: Let guest or signed-in customers create a valid mixed order with server-calculated totals, shipping profiles, discounts, destination validation, and reserved inventory.
**Mode:** mvp
**UI hint:** yes
**Depends on**: Phase 2
**Requirements**: MKT-06, CART-01, CART-02, CART-03, CART-04, CART-05, SHIP-01, SHIP-02, SHIP-03, SHIP-04, SHIP-05, INV-02, INV-03, DISC-01, DISC-02, DISC-03
**Success Criteria**:

  1. Customer can combine PDFs and physical variants in one cart and edit quantities without accepting stale prices or stock.
  2. Guest or signed-in customer can enter a destination and receive an authoritative total with eligible discounts and physical-only shipping fees.
  3. Checkout clearly asks for confirmation when shipping country changes market eligibility or pricing.
  4. Limited inventory is reserved atomically and invalid, unavailable, or oversold variants cannot become payable orders.
  5. Customer can submit a non-binding market exception request and admin can approve or reject it before exceptional checkout.

**Plans**: 5 plans

Plans:

- [ ] 03-01: Build mixed cart and server-owned pricing pipeline
- [ ] 03-02: Implement shipping profiles, destination quotes, and market revalidation
- [ ] 03-03: Implement discount administration, validation, and order allocation
- [ ] 03-04: Create guest/account checkout drafts, immutable lines, and atomic reservations
- [ ] 03-05: Add exception-request workflow and concurrent checkout verification

### Phase 4: Trusted Payments and Orders

**Goal**: Turn checkout drafts into trustworthy orders through PayPal or VietQR while protecting inventory and recording every important state transition.
**Mode:** mvp
**UI hint:** yes
**Depends on**: Phase 3
**Requirements**: INV-04, INV-05, ORD-01, ORD-02, ORD-03, PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, PAY-07, PAY-08, SEC-03
**Success Criteria**:

  1. International customer can pay the exact authoritative USD total through PayPal and receive one confirmed order even when callbacks or webhooks repeat.
  2. Vietnam customer receives exact VietQR instructions and the order remains pending until an authorized admin records bank verification.
  3. Failed, cancelled, rejected, or expired payments release reserved inventory, while a paid transition finalizes it exactly once.
  4. Customer and admin can see accurate payment/order states, and digital or physical fulfillment cannot begin before full payment.
  5. Admin can inspect order history, payment evidence, state transitions, and audit records without exposing another customer's data.

**Plans**: 5 plans

Plans:

- [ ] 04-01: Define order/payment state machines, audit events, and inventory finalization
- [ ] 04-02: Integrate server-owned PayPal create/capture flow
- [ ] 04-03: Verify PayPal webhooks, idempotency, reconciliation, and failure handling
- [ ] 04-04: Implement VietQR instructions, deadlines, and audited admin confirmation
- [ ] 04-05: Build customer/admin order views and payment lifecycle verification

### Phase 5: Fulfillment and Purchase Access

**Goal**: Give paid customers durable, secure access to digital purchases and transparent tracking for physical goods, including mixed orders.
**Mode:** mvp
**UI hint:** yes
**Depends on**: Phase 4
**Requirements**: DIG-02, DIG-03, DIG-04, DIG-05, DIG-06, DIG-07, FUL-01, FUL-02, FUL-03, ACC-02, ACC-05, OPS-01, OPS-02
**Success Criteria**:

  1. Confirmed payment creates digital entitlements once and queues an email with short-lived, authorization-checked download links.
  2. Signed-in customer can view only their own orders and pattern library, while a guest can securely reopen and later claim their order.
  3. Expired links can be regenerated without making the PDF public, and admin can audit resend, revoke, or reissue actions.
  4. Admin can advance physical fulfillment and add tracking while digital fulfillment remains independently complete.
  5. Failed transactional emails are durable, visible to admin, retry safely, and do not cause duplicate entitlements.

**Plans**: 5 plans

Plans:

- [ ] 05-01: Implement entitlement creation, private downloads, and secure guest access
- [ ] 05-02: Build transactional outbox, localized order/download email, retry, and resend
- [ ] 05-03: Build account order history, pattern library, and guest-order claiming
- [ ] 05-04: Implement physical fulfillment, tracking, notifications, and mixed-order status
- [ ] 05-05: Verify entitlement, email failure, cross-user access, and fulfillment-state scenarios

### Phase 6: Customer Retention and Trust

**Goal**: Let customers save shopping context, express verified product trust, and maintain an explicit newsletter relationship.
**Mode:** mvp
**UI hint:** yes
**Depends on**: Phase 5
**Requirements**: ACC-03, ACC-04, REV-01, REV-02, NEWS-01, NEWS-02, NEWS-03
**Success Criteria**:

  1. Customer can manage saved shipping addresses and a wishlist from their account.
  2. Only a customer with a paid order line can submit a review for that product.
  3. Admin can moderate and respond to reviews while customers see only approved content.
  4. Visitor can explicitly subscribe in either language and unsubscribe through a secure link with consent history retained.
  5. Admin can inspect current subscriber status without overriding customer consent.

**Plans**: 4 plans

Plans:

- [ ] 06-01: Implement saved addresses and wishlist experiences
- [ ] 06-02: Implement verified-purchase reviews and admin moderation/replies
- [ ] 06-03: Implement localized newsletter consent, unsubscribe, and subscriber administration
- [ ] 06-04: Verify ownership, review eligibility, consent, and account UX

### Phase 7: Content, SEO, and Launch Readiness

**Goal**: Launch a discoverable and operational bilingual store with blog publishing, technical SEO, policies, observability, and end-to-end verification.
**Mode:** mvp
**UI hint:** yes
**Depends on**: Phase 6
**Requirements**: BLOG-01, BLOG-02, SEO-02, SEO-03, SEO-04, ADM-01, OPS-03, OPS-04, LEGAL-01, LEGAL-02
**Success Criteria**:

  1. Admin can run all v1 catalog, commerce, customer, retention, content, and operational workflows from protected interfaces.
  2. Admin can publish bilingual scheduled blog content with categories, tags, related products, and valid Article metadata.
  3. Localized product and content pages expose correct `hreflang`, structured data, sitemaps, and robots behavior.
  4. Customers can read approved bilingual privacy, sale, return, and digital-download policies before purchase.
  5. Launch checks cover enabled countries, seller-approved policy/tax decisions, error monitoring, redacted logs, and automated critical journeys.

**Plans**: 5 plans

Plans:

- [ ] 07-01: Build bilingual blog authoring, scheduling, taxonomy, and related products
- [ ] 07-02: Complete localized technical SEO, structured data, sitemaps, and robots
- [ ] 07-03: Complete unified admin operations and safe observability
- [ ] 07-04: Publish bilingual policies and codify country/tax/consumer launch decisions
- [ ] 07-05: Run security, accessibility, performance, SEO, and end-to-end launch verification

## Progress

**Execution Order:**
Phases execute in numeric order. Decimal insertions execute between their surrounding integer phases.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Secure Bilingual Foundation | 4/8 | In Progress|  |
| 2. Market-Aware Catalog | 0/5 | Not started | - |
| 3. Mixed Cart and Checkout | 0/5 | Not started | - |
| 4. Trusted Payments and Orders | 0/5 | Not started | - |
| 5. Fulfillment and Purchase Access | 0/5 | Not started | - |
| 6. Customer Retention and Trust | 0/4 | Not started | - |
| 7. Content, SEO, and Launch Readiness | 0/5 | Not started | - |
