---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed quick task 260715-mma scrollspy implementation; browser verification pending
last_updated: "2026-07-15T16:46:00+07:00"
last_activity: 2026-07-15 -- Completed quick task 260715-mma product-form scrollspy optimization (Needs Review)
progress:
  total_phases: 8
  completed_phases: 7
  total_plans: 71
  completed_plans: 69
  percent: 97
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-12)

**Core value:** Customers in Vietnam and international markets can reliably discover, purchase, pay for, and receive eligible digital and physical products through one branded storefront.
**Current focus:** Phase 08 — shipping-profile-fallbacks-destination-zones-and-us-region-s

## Current Position

Phase: 08 (shipping-profile-fallbacks-destination-zones-and-us-region-s) — EXECUTING
Plan: 9 of 9
Status: Complete
Last activity: 2026-07-12 -- Phase 08 Plan 09 completed and all phase gates recorded

Progress: Phase 06 completed and human-approved; Phase 08 Plan 08 is complete; Plan 09 checkout UI integration is in progress.

## Performance Metrics

**Velocity:**

- Total plans completed: 36
- Average duration: 26 min
- Total execution time: 5 hours 20 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
| ----- | ----- | ----- | -------- |
| 02    | 8     | -     | -        |

**Recent Trend:**

- Last 5 plans: 18 min, 18 min, 52 min, 64 min, 31 min
- Trend: variable

| Phase 01 P01 | 10 min | 2 tasks | 15 files |
| Phase 01 P02 | 12 min | 2 tasks | 17 files |
| Phase 01 P04 | 16 min | 2 tasks | 8 files |
| Phase 01 P03 | 16 min | 2 tasks | 18 files |
| Phase 01 P05 | 20 min | 2 tasks | 14 files |
| Phase 01 P06 | 28 min | 2 tasks | 20 files |
| Phase 01 P07 | 24 min | 2 tasks | 15 files |
| Phase 01 P08 | 18 min | 3 tasks | 9 files |
| Phase 02 P01 | 18 min | 2 tasks | 5 files |
| Phase 02 P02 | 52 min | 2 tasks | 13 files |
| Phase 02 P03 | 64 min | 2 tasks | 11 files |
| Phase 02 P04 | 31 min | 2 tasks | 10 files |
| Phase 02 P05 | 25 min | 2 tasks | 11 files |
| Phase 02 P06 | 52 min | 2 tasks | 5 files |
| Phase 02 P07 | 41 min | 2 tasks | 17 files |
| Phase 02 P08 | 96 min | 3 tasks | 18 files |
| Phase 03 P01 | 24 min | 3 tasks | 23 files |
| Phase 03 P02 | 64 min | 3 tasks | 29 files |
| Phase 03 P03 | 20 min | 2 tasks | 18 files |
| Phase 03 P04 | 31 min | 3 tasks | 11 files |
| Phase 03 P05 | 42 min | 3 tasks | 21 files |
| Phase 04 P01 | 6 min | 2 tasks | 13 files |
| Phase 04 P02 | 2 days elapsed across checkpoint | 3 tasks | 8 files |
| Phase 04 P03 | 21 min | 2 tasks | 14 files |
| Phase 04 P04 | 13 min | 2 tasks | 5 files |
| Phase 04 P07 | 11 min | 2 tasks | 7 files |
| Phase 04 P05 | 12 min | 2 tasks | 14 files |
| Phase 04 P06 | 24 min | 2 tasks | 10 files |
| Phase 04 P08 | 12 min | 2 tasks | 9 files |
| Phase 04 P09 | 18 min | 2 tasks | 10 files |
| Phase 04 P10 | resumed validation | 2 tasks | 9 files |
| Phase 06 P01 | 38 min | 2 tasks | 14 files |
| Phase 06 P02 | 24 min | 2 tasks | 12 files |
| Phase 06 P03 | 20 min | 2 tasks | 15 files |
| Phase 06 P04 | 14 min | 2 tasks | 8 files |
| Phase 06 P05 | 47 min | 2 tasks | 12 files |
| Phase 06 P06 | 204 min | 2 tasks | 18 files |
| Phase 06 P07 | 109 min | 2 tasks | 11 files |
| Phase 06 P08 | 75 min | 2 tasks | 17 files |
| Phase 06 P09 | 48 min | 2 tasks | 9 files |
| Phase 08 P01 | 34 min | 3 tasks | 5 files |
| Phase 08 P02 | 56 min | 2 tasks | 7 files |

## Accumulated Context

### Roadmap Evolution

