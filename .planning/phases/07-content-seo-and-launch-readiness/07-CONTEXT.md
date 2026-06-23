# Phase 7: Content, SEO, and Launch Readiness - Context

**Gathered:** 2026-06-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Launch a discoverable and operational bilingual store with blog publishing,
technical SEO, public policy pages, safe admin operations, launch settings,
observability, and end-to-end launch verification.

This phase owns bilingual blog authoring, preview, publishing, scheduling,
blog taxonomy, related-product links, localized SEO alternates, structured
data, sitemap and robots behavior, admin operations/dashboard surfaces, safe
operational error reporting, editable policy content, launch country/tax
decision records, and launch-readiness gates.

Earlier phases already own localized routes, market-aware catalog metadata,
checkout/payment state, secure downloads, manual physical fulfillment, reviews,
newsletter consent, and server-side admin authorization. Phase 7 should extend
those surfaces for launch readiness without adding v2 analytics, marketplace
sync, automatic carrier labels, custom commissions, or payment-provider
features outside the existing PayPal/VietQR scope.

</domain>

<decisions>
## Implementation Decisions

### Blog Publishing Model
- **D-01:** Blog authoring uses a `draft -> preview -> publish/schedule` workflow. Admin can preview unpublished content and either publish immediately or schedule it.
- **D-02:** A bilingual blog post is one shared content record containing both Vietnamese and English translations. Publish state, taxonomy, related products, and scheduling are shared across the post so localized alternates stay coherent.
- **D-03:** A blog post must have a category plus localized slug, title, description, and social image for both Vietnamese and English before it can be published. Tags and related products are optional in v1.
- **D-04:** Scheduled posts become public automatically when `published_at <= now`; public queries should filter on publish state/time rather than requiring a separate background job to flip state.

### SEO Launch Rules
- **D-05:** Phase 7 uses strict launch SEO. Public product, blog, policy, category, and collection pages should expose correct canonical URLs, `hreflang` alternates, localized metadata, sitemap inclusion, and structured data where applicable.
- **D-06:** Structured data includes Product, Article, Organization, WebSite, and basic Breadcrumb JSON-LD. Product structured data builds on catalog facts; Article structured data belongs to blog pages.
- **D-07:** Sitemap behavior uses a sitemap index plus localized sitemap entries per locale. Sitemaps include only public, indexable URLs and must not include admin, private, draft, unavailable, or non-public operational URLs.
- **D-08:** SEO validation is a required launch gate. Automated checks should verify canonical URLs, `hreflang`, sitemap/robots behavior, JSON-LD structured data, and that admin/private pages are not indexable.

### Unified Admin Operations
- **D-09:** `/admin` becomes a lightweight operational dashboard rather than only an authorization card. It should summarize actionable work and link into the existing admin areas.
- **D-10:** Dashboard items should be actionable only: pending VietQR decisions, orders awaiting fulfillment, failed transactional emails, pending reviews, draft/scheduled blog posts, and unresolved launch checklist items.
- **D-11:** Observability/admin error reporting uses a safe operational error queue with redacted or sanitized facts. Admin can inspect error type, area, time, status, and safe context, but raw provider payloads, secrets, signatures, and unnecessary PII must not be exposed.
- **D-12:** Admin navigation keeps each area separate and adds a dashboard overview at `/admin`. Expected areas include catalog, orders, reviews, newsletter, blog, policies, and operations.

### Policies and Launch Decisions
- **D-13:** Policy pages are admin-editable content with publish state. Privacy, terms of sale, physical return policy, and digital download policy must be bilingual and include localized slug/SEO/social metadata before public launch.
- **D-14:** Launch country, tax, and consumer-policy decisions are stored in an admin-visible launch settings record. Public policy pages should present the customer-facing interpretation, while system/verification code can read the launch settings as structured configuration.
- **D-15:** Phase 7 is not complete until these launch gates are resolved: enabled destination countries recorded, tax stance recorded, required policies published, PayPal/VietQR provider or manual UAT completed, checkout/download/order tracking E2E checks passing, and monitoring/log redaction verified.
- **D-16:** Checkout and footer surfaces link directly to published policy pages. Launch readiness must fail if required customer-facing policy pages are not published.

### the agent's Discretion
- Exact table names, enum names, route paths, and component boundaries may be chosen during planning, provided the locked authoring, publish, SEO, admin, policy, observability, and launch-gate behavior above is preserved.
- Exact blog editor layout, preview affordance, dashboard card layout, admin filter set, and policy page copy may follow existing compact admin and localized storefront patterns.
- Exact automated SEO validation tooling may be selected during planning as long as it verifies the required launch gates in D-08 and avoids depending on live external services for normal CI.
- Exact redaction schema may be selected during planning, but sensitive provider/customer evidence must remain sanitized before storage or admin display.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Scope and Requirements
- `.planning/PROJECT.md` - Defines bilingual commerce, SEO, blog content, public policy, admin, payment, fulfillment, and launch constraints.
- `.planning/REQUIREMENTS.md` - Phase 7 requirements are BLOG-01, BLOG-02, SEO-02, SEO-03, SEO-04, ADM-01, OPS-03, OPS-04, LEGAL-01, and LEGAL-02.
- `.planning/ROADMAP.md` - Defines Phase 7 goal, success criteria, dependency on Phase 6, and planned slices 07-01 through 07-05.

