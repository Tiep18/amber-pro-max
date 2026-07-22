# Phase 09: Independent Locale and Market Commerce Projection - Pattern Map

**Mapped:** 2026-07-22
**Files classified:** 31 new/modified candidates
**Analogs found:** 31 / 31

This map turns the responsibility boundaries in `09-CONTEXT.md`, `09-RESEARCH.md`, `09-UI-SPEC.md`, and `09-VALIDATION.md` into concrete repository analogs. Names marked **proposed** come from the research structure; the planner may consolidate them, but it should preserve the boundary.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `src/proxy.ts` | middleware | request-response | `src/proxy.ts` | exact, modify |
| `src/i18n/routing.ts` | config/utility | transform | `src/i18n/routing.ts` | exact, modify |
| `src/catalog/market.ts` | utility | transform | `src/catalog/market.ts` | exact, modify |
| `src/catalog/market-actions.ts` | service/action | request-response | `src/catalog/market-actions.ts` | exact, modify |
| `src/app/api/storefront-context/route.ts` | route | request-response | same file | exact, modify |
| `src/catalog/projection-schemas.ts` **proposed** | model/validation | transform | `src/catalog/schemas.ts` | role-match |
| `src/catalog/projections.ts` **proposed** | service/model | transform | `src/catalog/queries.ts` | role-match |
| `src/app/api/storefront/catalog/route.ts` **proposed** | route | request-response | `src/app/api/storefront-context/route.ts` | exact flow |
| `src/app/api/storefront/products/[productId]/route.ts` **proposed** | route | request-response | `src/app/api/storefront-context/route.ts` | exact flow |
| `src/catalog/public-cache.ts` | service/cache | CRUD projection | same file | exact, extend |
| `src/components/storefront-context.tsx` | provider | event-driven/request-response | same file | exact, replace lifecycle |
| `src/components/commerce-context-switcher.tsx` | component | event-driven | same file | exact, refactor independent axes |
| `src/components/locale-switcher.tsx` | component | event-driven/navigation | `src/components/commerce-context-switcher.tsx` | role-match/consolidate |
| `src/components/market-switcher.tsx` | component | event-driven | `src/components/commerce-context-switcher.tsx` | role-match/consolidate |
| `src/components/catalog/catalog-commerce.tsx` **proposed** | component | request-response/transform | `src/components/storefront-context.tsx` | lifecycle-match |
| `src/components/catalog/product-commerce.tsx` **proposed** | component | request-response/transform | `src/components/storefront-context.tsx` | lifecycle-match |
| `src/components/catalog/add-to-cart.tsx` | component | event-driven | same file plus quote lifecycle | role-match |
| `src/cart/quote-cache.ts` | store/utility | session storage | same file | exact, modify identity |
| `src/cart/market-sync.ts` **proposed** | service | event-driven/request-response | `src/checkout/quote-lifecycle.ts` | exact lifecycle |
| `src/components/cart/cart-provider.tsx` | provider/store | event-driven/request-response | same file | exact, extend |
| `src/components/checkout/quote-diff-dialog.tsx` | component | event-driven | same file | exact, accessibility upgrade |
| `src/messages/en.json`, `src/messages/vi.json` | config/content | transform | existing message catalogs | exact, extend |
| `src/app/[locale]/catalog/page.tsx` | route/page | ISR/static | `src/app/[locale]/category/[categorySlug]/page.tsx` | role-match |
| `tests/unit/storefront-context-lifecycle.test.ts` **new** | test | event-driven | `tests/unit/checkout/quote-lifecycle.test.ts` | exact lifecycle |
| `tests/unit/catalog/storefront-projection.test.ts` **new** | test | request-response/cache | `tests/unit/catalog/public-cache.test.ts` | role-match |
| `tests/unit/catalog/product-commerce.test.ts` **new** | test | transform/event-driven | `tests/unit/catalog/add-to-cart.test.ts` | role-match |
| `tests/unit/cart/market-sync.test.ts` **new** | test | event-driven/request-response | `tests/unit/checkout/quote-lifecycle.test.ts` | exact lifecycle |
| `tests/unit/i18n/routing.test.ts`, `tests/unit/catalog/market.test.ts` | test | transform | same files | exact, rewrite stale assumptions |
| `tests/security/catalog-boundaries.test.mjs` | security test | file-I/O/source assertion | `tests/security/checkout-boundaries.test.mjs` | exact style |
| build-route assertion **proposed under `tests/unit/content/`** | test | batch/file-I/O | `tests/unit/content/storefront-performance.test.ts` | role-match |
| `tests/e2e/localization.spec.ts`, `catalog-market.spec.ts`, `catalog-discovery.spec.ts`, `cart.spec.ts`, `checkout-market-change.spec.ts`, SEO specs | E2E tests | request-response/event-driven | current specs and `tests/e2e/fixtures/authenticated-users.ts` | exact, extend |

