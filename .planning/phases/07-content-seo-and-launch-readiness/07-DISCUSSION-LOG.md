# Phase 7: Content, SEO, and Launch Readiness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-23
**Phase:** 7-Content, SEO, and Launch Readiness
**Areas discussed:** Blog publishing model, SEO launch rules, Unified admin operations, Policies and launch decisions

---

## Blog Publishing Model

| Option | Description | Selected |
|--------|-------------|----------|
| Draft -> Preview -> Publish/Schedule | Drafts, preview, immediate publish, and scheduled publish. Fits BLOG-01 while staying MVP-sized. | yes |
| Draft -> Publish only | Simpler, but does not fully satisfy scheduling. | |
| Editorial workflow full | Adds review/approval and is too large for a one-seller v1 shop. | |

**User's choice:** Draft -> Preview -> Publish/Schedule.
**Notes:** Scheduling is in scope for v1, but without a heavy editorial approval workflow.

| Option | Description | Selected |
|--------|-------------|----------|
| One shared post with vi/en translations | Keeps taxonomy, related products, publish state, and hreflang coherent. | yes |
| Separate posts linked by translation group | More flexible but easier to drift. | |
| Allow one language then add another later | Faster content entry but weak for launch SEO. | |

**User's choice:** One shared blog record with Vietnamese and English translations.
**Notes:** Blog alternates should be coherent at publish time.

| Option | Description | Selected |
|--------|-------------|----------|
| Require category and localized slug/title/description/social image; tags and related products optional | Strong publish quality without over-constraining content. | yes |
| Only require title/body/slug | Faster but risks weak SEO/social previews. | |
| Require category, tag, and related product | Strong marketing links but too rigid for general posts. | |

**User's choice:** Require category plus localized slug/title/description/social image for both locales; tags and related products optional.
**Notes:** This mirrors existing catalog publish-blocker behavior.

| Option | Description | Selected |
|--------|-------------|----------|
| Scheduled posts become public when `published_at <= now` | Query-driven scheduling without an extra job. | yes |
| Admin manually publishes at the scheduled time | Simpler but not true scheduling. | |
| Background job changes scheduled state to published | Clear state but more operational surface than v1 needs. | |

**User's choice:** Scheduled posts become visible when `published_at <= now`.
**Notes:** Public queries should filter scheduled content correctly.

---

## SEO Launch Rules

| Option | Description | Selected |
|--------|-------------|----------|
| Strict launch SEO | Canonical, hreflang, localized metadata, sitemap inclusion, and structured data for public pages. | yes |
| Core SEO only | Smaller scope; less structured-data coverage. | |
| Manual SEO review mainly | Fast but fragile for launch readiness. | |

**User's choice:** Strict launch SEO.
**Notes:** Applies to product, blog, policy, category, and collection pages where relevant.

| Option | Description | Selected |
|--------|-------------|----------|
| Product + Article + Organization/WebSite/Breadcrumb | Covers catalog, blog, site identity, and navigation. | yes |
| Product + Article only | Directly covers SEO-03 but less complete. | |
| Full schema for every page type | Too much risk of wrong or incomplete data. | |

**User's choice:** Product, Article, Organization, WebSite, and basic Breadcrumb structured data.
**Notes:** Structured data should use authoritative server facts.

| Option | Description | Selected |
|--------|-------------|----------|
| Sitemap index plus localized sitemap per locale | Clear localized URL sets with public-only URLs and alternates. | yes |
| One sitemap for all localized URLs | Simpler but less clean as content grows. | |
| Static sitemap updated manually | Easy to drift from actual content. | |

**User's choice:** Sitemap index plus localized sitemap per locale.
**Notes:** Draft, private, admin, and unavailable URLs must not leak into sitemaps.

| Option | Description | Selected |
|--------|-------------|----------|
| Automated checks are required launch gate | Verifies hreflang, canonical, sitemap/robots, JSON-LD, and private noindex behavior. | yes |
| Automated smoke checks plus manual checklist | Balanced but weaker as a gate. | |
| Manual checklist mainly | Too fragile for launch readiness. | |

