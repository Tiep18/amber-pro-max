# Phase 2: Market-Aware Catalog - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-12
**Phase:** 2-Market-Aware Catalog
**Areas discussed:** Market and pricing, Product variants and inventory, Taxonomy and discovery, Admin catalog workflow and media, Product page and SEO metadata

---

## Market and Pricing

| Question | Options Presented | Selected |
|----------|-------------------|----------|
| How should Vietnam/international market offer prices work? | Explicit price per enabled market; default price with market overrides; agent decides; other | Explicit price per enabled market |
| What should customers see for products unavailable in their market? | Hide completely; show unavailable in listings; show only on direct product URL; other | Show only on direct product URL |
| How should the active storefront market be set and changed? | IP suggestion with manual switch; IP decides fully; first-visit choice saved; other | IP suggestion with manual switch |
| How should prices be formatted? | Local market format; currency-code format; symbol plus code in important places; other | Local market format |

**Notes:** Vietnam uses VND, international uses USD. Listing/search stays market-eligible, while direct product pages can explain unavailability.

---

## Product Variants and Inventory

| Question | Options Presented | Selected |
|----------|-------------------|----------|
| What are the top-level commercial product types? | PDF pattern and physical finished product; three product types; one generic model; other | PDF pattern and physical finished product |
| How should admins manage physical variants? | Create each variant explicitly; auto-generate option combinations; auto-generate then enable/disable; other | Create each variant explicitly |
| How should physical variant prices relate to parent prices? | Variant always has own price; parent default with variant overrides; no variant price overrides; other | Parent default with variant overrides |
| Where should inventory be tracked? | Product inventory when no variants, variant inventory when variants exist; always variants; product-only inventory; other | Product inventory when no variants, variant inventory when variants exist |

**Notes:** Variant inventory and SKU are explicit admin-managed data for physical products.

---

## Taxonomy and Discovery

| Question | Options Presented | Selected |
|----------|-------------------|----------|
| Which taxonomy pages are public and indexable in Phase 2? | Category and collection; category, technique, tag, and collection; category only; other | Category and collection |
| How should localized slugs be managed? | Admin-entered Vietnamese and English slugs; auto-generated editable slugs; one shared slug; other | Admin-entered Vietnamese and English slugs |
| How deep should search/filter/sort be? | Basic text search plus market/type/category/collection/technique/tag filters and basic sort; filters only; fuzzy search; other | Basic text search plus filters and sort |
| How should collections be managed? | Manual curated selection and ordering; rule-based; both manual and rule-based; other | Manual curated selection and ordering |

**Notes:** Technique and tag are discovery filters only in Phase 2.

---

## Admin Catalog Workflow and Media

| Question | Options Presented | Selected |
|----------|-------------------|----------|
| What publish states should products have? | Draft / Published / Archived; Draft / Published; published flag plus soft-delete; other | Draft / Published / Archived |
| What minimum data blocks publish? | Missing translation, slug, SEO title/description, primary image, market offer, or type data blocks publish; block commerce only; warnings only; other | Full required data blocks publish |
| How should PDF pattern uploads work? | Private PDF required before publishing digital product; publish then upload PDF later; metadata only in Phase 2; other | Private PDF required before publishing digital product |
| How should product images work? | Product gallery plus optional variant images; product gallery only; required image per variant; other | Product gallery plus optional variant images |

**Notes:** Publishing should prevent incomplete storefront, SEO, market offer, and digital-file states.

---

## Product Page and SEO Metadata

| Question | Options Presented | Selected |
|----------|-------------------|----------|
| How should product pages distinguish PDF patterns from finished goods? | Badge plus type-specific purchase information; badge only; separate layouts; other | Badge plus type-specific purchase information |
| What localized SEO metadata is required? | SEO title, description, slug, social image per locale; title/description/slug with primary image fallback; generated metadata; other | SEO title, description, slug, social image per locale |
| What CTA should appear when a direct product URL is unavailable in the active market? | No add-to-cart, show unavailable message and market switch; wishlist/notify; exception request; other | No add-to-cart, show unavailable message and market switch |
| How should variant availability appear before add to cart? | Only valid in-stock variants selectable; hide out-of-stock variants; selectable with sold-out CTA; other | Only valid in-stock variants selectable, out-of-stock variants disabled |

**Notes:** Wishlist, notification, and exception request behavior belongs to later phases.

---

## the agent's Discretion

- Exact admin UI layout, validation copy, empty states, and implementation details.
- Exact basic sort options, as long as they remain practical and do not introduce advanced search infrastructure.

## Deferred Ideas

None.