## Pattern Assignments

### Proxy and locale/market resolution

**Apply to:** `src/proxy.ts`, `src/i18n/routing.ts`, `src/catalog/market.ts`  
**Analog:** `src/proxy.ts`

**Response composition and precedence** (`src/proxy.ts:24-35`):

```ts
if (isUnprefixedCustomerPath(pathname)) {
  const savedLocale = request.cookies.get('NEXT_LOCALE')?.value;
  const locale = isLocale(savedLocale)
    ? savedLocale
    : preferredLocale(request.headers.get('accept-language'));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  url.search = search;
  return updateSession(request, applyMarketSuggestionCookie(request, NextResponse.redirect(url)));
}
return updateSession(request, applyMarketSuggestionCookie(request, intlMiddleware(request)));
```

Keep the composition order: next-intl supplies the locale response, market suggestion mutates that response, and Supabase session refresh receives the same response. Replace the hand-written `preferredLocale` path with next-intl negotiation. Keep `/auth/callback` isolated, but remove the localized-auth bypass only if proxy tests prove session and locale behavior together.

**Routing conventions** (`src/i18n/routing.ts:98-107`):

```ts
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always',
  pathnames,
  localeDetection: false
});

export function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}
```

Dynamic equivalent routes cannot use the current exact-match fallback (`src/i18n/routing.ts:188-210`) because it collapses product/category/collection paths to the locale home. Extend the mapper with translated slug data supplied by projections. Preserve only route-specific allowlisted query keys.

### Private storefront Route Handlers

**Apply to:** context, catalog, and product projection handlers  
**Analog:** `src/app/api/storefront-context/route.ts`

**Minimal private response** (`src/app/api/storefront-context/route.ts:1-8`):

```ts
import { NextResponse } from 'next/server';
import { getRequestHeaderUser } from '@/auth/request-user';
import { getRequestMarket } from '@/catalog/page-context';

export async function GET() {
  const [market, user] = await Promise.all([getRequestMarket(), getRequestHeaderUser()]);
  return NextResponse.json({ market, user }, { headers: { 'Cache-Control': 'private, no-store' } });
}
```

Copy the response boundary exactly. For projection routes, validate locale/IDs/filter/sort bounds with Zod, derive market on the server (ignore/reject caller market), return stable error codes without raw cookies/headers/query bodies, and set `private, no-store` on success and error responses.

### Cached catalog RPC wrappers and projection DTOs

**Apply to:** `projection-schemas.ts`, `projections.ts`, `public-cache.ts`  
**Analog:** `src/catalog/public-cache.ts`

**Server-only imports and dependency pattern** (`src/catalog/public-cache.ts:1-15`):

```ts
import 'server-only';
import { unstable_cache } from 'next/cache';
import type { Locale } from '@/i18n/routing';
import { CACHE_TAGS } from '@/lib/cache-tags';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import type { MarketCode } from './market';
```

**Argument-complete cache wrapper** (`src/catalog/public-cache.ts:17-22,37-47`):

```ts
async function catalogProducts(input: CatalogListInput) {
  return listCatalogProducts(input, createSupabasePublicClient());
}

const cacheOptions = { revalidate: 300, tags: [CACHE_TAGS.catalog] };

export const getCachedCatalogProducts = unstable_cache(
  catalogProducts,
  ['catalog-products'],
  cacheOptions
);
```

The cached function argument must contain locale, market, surface identity, search, filters, sort, pagination/limit and every facet/result-shaping value. `keyParts` name the function; they do not replace arguments. Catalog projections return the complete list and matching facets atomically. Product projections return price/currency/availability/stock/variants/other-market facts plus a stable projection fingerprint used only to gate UI.

### Storefront lifecycle and latest-request-wins

**Apply to:** `storefront-context.tsx`, catalog/product commerce islands, `cart/market-sync.ts`  
**Analogs:** `src/components/storefront-context.tsx`, `src/checkout/quote-lifecycle.ts`

**Current fetch/focus seam to evolve** (`src/components/storefront-context.tsx:42-63,78-90`):

