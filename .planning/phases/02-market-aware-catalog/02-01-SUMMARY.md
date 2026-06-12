---
phase: 02-market-aware-catalog
plan: "01"
subsystem: database
tags: [supabase, postgres, rls, pgtap, catalog, inventory]

requires:
  - phase: 01-secure-bilingual-foundation
    provides: Database-owned admin authorization, local Supabase test harness, and generated TypeScript types
provides:
  - Bilingual catalog, taxonomy, collection, market-offer, media, and private PDF metadata schema
  - Physical variant, market override, and exclusive inventory ownership constraints
  - Database publish issue inspection and atomic publishing
  - Admin-only RLS for every catalog base table
affects:
  - 02-02-admin-catalog
  - 02-03-catalog-media
  - 02-04-variants-inventory
  - 02-06-catalog-queries

tech-stack:
  added: []
  patterns:
    - Integer market-specific money with database currency constraints
    - Trigger-enforced cross-table catalog invariants
    - Security-invoker publish RPCs over admin-only RLS

key-files:
  created:
    - supabase/migrations/20260612230000_market_catalog.sql
    - supabase/tests/database/02_catalog_model.test.sql
    - supabase/tests/database/02_catalog_rls.test.sql
    - src/catalog/types.ts
  modified:
    - src/types/supabase.ts

key-decisions:
  - "Catalog base tables remain inaccessible to anonymous and customer roles; later public projections will expose only market-safe published data."
  - "Product and variant prices are independent integer rows constrained to VND for Vietnam and USD for international markets."
  - "Inventory uses one XOR ownership table, with triggers preventing product-level and variant-level inventory from coexisting."
  - "Publishing uses security-invoker functions so database-owned admin RLS remains the authorization boundary."

patterns-established:
  - "Every catalog table enables RLS in the migration that creates it."
  - "Cross-table product-type and ownership rules raise check-violation SQLSTATE 23514."
  - "Publish checks return structured issue rows before the atomic status transition."

requirements-completed: [MKT-03, MKT-04, CAT-01, CAT-02, CAT-03, CAT-04, INV-01, DIG-01, SEO-01]

duration: 18 min
completed: 2026-06-12
---

# Phase 02 Plan 01: Market-Aware Catalog Data Contract Summary

**Relational bilingual catalog with independent VND/USD offers, physical variant inventory invariants, atomic publish checks, private PDF metadata, and admin-only RLS**

## Performance

- **Duration:** 18 min
- **Started:** 2026-06-12T16:58:04Z
- **Completed:** 2026-06-12T17:15:49Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created products, localized content, independent taxonomy joins, ordered collections, image metadata, and private PDF object metadata.
- Enforced market currency, physical-only variants, SKU/attribute validity, optional variant price overrides, and exclusive inventory ownership.
- Added structured publish issues for bilingual content, SEO, social/primary images, offers, private PDFs, and physical inventory.
- Protected all 20 catalog base tables with database-owned admin RLS and generated matching Supabase TypeScript types.

## Task Commits

Each TDD task was committed in RED then GREEN order:

1. **Task 1 RED: Catalog model contract** - `232e28c` (test)
2. **Task 1 GREEN: Bilingual market-aware catalog schema** - `63a9d67` (feat)
3. **Task 2 RED: Variant, publishing, and RLS contract** - `6cebe42` (test)
4. **Task 2 GREEN: Variant/inventory constraints, publish functions, RLS, and generated types** - `50bb58a` (feat)

**Plan summary:** committed immediately after creation.

## Files Created/Modified

- `supabase/migrations/20260612230000_market_catalog.sql` - Catalog schema, constraints, indexes, trigger invariants, publish functions, grants, and RLS.
- `supabase/tests/database/02_catalog_model.test.sql` - pgTAP model, negative constraint, inventory, and publishability evidence.
- `supabase/tests/database/02_catalog_rls.test.sql` - Anonymous/customer/admin role matrix and RLS/function security evidence.
- `src/catalog/types.ts` - Stable catalog unions, money/offer contracts, and publish result types.
- `src/types/supabase.ts` - Regenerated local database table and function types.

## Decisions Made

- Kept catalog base data private to admins. Public browsing will use later market-isolated projections rather than permissive base-table policies.
- Used a single inventory table with product-or-variant XOR ownership and trigger checks for the cross-table D-10 rules.
- Kept publish functions as security invokers with fixed `search_path`; RLS and `private.is_admin()` remain authoritative.
- Stored image and PDF ownership as bucket/path metadata. No public PDF URL or customer download path was introduced.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected pgTAP scalar configuration assertion**
- **Found during:** Task 2 verification
- **Issue:** `results_eq` could not infer a collation for the single `proconfig` text comparison.
- **Fix:** Replaced it with the established scalar `is(...)` assertion.
- **Files modified:** `supabase/tests/database/02_catalog_rls.test.sql`
- **Verification:** `npm run db:test` passes all 59 assertions.
- **Committed in:** `50bb58a`

---

**Total deviations:** 1 auto-fixed bug.
**Impact on plan:** Test-only correction; no catalog behavior or scope changed.

## Issues Encountered

- Supabase CLI `2.53.6` reports that `2.106.0` is available. The installed version completed reset, lint, pgTAP, and type generation successfully.

## User Setup Required

None - no hosted Supabase credentials or dashboard configuration were required.

## Verification

Passed sequentially on Windows:

```text
npm run db:reset
npm run db:lint
npm run db:test
npm run db:types
npm run typecheck
```

Evidence:

- Schema reset applied both migrations successfully.
- Database lint reported no schema errors.
- pgTAP passed 4 files and 59 tests.
- Generated types include catalog tables, variants, inventory, and both publish functions.
- TypeScript checking completed with no errors.

## Known Stubs

None.

## Next Phase Readiness

- Ready for Plan 02-02 admin catalog workflows and publish feedback.
- Base tables intentionally have no public read policies; Plan 02-06 must expose market-isolated published projections.

## Self-Check: PASSED

- All five planned files exist.
- Commits `232e28c`, `63a9d67`, `6cebe42`, and `50bb58a` exist in git history.
- Both RED commits precede their corresponding GREEN commits.
- Plan verification and acceptance criteria pass.

---
*Phase: 02-market-aware-catalog*
*Completed: 2026-06-12*