**User's choice:** Automated SEO checks are a required launch gate.
**Notes:** CI-friendly checks are preferred.

---

## Unified Admin Operations

| Option | Description | Selected |
|--------|-------------|----------|
| Lightweight operational dashboard | Shows queues/statuses needing action and links to admin areas. | yes |
| Navigation hub only | Easier but less useful for launch readiness. | |
| Metrics-heavy dashboard | Risks drifting into v2 analytics. | |

**User's choice:** Lightweight operational dashboard.
**Notes:** Avoid v2 analytics and focus on seller action.

| Option | Description | Selected |
|--------|-------------|----------|
| Only actionable work | Pending VietQR, awaiting fulfillment, failed emails, pending reviews, draft/scheduled blog posts, unresolved launch checklist. | yes |
| Every recent status | More information but noisy. | |
| Launch checklist only | Too narrow for unified admin operations. | |

**User's choice:** Only actionable work appears on the dashboard.
**Notes:** The dashboard should help the seller decide what to do next.

| Option | Description | Selected |
|--------|-------------|----------|
| Safe redacted operational error queue | Shows sanitized error facts without secrets or unnecessary PII. | yes |
| Server logs only | Less UI, but weak for admin inspection. | |
| Raw provider/app payloads | Rejected as unsafe. | |

**User's choice:** Safe redacted operational error queue.
**Notes:** Keep the same sanitized-evidence principle used in payments/email/admin UIs.

| Option | Description | Selected |
|--------|-------------|----------|
| Keep separate admin areas and add `/admin` overview | Dashboard summarizes and deep-links into catalog, orders, reviews, newsletter, blog, policies, operations. | yes |
| One tabbed admin console | Unified feel but could become large and hard to maintain. | |
| Add links only, no reorganization | Fast but leaves admin scattered. | |

**User's choice:** Keep separate admin areas and add `/admin` overview.
**Notes:** Preserve existing route boundaries.

---

## Policies and Launch Decisions

| Option | Description | Selected |
|--------|-------------|----------|
| Admin-editable policy pages with publish state | Bilingual privacy, terms, returns, and digital-download policies with metadata. | yes |
| Static markdown/code pages | Fast but not admin-manageable. | |
| Placeholder launch copy only | Not enough for launch readiness. | |

**User's choice:** Admin-editable policy pages with publish state.
**Notes:** Policies are content, not temporary placeholders.

| Option | Description | Selected |
|--------|-------------|----------|
| Launch settings record plus public policy refs | Structured admin-visible business decisions plus customer-facing policy pages. | yes |
| Policy text only | Customer-readable but not structured for system verification. | |
| Config/env/code only | System-readable but not visible to admin. | |

**User's choice:** Launch settings record in admin plus public policy references.
**Notes:** Launch settings should be structured enough for verification and runtime gates.

| Option | Description | Selected |
|--------|-------------|----------|
| Countries, tax stance, policies, UAT, E2E, redaction verified | Full launch gate set for LEGAL-02, OPS-03, and OPS-04. | yes |
| Countries plus policies only | Too narrow for launch readiness. | |
| Full external legal/tax package | Potentially too heavy for v1, though owner approval remains required. | |

**User's choice:** Enabled countries, tax stance, policies published, provider/payment UAT, checkout/download/tracking E2E, and monitoring redaction verified.
**Notes:** These are required before Phase 7 can be considered complete.

| Option | Description | Selected |
|--------|-------------|----------|
| Checkout/footer link to published policies; launch fails if required policies are missing | Strong trust and launch-readiness gate. | yes |
| Footer links plus checkout summary text | Lighter but weaker. | |
| Footer/site pages only | Too disconnected from purchase flow. | |

**User's choice:** Checkout and footer link directly to published policies; launch readiness fails if required policies are not published.
**Notes:** Customers must be able to read policies before purchase.

---

## the agent's Discretion

- Exact schema, route, component, and validation implementation details remain open for the researcher/planner, as long as the locked decisions in CONTEXT.md are preserved.
- Exact UI copy and layouts can follow existing localized storefront and compact admin patterns.

## Deferred Ideas

None - discussion stayed within phase scope.
