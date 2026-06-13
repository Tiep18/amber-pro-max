---
phase: 02-market-aware-catalog
plan: "06"
subsystem: catalog
tags: [postgres, supabase, rpc, rls, typescript, playwright]

requires:
  - phase: 02-market-aware-catalog
    provides: Private catalog schema, market offers, variants, and inventory from Plans 02-01 and 02-04
provides:
  - Market-isolated public catalog listing, facet, taxonomy, and detail RPCs
  - Safe variant effective-price and stock projections
  - Generated Supabase types for public catalog functions
  - Typed server query helpers with bounded input normalization
affects: [catalog discovery pages, product detail, localized SEO, checkout pricing]

tech-stack:
  added: []
  patterns:
    - Public catalog access uses fixed-output security-definer RPCs while base tables remain private
    - Locale and market are mandatory at every public query boundary
    - Query wrappers normalize bounded inputs and map database errors to stable application errors

key-files:
  created:
    - supabase/migrations/20260612232000_market_catalog_queries.sql
    - supabase/tests/database/02_catalog_queries.test.sql
    - src/catalog/queries.ts
    - tests/unit/catalog/queries.test.ts
  modified:
    - src/types/supabase.ts

key-decisions:
  - "Anon and authenticated roles execute fixed-search-path projection RPCs but retain no direct SELECT access to catalog base tables."
  - "Unavailable product detail returns localized public content and an eligible alternate market code, never the alternate market price."
  - "Collection manual ordering is represented by a validated collection sort token consumed only by the parameterized RPC."

patterns-established:
  - "Public database functions return only presentation-safe fields, boolean stock state, and public media paths."
  - "Server query helpers accept an injectable typed Supabase client for deterministic unit testing."

requirements-completed: [MKT-02, MKT-03, MKT-04, CAT-05, CAT-06, CAT-08]

duration: 52 min
completed: 2026-06-13
---

# Phase 02 Plan 06: Market-Isolated Catalog Query Boundary Summary

**Market-filtered Supabase RPCs and typed server helpers expose published catalog data without leaking exact inventory, private PDFs, drafts, or other-market prices**

## Performance

- **Duration:** 52 min
- **Started:** 2026-06-13T13:21:00Z
- **Completed:** 2026-06-13T14:13:15Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added public listing, facets, product detail, category, and collection RPCs requiring locale and market.
- Enforced published/enabled-offer filtering, independent VND/USD pricing, composable taxonomy filters, manual collection order, and unavailable-detail price isolation.
- Added variant projections with explicit IDs, effective market override state, disabled visibility, and stock booleans without exact quantities.
- Generated Supabase function types and added typed query wrappers with search bounds, practical sort allowlists, and stable error handling.
- Added 20 focused pgTAP assertions plus unit and browser verification.

## Task Commits

Each task was committed atomically:

1. **Task 1: Market catalog RPC RED tests** - `f3e389a` (test)
2. **Task 1: Market-safe public catalog RPCs and generated types** - `fc3837f` (feat)
3. **Task 2: Typed query helper RED tests** - `8ca09ee` (test)
4. **Task 2: Typed catalog query helpers** - `0e8f866` (feat)

**Plan metadata:** pending in docs commit

## Files Created/Modified

- `supabase/migrations/20260612232000_market_catalog_queries.sql` - Validated projection RPCs for listing, facets, taxonomy metadata, and product detail.
- `supabase/tests/database/02_catalog_queries.test.sql` - Database evidence for market isolation, draft/disabled filtering, collection order, variants, inventory privacy, and anon permissions.
- `src/types/supabase.ts` - Generated function argument and result types.
- `src/catalog/queries.ts` - Typed wrappers for list, facets, taxonomy, and detail RPCs.
- `tests/unit/catalog/queries.test.ts` - Input normalization, mandatory context, collection ordering, empty slug, and error-boundary tests.

## Decisions Made

- Data RPCs use `SECURITY DEFINER` with a fixed `search_path`, explicit execute grants, parameter validation, and fixed result shapes because anon must access projections while direct base-table access remains revoked.
- Search is trimmed and capped at 100 characters in TypeScript before reaching the parameterized RPC.
- Collection ordering is activated only by a normalized `collection:<slug>` token; arbitrary SQL sort fragments are rejected.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Public projection RPCs required owner execution**
- **Found during:** Task 1 database permission verification
- **Issue:** Security-invoker functions correctly inherited anon's lack of base-table SELECT permission, preventing the public projection from reading any catalog rows.
- **Fix:** Restricted the five data RPCs to fixed-search-path `SECURITY DEFINER` execution while keeping base tables revoked and proving direct anon SELECT fails.
- **Files modified:** `supabase/migrations/20260612232000_market_catalog_queries.sql`, `supabase/tests/database/02_catalog_queries.test.sql`
- **Verification:** Full pgTAP suite passed, including anon RPC success and direct table permission denial.
- **Committed in:** `fc3837f`

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** The public data boundary now works without broadening base-table privileges.

## Issues Encountered

- The delegated executor hit an account usage limit before implementation; execution continued inline from its untracked RED pgTAP draft.
- Playwright browser launch was blocked by sandbox `spawn EPERM`; the same spec passed 5/5 outside the sandbox.
- A timed-out Playwright run corrupted generated `.next/dev/types`; deleting the workspace-local `.next` cache restored clean typecheck/build behavior.
- The first sandboxed build could not fetch Google Fonts; the unrestricted build passed.

## Verification

- `npm run db:reset` - passed.
- `npm run db:lint` - passed.
- `npm run db:test` - passed, 97 tests across 6 files.
- `npm run db:types` plus `git diff --exit-code src/types/supabase.ts` - passed, no schema type drift.
- `npm run test:unit -- tests/unit/catalog/queries.test.ts` - passed, 5 tests.
- `npm run typecheck` - passed.
- `npm run build` - passed.
- `npm run test:e2e -- tests/e2e/catalog-market.spec.ts` - passed, 5 tests.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 02-07 can build localized catalog/category/collection pages directly on typed market-safe projections. Plan 02-08 can use the detail RPC for unavailable-market, variant, and SEO states.

---
*Phase: 02-market-aware-catalog*
*Completed: 2026-06-13*
