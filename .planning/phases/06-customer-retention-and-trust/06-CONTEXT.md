# Phase 6: Customer Retention and Trust - Context

**Gathered:** 2026-06-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Let signed-in customers manage repeat-purchase data, let customers express
verified trust in purchased products, and let visitors maintain an explicit
newsletter relationship. This phase owns saved shipping addresses, wishlist
behavior, verified-purchase product reviews with moderation/admin replies, and
newsletter subscribe/unsubscribe consent records.

Earlier phases already own authentication, market-aware catalog display, mixed
checkout, immutable order shipping snapshots, paid-order gates, secure download
access, transactional email outbox/retry, order history, guest reopen, and
physical tracking. Blog publishing, technical SEO, legal/policy pages, full
admin operations, observability, launch country/tax decisions, and critical
journey launch verification remain Phase 7 scope.

</domain>

<decisions>
## Implementation Decisions

### Saved Addresses in Checkout
- **D-01:** A signed-in customer can choose a saved shipping address and copy it into the checkout form. The order still stores its own immutable shipping-address snapshot at checkout time.
- **D-02:** Each customer has one default shipping address for v1.
- **D-03:** Selecting a saved address immediately triggers quote revalidation. If the address country changes market, currency, price, shipping, or eligibility, the Phase 3 material-change preview must be shown and confirmed before checkout continues.
- **D-04:** Customers may edit or delete saved addresses freely, including the default address. Prior orders are not affected because their shipping snapshots remain immutable.

### Wishlist Behavior
- **D-05:** Wishlist entries are product-level only. The wishlist must reload current catalog facts such as market availability, price, stock, and variant state when rendered instead of storing commercial snapshots.
- **D-06:** Customers may save products that are not available in the active market. The wishlist must clearly show the unavailable state and must not offer direct checkout until the product is eligible.
- **D-07:** Wishlist management appears in the account area, and customers can add or remove products through heart controls on product cards and product detail pages.
- **D-08:** Guests who use a wishlist heart are prompted to sign in and then return to the relevant product or wishlist context. Phase 6 does not create a guest wishlist or cart-like guest wishlist merge.

### Verified Reviews and Moderation
- **D-09:** A customer may have one public review per product. Later purchases do not create duplicate public reviews; the customer may update the existing review instead.
- **D-10:** Customer edits to a submitted review send the updated content back to pending moderation before it can become public again.
- **D-11:** Public reviews show a shortened or masked customer display plus a verified-purchase badge. Full customer email addresses must never be public.
- **D-12:** Each review may have one public admin reply. Admin can create, edit, or remove that reply. Phase 6 does not create threaded review conversations.

### Newsletter Consent and Unsubscribe
- **D-13:** Email is the primary identifier for newsletter subscription state. Store the latest locale and market preference plus consent history so visitors and signed-in customers can subscribe without requiring an account.
- **D-14:** Unsubscribe uses a one-click token from the email, then shows a localized confirmation page with the result and an option to subscribe again. Unsubscribe must not require sign-in.
- **D-15:** Admin can view, search, and filter subscriber status and consent history, but cannot override customer consent by manually subscribing or unsubscribing customers in v1.
- **D-16:** Newsletter consent evidence stores email, locale, market, consent source, timestamp, hashed or redacted IP/user-agent metadata, and unsubscribe token metadata. Avoid raw PII-heavy logs beyond what is needed for consent evidence.

### the agent's Discretion
- Exact database table names, enum names, action names, and route paths may be chosen during planning, provided the locked ownership, authorization, consent, and moderation behavior above is preserved.
- Exact bilingual copy, empty states, button labels, and compact admin list layouts may follow the existing account, catalog, admin, and email UI patterns.
- Exact review rating scale, review sorting, wishlist unavailable CTA wording, saved-address labels, and subscriber filter set may be chosen during UI specification/planning as long as they do not add new capabilities outside Phase 6.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Scope and Requirements
- `.planning/PROJECT.md` - Defines account features, wishlist, verified reviews, newsletter consent/unsubscribe, guest checkout, mixed commerce, immutable order evidence, and admin/customer boundaries.
- `.planning/REQUIREMENTS.md` - Phase 6 requirements are ACC-03, ACC-04, REV-01, REV-02, NEWS-01, NEWS-02, and NEWS-03.
- `.planning/ROADMAP.md` - Defines Phase 6 goal, success criteria, dependency on Phase 5, and planned slices 06-01 through 06-04.

