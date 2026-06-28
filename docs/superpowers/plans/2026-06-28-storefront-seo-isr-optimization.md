# Storefront SEO and ISR Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make public storefront content cacheable and streamable for stronger SEO and lower response cost while preserving per-market prices and private user data.

**Architecture:** Enable Next.js Cache Components and place request-bound market/auth work behind Suspense boundaries. Public Supabase reads use a cookie-free client plus tagged `use cache` facades, while private reads use request-scoped React cache only. Images move to `next/image`, client messages are narrowed, and cart updates are protected from stale responses.

**Tech Stack:** Next.js 16.2 App Router, React 19.2, TypeScript 5.9, next-intl 4.13, Supabase JS 2.108, Vitest, Playwright.

---

## File Structure

- Create `src/lib/supabase/public.ts`: anonymous, cookie-free client for RLS-protected public reads.
- Create `src/catalog/public-cache.ts`: tagged catalog cache facades with explicit locale and market inputs.
- Create `src/content/blog/public-cache.ts`: tagged blog list/detail cache facades.
- Create `src/policies/public-cache.ts`: tagged policy detail cache facade.
- Create `src/auth/request-user.ts`: request-scoped user/header identity deduplication.
- Create `src/components/header-account.tsx`: streamed account island.
- Create `src/components/storefront-providers.tsx`: narrowly scoped client providers.
- Modify public pages and mutations to consume/invalidate these boundaries.
- Modify `next.config.ts` and storefront image components for optimized Supabase images.
- Modify cart provider and tests to reject stale quote responses.

### Task 1: Public Cache Foundation

**Files:**
- Create: `src/lib/supabase/public.ts`
- Create: `src/catalog/public-cache.ts`
- Create: `src/content/blog/public-cache.ts`
- Create: `src/policies/public-cache.ts`
- Modify: `src/app/[locale]/catalog/page.tsx`
- Modify: `src/app/[locale]/product/[productSlug]/page.tsx`
- Modify: `src/app/[locale]/blog/page.tsx`
- Modify: `src/app/[locale]/blog/[postSlug]/page.tsx`
- Modify: `src/app/[locale]/policies/[policySlug]/page.tsx`
- Modify: `src/app/[locale]/chinh-sach/[policySlug]/page.tsx`
- Test: `tests/unit/content/public-cache.test.ts`
- Test: `tests/unit/catalog/public-cache.test.ts`

- [ ] **Step 1: Write failing cache-boundary tests**

Add static boundary tests that assert public cache modules are server-only, accept market explicitly, contain `'use cache'`, set cache life, and never import `cookies`, `headers`, `createSupabaseServerClient`, or admin credentials. Assert Vietnam and international calls form distinct argument tuples.

```ts
expect(source).toContain("'use cache'");
expect(source).toContain("cacheLife('minutes')");
expect(source).not.toMatch(/cookies|headers|createSupabaseServerClient|createSupabaseAdminClient/);
expect(catalogKey({locale: 'en', market: 'vn'})).not.toEqual(
  catalogKey({locale: 'en', market: 'intl'})
);
```

- [ ] **Step 2: Run tests and confirm the modules are absent**

Run: `npm run test:unit -- tests/unit/content/public-cache.test.ts tests/unit/catalog/public-cache.test.ts`

Expected: FAIL because the public cache modules do not exist.

- [ ] **Step 3: Implement the cookie-free public client and cache facades**

Create the public client with `createClient<Database>(url, publishableKey, {auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false}})`. Cached functions must receive only serializable primitives, call `cacheLife('minutes')`, and tag domain data:

```ts
export async function getCachedCatalogProduct(locale: Locale, market: MarketCode, slug: string) {
  'use cache';
  cacheLife('minutes');
  cacheTag('catalog', `catalog:${market}`, `product-slug:${locale}:${slug}`);
  return getCatalogProductBySlug({locale, market, slug}, createSupabasePublicClient());
}
```

Wrap exported cached functions with React `cache()` where metadata and page rendering call the same lookup. Update public pages to use these facades. Do not cache review eligibility, wishlist, checkout quotes, orders, or account data.

- [ ] **Step 4: Run focused and existing query tests**

