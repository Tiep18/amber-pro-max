# Project Research Summary

**Project:** Amigurumi Pattern & Handmade Store
**Domain:** Bilingual mixed digital/physical ecommerce
**Researched:** 2026-06-12
**Confidence:** HIGH

## Executive Summary

This project should be built as a modular Next.js ecommerce application backed by Supabase Postgres, Auth, and private Storage. The combination fits the unusual core requirement: one order can contain both expiring digital access and manually shipped limited-inventory goods, while prices and availability vary between Vietnam and international markets. A standard hosted-store model would reduce basic commerce work but would fight the custom market, mixed-fulfillment, and exception-request rules.

The architecture must treat payment, inventory, digital rights, and physical fulfillment as separate but coordinated concerns. All totals are calculated server-side and snapshotted into orders; physical inventory is reserved atomically; PayPal and VietQR converge on one validated paid transition; that transition creates durable PDF entitlements and physical fulfillment tasks. PDF files remain private and each authorized download creates a short-lived URL.

The main risks are not page-building risks. They are payment trust, duplicate events, overselling, market-price leakage, insecure PDF access, weak RLS, and missing side effects after successful payment. These should shape the roadmap and verification criteria from the beginning.

## Key Findings

### Recommended Stack

Use Next.js 16.2.x, React 19.2.x, TypeScript, Tailwind CSS 4.3, shadcn/ui, `next-intl`, and deploy to Vercel. Use Supabase for Postgres, Auth, RLS, and private Storage; Resend for email; PayPal Orders API and verified webhooks for international payment; and manual VietQR bank-transfer confirmation for Vietnam.

**Core technologies:**
- **Next.js:** Storefront, admin, server APIs, localized SEO pages.
- **Supabase Postgres/Auth/Storage:** Relational commerce authority, identity, RLS, and protected PDFs.
- **PayPal + VietQR:** International automatic payment and Vietnam manual bank transfer.
- **Resend:** Durable transactional email and newsletter delivery.
- **Vercel:** Deployment, CDN, scheduled jobs, and IP-country suggestion.

### Expected Features

**Must have (table stakes):**
- Bilingual, market-aware catalog with explicit VND/USD offers and product eligibility.
- Product variants, limited inventory, reusable shipping profiles, and mixed cart.
- Guest/account checkout with server-calculated totals.
- Reliable PayPal/VietQR payment state and secure digital delivery.
- Order history, pattern library, tracking, saved addresses, and wishlist.
- Admin operations, blog/SEO, verified reviews, discounts, and newsletter consent.

**Competitive strengths:**
- One checkout for patterns and handmade goods.
- Admin-reviewed requests for normally unavailable markets.
- Durable pattern library and content-to-commerce links.
- Strong bilingual brand content independent of Etsy.

**Defer (v1.x/v2+):**
- Automatic bank reconciliation, advanced analytics, carrier labels, marketplace synchronization, commissions, and native apps.

### Architecture Approach

Use a modular monolith with domain modules for catalog/markets, inventory, cart/pricing, orders, payments, fulfillment, customers, and content. Postgres constraints and transactional functions protect money, stock, and state transitions. A transactional outbox makes email and fulfillment retries durable. RLS protects customer and admin data, while private Storage plus entitlement checks protects PDFs.

**Major components:**
1. **Localized storefront and admin** - presentation and HTTP boundaries.
2. **Commerce domains** - catalog, pricing, inventory, checkout, orders.
3. **Payment domain** - PayPal and VietQR adapters converging on one paid command.
4. **Fulfillment domain** - digital entitlements, email, shipping, tracking.
5. **Supabase platform** - database, auth, RLS, private object storage.

### Critical Pitfalls

1. **Trusting browser payment success** - fulfill only from validated, idempotent server transitions.
2. **Treating a PDF URL as ownership** - store entitlements and generate short-lived URLs per authorized request.
3. **Non-atomic inventory** - reserve and finalize stock transactionally with expiry.
4. **Using IP as final market truth** - use it as a suggestion and validate physical destination.
5. **Collapsing mixed order states** - separate payment, digital fulfillment, and physical fulfillment.
6. **Weak RLS/admin authorization** - enforce policies from the first schema and never expose privileged keys.
7. **Non-durable email** - use an outbox and account download fallback.

## Implications for Roadmap

The detailed roadmap should be derived from approved requirements, but research suggests this order.

### Phase 1: Platform, Identity, and Security Foundation
**Rationale:** Every later domain depends on localization, database migrations, Auth, roles, RLS, testing, and deployment.
**Delivers:** Next.js/Supabase baseline, locale routing, design foundation, customer/admin identity, CI, security tests.
**Avoids:** Retrofitted RLS and leaked privileged access.

### Phase 2: Market-Aware Catalog and Admin
**Rationale:** Checkout cannot be correct until products, translations, variants, market offers, taxonomy, assets, and admin editing are authoritative.
**Delivers:** Bilingual catalog, VND/USD offers, eligibility, inventory records, private PDF metadata, collections, product SEO.
**Avoids:** One-price schema and market cache leaks.

