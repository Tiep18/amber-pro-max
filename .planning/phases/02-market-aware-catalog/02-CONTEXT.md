# Phase 2: Market-Aware Catalog - Context

**Gathered:** 2026-06-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a market-aware bilingual catalog where admins can publish digital PDF
patterns and physical handmade products with localized product content,
taxonomy, market-specific offers, prices, media, PDFs, physical variants, and
inventory. Customers can browse, search, filter, sort, and open localized
catalog and product pages that show only eligible listings for the active
market, while direct product URLs still explain unavailable products.

Cart, checkout, shipping destination validation, discounts, market exception
requests, payment, fulfillment, customer retention, reviews, newsletter, blog,
and full launch SEO infrastructure belong to later phases.

</domain>

<decisions>
## Implementation Decisions

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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Scope and Requirements
- `.planning/PROJECT.md` - Defines the store vision, market/language/currency constraints, mixed digital and physical commerce constraints, and key project decisions.
- `.planning/REQUIREMENTS.md` - Phase 2 requirements are MKT-02, MKT-03, MKT-04, MKT-05, CAT-01, CAT-02, CAT-03, CAT-04, CAT-05, CAT-06, CAT-07, CAT-08, INV-01, DIG-01, and SEO-01.
- `.planning/ROADMAP.md` - Defines the Phase 2 goal, success criteria, dependencies, and planned work slices.

### Prior Phase Decisions
- `.planning/phases/01-secure-bilingual-foundation/01-CONTEXT.md` - Locks explicit `/vi` and `/en` locale prefixes, translated public slugs, route-preserving language switching, and server-enforced admin authorization.

### Technology Guidance
- `.planning/research/STACK.md` - Defines the Next.js, next-intl, Supabase Postgres/Auth/Storage, TypeScript, Tailwind, shadcn/ui, Zod, Vitest, Playwright, and Vercel baseline.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/i18n/routing.ts`: Defines explicit `vi` and `en` locale routing, translated pathnames, and equivalent localized path helpers. Catalog routes should extend this pattern.
- `src/components/site-header.tsx` and `src/components/site-footer.tsx`: Existing public shell integration points for adding catalog navigation and market controls.
- `src/components/ui/card.tsx`, `button.tsx`, `alert.tsx`, `sheet.tsx`, `separator.tsx`, and `skeleton.tsx`: Existing UI primitives for catalog cards, admin forms, unavailable states, mobile panels, and loading states.
- `src/auth/guards.ts`: Provides `requireAdmin()` and `requireUser()` server-side authorization patterns for protected catalog administration.
- `src/lib/supabase/server.ts` and `src/lib/supabase/client.ts`: Existing typed Supabase clients for server-rendered catalog queries and browser-safe interactions.
- `supabase/migrations/20260612102801_foundation_identity.sql`: Existing migration and RLS style for public schema tables, private helper functions, grants, and policies.

### Established Patterns
- Public customer routes are localized under `/vi` and `/en`; unprefixed customer content redirects to a preferred locale.
- Public-facing slugs may be translated per locale.
- Admin routes are protected server-side before rendering and use database-owned role checks.
- Supabase migrations, generated types, database tests, unit tests, E2E tests, lint, typecheck, and build are part of the expected verification path.
- Money must use integer minor units plus explicit currency codes; floating-point money and automatic exchange-rate pricing are explicitly disallowed.
- Product/media security should use Supabase Storage private buckets and server-side entitlement logic later; Phase 2 only associates private PDFs with digital products and must not create public PDF URLs.

### Integration Points
- Add catalog database tables and RLS in new Supabase migrations, then regenerate `src/types/supabase.ts`.
- Add localized catalog routes to `src/i18n/routing.ts` and corresponding App Router pages under `src/app/[locale]`.
- Extend the admin shell under `src/app/admin` with protected catalog management experiences.
- Add market detection/switching around the public shell and market-aware query helpers so listing cache/query behavior cannot leak one market's price into another.
- Add product and taxonomy metadata generation to localized product/category/collection routes.

</code_context>

<specifics>
## Specific Ideas

- Use the market switcher as a visible storefront control, not a hidden preference.
- Preserve SEO value for direct product URLs even when the active market cannot buy the product, but make the unavailable state unambiguous.
- Keep Phase 2 search basic and database-backed; avoid fuzzy matching and dedicated search infrastructure.
- Keep collections editorial and manually ordered for seasonal, best seller, new arrival, and curated merchandising groups.
- Prevent digital products from going live before their private PDF is present.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 2-Market-Aware Catalog*
*Context gathered: 2026-06-12*
