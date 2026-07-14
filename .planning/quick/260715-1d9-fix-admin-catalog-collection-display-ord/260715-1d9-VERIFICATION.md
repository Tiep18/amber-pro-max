---
quick_id: 260715-1d9
status: human_needed
verified_at: '2026-07-15T01:30:00+07:00'
commits:
  - bfbadfc
  - cde1d9d
code_gaps: 0
---

# Quick Task 260715-1d9 Verification

## Result

Implementation evidence satisfies the planned collection-ordering and private-PDF boundary must-haves. No code gap was found in either commit. Status is `human_needed` only because the focused Playwright flow could not start while an existing user-owned Next.js development process held the repository dev lock.

## Must-have evidence

| Must-have | Result | Evidence |
| --- | --- | --- |
| PostgreSQL computes the exact per-collection next order without a PostgREST row scan or row-limit exposure | Verified | `public.admin_catalog_collection_next_orders(uuid[])` unnests and deduplicates only the requested ids, joins `collection_products`, and computes `coalesce(max(display_order::bigint) + 1, 0)` in `supabase/migrations/20260715010000_admin_catalog_collection_next_orders.sql`. `getCatalogOptions` sends only localized collection ids to the RPC and never selects raw memberships. |
| RPC authorization and execution boundary are admin-only | Verified | The function is `security definer`, fixes `search_path = public, private, pg_temp`, checks `private.is_admin()`, revokes `PUBLIC`/`anon`/`authenticated`, then grants execute only to `authenticated`. pgTAP covers security-definer, search path, grants, non-admin rejection, null/oversized/unknown input, and deterministic deduplication. |
| The aggregate remains correct beyond a normal PostgREST ceiling | Verified | `02_collection_ordering.test.sql` inserts display orders `0..1204` with `generate_series` and asserts the RPC returns `1205`. The focused file completed successfully during `npm run db:test`. |
| Current/persisted membership order wins; only a genuinely new selection gets the server append default | Verified | `reconcileCollectionMemberships` applies current, preserved, then option order precedence. `ProductForm` seeds `collectionOrderMemory` from `initialProduct`, remembers current edits before deselection, and restores them on reselect. Unit tests cover current-vs-persisted precedence, remove/reselect, distinct defaults, and missing/malformed aggregate failures. |
| Database uniqueness remains the concurrent-write integrity boundary | Verified | Historical `collection_products` constraints remain unchanged: primary key `(collection_id, product_id)`, nonnegative check, and unique `(collection_id, display_order)`. The atomic product-save RPC deletes and reinserts inside one transaction; a stale concurrent order conflicts and rolls back instead of overwriting or renumbering another product. No upsert or conflict overwrite was introduced. |
| Public media `object_path` is allowed while private PDF/fulfillment identifiers remain rejected | Verified | `catalog-boundaries.test.mjs` no longer bans generic `object_path`. Its fixtures allow `media.object_path` and positively reject the private asset table, `pattern-pdfs`, PDF/digital-asset path aliases, signed URLs, entitlements, and `/api/download` routes. The same public page/gallery/unavailable-market files remain scanned. |

## Automated verification

- `npm run test:unit -- tests/unit/catalog/collection-ordering.test.ts tests/unit/catalog/publish-checks.test.ts`: 2 files, 32 tests passed.
- `node --test tests/security/catalog-boundaries.test.mjs`: 2 tests passed.
- Focused ESLint over all task TypeScript, E2E, unit, and security files: passed.
- `npm run typecheck`: passed.
- Direct Supabase type generation against the configured local database on port `55432` exactly matched `src/types/supabase.ts` without rewriting it.
- `npm run db:test`: `02_collection_ordering.test.sql` passed, including its 1,205-row fixture. The full command was red for unrelated pre-existing local database residue: `guest-race-pattern` affected `02_catalog_queries`, and a previously persisted concurrency fixture caused a duplicate product id in `08_checkout_guest_retry_concurrency`.
- `npm run db:lint`: current local state was red only inside the installed `extensions.pgtap` functions. No lint finding referenced the new public RPC or another task artifact. A destructive reset was not repeated during independent verification.
- `npm run test:security`: task-owned catalog tests passed; suite result was 38/39 because the unrelated newsletter read-only regex spans `Subscribed`/`Unsubscribed` option text through the later `Apply filters` button.

## Human/browser verification needed

Run the focused E2E after the existing Next.js process releases the repository lock:

```powershell
npx playwright test tests/e2e/admin-product.spec.ts
```

The attempted run did not execute application assertions: Playwright's configured web server stopped with `Another next dev server is already running` (PID 24600). This is an environment/dev-lock condition, not evidence of a code failure.

## Gaps

No implementation gap found. The only remaining task-specific gate is execution of the focused browser scenario once the user-owned dev server is stopped.