### Prior Phase Decisions
- `.planning/phases/05-fulfillment-and-purchase-access/05-CONTEXT.md` - Locks signed-in order history, pattern library access, guest reopen/claim behavior, transactional email outbox patterns, and split digital/physical fulfillment UI.
- `.planning/phases/04-trusted-payments-and-orders/04-CONTEXT.md` - Locks immutable shipping-address snapshots, customer/admin order visibility, paid gates, payment/order state separation, and sanitized evidence display.
- `.planning/phases/03-mixed-cart-and-checkout/03-CONTEXT.md` - Locks server-authoritative checkout, guest/account cart boundaries, material-change quote previews, market revalidation, and exception request behavior.
- `.planning/phases/02-market-aware-catalog/02-CONTEXT.md` - Locks market-aware catalog data, unavailable-market behavior, product/variant availability, private PDF handling, and public product display patterns.
- `.planning/phases/01-secure-bilingual-foundation/01-CONTEXT.md` - Locks localized `/vi` and `/en` routes plus server-enforced customer/admin authorization boundaries.

### Architecture and Stack
- `.planning/research/STACK.md` - Defines Next.js App Router, Supabase Postgres/Auth/RLS, `@supabase/ssr`, Zod, Resend, Vitest, Playwright, integer money, and private/protected data handling constraints.
- `.planning/research/ARCHITECTURE.md` - Defines account, newsletter, reviews, wishlist, outbox, and admin/customer service boundaries for the modular monolith.
- `.planning/research/PITFALLS.md` - Notes consent, privacy, and launch-policy risks that should inform newsletter evidence and PII minimization.
- `.planning/research/FEATURES.md` - Summarizes verified reviews, newsletter consent, wishlist, and account-retention feature intent.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/[locale]/account/account-overview.tsx` and `src/app/[locale]/account/orders/account-orders-page.tsx`: Existing localized signed-in account surfaces where saved addresses and wishlist management can connect.
- `src/fulfillment/account-queries.ts`, `src/components/fulfillment/account-order-history.tsx`, and `src/components/fulfillment/pattern-library-card.tsx`: Existing customer-owned account query and display patterns for private account data.
- `src/checkout/shipping-address.ts`, `src/checkout/shipping-address-ui.ts`, and `supabase/migrations/20260618093000_checkout_shipping_address_snapshot.sql`: Existing full-address validation and immutable order snapshot behavior that saved addresses must reuse without mutating prior orders.
- `src/components/catalog/variant-selector.tsx`, catalog product/card pages, and catalog query helpers: Natural integration points for wishlist heart controls and current product availability display.
- `src/app/admin/exceptions/page.tsx`, `src/components/admin/orders/order-queue.tsx`, and `src/components/admin/orders/order-detail.tsx`: Existing protected admin list/detail patterns for moderation queues and subscriber status pages.
- `src/emails/transactional.ts`, `src/fulfillment/email-outbox.ts`, and `src/fulfillment/email-outbox.server.ts`: Existing durable email rendering/outbox patterns that should inform newsletter unsubscribe emails and any confirmation messaging.
- `src/components/ui/button.tsx`, `card.tsx`, `alert.tsx`, `separator.tsx`, and existing lucide icon usage: Existing UI primitives for compact account/admin forms, hearts, badges, and state messages.

### Established Patterns
- Customer-owned data is resolved server-side and protected by RLS/server authorization; browsers must not decide ownership or eligibility.
- Server actions, route handlers, and Supabase RPCs own commerce and account mutations.
- Order shipping snapshots are immutable evidence and must not be replaced by later saved-address edits.
- Catalog facts such as market availability, price, stock, and variant state are rendered from current server-owned catalog projections.
- Sensitive customer/provider evidence is sanitized or masked before admin/public display. Public reviews must follow the same masking principle.
- Email/token flows use short-lived, scoped tokens and durable outbox records where delivery matters.

### Integration Points
- Add Supabase migrations for saved addresses, wishlist items, product reviews, admin review replies, newsletter subscribers/consent events, and unsubscribe token records with RLS and server-only admin policies.
- Extend account navigation/pages with saved-address and wishlist management without exposing future Phase 7 blog/policy/admin operations.
- Extend catalog product cards and product detail pages with signed-in wishlist heart controls and guest sign-in return flow.
- Add review submission entry points from eligible paid product/order contexts and public approved-review display on product pages.
- Add protected admin moderation screens for pending reviews/replies and subscriber status inspection.
- Add localized newsletter subscribe form and unsubscribe route/page that works for visitors and signed-in customers.
- Add database, unit, and browser coverage for address ownership, default uniqueness, checkout revalidation after saved-address selection, wishlist ownership/unavailable state, review eligibility/moderation, public masking, admin reply behavior, consent evidence, one-click unsubscribe, and admin non-override constraints.

</code_context>

<specifics>
## Specific Ideas

- Saved addresses are convenience data for future checkout, not historical evidence; old orders keep their own snapshots.
- Wishlist is an account feature rather than a guest/cart-like feature in v1.
- Product-level wishlist entries keep the feature resilient when variant availability or market eligibility changes.
- Public trust comes from verified purchase badges and moderated content, not from exposing full customer identity.
- Newsletter consent should be useful for audit without turning logs into unnecessary PII storage.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 6-Customer Retention and Trust*
*Context gathered: 2026-06-20*