- Phase 8 added: Shipping profile fallbacks, destination zones, and US region surcharges.

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Initialization: Use a Vertical MVP roadmap.
- Architecture: Use a Next.js/Supabase modular monolith.
- Commerce: Keep payment, digital fulfillment, and physical fulfillment states separate.
- Payments: Use PayPal internationally and manually confirmed VietQR in Vietnam.
- [Phase 02]: Catalog base tables remain private to admins; later plans expose market-safe public projections. Ã¢â‚¬â€ Prevents drafts, inventory, and private PDF metadata from leaking through direct Data API access.
- [Phase 02]: Inventory uses XOR product-or-variant ownership with trigger-enforced cross-table rules. Ã¢â‚¬â€ Enforces physical inventory at exactly one ownership level for both variant and non-variant products.
- [Phase 02]: Catalog publish functions are security invokers over private.is_admin-backed RLS. Ã¢â‚¬â€ Keeps database-owned admin authorization authoritative without exposed security-definer RPCs.
- [Phase 02]: Variant creation requires explicit variant IDs, SKUs, attributes, display order, optional media, and admin-submitted stock; no hidden combinations are generated.
- [Phase 02]: Variant price overrides are optional rows; missing override means parent offer fallback, and saved overrides must preserve market currency.
- [Phase 02]: Inventory ownership remains mutually exclusive: non-variant physical products use product inventory and variant products use only variant inventory.
- [Phase 03]: Guest cart storage remains intent-only; server quote hydration owns all display price, title, availability, and line status data.
- [Phase 03]: Plan 03-01 intentionally stops before shipping, payment provider UI, payment confirmation, reservations, order creation, and fulfillment.
- [Phase 03]: Market exceptions are non-binding until checkout submit; approved grants are hashed, scoped, expiring, and consumed inside the submit_checkout order/reservation transaction.
- [Phase 04 Plan 01]: Wave 0 records Phase 4 requirement coverage as executable contracts only; payment, order, inventory, and fulfillment behavior remains owned by later implementation plans.
- [Phase 04 Plan 01]: PayPal fixtures use sanitized deterministic IDs, merchant placeholders, amounts, and headers with no live seller identity or secrets.
- [Phase 04 Plan 01]: Implementation-dependent payment UI journeys start as skipped Playwright contracts so later plans can turn them green without losing scenario ownership.
- [Phase 04 Plan 02]: Remote project kpnazmkprosboeiuhgea was approved for full migration-history bootstrap because dry-run showed no prior remote migration history.
- [Phase 04 Plan 02]: Payment state authority lives in public.apply_payment_transition(jsonb), which updates payment/order gate, reservation outcome, inventory, transition ledger, and audit rows in one transaction.
- [Phase 04 Plan 02]: Future PayPal, VietQR, admin, and expiry paths must call applyPaymentTransition instead of directly updating terminal payment or order tables.
- [Phase 04 Plan 03]: Guest checkout raw tokens are exchanged inside the Server Action into order-scoped HttpOnly cookies; browser-visible state receives no guestAccessToken.
- [Phase 04 Plan 03]: Checkout rejects mismatched market/currency/payment intent before submit_checkout; the database constraint remains the second boundary.
- [Phase 04 Plan 03]: Admin order query helpers require requireAdmin before reading admin projections or timeline RPCs; customer reads stay on get_order_payment_status.
- [Phase 04 Plan 04]: PayPal create/capture uses direct REST fetch with injected transport instead of adding a PayPal SDK dependency.
- [Phase 04 Plan 04]: PayPal route handlers authorize the local order before provider I/O, then derive amount, currency, merchant, and request IDs from server-owned order/payment rows.
- [Phase 04 Plan 04]: Capture/recheck treats uncertain provider outcomes as verifying and opens paid state only through applyPaymentTransition after exact provider fact reconciliation.
- [Phase 04]: [Phase 04 Plan 07]: VietQR instruction snapshots use vietqr_instruction + pending transitions so instructions are audited without opening the paid gate. — Needed to satisfy PAY-05 without customer self-confirmation or paid-state mutation.
- [Phase 04]: [Phase 04 Plan 07]: VietQR admin confirm/reject validates exact evidence then delegates to applyPaymentTransition. — Keeps manual bank decisions authorized, idempotent, auditable, and free of direct terminal payment/order/reservation/inventory updates.

- [Phase 04 Plan 06]: PayPal webhook verification uses official postback verification with raw-body digesting and required transmission headers; tests inject transport so no live PayPal call is made.
- [Phase 04 Plan 06]: PayPal webhook route delegates paid/failed effects to applyPaymentTransition, while duplicate/no-op/refund events are stored as sanitized payment_events evidence.
- [Phase 04 Plan 06]: payment_events now tracks delivery_count and last_received_at because durable duplicate delivery history is required for webhook replay mitigation.
- [Phase 04 Plan 09]: Admin order detail URLs use public order numbers while privileged order IDs are resolved only after requireAdmin.
- [Phase 04 Plan 09]: Provider evidence panels render sanitized operational facts only; raw provider payloads, signatures, payer PII, secrets, and customer email display stay out of admin UI.
- [Phase 08]: Store-default state remains separate from shipping profiles and starts empty; no profile or fallback is selected implicitly. — Prevents migration-time policy selection and keeps profile activation independent from store-default intent.
- [Phase 08]: Existing shipping rules become exact_country without changing semantic values. — Preserves IDs, countries, currencies, fees, and active state while enabling explicit fallbacks.
- [Phase 08]: Plan 08-03 exclusively owns the checked-in Supabase type refresh. — Avoids overlapping source ownership while local and linked generated interfaces have already been checked.
- [Phase 08]: Private shipping resolver direct execution is restricted to owner/service_role; browser roles use the hardened public wrapper. — Closes the direct private-function privilege path while preserving public quote callability.
- [Phase 08]: Shipping resolution is all-or-error across six fixed precedence tiers with exact-country before fallback. — Preserves exact-country behavior and prevents unsupported physical lines from becoming zero-cost shipping.
- [Phase 08]: Shipping aggregation consumes canonical final allocation fees while preserving highest-first-once ordering. — Applies region adjustments without arithmetic drift.
- [Phase 08 Plan 05]: Admin shipping separates parcel profiles, destination rules, US adjustments, and assignment visibility into one protected responsive workspace.
- [Phase 08 Plan 05]: Locale-prefixed auth routes bypass next-intl proxy handling so physical auth pages render for admin browser flows.
- [Phase 08 Plan 06]: Product-level shipping profiles remain valid for products with variants. â€” Variants without overrides inherit product assignment before the store default, so the legacy trigger that blocked product assignment after variants existed was replaced.
- [Phase 08 Plan 06]: Catalog assignment UI uses server-projected effective state and existing Plan 08-04 actions only. â€” Keeps admin authorization and profile allowlisting server-owned while avoiding client database access.
- [Phase 08 Plan 06]: Product Store default preview uses the active store default profile, not the current product effective profile. â€” Prevents the Sheet from displaying stale product assignment as the default after an in-place change.

