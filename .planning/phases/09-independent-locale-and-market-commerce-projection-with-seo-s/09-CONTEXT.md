---
phase: 09
status: discussed
created: 2026-07-22
source: approved-conversation
---

# Phase 09: Independent Locale and Market Commerce Projection - Context

<domain>
## Phase Boundary

Make storefront language and commerce market independent without changing the
public localized URL scheme or weakening the server-authoritative commerce
boundaries. The phase owns request resolution, market-aware public commerce
projections, storefront synchronization, cart requoting, SEO/ISR preservation,
and regression coverage across the four supported locale/market combinations.

The phase does not add currencies, payment providers, exchange-rate conversion,
market-specific public URL segments, carrier APIs, or new checkout business
rules. Existing VND/VietQR and USD/PayPal behavior remains authoritative.
</domain>

<decisions>
## Implementation Decisions

### Context Resolution
- **D-01:** Locale and market are independent dimensions. All four combinations `vi+vn`, `vi+intl`, `en+vn`, and `en+intl` are supported throughout browsing, cart, and checkout entry.
- **D-02:** Locale precedence is explicit localized URL, then a valid `NEXT_LOCALE` preference for an unprefixed visit, then `Accept-Language`, then the single project fallback `vi`. Locale controls content, translated slugs, metadata, and navigation only.
- **D-03:** Browsing market precedence is a valid explicit `ACTIVE_MARKET` cookie, then trusted deployment country (`x-vercel-ip-country`), then `intl`. Market controls offer eligibility, price, currency, variants, and commerce messaging only.
- **D-04:** Once a physical shipping destination exists, checkout destination determines the quote market. The browsing market and IP are suggestions, never final order authority.
- **D-05:** Language switching preserves active market; market switching preserves locale, the equivalent localized route, and only explicitly allowlisted query state.

### SEO and ISR Contract
- **D-06:** Public homepage, catalog, category, collection, and product routes remain statically rendered/ISR. Their page, layout, metadata, JSON-LD, sitemap, and cached public-data paths must not call `cookies()`, `headers()`, or another request-time API.
- **D-07:** Existing localized canonical URLs remain unchanged. No market segment or market query is introduced as an indexable URL dimension.
- **D-08:** Each locale keeps a deterministic SEO/default offer projection (`vi -> vn`, `en -> intl`) for initial indexable HTML and Product JSON-LD. Canonical, `hreflang`, sitemap, robots, and structured-data output must remain stable across visitor cookies and IPs.
- **D-09:** Non-default market personalization is confined to market-aware commerce components and private storefront APIs. It must not make the public route response private/dynamic or allow one visitor's market response to leak through a shared cache.
- **D-10:** Private API responses use `private, no-store`; reusable database projections may still use cache entries whose arguments include locale, market, product/filter identity, and every result-shaping parameter.
- **D-11:** The implementation stays on the project's current Next.js caching model. Enabling Cache Components/PPR or migrating the entire cache architecture is out of scope unless research proves it is strictly required and the plan surfaces that as a blocking decision.

### Market-Aware Storefront
- **D-12:** A resolved storefront context has an explicit lifecycle (`resolving`, `ready`, `error`) and includes the authoritative browsing market. Market-sensitive purchase actions remain disabled until context and offer projection agree; failures fail closed with localized recovery UI.
- **D-13:** Product commerce projection returns market-specific price, currency, availability, stock, variants, other-market information, and a stable identity/version sufficient to prevent a stale Add to Cart action.
- **D-14:** Catalog personalization must load the complete active-market result set and facets for the current search/filter/sort state. Overlaying only products present in the SEO-default list is insufficient because market-exclusive products would remain undiscoverable.
- **D-15:** Homepage featured products, catalog/category/collection results, product offer/variant UI, unavailable-market messaging, wishlist hydration, and add-to-cart all consume the same resolved market contract.
- **D-16:** A market change updates the cookie and client context atomically from the user's perspective, invalidates/refetches affected commerce projections, and triggers an authoritative cart requote. Optimistic labels must roll back or enter recovery if the server action fails.
- **D-17:** Locale and market controls expose independent choices with accessible labels and clear active state on desktop and mobile. Legacy duplicate switchers and stale combined-pair assumptions are removed or consolidated.

### Cart and Checkout Preservation
- **D-18:** Cart storage remains intent-only. `marketAtAdd` records the resolved active market at the accepted Add to Cart action, but server quote hydration owns display price, title, availability, currency, discounts, shipping, and totals.
- **D-19:** Market change requotes existing cart lines and clearly surfaces removed, unavailable, repriced, or currency-changed lines. It never silently preserves a stale purchasable state.
- **D-20:** Destination changes continue to use the existing latest-request-wins quote lifecycle and blocking material-change confirmation before replacing an accepted quote.
- **D-21:** Submit continues to validate accepted quote hash/evidence, shipping destination, market, currency, payment intent, inventory/reservation, discounts, and immutable snapshots on the server/database. Browser projection data is never trusted as order authority.
- **D-22:** Payment invariants remain `vn + VND -> VietQR` and `intl + USD -> PayPal`; this phase does not introduce FX, mixed-currency orders, or browser-selected payment overrides.

### Verification and Rollout
- **D-23:** Tests cover the full four-combination matrix plus cookie-over-IP precedence, invalid cookie recovery, missing country header, direct localized entry, unprefixed entry, locale switch, market switch, refresh, client navigation, API failure, stale responses, rapid switches, and multi-tab/focus revalidation.
- **D-24:** Static/ISR preservation is a release gate verified from a production build and response/cache behavior, not inferred only from source inspection. SEO output is compared across cookie/IP variants to prove determinism.
- **D-25:** Checkout regression coverage includes digital-only, physical-only, mixed cart, guest, signed-in, VN-to-US and US-to-VN destination changes, unavailable offers, discount revalidation, shipping changes, PayPal, VietQR, and submit-time stale quote rejection.
- **D-26:** Rollout is incremental: establish contracts/tests first, add projection APIs, migrate product commerce, migrate catalog/list surfaces, synchronize cart/context, then run SEO/build/checkout gates. Each migration slice retains a safe fail-closed fallback and can be independently verified.

