# Phase 09: Independent Locale and Market Commerce Projection with SEO-safe ISR - Research

**Researched:** 2026-07-22
**Domain:** Independent locale/market resolution, private commerce projections, ISR-safe personalization, and authoritative cart/checkout synchronization
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

### Deferred Ideas (OUT OF SCOPE)
- Market-specific indexable URLs and region-specific SEO landing pages.
- Additional currencies, automatic exchange rates, or mixed-currency carts.
- New payment providers or automatic VietQR reconciliation.
- Cache Components/PPR adoption as a broad platform migration.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MKT-01 | Customer can browse storefront content in Vietnamese or English using localized URLs. | Reuse next-intl locale-prefix routing and correct locale resolution/switching without coupling locale to market. [VERIFIED: codebase; CITED: https://next-intl.dev/docs/routing/middleware] |
| MKT-02 | Customer sees VND prices in the Vietnam market and USD prices in the international market. | Use a private market projection and retain the server quote pair invariants. [VERIFIED: codebase] |
| MKT-03 | Admin can make each product available in Vietnam, internationally, or in both markets. | Existing offer RPCs already project market eligibility; the new client contract must replace complete result sets. [VERIFIED: codebase] |
| MKT-04 | Admin can assign independent Vietnam and international prices to a product or variant. | Existing product/list RPCs already resolve independent product and inherited/overridden variant prices. [VERIFIED: codebase] |
| MKT-05 | Store suggests a market from the customer's IP country and shows the active market to the customer. | Preserve `ACTIVE_MARKET > x-vercel-ip-country > intl`, expose lifecycle and active market, and test missing/local deployment headers. [VERIFIED: codebase; CITED: https://vercel.com/docs/headers/request-headers] |
| MKT-06 | Checkout validates physical-product eligibility against the shipping country and requires confirmation before applying any market-driven cart change. | Preserve the existing destination-derived quote lifecycle and material-change proposal gate. [VERIFIED: codebase] |
| CAT-05 | Customer can browse product, category, technique, tag, and collection pages. | Product/category/collection routes exist; technique/tag are supported in the RPC but absent from customer routes/filter state and need an explicit planning decision. [VERIFIED: codebase] |
| CAT-06 | Customer can search, filter, and sort eligible products. | Move the complete filtered list and matching facets to the active-market private projection. [VERIFIED: codebase] |
| CAT-08 | Customer can view valid variant combinations and current availability before adding a physical product to cart. | Product projection must carry enabled variants, inherited/override prices, stock, and a projection identity; Add to Cart remains disabled until agreement. [VERIFIED: codebase] |
| CART-03 | Server recalculates product prices, discounts, shipping fees, and order totals from authoritative records. | Keep `quoteCartAction`, checkout requote, and database submit verification authoritative; projections are presentation only. [VERIFIED: codebase] |
| CART-05 | System stores an immutable snapshot of product, variant, market, currency, price, discount, and shipping data on each order line. | Preserve current database-built line snapshots and add regression tests rather than rewriting submit authority. [VERIFIED: codebase] |
| SEO-02 | Public localized pages emit correct language alternates using `hreflang`. | Keep locale-only canonical/alternate generation and compare output across market cookies/IPs. [VERIFIED: codebase] |
| SEO-03 | Product and blog pages emit valid Product and Article structured data. | Keep Product JSON-LD on deterministic locale-default offer and ensure hydrated commerce never enables a contradictory offer. [VERIFIED: codebase] |
| SEO-04 | System publishes localized sitemaps and an appropriate robots file. | Keep sitemap/robots request-independent and locale deterministic; add cookie/IP invariance tests. [VERIFIED: codebase] |
| OPS-04 | Critical guest/account checkout, payment, inventory, download, tracking, localization, and authorization flows have automated verification. | Add the four-combination, race, cache, market-switch, checkout, build, security, and SEO matrices described below. [VERIFIED: codebase] |
</phase_requirements>

## Summary

The phase should preserve each localized route as a deterministic SEO shell and move visitor-market commerce into private client-hydrated projections. The existing database functions already provide most market-shaped list, facet, product, variant, price, availability, and stock data, and `unstable_cache` already includes function arguments in its cache identity. The missing architecture is a single resolved client commerce context, projection DTOs with stale-response identity, and coordinated invalidation/requote behavior. [VERIFIED: codebase; CITED: https://nextjs.org/docs/app/api-reference/functions/unstable_cache]

The largest verified regression is the catalog route: the 2026-07-22 production build classifies `/[locale]/catalog` as dynamic, while home, category, collection, and product are five-minute ISR. Its server use of `searchParams` and filtered database queries must move behind a static default shell plus private market projection, and the production route report must become the release gate. `cookies()` and `headers()` are Dynamic APIs, and forcing a route static makes their values empty rather than making request-derived personalization safe. [VERIFIED: `npm run build`; CITED: https://nextjs.org/docs/app/api-reference/functions/cookies; CITED: https://nextjs.org/docs/app/api-reference/functions/headers; CITED: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config]

Locale resolution also needs correction: the hand-written resolver defaults missing language input to `en`, ignores quality ordering, and bypasses part of middleware behavior for localized auth routes. next-intl's middleware already implements the locked priority of prefix, locale cookie, `Accept-Language` best fit, and default locale. Compose that response with Supabase session refresh and market suggestion, while keeping `/auth/callback` isolated. [VERIFIED: codebase; CITED: https://next-intl.dev/docs/routing/middleware]

**Primary recommendation:** Build one request-resolved `StorefrontContext` and two private projection boundaries (complete list/facets and product commerce), hydrate them into static locale-default shells, and make a successful market mutation fan out atomically to projection refetch, quote-cache invalidation, authoritative cart requote, cross-tab notification, and visible material-change handling. [VERIFIED: codebase]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Localized URL resolution and switching | Frontend Server (proxy/middleware) | Browser / Client | The URL and `NEXT_LOCALE` establish language; controls navigate to an equivalent localized path. [VERIFIED: codebase] |
| Browsing-market resolution | Frontend Server | Browser / Client | Server reads the HttpOnly preference and trusted deployment header; client consumes only the resolved DTO. [VERIFIED: codebase] |
| Deterministic SEO shell and metadata | Frontend Server (ISR) | CDN / Static | Locale-default content is generated once per localized URL and may be shared safely. [VERIFIED: codebase] |
| Personalized catalog/product commerce | API / Backend | Browser / Client | Private handlers resolve market server-side, validate inputs, query cached database projections, and return `no-store` DTOs; client replaces commerce islands. [VERIFIED: codebase] |
| Offer, price, variant, inventory authority | Database / Storage | API / Backend | Existing RPCs and checkout database functions own market eligibility and authoritative values. [VERIFIED: codebase] |
| Market-switch transaction | Browser / Client | Frontend Server | Client orchestrates pending/commit/rollback while server validates and persists the preference. [VERIFIED: codebase] |
| Cart display and requote | API / Backend | Browser / Client | Browser stores line intent only; server quote owns display values and totals. [VERIFIED: codebase] |
| Destination-driven checkout | API / Backend and Database | Browser / Client | Destination selects quote market; latest-request-wins and material confirmation remain client workflow guards around server authority. [VERIFIED: codebase] |
| Cross-tab/focus convergence | Browser / Client | API / Backend | The cookie is HttpOnly, so tabs exchange only an invalidation signal and refetch authoritative context/quotes. [VERIFIED: codebase] |

## Project Constraints (from AGENTS.md)

- Preserve independent Vietnam/international availability, prices, payment, and shipping behavior; customer content/taxonomy/products/blog remain Vietnamese and English, with VND for Vietnam and USD internationally. [VERIFIED: AGENTS.md]
- Never fulfill digital goods before full payment confirmation; PDFs remain private and are delivered only through expiring access-controlled links. [VERIFIED: AGENTS.md]
- Guest checkout, mixed digital/physical carts, explicit physical/variant inventory, manual shipping/tracking, and localized indexable SEO remain required. [VERIFIED: AGENTS.md]
- Use the existing Next.js 16.2.x/React 19.2.x/TypeScript 5.9.x modular monolith with Supabase and Vercel; do not introduce a separate API service, ORM, microservices, or client-only storefront. [VERIFIED: AGENTS.md; VERIFIED: codebase]
- Use server-rendered/static localized public pages, controlled revalidation, canonical URLs, `hreflang`, and structured data; request-time market data must not enter shared cache output. [VERIFIED: AGENTS.md]
- Recalculate totals from database records, use integer minor units with explicit currency, store PDFs privately, and generate signed URLs only after entitlement checks. [VERIFIED: AGENTS.md]
- Do not authorize administrators from user-editable metadata; existing server-managed authorization and database policies remain authoritative. [VERIFIED: AGENTS.md]
- Conventions are not yet separately established, so follow existing codebase patterns. File changes must remain within the active GSD workflow. [VERIFIED: AGENTS.md]

## Standard Stack

### Core

| Library/Platform | Existing Version | Published | Purpose | Prescriptive Use |
|------------------|------------------|-----------|---------|------------------|
| Next.js | 16.2.9 | 2026-06-09 | ISR shells, proxy, Route Handlers, current cache model | Keep route segment configuration; do not enable Cache Components/PPR. [VERIFIED: codebase package.json; CITED: https://registry.npmjs.org/next] |
| React | 19.2.7 | 2026-06-01 | Client context, commerce islands, race-safe state orchestration | Use one provider lifecycle and explicit generation tokens; do not put request resolution into static layouts. [VERIFIED: codebase package.json; CITED: https://registry.npmjs.org/react] |
| TypeScript | 5.9.3 | 2025-09-30 | Projection/context/cart contracts | Define discriminated lifecycle DTOs and exhaustive market/currency handling. [VERIFIED: codebase package.json; CITED: https://registry.npmjs.org/typescript] |
| next-intl | 4.13.0 | 2026-05-28 | Localized routes, locale cookie, navigation, messages | Reuse its middleware resolution and static-rendering pattern. [VERIFIED: codebase package.json; CITED: https://registry.npmjs.org/next-intl; CITED: https://next-intl.dev/docs/routing/setup] |
| Supabase Postgres/RPC | Existing local/managed stack | Market projections and checkout authority | Extend/reuse projection functions only where DTO evidence is missing; keep checkout submit authority unchanged. [VERIFIED: codebase] |

### Supporting

| Library | Existing Version | Published | Purpose | When to Use |
|---------|------------------|-----------|---------|-------------|
| Zod | 4.4.3 | 2026-05-04 | Private endpoint and action validation | Validate locale, filter/sort bounds, IDs, and exact market enums; reject invalid mutations rather than coercing them. [VERIFIED: codebase package.json; CITED: https://registry.npmjs.org/zod] |
| Vitest | 4.1.8 | 2026-06-01 | Contract, reducer, race, cache, and route-source tests | Use for fast per-task validation. [VERIFIED: codebase package.json; CITED: https://registry.npmjs.org/vitest] |
| Playwright | 1.60.0 | 2026-05-11 | Browser matrix, multi-tab, cache/SEO, cart/checkout regression | Use the current single-worker local Supabase configuration. [VERIFIED: codebase package.json; CITED: https://registry.npmjs.org/@playwright%2ftest] |
| Supabase CLI | 2.106.0 installed | — | Local reset, lint, database tests, generated types | Use only if projection SQL changes; a schema migration is not required for a client-computed projection fingerprint. [VERIFIED: environment; VERIFIED: codebase] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Private Route Handlers | Server Actions for every projection | Route Handlers give explicit GET inputs and `Cache-Control`; actions are best kept for the cookie mutation. [VERIFIED: codebase; CITED: https://nextjs.org/docs/app/getting-started/route-handlers] |
| Deterministic static shell plus client commerce islands | Request-time server personalization | Request APIs would make public routes dynamic and risk shared-cache market leakage, violating locked decisions. [CITED: https://nextjs.org/docs/app/api-reference/functions/cookies] |
| Existing RPCs and direct Supabase client | New ORM or query-state package | Existing functions already express all market parameters, and the phase needs orchestration rather than another dependency. [VERIFIED: codebase] |
| In-process generation/abort controls | New data-fetching library | The required surface is bounded and current project has no such dependency; adding one would expand architecture without removing server-authority work. [VERIFIED: codebase] |

**Installation:** No external package installation is required. [VERIFIED: codebase]

## Package Legitimacy Audit

This phase installs no packages, so no package checkpoint is required for the recommended plan. A precautionary registry/legitimacy probe found no postinstall scripts; it rated Zod `OK` and rated the already-pinned Next.js, React, TypeScript, next-intl, Vitest, and Playwright package names `SUS` solely because their newest registry releases were below the seam's age threshold. Those results do not change existing project dependencies, but any install or upgrade added during planning must be preceded by `checkpoint:human-verify`. [VERIFIED: package-legitimacy seam; VERIFIED: npm registry]

| Package | Registry | Newest Release Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|--------------------|-----------|-------------|---------|-------------|
| `next` [WARNING: flagged by age threshold] | npm | ~1 day | 48.4M/week | `vercel/next.js` | SUS | Reuse pinned 16.2.9; verify before any upgrade. [VERIFIED: package-legitimacy seam] |
| `react` [WARNING: flagged by age threshold] | npm | ~1 day | 159.7M/week | `facebook/react` | SUS | Reuse pinned 19.2.7; verify before any upgrade. [VERIFIED: package-legitimacy seam] |
| `typescript` [WARNING: flagged by age threshold] | npm | ~14 days | 239.9M/week | `microsoft/TypeScript` | SUS | Reuse pinned 5.9.3; verify before any upgrade. [VERIFIED: package-legitimacy seam] |
| `next-intl` [WARNING: flagged by age threshold] | npm | ~1 day | 4.5M/week | `amannn/next-intl` | SUS | Reuse pinned 4.13.0; verify before any upgrade. [VERIFIED: package-legitimacy seam] |
| `zod` | npm | ~79 days | 234.1M/week | `colinhacks/zod` | OK | Reuse pinned 4.4.3; no install. [VERIFIED: package-legitimacy seam] |
| `vitest` [WARNING: flagged by age threshold] | npm | ~16 days | 80.0M/week | `vitest-dev/vitest` | SUS | Reuse pinned 4.1.8; verify before any upgrade. [VERIFIED: package-legitimacy seam] |
| `@playwright/test` [WARNING: flagged by age threshold] | npm | ~29 days | 47.0M/week | `microsoft/playwright` | SUS | Reuse pinned 1.60.0; verify before any upgrade. [VERIFIED: package-legitimacy seam] |

**Packages removed due to [SLOP] verdict:** none. [VERIFIED: package-legitimacy seam]

**Packages flagged as suspicious [SUS]:** existing core package names listed above; no installation is proposed. [VERIFIED: package-legitimacy seam]

## Architecture Patterns

### System Architecture Diagram

```text
Unprefixed request
  -> next-intl middleware: URL > NEXT_LOCALE > Accept-Language > vi
  -> Supabase session response composition
  -> market suggestion: valid ACTIVE_MARKET > trusted country > intl
  -> redirect to localized URL

Localized public URL
  -> ISR locale-default shell (vi->vn, en->intl)
       -> stable metadata / hreflang / JSON-LD / sitemap
       -> non-actionable default commerce markup
  -> browser StorefrontContext: resolving
       -> GET /api/storefront-context [private, no-store]
       -> ready(market, generation) OR error
            -> GET private complete list/facets projection
            -> GET private product-commerce projection
            -> render active-market commerce only when generation+market agree

Market switch intent
  -> validated server action sets HttpOnly ACTIVE_MARKET
       -> success: commit context -> broadcast invalidation
                  -> invalidate client projection state
                  -> clear quote cache -> authoritative cart requote
                  -> surface removed/repriced/currency changes
       -> failure: rollback label -> localized recovery state

Checkout destination
  -> authoritative destination-market quote
  -> latest request wins
  -> material change requires confirmation
  -> submit RPC rechecks market/currency/payment/offers/inventory/discounts
  -> database writes immutable snapshots
```

The public shell and private response are separate cache/security boundaries; private handlers must never be called during static server rendering. [VERIFIED: codebase; CITED: https://nextjs.org/docs/app/getting-started/route-handlers]

### Recommended Project Structure

```text
src/
├── app/api/storefront-context/                 # Existing private resolved context
├── app/api/storefront/catalog/                 # Complete market list + matching facets
├── app/api/storefront/products/[productId]/    # Market product-commerce projection
├── catalog/
│   ├── market.ts                               # Strict resolution primitives
│   ├── projections.ts                          # DTO mapping + stable fingerprint
│   ├── projection-schemas.ts                   # Zod boundary schemas
│   └── public-cache.ts                         # Reusable DB projections keyed by all args
├── components/
│   ├── storefront-context.tsx                  # lifecycle, generation, revalidation
│   ├── commerce-controls.tsx                   # independent locale/market controls
│   └── catalog/commerce-*.tsx                  # full-list and product islands
├── cart/
│   ├── quote-cache.ts                          # active-market-aware cache identity
│   └── market-sync.ts                          # invalidation/requote coordinator
└── i18n/routing.ts                             # next-intl routing + dynamic equivalent paths
```

These are recommended responsibility boundaries, not a requirement to rename stable existing modules. [VERIFIED: codebase]

### Pattern 1: Static SEO Shell, Private Commerce Island

**What:** Render locale-default products and SEO on the server, but treat all purchase UI as unresolved until the private context and private commerce projection agree. Replace a whole catalog result/facet set rather than patching only shared product IDs. [VERIFIED: codebase]

**When to use:** Homepage featured products, catalog, category, collection, product offers/variants, wishlist hydration, and Add to Cart. [VERIFIED: codebase]

**Example:**

```tsx
// Source: https://next-intl.dev/docs/routing/setup
type CommerceState =
  | {status: 'resolving'; generation: number}
  | {status: 'error'; generation: number; retry: () => void}
  | {status: 'ready'; generation: number; market: 'vn' | 'intl'};

const agreed =
  context.status === 'ready' &&
  projection.market === context.market &&
  projection.generation === context.generation;

return <AddToCart disabled={!agreed} offer={agreed ? projection.offer : null} />;
```

The projection generation is a client request-generation guard; the server quote and submit functions remain the final authority. [VERIFIED: codebase]

### Pattern 2: Strict Server Resolution, Notification-only Cross-tab Sync

**What:** Resolve the HttpOnly cookie and deployment country only on the server. After a successful market action, broadcast a version/invalidation event through `BroadcastChannel` with a `storage` fallback; receiving tabs refetch context and requote rather than trusting the event payload. [VERIFIED: codebase]

**When to use:** Market changes, focus/visibility recovery, and multi-tab behavior. [VERIFIED: codebase]

**Example:**

```ts
// Source: project pattern; server remains authoritative
const generation = ++requestGeneration.current;
const response = await fetch('/api/storefront-context', {
  cache: 'no-store',
  signal: controller.signal
});
if (generation !== requestGeneration.current) return;
commit(await response.json());
```

### Pattern 3: Full Cache Identity and Private Delivery

**What:** Keep reusable database reads cached with explicit function arguments for every shaping dimension, while the Route Handler response is always `private, no-store`. `unstable_cache` already uses function arguments in its cache key; `keyParts` are additional identity, not a substitute for arguments. [VERIFIED: codebase; CITED: https://nextjs.org/docs/app/api-reference/functions/unstable_cache]

**When to use:** Catalog list/facets, category/collection projections, home featured slices, and product commerce projections. [VERIFIED: codebase]

```ts
// Source: https://nextjs.org/docs/app/api-reference/functions/unstable_cache
const projectCatalog = unstable_cache(
  async (locale, market, filters) => listCatalogProducts({locale, market, ...filters}),
  ['catalog-projection'],
  {revalidate: 300, tags: ['catalog']}
);
```

### Pattern 4: Atomic Market-change Fan-out

**What:** A market switch has pending, committed, and failed states. Commit only the server-confirmed market, then invalidate active projections, clear any quote cache keyed to the prior context, request a new authoritative quote, compute the existing material diff, and display the result. [VERIFIED: codebase]

**When to use:** Header/mobile market controls and cross-tab revalidation. [VERIFIED: codebase]

Do not call `revalidatePath` for a visitor preference: it invalidates a shared route/cache and is not client-private invalidation. [VERIFIED: codebase; CITED: https://nextjs.org/docs/app/api-reference/functions/revalidatePath]

### Pattern 5: Destination Authority Remains Downstream

**What:** Browsing market initializes checkout only before a physical destination exists. Once a destination is present, its country derives quote market; latest-request-wins and blocking material confirmation stay unchanged. Payment UI is derived from the accepted quote pair and resets when that pair changes. [VERIFIED: codebase]

**When to use:** Checkout hydration, address changes, saved address selection, and submission. [VERIFIED: codebase]

### Equivalent Localized Route Pattern

The current exact-string route mapper falls back to the locale homepage for dynamic product/category/collection routes. Dynamic switches must use localized slug data already present in catalog projections; catalog queries preserve only `search`, `type`, `category`, `technique`, `tag`, and `sort`, while auth preserves only validated internal `next`. [VERIFIED: codebase]

### Anti-Patterns to Avoid

- **Reading request context in an ISR page/layout/metadata/cache function:** this opts into dynamic behavior or returns empty values under `force-static`; use a private client fetch. [CITED: https://nextjs.org/docs/app/api-reference/functions/cookies; CITED: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config]
- **Overlaying active-market data onto the SEO-default list:** market-exclusive products and facets remain missing; replace the complete surface projection. [VERIFIED: codebase]
- **Treating a market cookie, client fingerprint, or quote hash as order authority:** all are replayable/stale client evidence; preserve database recalculation and validation. [VERIFIED: codebase]
- **Optimistically committing the market label before server success:** the current action can fail with no rollback; use explicit pending/commit/error state. [VERIFIED: codebase]
- **Using `revalidatePath` for per-user preference changes:** it targets shared server cache behavior and does not coordinate client state. [CITED: https://nextjs.org/docs/app/api-reference/functions/revalidatePath]
- **Caching a cart quote without active resolved market:** the existing cache can reuse a five-minute old quote after market change because its fingerprint includes line `marketAtAdd`, not current market. [VERIFIED: codebase]
- **Assuming old E2E selectors describe current controls:** existing tests target a removed separate market label while the current header exposes combined locale-market pairs. [VERIFIED: codebase]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Locale negotiation | Custom regex/q-value parser | next-intl middleware resolution | It already implements prefix, cookie, best-fit `Accept-Language`, and default precedence. [CITED: https://next-intl.dev/docs/routing/middleware] |
| Market/pricing authority | Client price conversion or browser overrides | Existing market-offer RPCs and quote/submit functions | Independent prices, inheritance, availability, inventory, discounts, and payment pairs are already enforced. [VERIFIED: codebase] |
| Cross-user cache partitioning | Ad hoc global maps keyed by cookie | Argument-complete `unstable_cache` plus private `no-store` delivery | Framework cache identity already includes arguments; request state cannot be read inside the cached scope. [CITED: https://nextjs.org/docs/app/api-reference/functions/unstable_cache] |
| Checkout race handling | A new quote state machine | Existing `quote-lifecycle.ts` latest-request-wins/material-confirmation model | It already retains accepted quotes and blocks stale/material replacement. [VERIFIED: codebase] |
| Order integrity | Client-signed projection or new checkout calculation | Existing database submit authority and immutable snapshot construction | The database locks and rechecks offers, variants, inventory, discounts, shipping, totals, and evidence. [VERIFIED: codebase] |
| Currency math | Floating point/format parsing | Existing integer minor-unit money utilities | VND/USD calculations must remain exact and currency explicit. [VERIFIED: AGENTS.md; VERIFIED: codebase] |

**Key insight:** This is an authority-boundary and state-convergence phase, not a new commerce-engine phase. Reuse the proven database and checkout layers and make client rendering incapable of becoming authoritative. [VERIFIED: codebase]

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | `ACTIVE_MARKET` and `NEXT_LOCALE` cookies, guest-cart local storage, and cart-quote session storage persist across reloads. [VERIFIED: codebase] | Preserve cookie names; add an active-context/version dimension to quote-cache validation, invalidate on market change, and migrate stale stored payloads by rejection rather than mutation. No database data migration is required for the recommended DTO-only projection identity. [VERIFIED: codebase] |
| Live service config | Vercel supplies `x-vercel-ip-country` only in deployment; local development may omit it. Supabase RPC definitions are migration-owned in git; no UI-only market configuration was found. [VERIFIED: codebase; CITED: https://vercel.com/docs/headers/request-headers] | Treat a missing header as `intl`; verify preview/production header behavior without making IP authoritative. Apply a migration only if a DB projection version is chosen instead of the recommended deterministic DTO fingerprint. [VERIFIED: codebase] |
| OS-registered state | None — this refactor does not rename a service, executable, scheduled task, or process registration; repository and project scripts contain no phase-specific OS registration. [VERIFIED: codebase] | No OS migration. [VERIFIED: codebase] |
| Secrets/env vars | Existing site URL and Supabase variables remain; no locale/market secret or renamed environment key is required. [VERIFIED: codebase] | Do not add a client-readable market authority or log raw headers/cookies; retain existing variable names. [VERIFIED: codebase] |
| Build artifacts | `.next` route/type manifests encode route classification; a stale generated validator was found during the first build and the regenerated production build passed. [VERIFIED: environment] | Rebuild from generated output when needed and use the production route table as the gate; do not commit `.next` or generated `next-env.d.ts` drift. [VERIFIED: codebase] |

## Common Pitfalls

### Pitfall 1: Catalog silently remains dynamic

**What goes wrong:** Source code appears request-independent, but `searchParams`-driven server rendering keeps `/[locale]/catalog` dynamic. [VERIFIED: `npm run build`]

**Why it happens:** The route renders per-query search/filter state and metadata on the server rather than keeping a deterministic base shell. [VERIFIED: codebase]

**How to avoid:** Render the default catalog/metadata deterministically, parse allowlisted query state in the client commerce island, and fetch the complete private list/facets. Accept one canonical metadata projection for query variants; do not reintroduce dynamic query-dependent metadata. [VERIFIED: codebase]

**Warning signs:** The build route table shows `ƒ /[locale]/catalog`, or cookie/IP variants change HTML/JSON-LD. [VERIFIED: `npm run build`]

### Pitfall 2: Locale fallback and auth-entry divergence

**What goes wrong:** Missing language input selects `en`, q-values are ignored, and localized auth entries bypass locale/market middleware composition. [VERIFIED: codebase]

**Why it happens:** Custom redirect logic runs before next-intl while proxy bypass rules return early. [VERIFIED: codebase]

**How to avoid:** Let next-intl middleware implement the locked priority, compose its response with session and market-cookie handling, and exclude only the actual callback/service boundaries that require it. [CITED: https://next-intl.dev/docs/routing/middleware]

**Warning signs:** `/` without headers redirects to `/en`, a low-quality `vi` token beats a higher-quality `en`, or direct `/vi/dang-nhap` does not update preferences. [VERIFIED: codebase]

### Pitfall 3: Stale response re-enables purchase

**What goes wrong:** A slow projection for the prior market overwrites a rapid switch, or a guessed locale market enables Add to Cart before resolution. [VERIFIED: codebase]

**Why it happens:** Current context has no lifecycle/generation, coalesces a single in-flight request, swallows errors, and product props are static. [VERIFIED: codebase]

**How to avoid:** Use monotonic generations plus abort, discard mismatched responses, and require context/projection market and generation agreement. Keep failure localized and closed. [VERIFIED: codebase]

**Warning signs:** Market label, displayed currency, variants, and `marketAtAdd` disagree after rapid switching or API failure. [VERIFIED: codebase]

### Pitfall 4: Partial overlays erase market-exclusive discovery

**What goes wrong:** Only products already in the SEO-default markup are repriced, so active-market-only products and facets never appear. [VERIFIED: codebase]

**Why it happens:** Personalization is modeled per card instead of per complete query result. [VERIFIED: codebase]

**How to avoid:** Project the entire list and facet set for the active locale, market, search, type, taxonomy filters, sort, and surface; discard the prior set atomically. [VERIFIED: codebase]

**Warning signs:** Exclusive test fixtures remain absent after switching, or facet counts describe a different market than the grid. [VERIFIED: codebase]

### Pitfall 5: Cart quote cache survives a market transition

**What goes wrong:** A five-minute cached quote is restored after the active market changes. [VERIFIED: codebase]

**Why it happens:** The cache identity contains locale and stored line `marketAtAdd`, not the current resolved browsing market/context version. [VERIFIED: codebase]

**How to avoid:** Clear the cache on market commit and include accepted quote market plus active context generation/version in validation. Immediately requote and show the existing material diff. [VERIFIED: codebase]

**Warning signs:** Header currency changes while cart totals do not, or a refresh restores the prior currency. [VERIFIED: codebase]

### Pitfall 6: Payment control drifts from the accepted quote

**What goes wrong:** Both PayPal and VietQR remain selectable after the accepted quote market changes, producing late server rejection. [VERIFIED: codebase]

**Why it happens:** Payment intent is local state initialized to PayPal and is not derived/reset from the accepted quote pair. [VERIFIED: codebase]

**How to avoid:** Render only the allowed method and reset it on accepted `market/currency` change; keep the database invariant as the final check. [VERIFIED: codebase]

**Warning signs:** VietQR appears for `intl+USD` or PayPal for `vn+VND`. [VERIFIED: codebase]

### Pitfall 7: Dynamic localized paths collapse to home

**What goes wrong:** Switching language on product/category/collection falls back to `/{locale}`. [VERIFIED: codebase]

**Why it happens:** The mapper compares exact strings against templates and does not substitute localized dynamic slugs. [VERIFIED: codebase]

**How to avoid:** Carry both localized slugs in route projection data and build the equivalent path by route kind; apply route-specific query allowlists. [VERIFIED: codebase]

**Warning signs:** Locale switch loses the current entity or carries arbitrary nested query parameters. [VERIFIED: codebase]

### Pitfall 8: Tests pass while asserting obsolete behavior

**What goes wrong:** Unit tests codify `en` fallback and global `revalidatePath`, while E2E locators target legacy separate market controls. [VERIFIED: codebase]

**Why it happens:** UI and context work moved faster than characterization tests. [VERIFIED: codebase]

**How to avoid:** Make Wave 0 replace stale assertions with locked contracts before implementation; do not treat the current 13 passing targeted tests as phase correctness. [VERIFIED: environment; VERIFIED: codebase]

## Code Examples

### Strict Market Mutation Result

```ts
// Source: project authority boundary
const marketSchema = z.enum(['vn', 'intl']);

export async function setActiveMarketAction(input: unknown) {
  const market = marketSchema.parse(input);
  // Set the HttpOnly cookie, then return the server-accepted value.
  return {market, contextVersion: crypto.randomUUID()};
}
```

Invalid values must fail; the current silent coercion to `intl` hides corruption and makes rollback ambiguous. The version is a client invalidation token, not order evidence. [VERIFIED: codebase]

### Product Projection Fingerprint

```ts
// Source: project projection contract
type ProductCommerceProjection = {
  productId: string;
  locale: 'vi' | 'en';
  market: 'vn' | 'intl';
  currency: 'VND' | 'USD' | null;
  available: boolean;
  inStock: boolean;
  priceMinor: number | null;
  variants: Array<{
    id: string;
    enabled: boolean;
    inStock: boolean;
    priceMinor: number | null;
  }>;
  otherMarket: 'vn' | 'intl' | null;
  offerFingerprint: string;
};
```

Compute `offerFingerprint` deterministically from normalized product/variant offer and inventory fields returned by the RPC. It prevents accepting a stale rendered choice; quote and submit still re-read authoritative records. [VERIFIED: codebase]

### Static next-intl Page Pattern

```tsx
// Source: https://next-intl.dev/docs/routing/setup
export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export default async function Page({params}: PageProps) {
  const {locale} = await params;
  setRequestLocale(locale);
  return <StaticSeoShell locale={locale} />;
}
```

Call `setRequestLocale` before locale-sensitive server APIs in each relevant layout/page and keep request cookies/headers out of this path. [CITED: https://next-intl.dev/docs/routing/setup]

### Private Route Handler Boundary

```ts
// Source: https://nextjs.org/docs/app/getting-started/route-handlers
export async function GET(request: Request) {
  const context = await resolveStorefrontContext();
  const filters = catalogProjectionQuerySchema.parse(new URL(request.url).searchParams);
  const payload = await projectCatalog({locale: filters.locale, market: context.market, ...filters});
  return Response.json(payload, {
    headers: {'Cache-Control': 'private, no-store'}
  });
}
```

The server-resolved market overrides any caller claim; locale/filter/sort inputs are bounded and all shaping inputs flow into the cached function arguments. [VERIFIED: codebase; CITED: https://nextjs.org/docs/app/api-reference/functions/unstable_cache]

## State of the Art

| Old/Current Approach | Required Approach | When/Why | Impact |
|----------------------|-------------------|----------|--------|
| Hand-written `Accept-Language` regex and default `en` | next-intl middleware best-fit resolution with default `vi` | Locked Phase 09 contract; next-intl already implements the precedence. [CITED: https://next-intl.dev/docs/routing/middleware] | Correct unprefixed/direct-entry behavior without duplicate negotiation logic. |
| Combined `vn+vi` / `intl+en` selector | Independent locale and market controls | Phase 09 makes the axes orthogonal. [VERIFIED: codebase] | Supports all four combinations and accessible active states. |
| Locale-default offer is also purchasable | Locale-default SEO shell plus gated private commerce projection | Needed to keep ISR deterministic while personalizing price/availability. [VERIFIED: codebase] | Prevents stale/wrong-market Add to Cart. |
| Per-card market overlay | Complete active-market list and facets | Market-exclusive products cannot be discovered through overlays. [VERIFIED: codebase] | Correct search, filters, counts, and featured surfaces. |
| Market action calls `revalidatePath` | Client-private invalidation and authoritative requote | Shared cache invalidation is the wrong scope for visitor preference. [CITED: https://nextjs.org/docs/app/api-reference/functions/revalidatePath] | Avoids global churn and synchronizes the actual client state. |
| Cache helper tests a key builder not used by `unstable_cache` | Test actual wrapper argument isolation and endpoint response headers | Current test gives false assurance about runtime caching. [VERIFIED: codebase] | Detects market/filter cache leakage. |

**Deprecated/outdated:**

- Legacy combined commerce switcher assumptions and the older unused separate market selector should be consolidated into one independent control system. [VERIFIED: codebase]
- Custom locale fallback expectations (`missing -> en`) and market-action `revalidatePath` expectations must be removed from tests. [VERIFIED: codebase]
- Cache Components/PPR examples are not applicable because the project has not enabled `cacheComponents`; route segment configuration remains valid. [VERIFIED: codebase; CITED: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | No unverified factual claims are used as implementation decisions. | All | All recommendations are grounded in locked context, repository evidence, production build output, environment probes, or official documentation. |

## Open Questions (RESOLVED)

1. **RESOLVED — CAT-05 requires dedicated public technique and tag routes in this phase.**
   - What we know: The requirement explicitly says product, category, technique, tag, and collection pages. Product/category/collection routes exist; database queries accept technique/tag IDs, but public route directories and catalog list state do not expose technique/tag browsing. [VERIFIED: codebase]
   - What's unclear: The locked Phase 09 surface list names homepage/catalog/category/collection/product, and CAT-05 is marked complete upstream despite the missing route evidence. [VERIFIED: codebase; VERIFIED: CONTEXT.md]
   - Resolution: D-27 interprets CAT-05 literally and requires localized, indexable technique and tag discovery pages using the same static locale-default shell plus private active-market projection contract as category and collection pages. [VERIFIED: CONTEXT.md]

2. **RESOLVED — catalog query variants use deterministic base metadata and canonical consolidation.**
   - What we know: Current dynamic metadata marks any catalog query `noindex`; making metadata query-dependent keeps the route dynamic, while the locked contract requires ISR. The canonical URL already points at the base localized catalog. [VERIFIED: codebase; VERIFIED: `npm run build`]
   - What's unclear: CONTEXT.md locks deterministic metadata but does not explicitly choose between canonical-only consolidation and retaining query-specific `noindex`. [VERIFIED: CONTEXT.md]
   - Resolution: D-28 keeps deterministic base-page metadata and canonical consolidation, moves allowlisted search/filter/sort state into the client projection, and forbids server-side `searchParams` access for query-dependent metadata. [VERIFIED: CONTEXT.md]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Next.js build/tests | ✓ | 24.16.0 | Project minimum is already exceeded. [VERIFIED: environment] |
| npm | Scripts/dependencies | ✓ | 10.5.0 | — [VERIFIED: environment] |
| Supabase CLI | DB reset/lint/tests/types | ✓ | 2.106.0 | Avoid DB changes if deterministic DTO fingerprint suffices. [VERIFIED: environment] |
| Docker daemon | Local Supabase/E2E | ✓ | 24.0.7 | — [VERIFIED: environment] |
| Playwright | Browser matrix | ✓ | 1.60.0 | — [VERIFIED: environment] |
| Vercel deployment geo header | IP suggestion production behavior | Local: ✗; deployment: expected | deployment-managed | Test missing-header fallback locally and header precedence through injected requests/preview. [VERIFIED: environment; CITED: https://vercel.com/docs/headers/request-headers] |

**Missing dependencies with no fallback:** none. [VERIFIED: environment]

**Missing dependencies with fallback:** local Vercel country header; use explicit test headers and verify a deployed preview before release. [VERIFIED: environment]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.8 (unit/integration), Node test runner (security), Playwright 1.60.0 (E2E), Next.js 16.2.9 production build [VERIFIED: codebase] |
| Config file | `vitest.config.ts`, `playwright.config.ts`, package scripts [VERIFIED: codebase] |
| Quick run command | `npm run test:unit -- tests/unit/i18n/routing.test.ts tests/unit/catalog/storefront-projection.test.ts tests/unit/cart/market-sync.test.ts tests/unit/checkout/quote-lifecycle.test.ts` [VERIFIED: codebase] |
| Full suite command | `npm run ci` [VERIFIED: codebase] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MKT-01 | Locale precedence, direct/unprefixed entry, equivalent localized paths | unit + E2E | `npm run test:unit -- tests/unit/i18n/routing.test.ts && npx playwright test tests/e2e/localization.spec.ts` | ✅ update existing |
| MKT-02 | Four locale/market currency combinations | unit + E2E | `npx playwright test tests/e2e/catalog-market.spec.ts` | ✅ rewrite stale coverage |
| MKT-03 | Market-exclusive products appear/disappear as complete sets | E2E | `npx playwright test tests/e2e/catalog-discovery.spec.ts` | ✅ update existing |
| MKT-04 | Parent/variant independent price projection | unit + DB | `npm run test:unit -- tests/unit/catalog/storefront-projection.test.ts && npm run db:test` | ❌ Wave 0 unit |
| MKT-05 | Cookie-over-IP, invalid cookie, missing header, active label | unit + E2E | `npm run test:unit -- tests/unit/catalog/market.test.ts && npx playwright test tests/e2e/catalog-market.spec.ts` | ✅ extend existing |
| MKT-06 | Destination replaces browsing market with confirmation | unit + E2E | `npm run test:unit -- tests/unit/checkout/quote-lifecycle.test.ts && npx playwright test tests/e2e/checkout-market-change.spec.ts` | ✅ extend existing |
| CAT-05 | Product/category/technique/tag/collection discovery | E2E | `npx playwright test tests/e2e/catalog-discovery.spec.ts` | ✅ but missing technique/tag cases |
| CAT-06 | Search/filter/sort complete active-market results/facets | unit + E2E | `npm run test:unit -- tests/unit/catalog/storefront-projection.test.ts && npx playwright test tests/e2e/catalog-discovery.spec.ts` | ❌ Wave 0 unit |
| CAT-08 | Variant projection agreement gates Add to Cart | unit + E2E | `npm run test:unit -- tests/unit/catalog/product-commerce.test.ts && npx playwright test tests/e2e/catalog-market.spec.ts` | ❌ Wave 0 unit |
| CART-03 | Market change clears cache and requotes server totals | unit + E2E | `npm run test:unit -- tests/unit/cart/market-sync.test.ts tests/unit/cart/quote-cache.test.ts && npx playwright test tests/e2e/cart.spec.ts` | ❌ Wave 0 sync unit |
| CART-05 | Submit still creates authoritative immutable snapshots | DB + E2E | `npm run db:test && npx playwright test tests/e2e/checkout.spec.ts` | ✅ extend existing |
| SEO-02 | hreflang/canonical invariant across cookie/IP | unit + E2E/build | `npm run test:unit -- tests/unit/content/seo.test.ts && npx playwright test tests/e2e/launch-seo.spec.ts` | ✅ extend existing |
| SEO-03 | Product JSON-LD deterministic while hydrated UI changes | unit + E2E | `npm run test:unit -- tests/unit/content/json-ld.test.ts && npx playwright test tests/e2e/catalog-detail-seo.spec.ts` | ✅ extend existing |
| SEO-04 | robots/sitemaps localized and cookie/IP invariant | E2E | `npx playwright test tests/e2e/launch-seo.spec.ts` | ✅ extend existing |
| OPS-04 | Full matrix, races, API failure, multi-tab/focus, checkout regressions | full suite | `npm run ci` | ✅ infrastructure; ❌ Wave 0 cases |

### Required Contract and Race Matrix

- Resolution table: all four locale/market combinations; valid cookie over IP; invalid cookie recovery; missing country header; direct localized and unprefixed entry; locale switch preserving market; market switch preserving locale/equivalent path/allowlisted query. [VERIFIED: CONTEXT.md]
- Lifecycle table: resolving, ready, error/retry; stale context response; stale projection response; rapid A→B→A switch; failed action rollback; client navigation; reload; focus/visibility; two-tab invalidation. [VERIFIED: CONTEXT.md]
- Commerce table: home/catalog/category/collection/product/wishlist use the same market; exclusive additions/removals; repricing; currency changes; variant availability; Add to Cart disabled until agreement. [VERIFIED: CONTEXT.md]
- Checkout table: digital, physical, mixed; guest/signed-in; VN→US and US→VN; unavailable offer; discount/shipping revalidation; VietQR/PayPal; stale submit rejection. [VERIFIED: CONTEXT.md]
- SEO/cache table: build route classification, response headers, shared HTML/JSON-LD equality across cookie/IP, private endpoint `private, no-store`, and distinct database projection results for every shaping argument. [VERIFIED: CONTEXT.md]

### Sampling Rate

- **Per task commit:** targeted Vitest file(s), plus `npm run typecheck` for contract changes. [VERIFIED: codebase]
- **Per wave merge:** `npm run lint && npm run typecheck && npm run test:unit`; add DB/security/E2E commands for affected boundaries. [VERIFIED: codebase]
- **Phase gate:** `npm run ci`, inspect `npm run build` route table, and verify public HTML/metadata/cache behavior under differing cookie/IP requests before `$gsd-verify-work`. [VERIFIED: CONTEXT.md]

### Wave 0 Gaps

- [ ] `tests/unit/storefront-context-lifecycle.test.ts` — lifecycle, generation, abort, failure, focus, and cross-tab notification behavior. [VERIFIED: codebase]
- [ ] `tests/unit/catalog/storefront-projection.test.ts` — strict inputs, complete result/facet replacement, cache argument isolation, private headers. [VERIFIED: codebase]
- [ ] `tests/unit/catalog/product-commerce.test.ts` — projection fingerprint and Add to Cart agreement. [VERIFIED: codebase]
- [ ] `tests/unit/cart/market-sync.test.ts` — cache invalidation, latest-request-wins requote, material diffs. [VERIFIED: codebase]
- [ ] Rewrite stale assertions in `tests/unit/i18n/routing.test.ts`, `tests/unit/catalog/market.test.ts`, `tests/e2e/localization.spec.ts`, and `tests/e2e/catalog-market.spec.ts`. [VERIFIED: codebase]
- [ ] Extend `tests/security/catalog-boundaries.test.mjs` for shared-cache isolation, validated endpoint inputs, forbidden request APIs in static paths, and non-authoritative fingerprints. [VERIFIED: codebase]
- [ ] Add a build-report assertion that home/category/collection/product/catalog are `●`/`○`, never `ƒ`; baseline currently fails only for catalog. [VERIFIED: `npm run build`]
- [ ] Add Playwright multi-context tests for rapid switching, stale network responses, failed action rollback, focus, and cross-tab convergence. [VERIFIED: codebase]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Limited | Public catalog projections need no login; preserve existing Supabase session resolution and expose only the minimal user DTO. [VERIFIED: codebase] |
| V3 Session Management | Yes | HttpOnly, Secure-in-production, SameSite=Lax cookies; client receives resolved state, never raw cookie authority. [VERIFIED: codebase] |
| V4 Access Control | Yes | Keep admin/user data behind existing server/RLS boundaries; public commerce projection contains only publishable product data. [VERIFIED: codebase] |
| V5 Input Validation | Yes | Zod exact enums, bounded text, UUID validation, sort/filter allowlists, internal-return-path validation, and server-derived market. [VERIFIED: codebase] |
| V6 Cryptography | No new primitive | Do not use the projection fingerprint or quote hash as authorization; preserve server/database recalculation and existing payment/entitlement cryptography. [VERIFIED: codebase] |

### Known Threat Patterns for Next.js/Supabase Commerce Projection

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged geo header or cookie | Spoofing | Geo/IP is suggestion only; validate enum cookie; destination and database remain order authority. [VERIFIED: codebase] |
| Cross-market shared-cache leak | Information disclosure | No request APIs in ISR/cache scope, all shaping arguments in cache identity, private responses `no-store`, cache-isolation tests. [CITED: https://nextjs.org/docs/app/api-reference/functions/unstable_cache] |
| Stale response after rapid switch | Tampering | Monotonic generation, abort, market/generation agreement, fail-closed purchase controls. [VERIFIED: codebase] |
| Open redirect/query smuggling in switches | Spoofing | Route-aware equivalent path construction and explicit query allowlists; reject external/nested `next`. [VERIFIED: codebase] |
| Stale client offer used for cart/order | Tampering | Projection fingerprint only gates UI; quote and submit re-read offers, inventory, discounts, shipping, and payment pair. [VERIFIED: codebase] |
| Market mutation CSRF/preferences fixation | Tampering | SameSite HttpOnly cookie, framework action origin protections, strict enum, and no authorization derived from the preference. [VERIFIED: codebase] |
| Private context cached by intermediary | Information disclosure | `Cache-Control: private, no-store` on every context/projection response; E2E header assertion. [VERIFIED: codebase] |
| Sensitive logging | Information disclosure | Log stable error codes and bounded facts only; do not record cookies, raw headers, query text, customer data, or projection bodies. [VERIFIED: codebase] |
| Cross-tab state divergence | Tampering | Broadcast only invalidation/version, then refetch server context and requote; never accept raw market/price from another tab. [VERIFIED: codebase] |

## Sources

### Primary (HIGH confidence)

- Repository source, migrations, tests, configuration, and `AGENTS.md` — current resolution, caching, projection, cart, checkout, security, and test behavior. [VERIFIED: codebase]
- `npm run build` on 2026-07-22 — successful production build and exact route classification baseline. [VERIFIED: environment]
- npm registry checks on 2026-07-22 — installed package versions, publication dates, postinstall absence, and legitimacy-seam warnings. [CITED: https://registry.npmjs.org]
- https://nextjs.org/docs/app/api-reference/functions/cookies — request-time cookie semantics and dynamic behavior. [CITED: official docs]
- https://nextjs.org/docs/app/api-reference/functions/headers — request-time header semantics and dynamic behavior. [CITED: official docs]
- https://nextjs.org/docs/app/api-reference/functions/unstable_cache — cache key arguments, `keyParts`, tags, and request API restriction. [CITED: official docs]
- https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config — current route segment caching controls and `force-static` behavior. [CITED: official docs]
- https://nextjs.org/docs/app/api-reference/functions/generate-static-params — static generation behavior for dynamic routes. [CITED: official docs]
- https://nextjs.org/docs/app/getting-started/route-handlers — Route Handler behavior and caching boundary. [CITED: official docs]
- https://nextjs.org/docs/app/api-reference/functions/revalidatePath — shared path invalidation behavior. [CITED: official docs]
- https://next-intl.dev/docs/routing/setup — App Router localized static rendering setup. [CITED: official docs]
- https://next-intl.dev/docs/routing/middleware — locale negotiation precedence and best-fit matching. [CITED: official docs]
- https://next-intl.dev/docs/routing/configuration — routing, prefix, and locale-cookie configuration. [CITED: official docs]
- https://vercel.com/docs/headers/request-headers — deployment request country header. [CITED: official docs]

### Secondary (MEDIUM confidence)

- Official documentation pages were located through the research-plan fallback web provider and checked against current repository behavior. [VERIFIED: research seam]

### Tertiary (LOW confidence)

- None. [VERIFIED: research scope]

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — locked by AGENTS.md, pinned in `package.json`, registry metadata checked, and no new dependency is proposed; any later upgrade is explicitly gated. [VERIFIED: codebase; CITED: https://registry.npmjs.org]
- Architecture: HIGH — derived from current route/RPC/cart/checkout boundaries, locked decisions, official framework behavior, and production build output. [VERIFIED: codebase; VERIFIED: environment]
- Pitfalls: HIGH — each is reproduced by source inspection, stale tests, cache identity, or build classification. [VERIFIED: codebase; VERIFIED: environment]

**Research date:** 2026-07-22
**Valid until:** 2026-08-21 (30 days; framework versions are pinned and no new packages are proposed). [VERIFIED: codebase]