### Prior Phase Decisions
- `.planning/phases/06-customer-retention-and-trust/06-CONTEXT.md` - Locks newsletter, reviews, wishlist, saved addresses, admin moderation, consent evidence, and states that blog/SEO/policies/admin operations are Phase 7 scope.
- `.planning/phases/05-fulfillment-and-purchase-access/05-CONTEXT.md` - Locks secure download, transactional email outbox, physical tracking, guest reopen/claim, and admin failed-email queue patterns.
- `.planning/phases/04-trusted-payments-and-orders/04-CONTEXT.md` - Locks payment evidence, order state separation, paid gates, admin timeline visibility, and sanitized provider evidence.
- `.planning/phases/03-mixed-cart-and-checkout/03-CONTEXT.md` - Locks server-authoritative checkout, material-change previews, market validation, discounts, shipping, and immutable order snapshots.
- `.planning/phases/02-market-aware-catalog/02-CONTEXT.md` - Locks localized product metadata, market-aware catalog display, taxonomy, private digital assets, and product publish requirements.
- `.planning/phases/01-secure-bilingual-foundation/01-CONTEXT.md` - Locks localized `/vi` and `/en` routing plus server-enforced customer/admin authorization boundaries.

### Architecture and Stack
- `.planning/research/STACK.md` - Defines Next.js App Router, Supabase Postgres/RLS/Storage, `next-intl`, Tailwind, Zod, Resend, Vitest, Playwright, SEO pages, and private-data constraints.
- `.planning/research/ARCHITECTURE.md` - Defines the modular monolith, admin/customer boundaries, data ownership, operational jobs/outbox patterns, and service separation.
- `.planning/research/PITFALLS.md` - Notes launch, policy, privacy, SEO, and provider-readiness risks that Phase 7 must close.
- `.planning/research/FEATURES.md` - Summarizes blog, SEO, admin, policy, and launch-readiness feature intent.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/catalog/metadata.ts`: Existing helper for localized metadata, canonical URLs, language alternates, Open Graph images, and site URL construction. Phase 7 should extend or reuse this for blog, policies, and broader structured metadata.
- `src/app/[locale]/layout.tsx`, `src/components/site-header.tsx`, and `src/components/site-footer.tsx`: Existing localized storefront shell, navigation, market/locale controls, cart, newsletter form, and footer area where blog/policy links can connect.
- `src/app/admin/page.tsx` and `src/app/admin/layout.tsx`: Current protected admin shell is minimal. Phase 7 should turn `/admin` into an operational dashboard while preserving server-side authorization.
- `src/app/admin/catalog/*`, `src/app/admin/orders/*`, `src/app/admin/reviews/page.tsx`, and `src/app/admin/newsletter/page.tsx`: Existing separate admin areas and compact page patterns that new blog, policy, and operations pages should follow.
- `src/components/admin/fulfillment/failed-email-queue.tsx`, `src/components/admin/orders/order-queue.tsx`, `src/components/admin/orders/order-detail.tsx`, `src/components/admin/reviews/review-moderation-list.tsx`, and `src/components/admin/newsletter/subscriber-list.tsx`: Existing queue/list/detail patterns for actionable dashboard summaries.
- `src/catalog/publish-checks.ts` and `src/components/admin/catalog/product-form.tsx`: Existing publish-blocker pattern for required localized catalog metadata and social images; blog/policy publishing should use the same spirit.
- `src/components/ui/card.tsx`, `button.tsx`, `alert.tsx`, `separator.tsx`, and existing lucide icon usage: Existing UI primitives for compact admin dashboards, launch checklist cards, and policy/blog forms.

### Established Patterns
- Public localized pages live under `[locale]` routes and use `next-intl` plus `setRequestLocale`.
- Admin pages are protected by `requireAdmin` before privileged data is loaded or rendered.
- Server actions, route handlers, and Supabase RPCs own mutations; browsers do not decide publish, payment, fulfillment, or authorization facts.
- Market/product SEO facts already require localized slug, SEO title, SEO description, and social image before product publish.
- Sensitive operational evidence is sanitized before admin display; this must also govern observability and error reporting.
- Footer/header are already centralized and are the natural place to add public blog/policy navigation without duplicating links across pages.

### Integration Points
- Add Supabase migrations for blog posts, blog translations, blog categories/tags, blog related products, policy pages/translations, launch settings, launch checklist items, and sanitized operational errors.
- Add localized public blog index/detail and policy pages under `[locale]` routes, using canonical/hreflang metadata and Article/Breadcrumb structured data.
- Add admin blog, policy, operations/error queue, and launch settings/checklist pages under `/admin`, with `/admin` summarizing actionable counts and deep links.
- Extend site header/footer navigation with blog and policy links, keeping mobile and desktop navigation consistent.
- Implement sitemap index, localized sitemap routes, robots behavior, and structured data helpers/tests.
- Add automated coverage for publish blockers, scheduled visibility, draft exclusion, localized alternates, sitemap/robots output, JSON-LD validity, admin/private noindex behavior, policy launch gates, redacted error storage/display, and critical checkout/download/tracking launch journeys.

</code_context>

<specifics>
## Specific Ideas

- Blog should feel like a simple seller-operated content tool, not a multi-person editorial system.
- Scheduled blog content should become visible through query rules once the publish time arrives, without requiring a separate job in v1.
- Admin dashboard should reduce launch friction by showing only items the seller can act on now.
- Policy readiness is both customer-facing trust content and machine-readable launch configuration.
- SEO launch checks should be automated enough that future blog/product/policy changes cannot silently break localization or indexing rules.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 7-Content, SEO, and Launch Readiness*
*Context gathered: 2026-06-23*