### Pending Todos

None yet.

### Blockers/Concerns

- Final brand name and identity are needed before production metadata and visual polish.
- Seller-specific PayPal eligibility, shipping destinations, tax, privacy, and consumer-policy decisions must be validated before launch.
- Phase 04 automated validation is green, but PayPal sandbox HTTPS webhook delivery, seller-approved VietQR bank evidence, and managed Supabase Cron dashboard checks remain manual UAT before production readiness.

### Quick Tasks Completed

| #                                                     | Description                                                                                                                      | Date       | Commit      | Status       | Directory                                                                                                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 260715-1d9                                            | Fix admin catalog collection display-order collisions and narrow the catalog boundary security test false positive              | 2026-07-14 | cde1d9d     | Needs Review | [260715-1d9](./quick/260715-1d9-fix-admin-catalog-collection-display-ord/)                                                                                |
| 260715-0sw                                            | Harden admin catalog media boundary: authenticate before multipart parsing and surface storage deletion failures                | 2026-07-14 | a83382d     | Verified     | [260715-0sw](./quick/260715-0sw-harden-admin-catalog-media-boundary-auth/)                                                                                |
| 260714-x6u                                            | Fix admin catalog draft/publish flow: allow incomplete drafts and save the current form snapshot before publishing              | 2026-07-14 | 0828690     | Needs Review | [260714-x6u](./quick/260714-x6u-fix-admin-catalog-draft-publish-flow-all/)                                                                                |
| 260714-mhn                                            | Secure guest checkout retry recovery and make zero-discount allocation validation explicit                                      | 2026-07-14 | cb712144    | [260714-mhn](./quick/260714-mhn-secure-guest-checkout-retry-recovery-and/)                                                                                |
| 260714-kzt                                            | Harden checkout totals, physical-submit retries, non-US regions, and per-line shipping allocation evidence                       | 2026-07-14 | 68d700c0    | [260714-kzt](./quick/260714-kzt-harden-checkout-shipping-totals-physical/)                                                                                |
| 260714-ij7                                            | Polish admin shipping package cards, lock rate context, and fix Select interactions inside shared Sheets                         | 2026-07-14 | 098fc7fd    | [260714-ij7](./quick/260714-ij7-polish-admin-shipping-package-ui-for-cle/)                                                                                |
| 260714-g7i                                            | Redesign admin shipping into an actionable package-rate workspace with safe edit and readiness flows                            | 2026-07-14 | 33fb90e1    | [260714-g7i](./quick/260714-g7i-redesign-admin-shipping-into-an-actionab/)                                                                                |
| 260619-phase-4-docs-refresh                           | Update Phase 4 docs after checkout shipping-address/address-UX commits                                                           | 2026-06-19 | this commit | [260619-phase-4-docs-refresh](./quick/260619-phase-4-docs-refresh/)                                                                                       |
| 20260620-immediate-paid-email-trigger                 | Trigger transactional email worker immediately after verified paid transitions                                                   | 2026-06-20 | this commit | [20260620-immediate-paid-email-trigger](./quick/20260620-immediate-paid-email-trigger/)                                                                   |
| 260625-its                                            | Create an internal gsd-improve-advisor skill                                                                                     | 2026-06-25 | this commit | [260625-its-create-an-internal-gsd-improve-advisor-s](./quick/260625-its-create-an-internal-gsd-improve-advisor-s/)                                       |
| 260625-k3o                                            | apply vetted improve fixes for downloads, admin newsletter dashboard, and stale README                                           | 2026-06-25 | this commit | [260625-k3o-apply-vetted-improve-fixes-for-downloads](./quick/260625-k3o-apply-vetted-improve-fixes-for-downloads/)                                       |
| 260627-igr                                            | Redesign the Ambertinybear ecommerce homepage using the approved commerce-balanced layout and generated temporary studio imagery | 2026-06-27 | 421a073     | [260627-igr-redesign-the-ambertinybear-ecommerce-hom](./quick/260627-igr-redesign-the-ambertinybear-ecommerce-hom/)                                       |
| 260627-product-detail-ui                              | Upgrade product detail UI/UX using the approved text-only product-detail design                                                  | 2026-06-27 | pending     | [260627-product-detail-ui](./quick/260627-product-detail-ui/)                                                                                             |
| 260627-header-ux                                      | Upgrade header UI/UX with combined market-language control, account menu, admin link, cart badge, and mobile drawer              | 2026-06-27 | pending     | [260627-header-ux](./quick/260627-header-ux/)                                                                                                             |
| 260627-header-overlay-polish                          | Polish header account/context dropdowns and sheet/cart overlays using shadcn composition patterns                                | 2026-06-27 | pending     | [260627-header-overlay-polish](./quick/260627-header-overlay-polish/)                                                                                     |
| 260627-account-pages-ux                               | Upgrade account area UI/UX with shared shell, sidebar navigation, polished orders, patterns, wishlist, and address pages         | 2026-06-27 | pending     | [260627-account-pages-ux](./quick/260627-account-pages-ux/)                                                                                               |
| 260627-admin-pages-ux                                 | Upgrade admin Phase 1 UI/UX with grouped shell, attention dashboard, orders queue, and catalog queue                             | 2026-06-27 | pending     | [260627-admin-pages-ux](./quick/260627-admin-pages-ux/)                                                                                                   |
| 260627-admin-remaining-pages-ux                       | Upgrade remaining admin UI/UX across moderation, commerce, content, system, and detail pages                                     | 2026-06-27 | pending     | [260627-admin-remaining-pages-ux](./quick/260627-admin-remaining-pages-ux/)                                                                               |
| 260627-admin-taxonomy-navigation                      | Add admin navigation for commerce pages and taxonomy management for catalog and blog content                                     | 2026-06-27 | pending     | [260627-admin-taxonomy-navigation](./quick/260627-admin-taxonomy-navigation/)                                                                             |
| 260628-clean-lint-warnings                            | Remove existing ESLint unused-variable warnings without changing behavior                                                        | 2026-06-28 | pending     | [260628-clean-lint-warnings](./quick/260628-clean-lint-warnings/)                                                                                         |
| 260628-taxonomy-safe-delete                           | Add safe delete controls for admin taxonomy records while blocking deletion of in-use terms                                      | 2026-06-28 | pending     | [260628-taxonomy-safe-delete](./quick/260628-taxonomy-safe-delete/)                                                                                       |
| 260628-taxonomy-usage-counts                          | Show usage counts for admin taxonomy records and disable delete controls for in-use terms                                        | 2026-06-28 | pending     | [260628-taxonomy-usage-counts](./quick/260628-taxonomy-usage-counts/)                                                                                     |
| 260628-storefront-context-cart-cache                  | Stabilize storefront auth context and cart quote state across navigation and remounts                                            | 2026-06-28 | this commit | [260628-storefront-context-cart-cache](./quick/260628-storefront-context-cart-cache/)                                                                     |
| 260629-oez                                            | Fix homepage UI UX review findings                                                                                               | 2026-06-29 | pending     | [260629-oez-fix-homepage-ui-ux-review-findings](./quick/260629-oez-fix-homepage-ui-ux-review-findings/)                                                   |
| 260629-p1f                                            | Fix catalog UI UX review findings without breaking static ISR SEO                                                                | 2026-06-29 | pending     | [260629-p1f-fix-catalog-ui-ux-review-findings-withou](./quick/260629-p1f-fix-catalog-ui-ux-review-findings-withou/)                                       |
| 260629-pat                                            | Compact catalog page above the fold without breaking static ISR SEO                                                              | 2026-06-29 | pending     | [260629-pat-compact-catalog-page-above-the-fold-with](./quick/260629-pat-compact-catalog-page-above-the-fold-with/)                                       |
| 260701-p7i                                            | Upgrade homepage UI/UX with redesign-existing-projects skill                                                                     | 2026-07-01 | this commit | [260701-p7i-upgrade-homepage-ui-ux-with-redesign-exi](./quick/260701-p7i-upgrade-homepage-ui-ux-with-redesign-exi/)                                       |
| 260702                                                | Redesign mobile menu and mini-cart sheets with smooth motion and product thumbnails                                              | 2026-07-02 | this commit | [260702-redesign-mobile-sheets](./quick/260702-redesign-mobile-sheets/)                                                                                   |
| 260702-footer-brand-redesign                          | Redesign footer, header branding, mobile sheet navigation, and shared storefront container width                                 | 2026-07-02 | this commit | [260702-footer-brand-redesign](./quick/260702-footer-brand-redesign/)                                                                                     |
| 260702-homepage-content-led-redesign                  | Redesign homepage content, CTA, benefits, and trust sections while preserving storefront logic and SEO                           | 2026-07-02 | pending     | [260702-homepage-content-led-redesign](./quick/260702-homepage-content-led-redesign/)                                                                     |
| 260702-homepage-palette-font-correction               | Restore homepage beige/brown/cream palette and switch the app font to Nunito while preserving storefront logic and SEO           | 2026-07-02 | pending     | [260702-homepage-palette-font-correction](./quick/260702-homepage-palette-font-correction/)                                                               |
| 260702-homepage-pattern-hero-polish                   | Change homepage pattern areas away from beige and reduce desktop hero height while preserving mobile layout and SEO              | 2026-07-02 | pending     | [260702-homepage-pattern-hero-polish](./quick/260702-homepage-pattern-hero-polish/)                                                                       |
| 260702-homepage-hero-collage-polish                   | Refine desktop hero image collage so the three images feel integrated without overlap while preserving mobile and SEO            | 2026-07-02 | pending     | [260702-homepage-hero-collage-polish](./quick/260702-homepage-hero-collage-polish/)                                                                       |
| 260702-homepage-text-color-hierarchy                  | Reduce homepage and product-card brown text monotony with a clearer brand, body, price, and badge color hierarchy                | 2026-07-02 | pending     | [260702-homepage-text-color-hierarchy](./quick/260702-homepage-text-color-hierarchy/)                                                                     |
| 260706-catalog-ui-ux-polish                           | Polish catalog header, filters, active filter summary, mobile controls, and image fallback while preserving SEO/ISR behavior     | 2026-07-06 | this commit | [260706-catalog-ui-ux-polish](./quick/260706-catalog-ui-ux-polish/)                                                                                       |
| 260706-oez                                            | Compact two-column mobile product-card text and spacing while preserving desktop presentation and rendering behavior             | 2026-07-06 | this commit | [260706-oez-compact-mobile-product-cards](./quick/260706-oez-compact-mobile-product-cards/)                                                               |
| 260706-on4                                            | Restyle the catalog load-more control with a lightweight Ambertinybear treatment                                                 | 2026-07-06 | this commit | [260706-on4-brand-load-more](./quick/260706-on4-brand-load-more/)                                                                                         |
| 260708-ops                                            | Operational error checkout instrumentation                                                                                       | 2026-07-08 | this commit | [260708-ops-operational-error-checkout-instrumentation](./quick/260708-ops-operational-error-checkout-instrumentation/)                                   |
| 260708-ops2                                           | Fulfillment email and download instrumentation                                                                                   | 2026-07-08 | this commit | [260708-ops-fulfillment-email-download-instrumentation](./quick/260708-ops-fulfillment-email-download-instrumentation/)                                   |
| 260708-ops3                                           | PayPal operational instrumentation                                                                                               | 2026-07-08 | this commit | [260708-ops-paypal-operational-instrumentation](./quick/260708-ops-paypal-operational-instrumentation/)                                                   |
| 260708-ops4                                           | VietQR admin operational instrumentation                                                                                         | 2026-07-08 | this commit | [260708-ops-vietqr-admin-operational-instrumentation](./quick/260708-ops-vietqr-admin-operational-instrumentation/)                                       |
| 260708-ops5                                           | Fulfillment admin operational instrumentation                                                                                    | 2026-07-08 | this commit | [260708-ops-fulfillment-admin-operational-instrumentation](./quick/260708-ops-fulfillment-admin-operational-instrumentation/)                             |
| 260708-ops6                                           | Admin commerce operational instrumentation                                                                                       | 2026-07-08 | this commit | [260708-ops-admin-commerce-operational-instrumentation](./quick/260708-ops-admin-commerce-operational-instrumentation/)                                   |
| 260708-ops7                                           | Catalog admin operational instrumentation                                                                                        | 2026-07-08 | this commit | [260708-ops-catalog-admin-operational-instrumentation](./quick/260708-ops-catalog-admin-operational-instrumentation/)                                     |
| 260708-ops8                                           | Blog admin operational instrumentation                                                                                           | 2026-07-08 | this commit | [260708-ops-blog-admin-operational-instrumentation](./quick/260708-ops-blog-admin-operational-instrumentation/)                                           |
| 260708-ops9                                           | Reviews operational instrumentation                                                                                              | 2026-07-08 | this commit | [260708-ops-reviews-operational-instrumentation](./quick/260708-ops-reviews-operational-instrumentation/)                                                 |
| 260708-ops10                                          | Newsletter operational instrumentation                                                                                           | 2026-07-08 | this commit | [260708-ops-newsletter-operational-instrumentation](./quick/260708-ops-newsletter-operational-instrumentation/)                                           |
| 260708-ops11                                          | Account customer operational instrumentation                                                                                     | 2026-07-08 | this commit | [260708-ops-account-customer-operational-instrumentation](./quick/260708-ops-account-customer-operational-instrumentation/)                               |
| 260708-ops12                                          | Customer fulfillment operational instrumentation                                                                                 | 2026-07-08 | this commit | [260708-ops-customer-fulfillment-operational-instrumentation](./quick/260708-ops-customer-fulfillment-operational-instrumentation/)                       |
| 260708-ops13                                          | Storefront public loaders operational instrumentation                                                                            | 2026-07-08 | this commit | [260708-ops-storefront-public-loaders-operational-instrumentation](./quick/260708-ops-storefront-public-loaders-operational-instrumentation/)             |
| 260708-ops14                                          | Storefront cart and account loaders operational instrumentation                                                                  | 2026-07-08 | this commit | [260708-ops-storefront-cart-account-loaders-operational-instrumentation](./quick/260708-ops-storefront-cart-account-loaders-operational-instrumentation/) |
| 260708-ops15                                          | Payment order query operational instrumentation                                                                                  | 2026-07-08 | this commit | [260708-ops-payment-order-query-operational-instrumentation](./quick/260708-ops-payment-order-query-operational-instrumentation/)                         |
| 260708-ops16                                          | Admin system loader operational instrumentation                                                                                  | 2026-07-08 | this commit | [260708-ops-admin-system-loader-operational-instrumentation](./quick/260708-ops-admin-system-loader-operational-instrumentation/)                         |
| 260708-ops17                                          | Policy admin operational instrumentation                                                                                         | 2026-07-08 | this commit | [260708-ops-policy-admin-operational-instrumentation](./quick/260708-ops-policy-admin-operational-instrumentation/)                                       |
| 260708-ops18                                          | Catalog variant operational instrumentation                                                                                      | 2026-07-08 | this commit | [260708-ops-catalog-variant-operational-instrumentation](./quick/260708-ops-catalog-variant-operational-instrumentation/)                                 |
| 260708-ops19                                          | Catalog media operational instrumentation                                                                                        | 2026-07-08 | this commit | [260708-ops-catalog-media-operational-instrumentation](./quick/260708-ops-catalog-media-operational-instrumentation/)                                     |
| 260708-ops20                                          | Checkout exception operational instrumentation                                                                                   | 2026-07-08 | this commit | [260708-ops-checkout-exception-operational-instrumentation](./quick/260708-ops-checkout-exception-operational-instrumentation/)                           |
| 260708-ops21                                          | Payment transition and VietQR operational instrumentation                                                                        | 2026-07-08 | this commit | [260708-ops-payment-transition-vietqr-operational-instrumentation](./quick/260708-ops-payment-transition-vietqr-operational-instrumentation/)             |
| 260708-ops22                                          | Admin email actions operational instrumentation                                                                                  | 2026-07-08 | this commit | [260708-ops-admin-email-actions-operational-instrumentation](./quick/260708-ops-admin-email-actions-operational-instrumentation/)                         |
| 260708-ops23                                          | Review query and eligibility operational instrumentation                                                                         | 2026-07-08 | this commit | [260708-ops-review-query-eligibility-operational-instrumentation](./quick/260708-ops-review-query-eligibility-operational-instrumentation/)               |
| 260709-storefront-error-visibility                    | Storefront silent degradation and wishlist UI feedback hardening                                                                 | 2026-07-09 | this commit | [260709-storefront-error-visibility](./quick/260709-storefront-error-visibility/)                                                                         |
| 260709-global-operational-pattern                     | Shared monitored action/query wrappers and operational monitoring conventions                                                    | 2026-07-09 | this commit | [260709-global-operational-pattern](./quick/260709-global-operational-pattern/)                                                                           |
| 260709-monitoring-wrapper-hardening                   | Best-effort monitored action/query recorder behavior and dynamic facts                                                           | 2026-07-09 | this commit | [260709-monitoring-wrapper-hardening](./quick/260709-monitoring-wrapper-hardening/)                                                                       |
| 260709-monitor-cart-actions                           | Cart quote action uses monitored action wrapper                                                                                  | 2026-07-09 | this commit | [260709-monitor-cart-actions](./quick/260709-monitor-cart-actions/)                                                                                       |
| 260709-monitor-checkout-actions                       | Checkout quote and submit actions use monitored action wrapper                                                                   | 2026-07-09 | this commit | [260709-monitor-checkout-actions](./quick/260709-monitor-checkout-actions/)                                                                               |
| 260709-monitor-account-address-actions                | Account saved-address load and mutation helpers use monitored action wrapper                                                     | 2026-07-09 | this commit | [260709-monitor-account-address-actions](./quick/260709-monitor-account-address-actions/)                                                                 |
| 260709-monitor-admin-commerce-actions                 | Admin discount and shipping actions use monitored action wrapper                                                                 | 2026-07-09 | this commit | [260709-monitor-admin-commerce-actions](./quick/260709-monitor-admin-commerce-actions/)                                                                   |
| 260709-monitor-catalog-actions                        | Catalog save, publish, and archive actions use monitored action wrapper                                                          | 2026-07-09 | this commit | [260709-monitor-catalog-actions](./quick/260709-monitor-catalog-actions/)                                                                                 |
| 260709-monitor-catalog-variant-actions                | Catalog variant, price override, and inventory actions use monitored action wrapper                                              | 2026-07-09 | this commit | [260709-monitor-catalog-variant-actions](./quick/260709-monitor-catalog-variant-actions/)                                                                 |
| 260709-monitor-catalog-media-actions                  | Catalog media and PDF actions use monitored action wrapper                                                                       | 2026-07-09 | this commit | [260709-monitor-catalog-media-actions](./quick/260709-monitor-catalog-media-actions/)                                                                     |
| 260709-monitor-content-policy-actions                 | Blog and policy admin actions use monitored action wrapper                                                                       | 2026-07-09 | this commit | [260709-monitor-content-policy-actions](./quick/260709-monitor-content-policy-actions/)                                                                   |
| 260709-monitor-throwing-storefront-queries            | Storefront catalog and blog throwing queries use monitored wrapper                                                               | 2026-07-09 | this commit | [260709-monitor-throwing-storefront-queries](./quick/260709-monitor-throwing-storefront-queries/)                                                         |
| 260709-monitor-review-query-eligibility               | Review query and eligibility helpers use monitored action wrapper                                                                | 2026-07-09 | this commit | [260709-monitor-review-query-eligibility](./quick/260709-monitor-review-query-eligibility/)                                                               |
| 260709-monitor-payment-transition-vietqr-instructions | Payment transition and VietQR instruction helpers use monitored action wrapper                                                   | 2026-07-09 | this commit | [260709-monitor-payment-transition-vietqr-instructions](./quick/260709-monitor-payment-transition-vietqr-instructions/)                                   |
| 260709-monitor-payment-order-queries                  | Payment order query helpers use monitored action wrapper                                                                         | 2026-07-09 | this commit | [260709-monitor-payment-order-queries](./quick/260709-monitor-payment-order-queries/)                                                                     |
| 260709-monitor-admin-dashboard-query                  | Admin dashboard loader uses monitored action wrapper                                                                             | 2026-07-09 | this commit | [260709-monitor-admin-dashboard-query](./quick/260709-monitor-admin-dashboard-query/)                                                                     |
| 260709-monitor-launch-readiness-query                 | Launch readiness loader uses monitored action wrapper                                                                            | 2026-07-09 | this commit | [260709-monitor-launch-readiness-query](./quick/260709-monitor-launch-readiness-query/)                                                                   |
| 260709-monitor-checkout-exception-helper              | Checkout exception failures use monitored action wrapper                                                                         | 2026-07-09 | this commit | [260709-monitor-checkout-exception-helper](./quick/260709-monitor-checkout-exception-helper/)                                                             |
| 260709-monitor-wishlist-loader                        | Customer wishlist loader uses monitored action wrapper                                                                           | 2026-07-09 | this commit | [260709-monitor-wishlist-loader](./quick/260709-monitor-wishlist-loader/)                                                                                 |
| 260709-monitor-vietqr-admin-actions                   | VietQR admin actions use monitored action wrapper                                                                                | 2026-07-09 | this commit | [260709-monitor-vietqr-admin-actions](./quick/260709-monitor-vietqr-admin-actions/)                                                                       |
| 260709-monitor-paypal-routes                          | PayPal route helpers use monitored action wrapper                                                                                | 2026-07-09 | this commit | [260709-monitor-paypal-routes](./quick/260709-monitor-paypal-routes/)                                                                                     |
| 260709-monitor-customer-fulfillment-access            | Customer fulfillment access helpers use monitored action wrapper                                                                 | 2026-07-09 | this commit | [260709-monitor-customer-fulfillment-access](./quick/260709-monitor-customer-fulfillment-access/)                                                         |
| 260709-monitor-admin-email-actions                    | Admin email actions use monitored action wrapper                                                                                 | 2026-07-09 | this commit | [260709-monitor-admin-email-actions](./quick/260709-monitor-admin-email-actions/)                                                                         |
| 260709-monitor-injected-recorder-helpers              | Injected recorder helpers use monitored action wrapper                                                                           | 2026-07-09 | this commit | [260709-monitor-injected-recorder-helpers](./quick/260709-monitor-injected-recorder-helpers/)                                                             |
| 260709-monitor-review-action-recorders                | Review action recorders use monitored action wrapper                                                                             | 2026-07-09 | this commit | [260709-monitor-review-action-recorders](./quick/260709-monitor-review-action-recorders/)                                                                 |
| 260709-storefront-performance-test-boundary           | Storefront product-card image performance test follows component boundary                                                        | 2026-07-09 | this commit | [260709-storefront-performance-test-boundary](./quick/260709-storefront-performance-test-boundary/)                                                       |
| 260709-secure-approved-review-projection              | Approved reviews use sanitized RLS projection instead of public security-definer view                                            | 2026-07-09 | this commit | [260709-secure-approved-review-projection](./quick/260709-secure-approved-review-projection/)                                                             |
| 260709-monitoring-diagnostic-facts                    | Operational monitoring records safe DB diagnostics and account auth facts                                                        | 2026-07-09 | this commit | [260709-monitoring-diagnostic-facts](./quick/260709-monitoring-diagnostic-facts/)                                                                         |
| 260709-action-error-id-traces                         | Monitored action failures return safe errorId references for UI/admin correlation                                                | 2026-07-09 | this commit | [260709-action-error-id-traces](./quick/260709-action-error-id-traces/)                                                                                   |
| 260710-cart-ui-ux-polish                              | Cart page UI/UX polish with thumbnail-led lines and non-duplicated blocked messaging                                             | 2026-07-10 | pending     | [260710-cart-ui-ux-polish](./quick/260710-cart-ui-ux-polish/)                                                                                             |
| 260710-mgm                                            | Improve admin catalog list with pagination and product thumbnails                                                                | 2026-07-10 | 67a4dc23    | [260710-mgm-improve-admin-catalog-list-with-paginati](./quick/260710-mgm-improve-admin-catalog-list-with-paginati/)                                       |
| 260710-mml                                            | Compact admin catalog list header and improve badge color hierarchy                                                              | 2026-07-10 | ab1be72a    | [260710-mml-compact-admin-catalog-list-header-and-im](./quick/260710-mml-compact-admin-catalog-list-header-and-im/)                                       |
| 260710-mqi                                            | Polish admin catalog product editor shell without changing form actions                                                          | 2026-07-10 | bfc5d28c    | [260710-mqi-polish-admin-catalog-product-editor-shel](./quick/260710-mqi-polish-admin-catalog-product-editor-shel/)                                       |
| 260710-my6                                            | Convert admin product editor to task tabs and add slug SEO autofill                                                              | 2026-07-10 | bdcce854    | [260710-my6-convert-admin-product-editor-to-task-tab](./quick/260710-my6-convert-admin-product-editor-to-task-tab/)                                       |
| 260710-n9n                                            | Replace admin product editor tabs with smart sections and taxonomy multi-select                                                  | 2026-07-10 | a68b1443    | [260710-n9n-replace-admin-product-editor-tabs-with-s](./quick/260710-n9n-replace-admin-product-editor-tabs-with-s/)                                       |
| 260710-nhw                                            | Make admin product editor smart sections easier to navigate while scrolling                                                      | 2026-07-10 | 767498ed    | [260710-nhw-make-admin-product-editor-smart-sections](./quick/260710-nhw-make-admin-product-editor-smart-sections/)                                       |
| 260710-nk4                                            | Use shadcn components for product editor section controls                                                                        | 2026-07-10 | 082a3346    | [260710-nk4-use-shadcn-product-editor-sections](./quick/260710-nk4-use-shadcn-product-editor-sections/)                                                   |
| 260710-nra                                            | Redesign admin product editor page                                                                                               | 2026-07-10 | f78f8109    | [260710-nra-redesign-admin-product-editor-page](./quick/260710-nra-redesign-admin-product-editor-page/)                                                   |
| 260710-p34                                            | Redesign admin product editor as a two-column scrollspy workspace                                                                | 2026-07-10 | d91b6700    | [260710-p34-redesign-admin-product-editor-as-a-two-c](./quick/260710-p34-redesign-admin-product-editor-as-a-two-c/)                                       |
| 260711-j2o                                            | Redesign admin catalog taxonomy workspace with progressive bilingual editing and bounded usage queries                           | 2026-07-11 | 2effbd4     | [260711-j2o-redesign-admin-catalog-taxonomy-workspac](./quick/260711-j2o-redesign-admin-catalog-taxonomy-workspac/)                                       |
| 260711-ji3                                            | Polish admin taxonomy visual alignment, spacing rhythm, and surface hierarchy                                                     | 2026-07-11 | afe09f9     | [260711-ji3-polish-admin-taxonomy-visual-alignment-s](./quick/260711-ji3-polish-admin-taxonomy-visual-alignment-s/)                                       |
| 260711-jwl                                            | Align taxonomy metadata and locale tabs, then move browser actions to the right column                                             | 2026-07-11 | b88c361     | [260711-jwl-align-taxonomy-metadata-and-locale-tabs-](./quick/260711-jwl-align-taxonomy-metadata-and-locale-tabs-/)                                       |
| 260711-k74                                            | Compact all admin page headers to one row and add active sidebar navigation                                                        | 2026-07-11 | 044eb8f     | [260711-k74-compact-all-admin-page-headers-to-one-ro](./quick/260711-k74-compact-all-admin-page-headers-to-one-ro/)                                       |
| 260711-kl8                                            | Redesign admin discounts into a compact promotion workspace with clearer creation and monitoring                                  | 2026-07-11 | dd4a609     | [260711-kl8-redesign-admin-discounts-into-a-compact-](./quick/260711-kl8-redesign-admin-discounts-into-a-compact-/)                                       |
| 260711-l7s                                            | Replace discount selects with shadcn and make promotion list responsive without horizontal scrolling                              | 2026-07-11 | 3ed5557     | [260711-l7s-replace-discount-selects-with-shadcn-and](./quick/260711-l7s-replace-discount-selects-with-shadcn-and/)                                       |
| 260711-lig                                            | Move discount creation into a responsive sheet while preserving the two-column form layout                                        | 2026-07-11 | 9813993     | [260711-lig-move-discount-creation-into-a-responsive](./quick/260711-lig-move-discount-creation-into-a-responsive/)                                       |
| 260711-ovk                                            | Add real operations pagination and move launch settings into a sheet                                                              | 2026-07-11 | be36f42     | [260711-ovk-add-real-operations-pagination-and-move-](./quick/260711-ovk-add-real-operations-pagination-and-move-/)                                      |
| 260711-x7e                                            | Correct Operations totals and redesign operational error rows                                                                     | 2026-07-11 | c5141df     | [260711-x7e-correct-operations-totals-and-redesign-o](./quick/260711-x7e-correct-operations-totals-and-redesign-o/)                                      |
| 260712-0ix                                            | Compact Operations desktop rows and move sanitized details into a Sheet                                                           | 2026-07-12 | 1379a89     | [260712-0ix-compact-operations-desktop-rows-and-move](./quick/260712-0ix-compact-operations-desktop-rows-and-move/)                                      |
| 260712-0si                                            | Redesign admin Reviews moderation workspace                                                                                       | 2026-07-12 | 9cdfb76     | [260712-0si-redesign-admin-reviews-moderation-worksp](./quick/260712-0si-redesign-admin-reviews-moderation-worksp/)                                      |
| 260715-mma                                            | Optimize admin product form scrollspy without changing catalog business logic                                                     | 2026-07-15 | e5185321    | Needs Review | [260715-mma](./quick/260715-mma-optimize-admin-product-form-scrollspy-wi/)                                                                                 |