### the agent's Discretion
- Exact endpoint names, projection DTO names, component boundaries, cache-tag layout, loading visuals, and migration slice count may be chosen during research/planning.
- The agent may reuse Route Handlers or Server Actions for private projections, provided response caching, authorization, input validation, observability, and stale-response handling satisfy the locked decisions.
- The agent may preserve deterministic SEO-default price in initial HTML or use a non-actionable commerce placeholder, but Product JSON-LD, visible initial content, hydration behavior, and active-market result must not contradict one another or allow purchase before resolution.
</decisions>

<canonical_refs>
## Canonical References

### Product and Phase Scope
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/phases/01-secure-bilingual-foundation/01-CONTEXT.md`
- `.planning/phases/02-market-aware-catalog/02-CONTEXT.md`
- `.planning/phases/03-mixed-cart-and-checkout/03-CONTEXT.md`
- `.planning/phases/04-trusted-payments-and-orders/04-CONTEXT.md`
- `.planning/phases/07-content-seo-and-launch-readiness/07-CONTEXT.md`
- `.planning/phases/08-shipping-profile-fallbacks-destination-zones-and-us-region-s/08-CONTEXT.md`

### Current Resolution and UI
- `src/proxy.ts`
- `src/i18n/routing.ts`
- `src/i18n/request.ts`
- `src/catalog/market.ts`
- `src/catalog/page-context.ts`
- `src/catalog/seo-market.ts`
- `src/catalog/market-actions.ts`
- `src/components/storefront-context.tsx`
- `src/components/commerce-context-switcher.tsx`
- `src/components/locale-switcher.tsx`
- `src/components/market-switcher.tsx`

### Public Catalog, SEO, and Caching
- `src/app/[locale]/page.tsx`
- `src/app/[locale]/catalog/page.tsx`
- `src/app/[locale]/category/[categorySlug]/page.tsx`
- `src/app/[locale]/collection/[collectionSlug]/page.tsx`
- `src/app/[locale]/product/[productSlug]/page.tsx`
- `src/storefront/home-featured-products.ts`
- `src/catalog/queries.ts`
- `src/catalog/public-cache.ts`
- `src/catalog/cache-keys.ts`
- `src/catalog/metadata.ts`
- `src/content/seo/json-ld.tsx`
- `src/app/sitemaps/[locale]/route.ts`

### Cart and Checkout Authority
- `src/components/catalog/add-to-cart.tsx`
- `src/components/cart/cart-provider.tsx`
- `src/cart/actions.ts`
- `src/cart/guest-storage.ts`
- `src/checkout/actions.ts`
- `src/checkout/quote.ts`
- `src/checkout/quote-lifecycle.ts`
- `src/checkout/market-revalidation.ts`
- `src/checkout/submit-checkout.ts`

### Existing Verification
- `tests/unit/i18n/routing.test.ts`
- `tests/unit/catalog/market.test.ts`
- `tests/unit/catalog/public-cache.test.ts`
- `tests/unit/content/storefront-performance.test.ts`
- `tests/unit/content/seo.test.ts`
- `tests/unit/checkout/quote-lifecycle.test.ts`
- `tests/unit/checkout/submit-checkout.test.ts`
- `tests/e2e/localization.spec.ts`
- `tests/e2e/catalog-market.spec.ts`
- `tests/e2e/catalog-discovery.spec.ts`
- `tests/e2e/catalog-detail-seo.spec.ts`
- `tests/e2e/cart.spec.ts`
- `tests/e2e/checkout-market-change.spec.ts`
- `tests/e2e/launch-seo.spec.ts`
- `tests/security/catalog-boundaries.test.mjs`
- `tests/security/checkout-boundaries.test.mjs`
</canonical_refs>

<specifics>
## Specific Risks To Resolve in Planning

- Current public pages use `marketForLocale`, while header/API/cart can use `ACTIVE_MARKET`; the plan must remove this split authority without reading request cookies in ISR routes.
- Current storefront context guesses market from locale before fetching the request context; the plan must prevent misleading purchasable UI and stale Add to Cart actions during resolution.
- Catalog market personalization must account for products absent from the SEO-default market result, not only reprice already-rendered cards.
- Existing combined header switcher pairs VN/VI and INTL/EN, while footer language control is independent and older tests target separate controls; the plan must reconcile the intended UI and update stale coverage.
- Market changes can leave a persisted guest cart and cached quote from a different market; the plan must define invalidation, latest-request-wins behavior, and visible material changes.
- Product JSON-LD and visible initial offers must remain deterministic for crawlers even when the visitor later activates the non-default market.
- Direct localized auth routes currently bypass part of locale/market middleware behavior; research must decide whether to normalize those routes in this phase without risking auth callback/session behavior.
</specifics>

<deferred>
## Deferred Ideas

- Market-specific indexable URLs and region-specific SEO landing pages.
- Additional currencies, automatic exchange rates, or mixed-currency carts.
- New payment providers or automatic VietQR reconciliation.
- Cache Components/PPR adoption as a broad platform migration.
</deferred>

---

*Phase: 09-Independent locale and market commerce projection with SEO-safe ISR and checkout preservation*
*Context gathered: 2026-07-22 from the approved design discussion*