Run: `npm run test:unit -- tests/unit/content/public-cache.test.ts tests/unit/catalog/public-cache.test.ts tests/unit/catalog/queries.test.ts tests/unit/content/blog.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit cache foundation**

```bash
git add src/lib/supabase/public.ts src/catalog/public-cache.ts src/content/blog/public-cache.ts src/policies/public-cache.ts src/app tests/unit
git commit -m "perf: cache public storefront queries"
```

### Task 2: Cache Invalidation

**Files:**
- Create: `src/lib/cache-tags.ts`
- Modify: `src/catalog/actions.ts`
- Modify: `src/catalog/variant-actions.ts`
- Modify: `src/catalog/media-actions.ts`
- Modify: `src/content/blog/actions.ts`
- Modify: `src/policies/actions.ts`
- Test: `tests/unit/content/cache-invalidation.test.ts`

- [ ] **Step 1: Write failing mutation invalidation tests**

Mock `next/cache` and assert publish/archive/media/price/inventory mutations call `revalidateTag(tag, 'max')` for their domain plus the affected record tag. Keep existing `revalidatePath` assertions where tests already depend on them.

```ts
expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.catalog, 'max');
expect(revalidateTag).toHaveBeenCalledWith(productCacheTag(productId), 'max');
```

- [ ] **Step 2: Run the test and confirm missing tag invalidation**

Run: `npm run test:unit -- tests/unit/content/cache-invalidation.test.ts`

Expected: FAIL because mutations currently invalidate paths only.

- [ ] **Step 3: Add centralized cache tags and invalidate after successful writes**

Export stable tag builders from `src/lib/cache-tags.ts`. Call `revalidateTag(..., 'max')` only after the database mutation succeeds. Catalog changes invalidate `catalog`; blog publish/schedule/unpublish invalidates `blog`; policy publish/unpublish invalidates `policies`. Preserve path revalidation for admin screens.

- [ ] **Step 4: Run mutation and security tests**

Run: `npm run test:unit -- tests/unit/content/cache-invalidation.test.ts tests/unit/content/publish-checks.test.ts tests/unit/catalog/publish-checks.test.ts`

Run: `npm run test:security`

Expected: PASS.

- [ ] **Step 5: Commit invalidation**

```bash
git add src/lib/cache-tags.ts src/catalog src/content/blog src/policies tests/unit/content/cache-invalidation.test.ts
git commit -m "perf: invalidate storefront cache after mutations"
```

### Task 3: PPR Shell and Request-Scoped Personalization

**Files:**
- Modify: `next.config.ts`
- Create: `src/auth/request-user.ts`
- Create: `src/components/header-account.tsx`
- Modify: `src/components/site-header.tsx`
- Modify: `src/app/[locale]/layout.tsx`
- Modify: `src/app/[locale]/catalog/page.tsx`
- Modify: `src/app/[locale]/product/[productSlug]/page.tsx`
- Test: `tests/unit/auth/request-user.test.ts`
- Test: `tests/unit/content/storefront-shell.test.ts`

- [ ] **Step 1: Write failing shell and auth-deduplication tests**

Assert `cacheComponents: true`, assert the header account component is inside `Suspense`, and test that two calls to the request identity facade invoke the Supabase auth adapter once.

```ts
const first = getRequestUser();
const second = getRequestUser();
await Promise.all([first, second]);
expect(getUser).toHaveBeenCalledTimes(1);
```

- [ ] **Step 2: Run tests and confirm failures**

Run: `npm run test:unit -- tests/unit/auth/request-user.test.ts tests/unit/content/storefront-shell.test.ts`

Expected: FAIL because Cache Components and request user facade are not implemented.

- [ ] **Step 3: Enable Cache Components and stream account UI**

Set top-level `cacheComponents: true`. Implement a React `cache()` request identity helper that returns the minimal `{id, email, isAdmin}` shape. Move `getHeaderUser()` out of `site-header.tsx` into `HeaderAccount`, render it under `Suspense`, and ensure public page content does not await it.

Start product/catalog public queries before optional auth queries. Reuse the request identity result for wishlist and review eligibility. Optional personalization errors return anonymous state without failing the route.

- [ ] **Step 4: Run focused tests and production build**

Run: `npm run test:unit -- tests/unit/auth/request-user.test.ts tests/unit/content/storefront-shell.test.ts tests/unit/catalog/queries.test.ts`

Run: `npm run build`

Expected: PASS. Build output must show prerendered shells for editorial routes or PPR markers; if blog/policy remain fully request-rendered, add editorial/commerce route groups while preserving URLs and rerun the build.

- [ ] **Step 5: Commit PPR shell**

```bash
git add next.config.ts src/auth/request-user.ts src/components/header-account.tsx src/components/site-header.tsx src/app tests/unit
git commit -m "perf: stream storefront personalization"
```

### Task 4: Optimized Storefront Images and Narrow i18n Payload

**Files:**
- Modify: `next.config.ts`
- Create: `src/components/storefront-providers.tsx`
- Modify: `src/app/[locale]/layout.tsx`
- Modify: `src/components/catalog/product-card.tsx`
- Modify: `src/components/catalog/product-gallery.tsx`
- Modify: `src/app/[locale]/blog/page.tsx`
- Modify: `src/app/[locale]/blog/[postSlug]/page.tsx`
- Modify: `src/components/account/wishlist-page.tsx`
- Test: `tests/unit/content/storefront-images.test.ts`
- Test: `tests/unit/i18n/client-messages.test.ts`

- [ ] **Step 1: Write failing image and message-boundary tests**

Assert public product/blog components import `next/image`, include responsive `sizes`, and do not use raw `<img>`. Assert the locale layout does not mount an unbounded `NextIntlClientProvider` with implicit full messages.

- [ ] **Step 2: Run tests and confirm current raw images/provider fail**

Run: `npm run test:unit -- tests/unit/content/storefront-images.test.ts tests/unit/i18n/client-messages.test.ts`

Expected: FAIL on raw image tags and the root provider.

- [ ] **Step 3: Configure Supabase images and migrate public media**

Parse `NEXT_PUBLIC_SUPABASE_URL` at config load and add its protocol/hostname/path to `images.remotePatterns`. Use `Image fill` within existing aspect-ratio containers and these baseline sizes:

```tsx
<Image fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
```

Use `priority` only for the selected product hero image. Keep QR and admin preview images unchanged.

- [ ] **Step 4: Narrow the client translation boundary**

Replace the broad root provider with `StorefrontProviders`. Pass only the message namespaces required by persistent client islands, or pass already translated labels where a component needs fewer than ten strings. Ensure server pages continue using `getTranslations()`.

- [ ] **Step 5: Run image, localization, and build checks**

Run: `npm run test:unit -- tests/unit/content/storefront-images.test.ts tests/unit/i18n/client-messages.test.ts tests/unit/i18n/routing.test.ts`

Run: `npm run build`

Expected: PASS with no `next/image` host errors or missing-message errors.

- [ ] **Step 6: Commit media and i18n changes**

```bash
git add next.config.ts src/app src/components tests/unit/content/storefront-images.test.ts tests/unit/i18n/client-messages.test.ts
git commit -m "perf: optimize storefront media and messages"
```

### Task 5: Cart Concurrency and Final SEO Verification

**Files:**
- Modify: `src/components/cart/cart-provider.tsx`
- Test: `tests/unit/cart/quote-concurrency.test.ts`
- Modify: `tests/e2e/launch-seo.spec.ts`
- Modify: `tests/e2e/catalog-detail-seo.spec.ts`
- Create: `docs/performance/storefront-rendering.md`

- [ ] **Step 1: Write failing stale-quote test**

Model two quote requests where request B resolves before request A. Assert the final quote is B. The implementation may use a monotonically increasing request ID stored in a ref:

```ts
const requestId = ++latestQuoteRequest.current;
const result = await refreshCartQuoteAction(input);
if (requestId === latestQuoteRequest.current) setQuote(toQuote(result));
```

- [ ] **Step 2: Run test and confirm stale response currently wins**

Run: `npm run test:unit -- tests/unit/cart/quote-concurrency.test.ts`

Expected: FAIL before the request-generation guard exists.

- [ ] **Step 3: Implement stale-response protection and narrow subscriptions where safe**

Add the request-generation guard. Split cart UI state from data/actions only if consumer tests show the split does not create duplicated providers or API churn; otherwise retain one context and document the measured rationale. Do not alter server-authoritative quote calculation.

- [ ] **Step 4: Strengthen SEO browser assertions**

For English and Vietnamese blog/product pages, assert rendered HTML contains title, description, canonical, alternate hreflang links, JSON-LD, crawlable heading/body text, and optimized image output. Verify market switching changes product currency without leaking the prior market response.

- [ ] **Step 5: Run complete verification**

Run: `npm run lint`

Run: `npm run typecheck`

Run: `npm run test:unit`

Run: `npm run test:security`

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/launch-seo.spec.ts tests/e2e/catalog-detail-seo.spec.ts tests/e2e/catalog-market.spec.ts tests/e2e/localization.spec.ts`

Expected: all commands PASS.

- [ ] **Step 6: Record rendering outcome and commit**

Document which routes are static, ISR/PPR, or dynamic; list cache tags and invalidation owners; record any intentionally raw images and why.

```bash
git add src/components/cart/cart-provider.tsx tests docs/performance/storefront-rendering.md
git commit -m "perf: harden cart updates and verify storefront SEO"
```

## Completion Criteria

- Public cached functions never read cookies, headers, sessions, or service-role credentials.
- Market is part of every market-sensitive cache key.
- Blog and policy content is served through ISR/PPR and invalidated on publish changes.
- Product/catalog public data is cached while checkout quotes and user data remain uncached.
- Public product and blog images use `next/image` with responsive sizing.
- The root client bundle does not receive all locale messages implicitly.
- Header auth and wishlist work no longer block public content rendering.
- Stale cart quote requests cannot overwrite newer results.
- Lint, typecheck, unit, security, production build, and focused SEO E2E checks pass.