```ts
const lastValidatedAt = useRef<number | null>(null);
const requestInFlight = useRef<Promise<void> | null>(null);

const request = fetch('/api/storefront-context', { cache: 'no-store' })
  .then((response) => response.ok ? response.json() : null)
  .then((value) => {
    if (value) {
      setContext(value);
      lastValidatedAt.current = Date.now();
    }
  });
```

Replace locale-derived ready state with a discriminated `resolving | ready | error` state. Use a monotonically increasing generation and `AbortController`; only the active generation may commit. Focus, visibility and cross-tab signals refetch server context. Broadcast only invalidation/version—not market, price, or quote data.

**Latest response guard** (`src/checkout/quote-lifecycle.ts:81-108`):

```ts
const requestId = state.lastRequestId + 1;
// ... state.activeRequestId = requestId
if (requestId !== state.activeRequestId) {
  return state;
}
```

**Fail-closed proposal pattern** (`src/checkout/quote-lifecycle.ts:129-150`):

```ts
const materialChanges = diffMaterialQuotes(state.acceptedQuote, result.quote);
const cartChanges = diffLifecycleCartQuotes(state.acceptedQuote, result.quote);
if (materialChanges.length > 0 || cartChanges.length > 0) {
  return {...settled, proposal: {quote: result.quote, materialChanges, cartChanges}, issue: null};
}
return {...settled, acceptedQuote: result.quote, proposal: null, issue: null};
```

Use the same shape for market switches: pending mutation, server-confirmed commit, projection invalidation, quote cache invalidation, authoritative requote, material proposal/summary. A failed mutation restores the prior committed state and durable localized error. Purchase remains disabled unless context market+generation equals projection market+generation.

### Cart cache and quote preservation

**Apply to:** `src/cart/quote-cache.ts`, `src/cart/market-sync.ts`, cart provider  
**Analog:** `src/cart/quote-cache.ts`

**Defensive storage read** (`src/cart/quote-cache.ts:48-67`):

```ts
if (
  cached.locale !== options.locale ||
  cached.fingerprint !== cartLinesFingerprint(options.lines) ||
  typeof cached.validatedAt !== 'number' ||
  now - cached.validatedAt > CART_QUOTE_TTL_MS ||
  !looksLikeCartQuote(cached.quote)
) return null;
```

Add resolved market/context version to both options and stored identity; clear/ignore the cache on any mismatch. Keep storage errors non-fatal (`src/cart/quote-cache.ts:82-84`). `marketAtAdd` remains intent evidence, never the current quote authority.

### Independent localized controls and material dialog

**Apply to:** commerce/locale/market controls and `quote-diff-dialog.tsx`  
**Analog:** `src/components/commerce-context-switcher.tsx`

Reuse the existing DropdownMenu styling and 44px target (`src/components/commerce-context-switcher.tsx:91-110`), but replace paired `VN / VI` and `INTL / EN` options with two named radio groups. Locale navigation preserves market; market mutation preserves locale. Do not optimistically dispatch `notifyStorefrontContextChanged({market})` as the current code does at lines 81-88; notify after server confirmation.

Use `aria-current` for locale navigation and checked radio semantics for market. Mobile uses the existing Sheet plus visible fieldset/legend groups. One shared polite atomic live region reports convergence; blocking failures use `role="alert"`.

The current dialog already supplies `role="dialog"` and `aria-modal` (`src/components/checkout/quote-diff-dialog.tsx:65-70`). Extend it with `aria-describedby`, focus trap, Escape, and focus restoration; localize every change label currently generated in English at lines 25-47.

### Static/ISR pages and build gate

**Apply to:** catalog page and performance/build assertions  
**Analog:** `tests/unit/content/storefront-performance.test.ts`

Follow existing source-boundary assertions: load route source with `readFileSync`, assert static exports/revalidation, and reject request APIs. The new build assertion must parse the production build route table and require home, catalog, category, collection and product to be static/ISR (`●`/`○`), never dynamic (`ƒ`). It must also compare public HTML, metadata and JSON-LD across cookie/IP variants.

Public page/layout/metadata/JSON-LD/sitemap/cache code must remain free of `cookies()`, `headers()` and private API calls. The catalog page must stop consuming server `searchParams`; filters become private client projection inputs while base metadata/canonical stay deterministic.

### Security boundary tests

**Apply to:** `tests/security/catalog-boundaries.test.mjs`  
**Analog:** `tests/security/checkout-boundaries.test.mjs`

**Source-contract style** (`tests/security/checkout-boundaries.test.mjs:24-36`):

