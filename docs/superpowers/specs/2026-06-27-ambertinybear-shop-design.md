# Ambertinybear Shop Design

## Goal

Turn the catalog into a focused shopping surface where customers can understand the active market, narrow the real catalog, compare handmade goods with PDF patterns, and reach a product detail page efficiently on desktop or mobile.

## Scope

This launch redesign includes:

- Breadcrumb, dynamic page heading, explanatory copy, and visible result count.
- Product-type tabs for all products, finished handmade goods, and PDF patterns.
- Search, supported sorting, category filtering, and clear-all behavior reflected in the URL.
- Desktop filter sidebar and mobile filter Sheet.
- Responsive product grid with improved physical/digital distinctions.
- Button-driven progressive disclosure in groups of 12 products.
- Empty, query-error, and loading feedback appropriate to the existing server-rendered architecture.

This iteration excludes promotions, bestseller/rating sorts, rating filters, preorder controls, comparison, recommendations, and hover image swapping because the required trustworthy data or media contracts do not yet exist.

## Information Architecture

The page order is:

1. Breadcrumb: localized home and shop links.
2. Shop heading: dynamic title, short introduction, and result count.
3. Product-type segmented navigation: All, Handmade, PDF patterns.
4. Desktop two-column workspace:
   - A 240px filter sidebar.
   - Search/sort toolbar and product results.
5. Mobile workspace:
   - Search and sort remain visible.
   - A filter button opens a Sheet containing the same filter controls.
   - Results use a compact two-column grid.
6. Load-more control when more than the current visible count remains.

The page uses open layout bands and restrained borders. It does not wrap the entire workspace or each section in decorative cards.

## URL Contract

The server owns filtering and sorting. Supported query parameters remain shareable and Back-button friendly:

- `search`: trimmed search text.
- `type`: `physical_finished` or `pdf_pattern`.
- `category`: localized category slug.
- `sort`: `newest`, `price_asc`, `price_desc`, or `title`.

Changing product type, category, search, or sort submits a GET navigation. Unknown parameter values fall back to safe defaults. Clear-all navigates to the localized catalog path with no filter parameters.

## Data Flow

The catalog page resolves locale, active market, URL state, product results, facets, authenticated user, and wishlist state on the server. Product and facet queries begin in parallel where dependencies allow. The browser never supplies trusted price, currency, availability, or market membership.

The server passes the already-filtered product list to a small client result-grid component. That component only controls presentation state: it initially reveals 12 items and adds 12 per click. A URL filter change remounts the grid with its visible count reset to 12.

The existing catalog RPC remains authoritative. Database pagination is deferred until the catalog approaches 200 products.

## Filters

Launch filters are deliberately limited to data already supported by `listCatalogProducts` and `listCatalogFacets`:

- Product type.
- Category.
- Search.
- Sort.

Difficulty, price bands, review score, stock-only, and preorder are excluded because they lack complete query contracts or trustworthy public data. Filter labels use actual localized facets rather than hard-coded category examples.

Desktop and mobile render the same semantic filter fields. There is one canonical query-state parser and one shared filter content component so behavior cannot drift between sidebar and Sheet.

## Product Cards

Cards preserve the existing market-safe catalog projection and wishlist behavior while improving commerce clarity:

- Stable product media ratio and visible focus/hover treatment.
- A concise type label distinguishing Handmade from PDF pattern.
- Product title, price, and at most a short supporting line.
- Physical products show stock state; digital patterns state that access is delivered after payment confirmation.
- The CTA opens product detail. Quick add-to-cart is excluded because physical products may require variant selection.
- Desktop cards can show description; mobile two-column cards omit or clamp it more aggressively.

No sale price, rating, bestseller, low-stock, or free-pattern badge is shown without authoritative data.

## States

- Empty result: retain the current controls, explain that no products match, and provide a clear-filter action when filters are active.
- Query failure: render the page shell and controls with a localized catalog-unavailable message; do not silently present an empty result as success.
- Missing product media: keep a stable neutral media area with an accessible fallback label.
- Load more: hide the control when all filtered results are visible and announce the updated visible count for assistive technology.

## Responsive Behavior

- Below 640px, results use two equal columns with compact typography and controls that do not overflow at 320px.
- At tablet sizes, results use two or three columns depending on available width.
- Desktop uses a 240px sidebar plus a three-column result grid.
- Filter Sheet controls are keyboard accessible and use the project's existing Sheet primitive.
- Search, sort, and filter actions keep minimum 44px touch targets.

## Testing

Test-first implementation will cover:

- Query-state parsing and active-filter detection.
- Progressive disclosure in groups of 12 and reset behavior on changed results.
- Bilingual page identity, result count, and product-type navigation.
- URL state for search, sort, type, category, and clear-all.
- Mobile filter Sheet and 320px overflow.
- Product-card distinction between physical stock and digital delivery.
- Typecheck, lint, unit tests, focused Playwright tests, production build, and visual browser checks at desktop and mobile widths.

## Acceptance Criteria

- Customers can identify the active product type and result count without scanning the grid.
- Every launch filter is backed by real catalog data and reflected in the URL.
- Market-specific products and prices continue to come only from the server catalog projection.
- Handmade and PDF cards communicate different fulfillment behavior.
- The first 12 results render without client-side fetching, and load more reveals subsequent groups.
- Desktop sidebar and mobile Sheet offer equivalent filters.
- The page remains usable without horizontal overflow at 320px.