### Phase 3: Cart, Shipping, Inventory Reservations, and Checkout
**Rationale:** Server calculation, shipping profiles, discounts, guest identity, and atomic stock are prerequisites for payment.
**Delivers:** Mixed cart, destination validation, shipping quotes, reservations, immutable order drafts, exception requests.
**Avoids:** Overselling and client price tampering.

### Phase 4: Payments and Order Lifecycle
**Rationale:** PayPal and VietQR must converge on a single audited payment state machine before any fulfillment.
**Delivers:** PayPal sandbox integration/webhooks, VietQR instructions/admin confirmation, order snapshots, idempotency, refund-ready records.
**Avoids:** Duplicate fulfillment and unpaid PDF release.

### Phase 5: Digital and Physical Fulfillment
**Rationale:** Once payment is trustworthy, digital entitlements and physical workflow can be delivered safely.
**Delivers:** Expiring download links, transactional email/outbox, account pattern library, tracking, status notifications.
**Avoids:** Permanent PDF leaks and missing paid-order email.

### Phase 6: Customer Retention and Trust
**Rationale:** Reviews, wishlists, saved addresses, discounts, and newsletter build repeat purchasing on top of stable commerce.
**Delivers:** Full customer account features, verified reviews/admin replies, discount controls, consent/unsubscribe.

### Phase 7: Blog, SEO, and Launch Readiness
**Rationale:** Brand discovery and a production launch require complete localized content, structured data, policies, monitoring, and end-to-end verification.
**Delivers:** Bilingual blog, Article/Product structured data, sitemap/hreflang, operational dashboards, policy gates, launch tests.
**Avoids:** Search duplication and unexamined international compliance.

### Phase Ordering Rationale

- Catalog and market offers precede cart; cart, shipping, and reservations precede payment.
- Payment confirmation precedes digital entitlements and physical fulfillment.
- Retention features depend on real customer/order relationships.
- SEO starts structurally in early phases but final content and launch validation occur after commerce behavior is stable.

### Research Flags

Phases needing deeper research during planning:
- **Phase 3:** Exact shipping-profile calculation semantics and reservation expiry policy.
- **Phase 4:** Current PayPal SDK/API patterns, webhook event selection, refund design, and VietQR operational process.
- **Phase 5:** Email provider domain setup, deliverability, download-token policy, and outbox scheduling.
- **Phase 7:** Seller-specific tax, consumer, privacy, newsletter, and country eligibility decisions require professional validation.

Phases with established patterns:
- **Phase 1:** Next.js/Supabase SSR, RLS, localization, and CI are well documented.
- **Phase 2:** Relational catalog, translations, variants, taxonomy, and explicit market offers are standard modeling work.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Current official framework, provider, and package documentation checked. |
| Features | HIGH | Derived from explicit owner scope and standard ecommerce expectations. |
| Architecture | HIGH | Relational transactions, state machines, private storage, and idempotent webhooks directly fit the domain. |
| Pitfalls | HIGH | Payment, RLS, signed URL, webhook, and localization concerns are documented by primary sources. |

**Overall confidence:** HIGH

### Gaps to Address

- **Brand identity and final project name:** Needed before visual design, domain, metadata, and email setup.
- **Shipping rate rules:** Confirm exact Etsy-like profile fields, destinations, additional-item behavior, and free-shipping conditions.
- **Reservation windows:** Decide how long PayPal checkout and pending VietQR orders hold physical stock.
- **PayPal merchant eligibility and fees:** Validate against the seller's actual account and country before implementation.
- **Tax/legal policy:** Obtain seller-specific advice before enabling final destination countries.
- **Email/newsletter operations:** Confirm sender domain, address, consent wording, and chosen audience workflow.

## Sources

### Primary (HIGH confidence)

- https://nextjs.org/docs/app - Next.js 16 App Router.
- https://registry.npmjs.org/next/latest - Next.js 16.2.9 metadata on 2026-06-12.
- https://registry.npmjs.org/react/latest - React 19.2.7 metadata on 2026-06-12.
- https://supabase.com/changelog.md - current Supabase change index.
- https://supabase.com/docs/guides/auth/server-side/creating-a-client - SSR Auth and key guidance.
- https://supabase.com/docs/guides/database/postgres/row-level-security - RLS guidance.
- https://supabase.com/docs/reference/javascript/storage-from-createsignedurl - signed URLs.
- https://developer.paypal.com/docs/api/orders/v2/ - PayPal Orders API.
- https://developer.paypal.com/api/rest/webhooks/rest/ - webhook delivery and verification.
- https://resend.com/docs/send-with-nextjs - Next.js email integration.
- https://vercel.com/docs/headers/request-headers#x-vercel-ip-country - IP-country signal.
- https://developers.google.com/search/docs/appearance/structured-data/product-snippet - Product structured data.
- https://developers.google.com/search/docs/specialty/international/localized-versions - multilingual search architecture.

### Project Evidence (HIGH confidence)

- `.planning/PROJECT.md` - owner-approved product vision, markets, payments, fulfillment, account, admin, and content scope.

---
*Research completed: 2026-06-12*
*Ready for requirements: yes*