```js
const quote = readFileSync('src/checkout/quote.ts', 'utf8');
assert.match(quote, /rpc\('get_checkout_shipping_quote_v2'/);
assert.doesNotMatch(quote, /get_checkout_shipping_rules/);
```

Extend catalog boundaries to prove strict enums/bounds, server-derived market, `private, no-store`, all shaping inputs passed to cached wrappers, no request APIs in static scopes, no shared-path invalidation for market preference, and no fingerprint entering quote/submit authority. Preserve the existing checkout authority assertions, especially database reconstruction (`tests/security/checkout-boundaries.test.mjs:39-54`).

### Vitest and Playwright patterns

**Lifecycle unit analog:** `tests/unit/checkout/quote-lifecycle.test.ts:87-110`

```ts
const first = beginQuoteRequest(initial, {countryCode: 'VN'});
const second = beginQuoteRequest(first.state, {countryCode: 'US', regionCode: 'CA'});
expect(second.request.requestId).toBe(2);
const stale = settleQuoteRequest(second.state, first.request.requestId, result);
expect(stale).toBe(second.state);
```

Use table-driven four-combination tests, then explicit A→B→A, stale completion, failed mutation rollback, focus, visibility and cross-tab invalidation cases.

**Isolated browser contexts** (`tests/e2e/catalog-market.spec.ts:7-20`):

```ts
const vnContext = await browser.newContext({extraHTTPHeaders: {'x-vercel-ip-country': 'VN'}});
const intlContext = await browser.newContext({extraHTTPHeaders: {'x-vercel-ip-country': 'US'}});
```

Build a reusable Phase 09 fixture around isolated contexts, cookie seeding, API response delay/failure interception, and two pages for multi-tab behavior. Follow existing fixture cleanup discipline (`tests/e2e/fixtures/authenticated-users.ts:53-84`) and keep selectors role/accessible-name based. Rewrite stale selectors targeting the removed separate/combined controls.

## Shared Patterns

### Authority boundaries

- Browser context and projection fingerprints gate presentation only.
- Route Handlers derive market server-side and deliver personalized data with `private, no-store`.
- Cached RPC wrappers are server-only and argument-complete.
- Cart storage holds intent; server quotes own displayed commerce facts.
- Checkout destination owns physical quote market; accepted quote evidence blocks submission while stale/pending/proposed.
- Database submit reconstructs immutable lines and validates inventory, discounts, shipping, currency and payment pair.

### Error handling and observability

- Use discriminated lifecycle states and stable bounded error codes.
- Preserve the last safe accepted quote while a refresh fails; disable unsafe purchase/checkout actions.
- Never log cookies, raw headers, customer query text, projection bodies, quote hashes as authority, or secrets.
- Recovery copy states what remains active/safe and offers a localized retry.

### Static cache separation

```text
ISR locale-default shell -> public shared cache, deterministic SEO
browser private fetch    -> private, no-store response
cached RPC projection    -> server-only, all shaping arguments in identity
```

## Files That Must Remain Untouched

The planner should treat these as regression targets, not implementation surfaces, unless a failing authoritative regression proves a minimal compatibility change is unavoidable:

| File/area | Reason |
|---|---|
| `src/checkout/submit-checkout.ts` | Existing server/database submit authority and immutable evidence must not be weakened or rewritten. |
| `src/checkout/quote.ts` | Existing authoritative product/discount/shipping recalculation remains the source of truth. |
| checkout authority migrations and RPCs under `supabase/migrations/` | Database locks, inventory/reservation, payment pair, arithmetic, snapshot and stale-evidence validation remain authoritative. |
| PayPal/VietQR implementation under `src/payments/` | Payment invariants are fixed; Phase 09 adds no provider or browser override. |
| fulfillment/entitlement/download code | No fulfillment behavior changes; paid-only and signed-link security remains intact. |
| public canonical/hreflang/JSON-LD/sitemap URL structure | Market must not become an indexable route/query dimension. Extend invariance tests instead. |

`src/checkout/quote-lifecycle.ts` should also remain behaviorally stable; reuse it as the analog and extend tests before considering edits.

## No Analog Found

No file lacks a usable local analog. The new commerce projection handlers and islands are compositions of existing private Route Handler, cached RPC, StorefrontContext, and quote-lifecycle patterns rather than new architectural styles.

## Metadata

**Search scope:** `src/`, `tests/`, phase contracts, project instructions  
**Primary analogs read:** 18  
**Pattern extraction date:** 2026-07-22