### Debug Sessions Resolved

| #                                   | Description                                                                                                 | Date       | Directory                                                                             |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------- |
| header-overlays                     | Fix header dropdown outside-click behavior and modal sheet/cart background interaction after header upgrade | 2026-06-27 | [header-overlays](./debug/header-overlays.md)                                         |
| catalog-lcp-and-repeated-requests   | Verify catalog request behavior and remove the first product image LCP warning                              | 2026-07-06 | [catalog-lcp-and-repeated-requests](./debug/catalog-lcp-and-repeated-requests.md)     |
| product-route-smooth-scroll-warning | Declare Next.js 16 smooth-scroll transition behavior and verify product navigation                          | 2026-07-06 | [product-route-smooth-scroll-warning](./debug/product-route-smooth-scroll-warning.md) |
| wishlist-invalid-product-id         | Accept PostgreSQL-valid product UUIDs in wishlist actions and client wishlist state                         | 2026-07-09 | [wishlist-invalid-product-id](./debug/wishlist-invalid-product-id.md)                 |

## Deferred Items

| Category | Item                                  | Status | Deferred At    |
| -------- | ------------------------------------- | ------ | -------------- |
| Payments | Automatic Vietnam bank reconciliation | v2     | Initialization |
| Channels | Etsy synchronization                  | v2     | Initialization |
| Shipping | Carrier labels and customs automation | v2     | Initialization |
| Products | Custom commissions and native apps    | v2     | Initialization |

## Session Continuity

Last session: 2026-07-12T04:52:00.543Z
Stopped at: Completed 08-02-PLAN.md
Resume file: None
