# Phase 02: Market-Aware Catalog - Research

**Researched:** 2026-06-12
**Domain:** Next.js App Router catalog, Supabase Postgres/RLS/Storage, next-intl localized commerce routing
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Market and Pricing
- **D-01:** Every enabled market offer must have an explicit price in that market's currency. Vietnam offers require VND prices; international offers require USD prices.
- **D-02:** Catalog listing and search results show only products available in the active market.
- **D-03:** Direct product URLs for products unavailable in the active market still render the product page with a clear unavailable state instead of returning a hidden or missing page.
- **D-04:** The storefront uses IP/country signal only as the initial market suggestion. Customers must be able to see the active market and change it manually.
- **D-05:** Prices use market-local formatting: Vietnam prices display in Vietnamese VND format, and international prices display in US USD format.

### Product, Variants, and Inventory
- **D-06:** The top-level commercial product types are `PDF pattern` and `physical finished product`.
- **D-07:** Physical variants and inventory apply only to physical finished products.
- **D-08:** Admins create each physical variant explicitly. Each variant can have its own SKU, inventory, optional media, and market price overrides.
- **D-09:** Physical products define default market prices at the parent product level; variants override those prices only when a specific variant has a different price.
- **D-10:** Physical products without variants track inventory at the product level. Physical products with variants track inventory at the variant level.

### Taxonomy and Discovery
- **D-11:** Category and collection pages are public and indexable in Phase 2.
- **D-12:** Technique and tag are available as discovery filters in Phase 2 but do not need standalone indexable pages yet.
- **D-13:** Admins enter separate Vietnamese and English slugs for products, categories, and collections. Slugs must be unique within the relevant content type and locale.
- **D-14:** Catalog discovery includes basic text search, filters for market, product type, category, collection, technique, and tag, plus basic sorting. Fuzzy search and a dedicated search engine are out of scope for this phase.
- **D-15:** Collections are manually curated. Admins select products and control display order.

### Admin Catalog Workflow and Media
- **D-16:** Products have `draft`, `published`, and `archived` states.
- **D-17:** Publishing is blocked until required translations, localized slugs, SEO title/description, primary image, valid market offer data, and type-specific required data are present.
- **D-18:** Digital products cannot be published until a private PDF file is uploaded and associated with the product.
- **D-19:** Products have an image gallery. Physical variants can optionally have their own images.

### Product Page and SEO Metadata
- **D-20:** Product pages distinguish PDF patterns from physical finished goods using a visible type badge plus type-specific purchase information.
- **D-21:** PDF pattern product pages should clearly show that the item is a digital PDF pattern and include relevant pattern information such as difficulty, file, and language details when available.
- **D-22:** Physical product pages should clearly show that the item is a finished handmade product and include relevant variant, inventory, and shipping-note information when available.
- **D-23:** Each locale requires SEO title, SEO description, slug, and social image before publish. Canonical URLs and `hreflang` alternates are generated from localized routes.
- **D-24:** If a direct product URL is unavailable for the active market, the page must not show an add-to-cart action. It should show an unavailable message and offer a market switch when the other market sells the product.
- **D-25:** Product pages only allow selection of valid in-stock variants. Out-of-stock variants remain visible but disabled.

### the agent's Discretion
- Exact admin form layout, validation copy, empty states, and standard server/client component boundaries may be chosen during research and planning as long as they honor the decisions above.
- Exact basic sort options may be selected during planning, provided they cover practical catalog browsing without introducing advanced search infrastructure.

### Deferred Ideas (OUT OF SCOPE)
None - discussion stayed within phase scope.
</user_constraints>

## Summary

