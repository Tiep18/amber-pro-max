# Storefront SEO and ISR Optimization Design

## Goal

Improve storefront crawlability, response time, image delivery, and client hydration cost without weakening market-specific pricing, payment rules, authentication, or inventory correctness.

## Rendering Model

Use a hybrid rendering model rather than forcing every localized route into one strategy.

- Public editorial content such as blog posts and policies uses ISR with a bounded revalidation interval and on-demand invalidation after publish changes.
- Public commerce data is cached by every input that changes the response, especially locale, market, slug, filters, and sort order.
- User-specific data such as account identity and wishlist state is never placed in a shared cache. It is rendered behind a Suspense boundary or loaded as a client-side enhancement.
- Checkout, account, order status, admin, and payment routes remain dynamic.

The active market remains an explicit cache-key input. No cached function may infer the market internally from cookies or headers.

## Route Shell

The localized shell keeps locale validation and shared visual structure. Dynamic market and account work moves out of the critical content path.

- Resolve the market once per request and pass it to commerce consumers.
- Render account controls through an async component inside Suspense so public page content can stream first.
- Deduplicate request-scoped user lookup with React `cache()`.
- Avoid querying the admin role unless an authenticated user exists and the account menu needs it.

This change improves streaming immediately. After implementation, inspect the production route table: if blog and policy routes remain request-rendered, split editorial and commerce pages into route groups so editorial routes can meet the ISR requirement without reading market or auth state in their layout.

## Data Cache

Introduce server-only cached query facades for public catalog, blog, and policy reads.

- Use React `cache()` to deduplicate identical calls made by `generateMetadata()` and page rendering in one request.
- Use Next.js cache primitives for cross-request reuse only on public, non-personalized records.
- Include locale, market, slug, search, product type, category, collection, and sort in cache keys as applicable.
- Assign cache tags by domain and record, for example `catalog`, `product:<id>`, `blog`, `blog-post:<id>`, and `policies`.
- Keep inventory-sensitive quote and checkout calculations uncached.

Mutations that publish, archive, update price, adjust inventory, or modify media invalidate the relevant tags or paths. Existing path revalidation remains as a compatibility fallback where useful.

## Personalization Data Flow

Catalog and product content must not wait on wishlist state.

- Start public product, translation, review, and media work in parallel.
- Render wishlist controls with a stable unsigned default when no session is available.
- Use one request-scoped auth result for the header, product review eligibility, and wishlist queries.
- Never serialize a Supabase client or full user object into a client component.

Failures in optional personalization render an anonymous state; they do not fail the public product page.

## Images

Configure `next/image` for the project's Supabase Storage origin.

- Use `remotePatterns` derived from the configured public Supabase URL.
- Replace storefront product and blog `<img>` elements with `Image`.
- Supply stable dimensions through `fill` plus an aspect-ratio container or explicit width and height.
- Provide route-appropriate `sizes` values.
- Mark only the actual above-the-fold LCP candidate as priority.
- Preserve plain `<img>` only for data URLs, QR output, or admin previews where optimization is unsuitable.

## Internationalization Payload

Do not implicitly serialize every locale message through the root provider.

- Server components continue using `getTranslations()`.
- The root client provider receives no broad message object.
- Interactive client islands receive only the namespaces or labels they need, preferably as typed string props when the set is small.
- Existing interactive behavior and bilingual route semantics remain unchanged.

## React Rendering

Reduce global cart updates without changing cart persistence or server-side quote authority.

- Separate cart data, UI state, and actions if current consumers benefit from narrower subscriptions.
- Keep price calculation on the server and retain versioned local storage validation.
- Prevent stale quote responses from replacing newer quantity changes.
- Preserve optimistic interactions only where rollback behavior is explicit.

Large admin forms are outside this optimization unless a required change touches them directly.

## Error Handling

- Cached public query failures continue to use the existing domain error behavior and route error boundaries.
- Optional auth and wishlist failures fall back to anonymous rendering.
- Image URLs that cannot be normalized render the current placeholder state.
- Cache invalidation failures must not make a successful commerce mutation appear failed; they should be logged and retried or covered by bounded TTL.

## Verification

- Unit tests cover cache-key separation between Vietnam and international markets.
- Unit tests cover request auth deduplication and stale cart quote protection where introduced.
- Existing catalog, localization, checkout, payment, and security tests remain green.
- Production build succeeds and route output is compared before and after.
- Browser checks verify product images, responsive catalog cards, locale switching, market switching, anonymous wishlist state, and authenticated wishlist state.
- Inspect generated HTML for localized title, description, canonical URL, hreflang, Product or Article JSON-LD, and crawlable body content.

## Delivery Order

1. Add request deduplication and public query caching with safe invalidation.
2. Stream and deduplicate account and wishlist personalization.
3. Configure and migrate storefront images to `next/image`.
4. Narrow the internationalization client payload.
5. Split cart subscriptions and guard against stale quote responses.
6. Run static, unit, security, build, and browser verification; document remaining dynamic routes.

## Non-Goals

- Changing payment providers, checkout totals, market rules, or inventory semantics.
- Caching private account, order, entitlement, or admin data across users.
- Replacing Supabase or next-intl.
- Redesigning the storefront visual language.
