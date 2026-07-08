# Project Conventions

## Operational Monitoring Pattern

Server-side code must use the shared operational monitoring wrappers for recoverable system failures:

- Use `runMonitoredAction` from `src/operations/monitoring.ts` for Server Actions and domain mutation helpers that return action states.
- Use `runMonitoredQuery` from `src/operations/monitoring.ts` for server loaders, cached queries, RPC reads, and fallback-producing data access.
- Always provide `area`, `action`, `errorCode`, `summary`, and safe `facts`.
- Use namespaced error codes such as `storefront.home.featured_products_failed` or `account.wishlist.add_failed`.
- Do not record expected user-controlled outcomes as operational errors: invalid form input, unauthenticated redirects, forbidden access, not found, duplicate webhook delivery, unsupported provider events, and safe client storage/cache misses.
- Do record database errors, RPC errors, provider outages, unexpected result shapes, thrown exceptions, worker failures, and silent degradation fallbacks that hide missing server data from users or admins.
- Monitoring is best-effort: recorder failures must never change action/query return values or throw to the caller.
- Use `factsFromResult` and `factsFromError` for dynamic safe facts such as provider, status, request id, HTTP status, or transition result. Keep static facts for stable context such as locale, market, product id, and product type.

Safe facts are allow-listed by `src/operations/redaction.ts`. Do not pass raw payloads, tokens, emails, addresses, phone numbers, signatures, stack traces, cookies, or signed URLs.

### Action Example

```ts
return runMonitoredAction({
  area: 'application',
  action: 'wishlist_add',
  errorCode: 'account.wishlist.add_failed',
  summary: 'Wishlist add failed',
  facts: { productId },
  errorResult: { status: 'error', code: 'wishlist_action_failed' } as const,
  shouldRecordResult: (result) => result.status === 'error',
  factsFromResult: (result) => ({ status: result.code }),
  operation: async () => {
    // mutation logic
    return { status: 'saved' } as const;
  }
});
```

### Query Example

```ts
return runMonitoredQuery({
  area: 'storefront',
  severity: 'warning',
  action: 'home_featured_products',
  errorCode: 'storefront.home.featured_products_failed',
  summary: 'Home featured products failed',
  facts: { locale, market, productType },
  fallback: [],
  query: async () => getCachedCatalogProducts({ locale, market, productType, sort: 'newest' })
});
```

New `catch` blocks in server-side code should be rare. If a catch returns fallback data or an error state, prefer routing through one of these wrappers.
