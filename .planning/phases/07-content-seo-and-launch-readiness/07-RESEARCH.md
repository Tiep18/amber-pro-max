# Phase 7: Content, SEO, and Launch Readiness - Research

**Researched:** 2026-06-23
**Domain:** Bilingual content publishing, technical SEO, admin operations, policy readiness, and launch verification
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

### Deferred Ideas (OUT OF SCOPE)
## Deferred Ideas

None - discussion stayed within phase scope.
</user_constraints>

## Summary

Phase 7 should be implemented as an extension of the existing modular monolith, not as a separate CMS, analytics system, or observability product. The current code already has localized routing, catalog publish blockers, `localizedMetadata`, protected admin pages, sanitized payment/email evidence patterns, and Vitest/Playwright/security test infrastructure. [VERIFIED: codebase grep]

The prescriptive approach is: model blog posts and policies as shared bilingual records with per-locale translation rows; publish only through server-side checks; make scheduled visibility a query predicate; extend metadata helpers for canonical/hreflang and JSON-LD; generate sitemap/robots from public query projections; and make `/admin` an actionable dashboard composed from existing queue counts. [VERIFIED: codebase grep] [CITED: https://nextjs.org/docs/app/api-reference/functions/generate-metadata] [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap] [CITED: https://nextjs.org/docs/app/guides/json-ld]

**Primary recommendation:** Build Phase 7 with first-party tables, route handlers, server actions, and tests on the existing Next.js/Supabase stack; do not add a CMS, SEO plugin, analytics suite, or logging SaaS dependency for v1. [VERIFIED: package.json] [ASSUMED]

## Project Constraints (from AGENTS.md)

- The store must remain bilingual Vietnamese/English and market-aware for Vietnam and international customers. [VERIFIED: AGENTS.md]
- Vietnam uses VND and VietQR manual transfer; international uses USD and PayPal. [VERIFIED: AGENTS.md]
- Digital fulfillment must never occur before full confirmed payment. [VERIFIED: AGENTS.md]
- Purchased PDFs must use expiring, access-controlled delivery links. [VERIFIED: AGENTS.md]
- Guest checkout must remain supported. [VERIFIED: AGENTS.md]
- Mixed digital/physical carts must remain supported. [VERIFIED: AGENTS.md]
- Physical inventory and variants remain explicitly admin-managed. [VERIFIED: AGENTS.md]
- Physical shipping stays manual; system stores fees, status, and tracking. [VERIFIED: AGENTS.md]
- Public product, category, collection, and blog pages must be indexable and support localized metadata. [VERIFIED: AGENTS.md]
- Direct repo edits should happen inside a GSD workflow; this research artifact is produced as part of `$gsd-plan-phase` Phase 7. [VERIFIED: AGENTS.md]

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BLOG-01 | Admin can create, edit, preview, publish, unpublish, and schedule bilingual blog posts. | Use shared post status plus translation rows, publish blockers, preview route with admin auth, and public query predicate `status='published' and published_at <= now()`. [VERIFIED: 07-CONTEXT.md] |
| BLOG-02 | Admin can organize blog posts by categories and tags and link posts to related products. | Use one required category, optional tags, and optional related product join table; public rendering reloads current product facts. [VERIFIED: 07-CONTEXT.md] |
| SEO-02 | Public localized pages emit correct language alternates using `hreflang`. | Extend `localizedMetadata` and localized slug helpers; Google requires alternates to identify localized variants. [VERIFIED: codebase grep] [CITED: https://developers.google.com/search/docs/specialty/international/localized-versions] |
| SEO-03 | Product and blog pages emit valid Product and Article structured data. | Add sanitized JSON-LD helpers; Product uses catalog facts, Article uses blog facts. [CITED: https://nextjs.org/docs/app/guides/json-ld] [CITED: https://developers.google.com/search/docs/appearance/structured-data/product-snippet] [CITED: https://developers.google.com/search/docs/appearance/structured-data/article] |
| SEO-04 | System publishes localized sitemaps and an appropriate robots file. | Implement Next metadata route conventions for sitemap/robots and include only public, indexable URLs. [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap] [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots] |
| ADM-01 | Authorized admin can manage catalog, markets, inventory, shipping, orders, payments, fulfillment, customers, reviews, discounts, newsletter, blog, and site content. | Convert `/admin` into dashboard and add blog/policies/operations links while retaining `requireAdmin`. [VERIFIED: codebase grep] |
| OPS-03 | System captures and reports application, payment, email, and fulfillment errors without logging secrets or unnecessary personal data. | Add operational error queue with sanitized context and DB constraints mirroring existing payment/email redaction patterns. [VERIFIED: codebase grep] |
| OPS-04 | Critical guest/account checkout, payment, inventory, download, tracking, localization, and authorization flows have automated verification. | Existing scripts cover unit, db, security, build, and Playwright; Phase 7 must add launch smoke/spec files. [VERIFIED: package.json] |
| LEGAL-01 | Store publishes Vietnamese and English privacy, terms of sale, physical return, and digital-download policies. | Model required policy kinds as publish-checked bilingual policy pages; footer and checkout link only published records. [VERIFIED: 07-CONTEXT.md] |
| LEGAL-02 | Launch configuration explicitly records enabled destination countries and seller-approved tax and consumer-policy decisions. | Add structured launch settings/checklist records and fail launch readiness until required fields and UAT flags are resolved. [VERIFIED: 07-CONTEXT.md] |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Blog authoring/publish/schedule | API / Backend | Database / Storage | Admin mutations, publish checks, preview auth, and scheduled visibility must be server-owned; DB enforces status/time and relations. [VERIFIED: codebase grep] |
| Public blog rendering | Frontend Server (SSR) | Database / Storage | Localized pages need server-rendered metadata/content and must query only published posts. [CITED: https://nextjs.org/docs/app/api-reference/functions/generate-metadata] |
| Canonical/hreflang metadata | Frontend Server (SSR) | API / Backend | App Router metadata is generated in page/layout modules from localized path facts; DB supplies localized slugs. [VERIFIED: codebase grep] [CITED: https://next-intl.dev/docs/routing/configuration] |
| Sitemap index and localized sitemaps | Frontend Server (SSR) | API / Backend | Next metadata route handlers generate XML from public projections; backend query decides indexable URLs. [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap] |
| Robots behavior | Frontend Server (SSR) | CDN / Static | `robots.ts` emits crawler rules and sitemap locations; no private/admin path should be allowed through sitemap. [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots] |
| Structured JSON-LD | Frontend Server (SSR) | API / Backend | JSON-LD must describe visible page content and be rendered on the page with XSS-safe serialization. [CITED: https://nextjs.org/docs/app/guides/json-ld] [CITED: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data] |
| Admin dashboard | Frontend Server (SSR) | API / Backend | `/admin` should call `requireAdmin`, load actionable counts, and link to separate admin areas. [VERIFIED: codebase grep] |
| Operational error queue | API / Backend | Database / Storage | Error ingestion and display must sanitize before storage/display and enforce RLS/admin-only access. [VERIFIED: codebase grep] [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |
| Policy pages and launch settings | API / Backend | Frontend Server (SSR) | Admin edits structured/published policy facts; public pages and checkout/footer consume published policy URLs. [VERIFIED: 07-CONTEXT.md] |
| Launch gates | API / Backend | Test / CI | Gate logic reads DB/config/UAT flags and automated test status; planner should add explicit verification tasks. [VERIFIED: package.json] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.9 installed; latest npm 16.2.9 modified 2026-06-23 | App Router pages, route handlers, metadata, sitemap, robots, JSON-LD rendering | Existing app framework; official docs cover metadata and metadata route conventions. [VERIFIED: package.json] [CITED: https://nextjs.org/docs/app/api-reference/functions/generate-metadata] |
| React | 19.2.7 installed; latest npm 19.2.7 modified 2026-06-22 | UI rendering | Existing Next-compatible UI runtime. [VERIFIED: package.json] |
| TypeScript | 5.9.3 installed | Typed domain logic and metadata helpers | Existing project language and test/compiler target. [VERIFIED: package.json] |
| Supabase Postgres/RLS | Managed plus CLI 2.107.0 local | Blog/policy/launch/error tables, RLS, migrations, DB tests | Existing commerce authority; RLS protects admin/customer boundaries. [VERIFIED: package.json] [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |
| next-intl | 4.13.0 installed; latest npm 4.13.0 modified 2026-06-05 | Localized routes/messages and dynamic localized pathnames | Existing routing config uses `/vi` and `/en`; docs require alternate links aware of CMS-driven localized slugs. [VERIFIED: package.json] [CITED: https://next-intl.dev/docs/routing/configuration] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/supabase-js` | 2.108.1 installed; latest npm 2.108.2 modified 2026-06-19 | Server/browser Supabase client | Keep existing installed version unless planner creates explicit upgrade task. [VERIFIED: package.json] |
| `@supabase/ssr` | 0.12.0 installed; latest npm 0.12.0 modified 2026-06-09 | SSR cookie client | Reuse existing server/client helpers. [VERIFIED: package.json] |
| Zod | 4.4.3 installed; latest npm 4.4.3 modified 2026-05-04 | Runtime validation | Validate blog, policy, launch setting, and error ingestion forms. [VERIFIED: package.json] |
| Tailwind CSS / shadcn-style primitives | Tailwind 4.3.0 installed; latest npm 4.3.1 modified 2026-06-22 | Admin and storefront UI | Reuse existing `Card`, `Button`, `Alert`, `Separator`, and compact admin patterns. [VERIFIED: package.json] [VERIFIED: codebase grep] |
| Vitest | 4.1.8 installed; latest npm 4.1.9 modified 2026-06-15 | Unit/integration tests | Add SEO helper, publish check, redaction, launch gate, and query tests. [VERIFIED: package.json] |
| Playwright | 1.60.0 installed; latest npm 1.61.0 modified 2026-06-23 | Browser launch checks | Add admin blog/policy, SEO head/XML, checkout policy-link, and critical journey smoke specs. [VERIFIED: package.json] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| First-party blog tables | Headless CMS | Adds provider auth, webhook, preview, migration, and bilingual slug sync complexity; not needed for seller-operated v1. [ASSUMED] |
| First-party metadata/sitemap helpers | SEO plugin/package | Next already exposes typed metadata, sitemap, robots, and JSON-LD patterns; extra package increases dependency risk. [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap] |
| Safe operational error queue | Sentry/Datadog-style SaaS integration | External observability is useful later, but D-11 requires redacted facts in admin and v1 should avoid storing raw provider/PII payloads externally by default. [ASSUMED] |

**Installation:**

```bash
# No new packages recommended for Phase 7.
# Use the existing dependencies pinned in package-lock.json.
```

## Package Legitimacy Audit

> Phase 7 should not install external packages. The table below audits the existing stack only because the planner will rely on these installed dependencies. [VERIFIED: package.json]

| Package | Registry | Age / Publish Signal | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|----------------------|-----------|-------------|---------|-------------|
| next | npm | Latest 16.2.9, modified 2026-06-23 | 43M/wk | github.com/vercel/next.js | SUS: too-new | Already installed; do not upgrade without checkpoint. |
| react | npm | Latest 19.2.7, modified 2026-06-22 | 149M/wk | github.com/facebook/react | SUS: too-new | Already installed; do not upgrade without checkpoint. |
| react-dom | npm | Latest 19.2.7, modified 2026-06-22 | 140M/wk | github.com/facebook/react | SUS: too-new | Already installed; do not upgrade without checkpoint. |
| next-intl | npm | Latest 4.13.0, modified 2026-06-05 | 4M/wk | github.com/amannn/next-intl | SUS: too-new | Already installed; do not upgrade without checkpoint. |
| @supabase/supabase-js | npm | Latest 2.108.2, modified 2026-06-19 | 21M/wk | github.com/supabase/supabase-js | SUS: too-new | Keep installed 2.108.1 unless upgrade is planned. |
| @supabase/ssr | npm | Latest 0.12.0, modified 2026-06-09 | 4.9M/wk | github.com/supabase/ssr | SUS: too-new | Already installed; do not upgrade without checkpoint. |
| zod | npm | Latest 4.4.3, modified 2026-05-04 | 206M/wk | github.com/colinhacks/zod | OK | Approved existing dependency. |
| vitest | npm | Latest 4.1.9, modified 2026-06-15 | 71M/wk | github.com/vitest-dev/vitest | SUS: too-new | Keep installed 4.1.8 unless upgrade is planned. |
| @playwright/test | npm | Latest 1.61.0, modified 2026-06-23 | 42M/wk | github.com/microsoft/playwright | SUS: too-new | Keep installed 1.60.0 unless upgrade is planned. |
| tailwindcss | npm | Latest 4.3.1, modified 2026-06-22 | 122M/wk | github.com/tailwindlabs/tailwindcss | SUS: too-new | Keep installed 4.3.0 unless upgrade is planned. |
| resend | npm | Latest 6.14.0, modified 2026-06-17 | 7.5M/wk | github.com/resend/resend-node | SUS: too-new | Already installed; no Phase 7 install needed. |
| lucide-react | npm | Latest 1.21.0, modified 2026-06-18 | 85M/wk | github.com/lucide-icons/lucide | SUS: too-new | Keep installed 1.17.0 unless upgrade is planned. |

**Packages removed due to [SLOP] verdict:** none. [VERIFIED: package-legitimacy seam]
**Packages flagged as suspicious [SUS]:** existing packages above were flagged for recent publishes; planner must add a human checkpoint before any package upgrade or new dependency install. [VERIFIED: package-legitimacy seam]

## Architecture Patterns

### System Architecture Diagram

```text
---------------------+       +-----------------------+
| Admin /admin/*     | ----> | Server Actions/RPCs   |
| blog, policies,    |       | requireAdmin + Zod    |
| operations, launch |       +-----------+-----------+
+----------+----------+                   |
           |                              v
           |                    +----------------------+
           |                    | Supabase Postgres    |
           |                    | blog/policy/launch   |
           |                    | operational_errors   |
           |                    | RLS + sanitized JSON |
           |                    +----------+-----------+
           |                               |
           v                               v
+---------------------+       +-----------------------+
| Public /[locale]/*  | <---- | Public query helpers  |
| blog, policy,       |       | published + scheduled |
| product/category    |       | indexable only        |
+----------+----------+       +-----------+-----------+
           |                              |
           v                              v
+---------------------+       +-----------------------+
| generateMetadata    |       | app/sitemap* +        |
| JSON-LD helpers     |       | app/robots.ts         |
| canonical/hreflang  |       | public URLs only      |
+---------------------+       +-----------------------+
```

### Recommended Project Structure

```text
src/
├── content/              # Blog, policy, launch settings, SEO query/helpers
├── components/admin/     # Blog editor, policy editor, operations queue, launch checklist
├── components/content/   # Public blog/policy rendering and related products
├── app/admin/blog/       # Protected blog management
├── app/admin/policies/   # Protected policy management
├── app/admin/operations/ # Operational error queue and launch checklist
├── app/[locale]/blog/    # Public localized blog index/detail
├── app/[locale]/policies/# Public localized policy pages
├── app/sitemap.ts        # Sitemap index or top-level metadata route
├── app/sitemaps/[...]/   # Localized sitemap route handlers if index split is needed
└── app/robots.ts         # Robots metadata route
```

### Pattern 1: Shared Record, Localized Translations

**What:** Store shared publish state, category, tags, related products, and scheduling on `blog_posts`; store `locale`, `slug`, `title`, `description`, `body`, `seo_title`, `seo_description`, and social image fields on translation rows. [VERIFIED: 07-CONTEXT.md]

**When to use:** Blog posts and policy pages that must keep `/vi` and `/en` alternates coherent. [VERIFIED: 07-CONTEXT.md]

**Example:**

```typescript
// Source: existing catalog pattern, adapted for content.
type LocalizedSlugs = {vi: string; en: string};

function contentAlternatePaths(slugs: LocalizedSlugs) {
  return {
    vi: `/vi/bai-viet/${slugs.vi}`,
    en: `/en/blog/${slugs.en}`
  };
}
```

### Pattern 2: Publish Blockers as DB + UI Contract

**What:** Follow `catalog_publish_issues` + `mapPublishIssues` style: database returns missing localized fields and UI maps them to editor fields. [VERIFIED: codebase grep]

**When to use:** Blog publish, policy publish, and launch readiness gates. [VERIFIED: 07-CONTEXT.md]

**Example:**

```typescript
// Source: src/catalog/publish-checks.ts pattern.
export type ContentPublishIssue =
  | 'missing_category'
  | 'missing_slug'
  | 'missing_title'
  | 'missing_description'
  | 'missing_social_image';
```

### Pattern 3: Scheduled Visibility Without Job Mutation

**What:** Public queries select records where `status = 'published'` and `published_at <= now()`; scheduling does not require a cron job to flip status. [VERIFIED: 07-CONTEXT.md]

**When to use:** Blog posts only; policy pages should normally publish immediately after explicit admin action. [ASSUMED]

### Pattern 4: JSON-LD Helper With XSS-Safe Serialization

**What:** Render JSON-LD in a page component using `JSON.stringify(data).replace(/</g, '\\u003c')`. [CITED: https://nextjs.org/docs/app/guides/json-ld]

**When to use:** Product, Article, Organization, WebSite, and Breadcrumb structured data. [VERIFIED: 07-CONTEXT.md]

**Example:**

```tsx
// Source: Next.js JSON-LD guide.
export function JsonLd({data}: {data: Record<string, unknown>}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{__html: JSON.stringify(data).replace(/</g, '\\u003c')}}
    />
  );
}
```

### Anti-Patterns to Avoid

- **New headless CMS:** Breaks the existing Supabase/RLS/admin authorization ownership for v1 content. [ASSUMED]
- **Cron that flips scheduled posts:** D-04 explicitly says public query rules should own scheduled visibility. [VERIFIED: 07-CONTEXT.md]
- **Sitemap from route filesystem only:** Drafts, private admin URLs, unavailable products, and unpublished policies must be excluded from DB facts, not guessed from files. [VERIFIED: 07-CONTEXT.md]
- **Raw error log display:** Existing admin provider/email panels intentionally show sanitized facts only. [VERIFIED: codebase grep]
- **JSON-LD that contains hidden or invented facts:** Google states structured data should describe content on the page. [CITED: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Metadata tags | Manual `<head>` string builders | Next `generateMetadata` and existing `localizedMetadata` | Typed App Router metadata already supports canonical and language alternates. [CITED: https://nextjs.org/docs/app/api-reference/functions/generate-metadata] |
| Sitemap XML serialization | Ad hoc XML strings for simple sitemap entries | Next `MetadataRoute.Sitemap` where possible | Official file convention returns typed URL objects with alternates. [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap] |
| Robots file | Static untracked text | `app/robots.ts` | Keeps sitemap URL and disallow rules generated from site URL/config. [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots] |
| Content authorization | Client-side admin checks | `requireAdmin`, RLS, server actions/RPCs | Existing admin boundary is server-side. [VERIFIED: codebase grep] |
| Error redaction | UI-only masking after raw storage | Redact before insert and add DB constraints/triggers | Existing audit/email patterns reject or avoid unsafe metadata. [VERIFIED: codebase grep] |
| Launch checklist | Markdown-only checklist | Structured `launch_settings` and checklist rows plus tests | D-14 and D-15 require machine-readable launch state. [VERIFIED: 07-CONTEXT.md] |

**Key insight:** Phase 7 is a trust and launch gate phase; custom convenience shortcuts are risky when they bypass existing RLS, publish checks, localized metadata, or redaction boundaries. [VERIFIED: 07-CONTEXT.md]

## Common Pitfalls

### Pitfall 1: Alternates Point to the Wrong Localized Slug
**What goes wrong:** `/vi` and `/en` pages point to generic translated route patterns instead of the actual localized slug. [CITED: https://next-intl.dev/docs/routing/configuration]
**Why it happens:** CMS-driven slugs are stored separately from static route pathnames. [CITED: https://next-intl.dev/docs/routing/configuration]
**How to avoid:** Store both slugs before publish and generate alternates from DB localized slug facts. [VERIFIED: 07-CONTEXT.md]
**Warning signs:** Locale switcher falls back to locale home for detail pages; `hreflang` URL 404s. [ASSUMED]

### Pitfall 2: Drafts and Admin URLs Leak Into Sitemaps
**What goes wrong:** Search crawlers discover unpublished blog/policy pages or protected admin routes. [VERIFIED: 07-CONTEXT.md]
**Why it happens:** Sitemap generation walks filesystem routes rather than public query projections. [ASSUMED]
**How to avoid:** Generate sitemap entries from published/indexable projections only and test for absence of `/admin`, draft, private, and operational URLs. [VERIFIED: 07-CONTEXT.md]
**Warning signs:** Sitemap tests only assert presence, not exclusions. [ASSUMED]

### Pitfall 3: JSON-LD Creates XSS or Unsupported Claims
**What goes wrong:** User-authored content containing `<script`-like text is injected into JSON-LD, or structured data claims facts not visible on the page. [CITED: https://nextjs.org/docs/app/guides/json-ld] [CITED: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data]
**Why it happens:** Raw `JSON.stringify` is placed inside `dangerouslySetInnerHTML` without escaping `<`. [CITED: https://nextjs.org/docs/app/guides/json-ld]
**How to avoid:** Centralize `JsonLd` serialization and keep builders sourced from rendered page data. [CITED: https://nextjs.org/docs/app/guides/json-ld]
**Warning signs:** Repeated inline JSON-LD code in pages. [ASSUMED]

### Pitfall 4: Launch Gates Are Only Visual
**What goes wrong:** Admin sees checklist items but checkout/footer still operate with missing policies or unresolved provider UAT. [VERIFIED: 07-CONTEXT.md]
**Why it happens:** Readiness is implemented as copy, not structured configuration. [ASSUMED]
**How to avoid:** Store launch settings/checklist in DB and make checkout/footer/policy tests fail if required policies are unpublished. [VERIFIED: 07-CONTEXT.md]
**Warning signs:** Required policy URLs are hardcoded in footer before content exists. [ASSUMED]

### Pitfall 5: Operational Queue Stores Raw Payloads
**What goes wrong:** Admin can inspect secrets, signatures, signed URLs, tokens, full provider payloads, or unnecessary PII. [VERIFIED: 07-CONTEXT.md]
**Why it happens:** Error reporting stores raw exception/provider context first and relies on UI masking later. [ASSUMED]
**How to avoid:** Redact before insert, constrain JSON metadata, and test serialized records for forbidden terms. [VERIFIED: codebase grep]
**Warning signs:** `operational_errors.context` can contain arbitrary JSON with no tests. [ASSUMED]

## Code Examples

### Localized Metadata Extension

```typescript
// Source: src/catalog/metadata.ts existing shape.
const metadata = localizedMetadata({
  title: post.seoTitle || post.title,
  description: post.seoDescription || post.description,
  canonicalPath: getBlogPostPath(locale, post.slug),
  alternatePaths: {
    vi: getBlogPostPath('vi', post.localizedSlugs.vi),
    en: getBlogPostPath('en', post.localizedSlugs.en)
  },
  socialImage: post.socialImageUrl
});
```

### Public Scheduled Query Predicate

```sql
-- Source: D-04.
where bp.status = 'published'
  and bp.published_at is not null
  and bp.published_at <= now()
```

### Robots Metadata Route

```typescript
// Source: Next.js robots metadata convention.
export default function robots() {
  return {
    rules: {userAgent: '*', allow: '/', disallow: ['/admin/', '/api/']},
    sitemap: `${siteUrl()}/sitemap.xml`
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual head tags per page | App Router `generateMetadata` with typed `Metadata` | Current Next.js docs as of 2026-06-23 | Keep SEO logic in page/layout metadata helpers. [CITED: https://nextjs.org/docs/app/api-reference/functions/generate-metadata] |
| Static sitemap.xml only | Programmatic `sitemap.ts` with URL objects and alternates | Current Next.js docs as of 2026-06-23 | Generate public URL inventory from database. [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap] |
| Raw JSON-LD serialization | Escape `<` during `dangerouslySetInnerHTML` serialization | Current Next.js docs as of 2026-06-23 | Central helper required for user-authored blog/policy content. [CITED: https://nextjs.org/docs/app/guides/json-ld] |
| Sitelinks search box as SEO goal | WebSite data may remain for site identity, search box visual removed | Google removal started 2024-11-21 | Do not optimize Phase 7 around sitelinks search box rich result. [CITED: https://developers.google.com/search/blog/2024/10/sitelinks-search-box] |

**Deprecated/outdated:**
- Sitelinks search box as a launch KPI: Google removed the visual element globally starting 2024-11-21; Phase 7 can still emit basic WebSite/Organization identity data but should not require a SearchAction rich result. [CITED: https://developers.google.com/search/blog/2024/10/sitelinks-search-box]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | No headless CMS should be added for v1. | Summary / Alternatives | If the seller requires CMS workflows outside admin, first-party blog tooling may be too limited. |
| A2 | No external observability SaaS should be added in Phase 7. | Alternatives | If production monitoring requirements require SaaS alerts, planner must add a decision and package/provider audit. |
| A3 | Policy pages normally publish immediately after explicit admin action rather than using scheduling. | Architecture Patterns | If scheduled policies are required, policy query and launch gates need time-based behavior too. |
| A4 | Sitemap leaks usually come from filesystem route walking. | Common Pitfalls | If implemented from DB projections, this risk is already mitigated. |
| A5 | Warning signs listed for pitfalls are inferred from engineering practice. | Common Pitfalls | Planner should validate these through tests rather than treating them as known current defects. |

## Open Questions

1. **Final legal/tax content owner**
   - What we know: LEGAL-01 and LEGAL-02 require published policies and seller-approved tax/consumer decisions. [VERIFIED: REQUIREMENTS.md]
   - What's unclear: The actual legal policy copy and tax stance require seller/professional approval. [ASSUMED]
   - Recommendation: Planner should create implementation tasks for editable structure and launch gates, plus human UAT/checkpoint for final policy/tax approval.

2. **Production brand identity**
   - What we know: Organization/WebSite JSON-LD needs stable name, URL, logo/social facts to be useful. [CITED: https://developers.google.com/search/docs/appearance/structured-data/organization]
   - What's unclear: Final brand name/logo/social profiles are not locked in the Phase 7 context. [VERIFIED: STATE.md]
   - Recommendation: Store configurable organization facts and block launch readiness if required brand fields are missing.

3. **PayPal/VietQR UAT completion source**
   - What we know: D-15 requires provider/manual UAT completion before Phase 7 is done. [VERIFIED: 07-CONTEXT.md]
   - What's unclear: Whether this is recorded manually in launch settings or imported from verification notes. [ASSUMED]
   - Recommendation: Use structured launch checklist rows with manual evidence fields.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Next.js/Vitest/Playwright | yes | v20.19.4 | Meets Next >=20.9, but stack research prefers Node 22 LTS for production. [VERIFIED: shell] |
| npm | Package scripts/package audit | yes | 10.8.1 | none needed. [VERIFIED: shell] |
| Supabase CLI | DB reset, lint, db tests, type generation | yes via `npx supabase` | 2.107.0 | Use existing npm script wrappers. [VERIFIED: shell] |
| Playwright CLI | E2E launch verification | yes via `npx playwright` | 1.60.0 | none for browser coverage. [VERIFIED: shell] |
| ctx7 | Preferred documentation provider | no | — | Used official docs via web fallback. [VERIFIED: shell] |

**Missing dependencies with no fallback:** none for planning. [VERIFIED: shell]

**Missing dependencies with fallback:**
- `ctx7` is unavailable; research used official Next.js, next-intl, Google Search Central, and Supabase docs through web. [VERIFIED: shell]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.8, Playwright 1.60.0, Supabase pgTAP-style database tests, Node security tests. [VERIFIED: package.json] |
| Config file | `vitest.config.ts`, `playwright.config.ts`, Supabase tests under `supabase/tests/database`, security scripts under `tests/security`. [VERIFIED: rg --files tests] |
| Quick run command | `npm run test:unit -- tests/unit/content/seo.test.ts tests/unit/content/publish-checks.test.ts tests/unit/content/redaction.test.ts` [ASSUMED] |
| Full suite command | `npm run ci` [VERIFIED: package.json] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| BLOG-01 | Draft/preview/publish/schedule/unpublish and scheduled public visibility | unit + db + e2e | `npm run test:unit -- tests/unit/content/blog.test.ts` and `npm run db:test` | No - Wave 0 |
| BLOG-02 | Category required, tags optional, related products render current public facts | unit + db + e2e | `npm run test:unit -- tests/unit/content/blog-taxonomy.test.ts` | No - Wave 0 |
| SEO-02 | Canonical and hreflang alternates for product/blog/policy/category/collection | unit + e2e | `npm run test:e2e -- tests/e2e/launch-seo.spec.ts` | No - Wave 0 |
| SEO-03 | Product/Article/Organization/WebSite/Breadcrumb JSON-LD valid and sanitized | unit + e2e | `npm run test:unit -- tests/unit/content/json-ld.test.ts` | No - Wave 0 |
| SEO-04 | Sitemap index/localized sitemaps/robots include public URLs and exclude private URLs | unit + e2e | `npm run test:e2e -- tests/e2e/sitemap-robots.spec.ts` | No - Wave 0 |
| ADM-01 | `/admin` dashboard shows actionable counts and protected links | e2e | `npm run test:e2e -- tests/e2e/admin-dashboard.spec.ts` | No - Wave 0 |
| OPS-03 | Operational errors are sanitized before storage/display | unit + db + security | `npm run test:security` plus `npm run test:unit -- tests/unit/operations/redaction.test.ts` | No - Wave 0 |
| OPS-04 | Critical launch journeys still pass | e2e + security + ci | `npm run ci` | Existing suite plus Phase 7 additions |
| LEGAL-01 | Required bilingual policy pages publish and render before checkout/footer links | unit + e2e | `npm run test:e2e -- tests/e2e/policies.spec.ts` | No - Wave 0 |
| LEGAL-02 | Launch settings record countries/tax/policy decisions and gates fail when incomplete | unit + db + e2e | `npm run test:unit -- tests/unit/operations/launch-gates.test.ts` | No - Wave 0 |

### Sampling Rate

- **Per task commit:** targeted Vitest file plus relevant Playwright spec for the touched slice. [ASSUMED]
- **Per wave merge:** `npm run lint && npm run typecheck && npm run test:unit && npm run db:test && npm run test:security`. [VERIFIED: package.json]
- **Phase gate:** `npm run ci` plus manual UAT evidence for PayPal/VietQR, policy/tax decisions, and production-like SEO crawl checks. [VERIFIED: package.json] [VERIFIED: 07-CONTEXT.md]

### Wave 0 Gaps

- [ ] `tests/unit/content/blog.test.ts` - covers BLOG-01/BLOG-02.
- [ ] `tests/unit/content/publish-checks.test.ts` - covers BLOG-01/LEGAL-01 publish blockers.
- [ ] `tests/unit/content/json-ld.test.ts` - covers SEO-03 serialization and builders.
- [ ] `tests/unit/operations/redaction.test.ts` - covers OPS-03 redaction schema.
- [ ] `tests/unit/operations/launch-gates.test.ts` - covers LEGAL-02/D-15/D-16.
- [ ] `tests/e2e/launch-seo.spec.ts` - covers SEO-02/SEO-03.
- [ ] `tests/e2e/sitemap-robots.spec.ts` - covers SEO-04 and private URL exclusions.
- [ ] `tests/e2e/admin-dashboard.spec.ts` - covers ADM-01.
- [ ] `tests/e2e/policies.spec.ts` - covers LEGAL-01/D-16.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Existing Supabase SSR auth and `requireAdmin` for admin-only previews/editors. [VERIFIED: codebase grep] |
| V3 Session Management | yes | Existing Supabase SSR cookie client; preview/admin routes must not be public token bypasses. [VERIFIED: codebase grep] |
| V4 Access Control | yes | RLS on new tables plus server-side `requireAdmin`; no `user_metadata` auth decisions. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |
| V5 Input Validation | yes | Zod schemas for admin forms and error ingestion, DB constraints for publish/redaction. [VERIFIED: package.json] |
| V6 Cryptography | yes | Do not create new raw public tokens for preview unless hashed/expiring; reuse existing token discipline if needed. [VERIFIED: codebase grep] |
| V8 Data Protection | yes | Redact operational errors before storage/display; avoid raw provider payloads, signatures, tokens, signed URLs, full addresses, and unnecessary PII. [VERIFIED: 07-CONTEXT.md] |
| V9 Communications | yes | Robots/sitemap must not expose private/admin URLs; HTTPS production assumed through deployment. [CITED: https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview] |
| V14 Configuration | yes | Launch settings record enabled countries, tax stance, policy status, provider/manual UAT, and monitoring/redaction readiness. [VERIFIED: 07-CONTEXT.md] |

### Known Threat Patterns for Next.js + Supabase Content/Admin

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Draft blog/policy exposure | Information Disclosure | Public queries filter `published` and `published_at <= now`; admin previews require `requireAdmin`. [VERIFIED: 07-CONTEXT.md] |
| Stored XSS through JSON-LD | Tampering / Elevation | Central JSON-LD helper escapes `<` and builders use sanitized visible facts. [CITED: https://nextjs.org/docs/app/guides/json-ld] |
| IDOR on admin content/error records | Information Disclosure | RLS plus server-side admin checks; no browser-owned admin authority. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |
| Raw payload/secret leakage in operations queue | Information Disclosure | Redact before insert, constrain metadata JSON, and test forbidden substrings. [VERIFIED: codebase grep] |
| Sitemap discovery of private URLs | Information Disclosure | Generate sitemap from public projections and add negative tests for `/admin`, `/api`, drafts, private downloads, and operational URLs. [VERIFIED: 07-CONTEXT.md] |

## Sources

### Primary (HIGH confidence)

- `AGENTS.md` - project constraints and workflow enforcement. [VERIFIED: AGENTS.md]
- `.planning/phases/07-content-seo-and-launch-readiness/07-CONTEXT.md` - D-01 through D-16 and Phase 7 scope. [VERIFIED: file read]
- `.planning/REQUIREMENTS.md` - BLOG-01, BLOG-02, SEO-02, SEO-03, SEO-04, ADM-01, OPS-03, OPS-04, LEGAL-01, LEGAL-02. [VERIFIED: file read]
- `package.json` - installed versions and test scripts. [VERIFIED: package.json]
- Codebase grep/CodeGraph - `localizedMetadata`, `requireAdmin`, admin pages, publish checks, redacted provider/email patterns, test files. [VERIFIED: codebase grep]

### Secondary (MEDIUM confidence)

- https://nextjs.org/docs/app/api-reference/functions/generate-metadata - App Router metadata.
- https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap - sitemap file convention and typed returns.
- https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots - robots file convention.
- https://nextjs.org/docs/app/guides/json-ld - JSON-LD rendering and escaping guidance.
- https://next-intl.dev/docs/routing/configuration - localized pathnames and CMS-driven slugs.
- https://developers.google.com/search/docs/specialty/international/localized-versions - hreflang guidance.
- https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data - structured data principles.
- https://developers.google.com/search/docs/appearance/structured-data/product-snippet - Product structured data.
- https://developers.google.com/search/docs/appearance/structured-data/article - Article structured data.
- https://developers.google.com/search/docs/appearance/structured-data/organization - Organization structured data.
- https://developers.google.com/search/docs/appearance/structured-data/breadcrumb - Breadcrumb structured data.
- https://developers.google.com/search/blog/2024/10/sitelinks-search-box - sitelinks search box removal and WebSite note.
- https://supabase.com/docs/guides/database/postgres/row-level-security - RLS guidance.
- https://supabase.com/docs/guides/database/database-advisors - security advisor checks.

### Tertiary (LOW confidence)

- Assumptions listed in the Assumptions Log; no third-party community source is used as authoritative.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - installed versions and scripts verified locally; latest registry versions checked; no new package recommended.
- Architecture: HIGH - driven by locked Phase 7 decisions plus existing code patterns.
- SEO docs: MEDIUM - official docs were checked through web fallback; Context7/ctx7 unavailable.
- Pitfalls: MEDIUM - critical pitfalls are supported by official docs and prior code patterns, but warning signs include engineering inference.
- Security: HIGH - RLS/redaction/admin boundaries align with existing code and Supabase official guidance.

**Research date:** 2026-06-23
**Valid until:** 2026-07-23 for architecture/codebase decisions; re-check package versions and framework docs before dependency upgrades.