Phase 2 should extend the Phase 1 modular monolith rather than add new packages or services: keep Next.js App Router pages under explicit `/vi` and `/en`, keep `/admin` server-protected by `requireAdmin()`, and add catalog schema in Supabase migrations with generated types and pgTAP coverage. [VERIFIED: codebase grep] [CITED: https://next-intl.dev/docs/routing/configuration] The core implementation should be a relational catalog model with translations, explicit market offers, offer-level integer money, taxonomy join tables, curated collections, physical variants/inventory, and PDF asset records that point to private Storage objects. [VERIFIED: codebase grep] [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]

Public catalog pages should read an active market from an explicit customer choice cookie/query first and use Vercel `x-vercel-ip-country` only for the initial suggestion; database queries must include market and locale filters so lists show only eligible offers while direct product pages can render an unavailable state. [CITED: https://vercel.com/docs/headers/request-headers] [VERIFIED: codebase grep] Use `generateMetadata` for localized title, description, canonical, alternate language URLs, and social image metadata; Next.js supports dynamic metadata and `alternates.languages` from server components. [CITED: https://nextjs.org/docs/app/api-reference/functions/generate-metadata]

Supabase Storage should be enabled locally in this phase because Phase 1 disabled it in `supabase/config.toml`, and Phase 2 includes PDF upload. [VERIFIED: codebase grep] PDFs must live in a private bucket with Storage RLS policies and admin-only upload paths; Phase 2 should not generate customer download links because signed URLs remain valid until expiry and entitlement-backed download belongs to Phase 5. [CITED: https://supabase.com/docs/guides/storage/buckets/fundamentals] [CITED: https://supabase.com/docs/guides/storage/serving/downloads]

**Primary recommendation:** Implement Phase 2 as focused execution slices for catalog schema/RLS, admin product basics, public image/private PDF media, physical variants/inventory, market resolution, market-aware queries, public listing/search, public detail/SEO, adversarial verification, and the final CI/security gate. [VERIFIED: codebase grep]

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MKT-02 | Customer sees VND prices in the Vietnam market and USD prices in the international market. | Store offers with `market_code`, `currency_code`, and integer `price_minor`; format with `Intl.NumberFormat('vi-VN', 'VND')` and `Intl.NumberFormat('en-US', 'USD')`. [VERIFIED: codebase grep] [ASSUMED] |
| MKT-03 | Admin can make each product available in Vietnam, internationally, or in both markets. | Use one product row plus zero or more validated market offer rows; listings require an active published offer for the active market. [VERIFIED: codebase grep] |
| MKT-04 | Admin can assign independent Vietnam and international prices to a product or variant. | Parent offers define default price; physical variant offers override only when needed, preserving D-09. [VERIFIED: codebase grep] |
| MKT-05 | Store suggests a market from the customer's IP country and shows the active market to the customer. | Read Vercel `x-vercel-ip-country` for first suggestion, then persist explicit customer choice. [CITED: https://vercel.com/docs/headers/request-headers] |
| CAT-01 | Admin can create digital PDF products and physical handmade products. | Model `product_type in ('pdf_pattern','physical_finished')` and type-specific validation gates before publish. [VERIFIED: codebase grep] |
| CAT-02 | Admin can create physical variants with independent attributes, prices, SKUs, and inventory. | Use explicit `product_variants`, `variant_attribute_values`, `variant_market_offers`, and inventory at variant level when variants exist. [VERIFIED: codebase grep] |
| CAT-03 | Admin can manage localized product titles, descriptions, specifications, and SEO content. | Use `product_translations` keyed by `(product_id, locale)` with slug/title/body/spec/SEO fields. [VERIFIED: codebase grep] |
| CAT-04 | Admin can organize products by type, category, technique, tags, and collections independently. | Use independent taxonomy tables and join tables; do not overload category as the only discovery dimension. [VERIFIED: codebase grep] |
| CAT-05 | Customer can browse product, category, technique, tag, and collection pages. | Category and collection get localized indexable routes; technique/tag remain filters only in this phase. [VERIFIED: codebase grep] |
| CAT-06 | Customer can search, filter, and sort eligible products. | MVP query helpers should combine market eligibility, localized text `ilike`, filters, and basic order clauses; no search engine. [VERIFIED: codebase grep] |
| CAT-07 | Customer can clearly distinguish a PDF pattern from a physical finished product throughout browsing and checkout. | Product cards and detail pages need type badge and type-specific facts before cart exists. [VERIFIED: codebase grep] |
| CAT-08 | Customer can view valid variant combinations and current availability before adding a physical product to cart. | Render valid explicit variants, disable out-of-stock variants, and hide add-to-cart until Phase 3. [VERIFIED: codebase grep] |
| INV-01 | Admin can set and adjust inventory for each physical product or variant. | Use product-level inventory only for non-variant physical products and variant-level inventory for products with variants. [VERIFIED: codebase grep] |
| DIG-01 | Admin can upload a PDF pattern to private storage and associate it with a digital product. | Enable Supabase Storage and private bucket RLS; record bucket/path/checksum/metadata on digital product asset row. [CITED: https://supabase.com/docs/guides/storage/security/access-control] |
| SEO-01 | Admin can manage localized slugs, titles, descriptions, canonical URLs, and social sharing images. | Use translation tables plus `generateMetadata` for canonical, alternates, and OpenGraph images. [CITED: https://nextjs.org/docs/app/api-reference/functions/generate-metadata] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- The storefront must support Vietnam and international markets with different availability, pricing, payment, and shipping behavior. [VERIFIED: codebase grep]
- Customer-facing storefront, taxonomy, products, and blog content must support Vietnamese and English. [VERIFIED: codebase grep]
- Vietnam pricing is VND and international pricing is USD. [VERIFIED: codebase grep]
- Digital fulfillment must never occur until full order payment is confirmed; Phase 2 may associate private PDFs but must not grant customer access. [VERIFIED: codebase grep]
- Purchased PDFs must be delivered through expiring, access-controlled links; Phase 2 must not create public PDF URLs. [VERIFIED: codebase grep] [CITED: https://supabase.com/docs/guides/storage/buckets/fundamentals]
- Guest checkout, cart, payment, fulfillment, reviews, newsletter, blog publishing, and launch policy workflows are later phases unless explicitly listed in Phase 2. [VERIFIED: codebase grep]
- Physical inventory and variant inventory are admin-managed. [VERIFIED: codebase grep]
- Public product, category, collection, and blog pages must be indexable and support localized metadata; Phase 2 owns product/category/collection metadata only. [VERIFIED: codebase grep]
- Use the locked stack: Next.js App Router, React, TypeScript, Supabase Postgres/Auth/Storage, next-intl, Tailwind CSS, local shadcn-style primitives, Zod, Vitest, Playwright, and Supabase CLI. [VERIFIED: codebase grep]
- Do not introduce microservices, public PDF storage URLs, floating-point money, automatic exchange-rate pricing, or user-editable metadata for admin authorization. [VERIFIED: codebase grep]
- GSD workflow allows this research artifact; do not edit application code during this research task. [VERIFIED: codebase grep]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Catalog schema, offer validity, translations, taxonomy, variants, inventory | Database / Storage | API / Backend | Relational constraints and RLS must enforce market, admin, and inventory invariants before UI consumes them. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |
| Admin product publishing workflow | Frontend Server (SSR) | Database / Storage | Admin pages and server actions must call `requireAdmin()` before rendering/mutating and rely on RLS/grants underneath. [VERIFIED: codebase grep] |
| Market suggestion and active market switch | Frontend Server (SSR Proxy/Page) | Browser / Client | Vercel request headers can suggest country; customer choice must be visible and persisted by app UI. [CITED: https://vercel.com/docs/headers/request-headers] |
| Market-aware listing/search/filter/sort | Frontend Server (SSR) | Database / Storage | Server queries must include active market and locale so one market's offer is not rendered in another market. [ASSUMED] |
| Localized product/category/collection pages | Frontend Server (App Router) | CDN / Static | App Router pages render localized content and metadata; category/collection can use controlled revalidation only if cache keys include locale/market. [CITED: https://nextjs.org/docs/app/guides/caching-without-cache-components] |
| Private PDF upload and association | Database / Storage | Frontend Server | Storage bucket policy controls object writes; catalog DB links products to private object metadata. [CITED: https://supabase.com/docs/guides/storage/security/access-control] |
| SEO metadata | Frontend Server (App Router) | Database / Storage | `generateMetadata` runs on the server and can build canonical, alternate, and social metadata from localized DB rows. [CITED: https://nextjs.org/docs/app/api-reference/functions/generate-metadata] |

## Standard Stack

### Core

| Library / Platform | Version | Purpose | Why Standard |
|--------------------|---------|---------|--------------|
| `next` | Installed 16.2.9; npm latest 16.2.9 checked 2026-06-12 | App Router pages, server actions, metadata, rendering/cache controls | Already installed and locked by Phase 1; `generateMetadata` supports dynamic route metadata and alternates. [VERIFIED: codebase grep] [VERIFIED: npm registry] [CITED: https://nextjs.org/docs/app/api-reference/functions/generate-metadata] |
| `next-intl` | Installed 4.13.0; npm latest 4.13.0 checked 2026-06-12 | `/vi` and `/en` route map, localized pathnames, typed links | Existing Phase 1 routing uses `defineRouting`, `localePrefix: 'always'`, and `pathnames`; docs support localized dynamic slugs. [VERIFIED: codebase grep] [CITED: https://next-intl.dev/docs/routing/configuration] |
| `@supabase/supabase-js` / `@supabase/ssr` | Installed 2.108.1 / 0.12.0; npm latest checked 2026-06-12 | RLS-bound database access and Storage operations through SSR clients | Existing server/browser clients are typed and session-bound; keep them rather than adding an ORM. [VERIFIED: codebase grep] |
| Supabase Postgres | Local Postgres major 17 in config | Catalog, offers, translations, taxonomy, inventory, admin roles | RLS and relational constraints fit market/catalog correctness and continue Phase 1 database-owned admin authorization. [VERIFIED: codebase grep] [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |
| Supabase Storage | Disabled locally in Phase 1 config; must be enabled for Phase 2 | Product images and private PDF files | Private buckets and Storage RLS are required for DIG-01; public PDF URLs are prohibited. [VERIFIED: codebase grep] [CITED: https://supabase.com/docs/guides/storage/buckets/fundamentals] |

### Supporting

| Library / Tool | Version | Purpose | When to Use |
|----------------|---------|---------|-------------|
| `zod` | Installed 4.4.3; npm latest 4.4.3 checked 2026-06-12 | Admin/server action validation | Validate product publish gate, offers, variant forms, filters, and market cookie/query values. [VERIFIED: codebase grep] [VERIFIED: npm registry] |
| Tailwind CSS + local UI primitives | Installed Tailwind 4.3.0; local components in `src/components/ui` | Catalog/admin UI styling | Reuse `Button`, `Card`, `Alert`, `Sheet`, `Skeleton`, and `Separator`; do not add UI packages. [VERIFIED: codebase grep] |
| `vitest` | Installed 4.1.8 | Unit tests | Test money formatting, market resolution, route helpers, query builders, and publish validators. [VERIFIED: codebase grep] |
| `@playwright/test` | Installed 1.60.0 | Browser tests | Test admin publishing, market switching, localized catalog browsing, product detail unavailable state, and variant disabling. [VERIFIED: codebase grep] |
| Supabase CLI + pgTAP | CLI installed 2.53.6; CLI reports 2.106.0 available | Local migrations, db reset/lint/test/types | Continue sequential `db:reset`, `db:lint`, `db:test`, `db:types`; note CLI version drift before Storage work. [VERIFIED: environment probe] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase/Postgres `ilike` and indexed filters | Dedicated search engine or fuzzy search | Dedicated search adds infrastructure and is explicitly out of scope for D-14. [VERIFIED: codebase grep] |
| Relational market offer rows | JSON price blobs on products | JSON blobs weaken constraints for currency/market uniqueness and make checkout snapshots harder later. [ASSUMED] |
| App Router server components and server actions | Separate backend API service | A separate service contradicts the locked modular monolith and adds deployment cost before v1 needs it. [VERIFIED: codebase grep] |
| Private bucket plus DB PDF asset rows | Public PDF URL or email attachment | Public URLs bypass purchase authorization; private buckets require RLS and no public URL. [VERIFIED: codebase grep] [CITED: https://supabase.com/docs/guides/storage/buckets/fundamentals] |

**Installation:**

```bash
# No new packages recommended for Phase 2.
npm install
```

**Version verification:** Existing package versions were read from `package.json`, current npm versions were checked with `npm view`, and no `scripts.postinstall` values were returned for the checked packages. [VERIFIED: codebase grep] [VERIFIED: npm registry]

## Package Legitimacy Audit

| Package | Registry | Age / Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----------------|-------------|---------|-------------|
| `next` | npm | 30,998,510/wk | github.com/vercel/next.js | SUS: too-new | Already installed from Phase 1; no new install. [VERIFIED: npm registry] |
| `next-intl` | npm | 3,166,598/wk | github.com/amannn/next-intl | SUS: too-new | Already installed from Phase 1; no new install. [VERIFIED: npm registry] |
| `@supabase/supabase-js` | npm | 17,191,124/wk | github.com/supabase/supabase-js | SUS: too-new | Already installed from Phase 1; no new install. [VERIFIED: npm registry] |
| `@supabase/ssr` | npm | 3,585,614/wk | github.com/supabase/ssr | SUS: too-new | Already installed from Phase 1; no new install. [VERIFIED: npm registry] |
| `zod` | npm | 161,202,261/wk | github.com/colinhacks/zod | OK | Approved existing dependency. [VERIFIED: npm registry] |
| `vitest` | npm | 56,565,939/wk | github.com/vitest-dev/vitest | SUS: too-new | Already installed from Phase 1; no new install. [VERIFIED: npm registry] |
| `@playwright/test` | npm | 39,825,868/wk | github.com/microsoft/playwright | OK | Approved existing dev dependency. [VERIFIED: npm registry] |
| `lucide-react` | npm | 83,075,971/wk | github.com/lucide-icons/lucide | SUS: too-new | Already installed from Phase 1; no new install. [VERIFIED: npm registry] |

**Packages removed due to [SLOP] verdict:** none. [VERIFIED: npm registry]
**Packages flagged as suspicious [SUS]:** existing dependencies only: `next`, `next-intl`, `@supabase/supabase-js`, `@supabase/ssr`, `vitest`, `lucide-react`. Planner does not need a new install checkpoint unless it adds packages beyond this research. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
Browser request
  |
  v
src/proxy.ts
  |-- locale prefix stays explicit: /vi or /en
  |-- first market suggestion: x-vercel-ip-country -> VN ? vietnam : international
  `-- active market cookie/query wins after user switch
        |
        v
App Router Server Components
  |-- /[locale]/catalog, category, collection, product detail
  |-- generateMetadata(locale, slug)
  `-- /admin catalog screens -> requireAdmin()
        |
        v
Catalog server actions / query helpers
  |-- validate with Zod
  |-- include locale + market in every public query
  |-- no cart/payment/entitlement side effects
  `-- session-bound Supabase client
        |
        v
Supabase Postgres + Storage
  |-- products, translations, taxonomy, offers
  |-- variants, inventory, PDF asset metadata
  |-- storage.objects policies for private PDFs
  `-- RLS denies unauthorized admin/customer access
```

### Recommended Project Structure

```text
src/
├── app/
│   ├── [locale]/
│   │   ├── catalog/
│   │   ├── category/[categorySlug]/
│   │   ├── collection/[collectionSlug]/
│   │   └── product/[productSlug]/
│   └── admin/catalog/
├── catalog/
│   ├── actions.ts
│   ├── queries.ts
│   ├── schemas.ts
│   ├── market.ts
│   ├── money.ts
│   └── publish-checks.ts
├── components/catalog/
└── components/admin/catalog/
supabase/
├── migrations/<timestamp>_market_catalog.sql
└── tests/database/02_catalog_rls.test.sql
```

This structure keeps domain code outside route folders while matching existing `src/auth/*`, `src/i18n/*`, and `src/lib/supabase/*` patterns. [VERIFIED: codebase grep]

### Pattern 1: Market Offer Rows

**What:** Store market availability and price as rows keyed by product or variant, market, and currency. [ASSUMED]
**When to use:** Use for every purchasable catalog surface so Phase 3 checkout can snapshot authoritative offer rows later. [VERIFIED: codebase grep]
**Example:**

```sql
-- Source: project decisions + Supabase RLS docs
create table public.product_market_offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  market_code text not null check (market_code in ('vn', 'intl')),
  currency_code text not null check (
    (market_code = 'vn' and currency_code = 'VND')
    or (market_code = 'intl' and currency_code = 'USD')
  ),
  price_minor bigint not null check (price_minor >= 0),
  is_enabled boolean not null default false,
  unique (product_id, market_code)
);

alter table public.product_market_offers enable row level security;
```

### Pattern 2: Publish Gate Function

**What:** Use one server-side validator and matching database constraints for required translations, slugs, SEO, image, offer data, PDF asset, and physical inventory. [ASSUMED]
**When to use:** Use before changing `products.status` to `published`; do not duplicate publish rules separately in UI. [ASSUMED]
**Example:**

```typescript
// Source: project Phase 1 server-action/Zod pattern
export async function publishProductAction(productId: string) {
  await requireAdmin();
  const result = await validateProductPublishability(productId);
  if (!result.ok) {
    return {status: 'blocked' as const, issues: result.issues};
  }
  // Update status through the session-bound Supabase server client.
}
```

### Pattern 3: Localized Metadata From Translation Rows

**What:** Build page metadata from the locale-specific translation row and route map. [CITED: https://nextjs.org/docs/app/api-reference/functions/generate-metadata]
**When to use:** Product, category, and collection detail pages. [VERIFIED: codebase grep]
**Example:**

```typescript
// Source: Next.js generateMetadata docs
export async function generateMetadata({params}: {params: Promise<{locale: Locale; productSlug: string}>}) {
  const {locale, productSlug} = await params;
  const product = await getProductSeoBySlug({locale, slug: productSlug});
  return {
    title: product.seoTitle,
    description: product.seoDescription,
    alternates: {
      canonical: product.canonicalUrl,
      languages: product.alternateUrls
    },
    openGraph: {
      images: [product.socialImageUrl]
    }
  };
}
```

### Anti-Patterns to Avoid

- **Market in UI only:** Filtering by market after fetching all products can leak unavailable prices and fails D-02. [VERIFIED: codebase grep]
- **Floating-point price fields:** Money must be integer minor units with currency code; float arithmetic can corrupt VND/USD totals. [VERIFIED: codebase grep]
- **Public PDF bucket:** Public buckets allow anyone with the URL to access files; PDFs must be private. [CITED: https://supabase.com/docs/guides/storage/buckets/fundamentals]
- **Variant generation magic:** D-08 requires explicit variants; do not infer hidden combinations at purchase time. [VERIFIED: codebase grep]
- **Checkout creep:** Add-to-cart, reservation, payment, entitlement, download email, and shipping quote logic belong to later phases. [VERIFIED: codebase grep]

## MVP Sequencing Guidance

| Roadmap Plan | Research Guidance |
|--------------|-------------------|
| 02-01 Catalog schema | Create tables, constraints, RLS, pgTAP, and generated types first. [VERIFIED: codebase grep] |
| 02-02 Admin product basics | Build protected bilingual draft/edit/publish-blocker workflows; use `requireAdmin()` at every server action. [VERIFIED: codebase grep] |
| 02-03 Media and private PDF | Probe local Storage with the installed CLI, then add public product media, private PDFs, metadata, RLS, and admin upload/association. [VERIFIED: codebase grep] |
| 02-04 Variants and inventory | Add explicit physical variants, parent-price fallback, optional overrides, and inventory-at-one-level editing. [VERIFIED: codebase grep] |
| 02-05 Market resolution | Add country suggestion, visible switcher, cookie persistence, and integer money formatting. [CITED: https://vercel.com/docs/headers/request-headers] |
| 02-06 Market-aware queries | Add database projections/RPCs and typed helpers with locale+market isolation before public pages consume prices. [VERIFIED: codebase grep] |
| 02-07 Public listing/search | Add localized listing, category, collection, search/filter/sort, and type-distinguishing cards. [VERIFIED: codebase grep] |
| 02-08 Public detail/SEO and phase gate | Add product detail, unavailable-market state, variant selection, canonical URLs, alternates, social metadata, static fulfillment-boundary checks, and the full CI gate from a clean local state. Earlier plans own their focused pgTAP, unit, and Playwright coverage; 02-08 Task 3 owns the integrated security/CI sign-off. [VERIFIED: codebase grep] |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Locale routing and translated static pathnames | Custom router map | Existing `next-intl` routing helpers | Current project already uses typed pathnames and locale helpers. [VERIFIED: codebase grep] |
| Admin authorization | Client-side role checks | `requireAdmin()` plus RLS | Phase 1 established database-owned admin roles. [VERIFIED: codebase grep] |
| Money math | Floating number helpers | Integer minor units + currency code | Project constraints explicitly forbid floating-point money. [VERIFIED: codebase grep] |
| PDF access | Custom tokenized public URLs | Supabase private bucket + Storage RLS | Private buckets route operations through RLS or signed URLs. [CITED: https://supabase.com/docs/guides/storage/security/access-control] |
| Search engine | Fuzzy/custom search service | Postgres-backed basic `ilike` and filters | D-14 excludes fuzzy search and dedicated search infrastructure. [VERIFIED: codebase grep] |

**Key insight:** Catalog correctness is a data-contract problem first; UI polish cannot compensate for weak market, currency, publish, RLS, or Storage constraints. [ASSUMED]

## Common Pitfalls

### Pitfall 1: Market Cache Leakage
**What goes wrong:** A cached listing or product response shows VND/Vietnam availability to an international customer or USD/international availability to a Vietnam customer. [ASSUMED]
**Why it happens:** Locale and market are different dimensions, and Next.js can cache data unless request-time values or no-store behavior are used deliberately. [CITED: https://nextjs.org/docs/app/guides/caching-without-cache-components]
**How to avoid:** Include `locale` and `market` in every catalog query/cache key, or mark market-cookie-dependent pages dynamic. [ASSUMED]
**Warning signs:** Playwright sees unchanged prices after switching market, or network responses have shared cache headers for market-cookie pages. [ASSUMED]

### Pitfall 2: Publishing Without Complete Localized Data
**What goes wrong:** Product pages index with missing slugs, generic titles, absent social image, or untranslated SEO text. [VERIFIED: codebase grep]
**Why it happens:** Admin form saves drafts and publish state using the same validation. [ASSUMED]
**How to avoid:** Separate draft save from publish gate and require both `vi` and `en` translations before `published`. [VERIFIED: codebase grep]
**Warning signs:** Published products with `null` SEO fields or missing translation rows. [ASSUMED]

### Pitfall 3: Storage Enabled Too Late
**What goes wrong:** DIG-01 cannot be tested because Phase 1 local Storage is disabled. [VERIFIED: codebase grep]
**Why it happens:** Phase 1 disabled Storage to avoid Windows local reset issues while Storage was out of scope. [VERIFIED: codebase grep]
**How to avoid:** Plan an early Storage configuration task and verify `supabase db reset`, upload, RLS, and type generation after enabling it. [ASSUMED]
**Warning signs:** Upload tests fail with missing Storage endpoint or bucket errors. [CITED: https://supabase.com/docs/guides/storage/debugging/error-codes]

### Pitfall 4: Signed URL Scope Creep
**What goes wrong:** Phase 2 starts generating customer PDF download links before payment/entitlement exists. [VERIFIED: codebase grep]
**Why it happens:** Upload success is confused with purchase access. [ASSUMED]
**How to avoid:** Phase 2 may create/upload/admin-preview metadata only; paid download links wait for Phase 5. [VERIFIED: codebase grep]
**Warning signs:** Public route handler named download, entitlement table, or email link logic appears in Phase 2. [VERIFIED: codebase grep]

## Code Examples

### Market Resolver

```typescript
// Source: Vercel request header docs + Phase 2 D-04
export type MarketCode = 'vn' | 'intl';

export function suggestMarketFromCountry(country: string | null): MarketCode {
  return country?.toUpperCase() === 'VN' ? 'vn' : 'intl';
}

export function formatMoney(priceMinor: number, currencyCode: 'VND' | 'USD') {
  const locale = currencyCode === 'VND' ? 'vi-VN' : 'en-US';
  return new Intl.NumberFormat(locale, {style: 'currency', currency: currencyCode}).format(priceMinor);
}
```

### Market-Aware Listing Query

```typescript
// Source: Supabase JS existing project pattern
export async function listCatalogProducts({locale, market}: {locale: Locale; market: MarketCode}) {
  const supabase = await createSupabaseServerClient();
  return supabase
    .from('catalog_product_cards')
    .select('*')
    .eq('locale', locale)
    .eq('market_code', market)
    .eq('status', 'published')
    .order('published_at', {ascending: false});
}
```

### Private PDF Upload

```typescript
// Source: Supabase Storage upload docs
export async function uploadPatternPdf(productId: string, file: File) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const path = `patterns/${productId}/${crypto.randomUUID()}.pdf`;
  const {data, error} = await supabase.storage.from('pattern-pdfs').upload(path, file, {
    contentType: 'application/pdf',
    upsert: false
  });
  if (error) return {status: 'error' as const};
  return {status: 'uploaded' as const, path: data.path};
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Next.js `middleware.ts` naming | Project uses `src/proxy.ts` composed with next-intl and Supabase refresh | Phase 1 | Extend proxy carefully for market suggestion without dropping auth cookies. [VERIFIED: codebase grep] |
| Public file URLs for protected downloads | Private Storage bucket plus entitlement-checked signed URL later | Project stack | Phase 2 stores private PDF assets but does not issue customer links. [VERIFIED: codebase grep] [CITED: https://supabase.com/docs/guides/storage/serving/downloads] |
| Single product price | Explicit market offer rows | Phase 2 locked decision | Each market controls availability and price independently. [VERIFIED: codebase grep] |

**Deprecated/outdated:**
- `unstable_noStore` should not be introduced as the first choice; Next.js docs call it legacy and recommend newer dynamic/caching patterns. [CITED: https://nextjs.org/docs/app/api-reference/functions/unstable_noStore]
- Supabase legacy Auth Helpers should not be introduced; the project already uses `@supabase/ssr`. [VERIFIED: codebase grep]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Product/gallery/variant/social images use public read access with database-owned metadata and admin-only writes; PDFs remain private. | Open Questions (RESOLVED) | A private social image would not render in link previews. |
| A2 | Basic `ilike` search is adequate for MVP catalog size. | Standard Stack / Requirements | Large catalogs may need Postgres full-text indexes earlier. |
| A3 | Variant/offer schema should use separate parent and override tables rather than nullable polymorphic columns. | Architecture Patterns | Planner may need a simpler schema if implementation time is constrained. |
| A4 | Market-cookie-dependent public pages should be dynamic unless cache keys explicitly include market. | Pitfalls | Overly dynamic rendering may reduce cache efficiency. |
| A5 | Product-level inventory for non-variant physical products can be stored in the same inventory table with nullable variant_id and a constraint. | Architecture Patterns | A stricter separate table may be easier to test. |

## Open Questions (RESOLVED)

1. **Product image bucket visibility - RESOLVED**
   - Decision: Product, gallery, variant, and social-sharing images use a public `product-media` bucket so indexable pages and link previews can load them.
   - Ownership and writes: Database rows own image metadata and associations; only server-authorized admin workflows may create, update, or delete media records or Storage objects. Public access is read-only.
   - PDF boundary: Pattern files use the private `pattern-pdfs` bucket only. No PDF object path becomes a public URL, and Phase 2 creates no customer download route or signed fulfillment URL.

2. **Supabase CLI upgrade timing - RESOLVED**
   - Decision: Do not upgrade Supabase CLI during Phase 2 by default.
   - Execution rule: First enable local Storage and run a focused reset/upload/RLS probe with the installed CLI. Upgrade is permitted only if that probe fails after configuration and policy errors are ruled out, and the failure evidence indicates CLI incompatibility.
   - Verification rule: Database and Storage commands remain sequential on Windows.

3. **Exact public route names for catalog - RESOLVED**
   - Decision: Route names follow the existing `next-intl` locale routing and translated-pathname patterns established in Phase 1.
   - Ownership: The public catalog listing plan owns the final static route labels and adds them to `src/i18n/routing.ts`; product, category, and collection pages consume that route contract rather than inventing independent paths.
   - Constraint: Separate Vietnamese and English content slugs remain database-owned and unique per locale per D-13.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Next.js build/test | Yes | v24.16.0 | Project `.nvmrc`/CI can still pin Node 22 from Phase 1. [VERIFIED: environment probe] |
| npm | Package scripts | Yes | 10.5.0 | None needed. [VERIFIED: environment probe] |
| Supabase CLI | Migrations, db reset/lint/test/types, local Storage | Yes, but version drift | 2.53.6; CLI reports 2.106.0 available | Keep the installed CLI unless the focused local Storage probe fails for a confirmed CLI compatibility reason. [VERIFIED: environment probe] |
| Docker | Local Supabase | Yes | 24.0.7 | Hosted Supabase only would weaken pgTAP reproducibility. [VERIFIED: environment probe] |
| Local Supabase Storage | DIG-01 private PDF upload | No, disabled in config | `[storage].enabled = false` | Enable and test in Plan 02-01/02-02 before PDF upload UI. [VERIFIED: codebase grep] |
| Vercel country header | MKT-05 deployed market suggestion | Available only on Vercel deployment | `x-vercel-ip-country` | Local/dev tests can inject headers or use a test-only country override. [CITED: https://vercel.com/docs/headers/request-headers] |

**Missing dependencies with no fallback:**
- Local Storage enablement is required for automated DIG-01 verification. [VERIFIED: codebase grep]

**Missing dependencies with fallback:**
- Deployed Vercel geolocation is not available locally; Playwright can simulate by setting request headers or using a test route/helper. [ASSUMED]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.8, Playwright 1.60.0, pgTAP via Supabase CLI. [VERIFIED: codebase grep] |
| Config file | `vitest.config.ts`, `playwright.config.ts`, `supabase/config.toml`. [VERIFIED: codebase grep] |
| Quick run command | `npm run test:unit && npm run db:test`. [VERIFIED: codebase grep] |
| Full suite command | `npm run ci`. [VERIFIED: codebase grep] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MKT-02-MKT-05 | Active market suggestion/switch and VND/USD eligible offers | unit + E2E | `npm run test:unit -- tests/unit/catalog && npm run test:e2e -- tests/e2e/catalog-market.spec.ts` | No, Wave 0. [VERIFIED: codebase grep] |
| CAT-01-CAT-04, INV-01, DIG-01, SEO-01 | Admin creates draft/published product, translations, taxonomy, offers, variants/inventory, private PDF, SEO | pgTAP + E2E | `npm run db:test && npm run test:e2e -- tests/e2e/admin-catalog.spec.ts` | No, Wave 0. [VERIFIED: codebase grep] |
| CAT-05-CAT-08 | Public browsing, search/filter/sort, product type distinction, valid variant display | unit + E2E | `npm run test:e2e -- tests/e2e/catalog-discovery.spec.ts` | No, Wave 0. [VERIFIED: codebase grep] |
| SEO-01 | Localized metadata, canonical, alternates, social image | unit + E2E/source assertions | `npm run test:unit -- tests/unit/catalog/metadata.test.ts && npm run test:e2e -- tests/e2e/catalog-seo.spec.ts` | No, Wave 0. [VERIFIED: codebase grep] |

### Sampling Rate

- **Per task commit:** targeted Vitest or pgTAP for touched catalog rule, plus `npm run typecheck` for generated types. [VERIFIED: codebase grep]
- **Per wave merge:** `npm run lint && npm run typecheck && npm run test:unit && npm run db:reset && npm run db:lint && npm run db:test && npm run db:types && npm run build`. [VERIFIED: codebase grep]
- **Phase gate:** `npm run ci` plus manual visual review of admin catalog and public catalog in Vietnamese/English at mobile and desktop. [VERIFIED: codebase grep]

### Wave 0 Gaps

- [ ] `supabase/migrations/<timestamp>_market_catalog.sql` - schema, constraints, RLS, private bucket setup. [VERIFIED: codebase grep]
- [ ] `supabase/tests/database/02_catalog_rls.test.sql` - anon/customer/admin market/catalog/storage matrix. [VERIFIED: codebase grep]
- [ ] `tests/unit/catalog/*.test.ts` - market resolver, money formatting, publish gate, query helper rules. [VERIFIED: codebase grep]
- [ ] `tests/e2e/admin-catalog.spec.ts`, `catalog-market.spec.ts`, `catalog-discovery.spec.ts`, `catalog-seo.spec.ts` - browser coverage. [VERIFIED: codebase grep]
- [ ] Storage local config enabled and verified, because Phase 1 left `[storage].enabled = false`. [VERIFIED: codebase grep]

## Security Domain

Security enforcement is enabled in `.planning/config.json`; ASVS 5.0.0 is the current stable ASVS version according to OWASP. [VERIFIED: codebase grep] [CITED: https://owasp.org/www-project-application-security-verification-standard/]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V1 Encoding and Sanitization | Yes | Validate slugs, search text, uploaded file metadata, and rendered structured data; never render raw admin HTML. [CITED: https://owasp.org/www-project-application-security-verification-standard/] |
| V2 Validation and Business Logic | Yes | Zod plus DB constraints for product type, market/currency, publish gate, variant/inventory validity. [VERIFIED: codebase grep] |
| V3 Web Frontend Security | Yes | Server-render market/catalog data and keep admin mutations in server actions; no secret values in client bundles. [VERIFIED: codebase grep] |
| V6 Authentication | Limited | Reuse Phase 1 Supabase Auth; no new auth mechanism. [VERIFIED: codebase grep] |
| V7 Session Management | Limited | Admin catalog pages remain dynamic and protected by Phase 1 SSR cookie/claims pattern. [VERIFIED: codebase grep] |
| V8 Authorization | Yes | `requireAdmin()` plus RLS on catalog/admin-write tables and Storage objects. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |
| V12 File Handling | Yes | Restrict PDF MIME/size/path, private bucket access, and no public PDF URL. [CITED: https://supabase.com/docs/guides/storage/security/access-control] |
| V14 Data Protection | Yes | Private PDFs, least-privilege Storage policies, no cross-market price leakage, no customer download before entitlement. [VERIFIED: codebase grep] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Customer sees wrong market price | Information Disclosure / Tampering | Include active market in DB predicates and tests; never filter only in client UI. [ASSUMED] |
| Non-admin calls catalog mutation | Elevation of Privilege | `requireAdmin()` before mutation plus RLS/grants. [VERIFIED: codebase grep] |
| PDF object becomes public | Information Disclosure | Private bucket, Storage RLS, no `getPublicUrl()` for PDFs. [CITED: https://supabase.com/docs/guides/storage/buckets/fundamentals] |
| Published product lacks required translation/SEO/PDF | Tampering / Business Logic | Single publish gate with database-backed checks. [VERIFIED: codebase grep] |
| Variant unavailable but selectable | Tampering / Business Logic | Query only valid variants, disable out-of-stock variants, block add-to-cart until Phase 3. [VERIFIED: codebase grep] |
| Unsafe file upload path or MIME | Tampering / Information Disclosure | Server-generated object paths, PDF content type checks, bucket restrictions. [CITED: https://supabase.com/docs/reference/javascript/storage-from-upload] |

## Sources

### Primary (HIGH confidence)

- Codebase and planning artifacts: `AGENTS.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/phases/02-market-aware-catalog/02-CONTEXT.md`, all Phase 1 PLAN/SUMMARY/VALIDATION artifacts, `package.json`, `src/i18n/routing.ts`, `src/auth/guards.ts`, `src/lib/supabase/server.ts`, `supabase/config.toml`, foundation migration/tests. [VERIFIED: codebase grep]
- GSD seams: `init.phase-op`, `research-plan`, `research-store put`, `classify-confidence`, `package-legitimacy check`. [VERIFIED: gsd-tools]

### Secondary (MEDIUM confidence)

- https://nextjs.org/docs/app/api-reference/functions/generate-metadata - dynamic metadata, server component constraint, alternates. [CITED: https://nextjs.org/docs/app/api-reference/functions/generate-metadata]
- https://next-intl.dev/docs/routing/configuration - `localePrefix`, `pathnames`, localized dynamic slugs. [CITED: https://next-intl.dev/docs/routing/configuration]
- https://next-intl.dev/docs/routing/navigation - typed navigation with pathnames. [CITED: https://next-intl.dev/docs/routing/navigation]
- https://supabase.com/docs/guides/storage/buckets/fundamentals - private bucket access model. [CITED: https://supabase.com/docs/guides/storage/buckets/fundamentals]
- https://supabase.com/docs/guides/storage/security/access-control - Storage RLS policies. [CITED: https://supabase.com/docs/guides/storage/security/access-control]
- https://supabase.com/docs/guides/storage/serving/downloads - private asset serving and signed URL behavior. [CITED: https://supabase.com/docs/guides/storage/serving/downloads]
- https://supabase.com/docs/guides/database/postgres/row-level-security - RLS behavior. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]
- https://nextjs.org/docs/app/guides/caching-without-cache-components - dynamic rendering and cache behavior. [CITED: https://nextjs.org/docs/app/guides/caching-without-cache-components]
- https://vercel.com/docs/headers/request-headers - `x-vercel-ip-country`. [CITED: https://vercel.com/docs/headers/request-headers]
- https://owasp.org/www-project-application-security-verification-standard/ - ASVS 5.0.0 current stable and security verification purpose. [CITED: https://owasp.org/www-project-application-security-verification-standard/]

### Tertiary (LOW confidence)

- Assumptions in the Assumptions Log, mainly schema ergonomics, cache strategy details, image bucket visibility, and MVP search adequacy. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new packages; versions and installed files verified locally, npm versions checked, and package legitimacy seam audited existing packages. [VERIFIED: codebase grep] [VERIFIED: npm registry]
- Architecture: MEDIUM - strong alignment with locked decisions and Phase 1 patterns, but exact schema shape remains planner/implementation work. [VERIFIED: codebase grep] [ASSUMED]
- Pitfalls: MEDIUM - security/storage/cache risks are documented by official sources, while exact cache behavior needs implementation tests. [CITED: https://nextjs.org/docs/app/guides/caching-without-cache-components] [ASSUMED]
- Validation: HIGH - existing project scripts and Phase 1 CI pattern provide a concrete verification path. [VERIFIED: codebase grep]

**Research date:** 2026-06-12
**Valid until:** 2026-06-19 for framework/Storage/cache details; schema and project-decision guidance remains valid until Phase 2 context changes. [ASSUMED]
