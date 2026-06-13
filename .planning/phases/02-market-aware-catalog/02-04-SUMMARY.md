---
phase: 02-market-aware-catalog
plan: "04"
subsystem: catalog-variants-inventory
tags: [nextjs, admin, catalog, variants, inventory, zod, playwright]

requires:
  - phase: 02-market-aware-catalog
    plan: "02"
    provides: Admin product basics workflow, product market offers, publish checks, and product edit routes
  - phase: 02-market-aware-catalog
    plan: "03"
    provides: Product media records that variants can optionally reference
provides:
  - Admin-only physical variant, price override, and inventory server actions
  - Effective variant price resolution with override before parent fallback
  - Protected physical variants and inventory editor for product-level or variant-level stock
  - Browser coverage for product-level inventory and explicit variant inventory journeys
affects:
  - 02-06-market-isolated-catalog-queries
  - 02-08-product-detail
  - 03-mixed-cart-and-checkout

tech-stack:
  added: []
  patterns:
    - Variant and inventory mutations call requireAdmin before creating database clients
    - UI separates product-level inventory from variant-level inventory without silently converting ownership
    - Variant price display resolves optional overrides before parent market offers

key-files:
  created:
    - src/catalog/variant-schemas.ts
    - src/catalog/variant-actions.ts
    - src/catalog/variant-pricing.ts
    - src/app/admin/catalog/[productId]/variants/page.tsx
    - src/components/admin/catalog/variant-editor.tsx
    - tests/unit/catalog/variants.test.ts
    - tests/e2e/admin-variants.spec.ts
    - supabase/migrations/20260613003000_variant_display_order.sql
  modified:
    - src/types/supabase.ts
    - src/auth/redirect.ts

key-decisions:
  - "Variant creation requires explicit variant IDs, SKUs, attributes, display order, optional media, and admin-submitted stock; no hidden combinations are generated."
  - "Variant price overrides are optional rows: missing override means parent offer fallback, while saved overrides must preserve the market currency."
  - "Inventory ownership remains mutually exclusive: non-variant physical products use product inventory and variant products use only variant inventory."

patterns-established:
  - "Nested admin catalog routes must be added to the safe redirect allow-list explicitly."
  - "Browser specs wait for admin page headings after sign-in before navigating to nested protected routes."
  - "Client action result messages are cleared before mutations so tests and users see the current operation result."

requirements-completed: [MKT-04, CAT-02, CAT-08, INV-01]

duration: 31 min
completed: 2026-06-13
---

# Phase 02 Plan 04: Physical Variants and Inventory Summary

**Admin-owned physical variant, market override, and mutually exclusive inventory workflows with focused unit and browser verification**

## Performance

- **Duration:** 31 min
- **Started:** 2026-06-13T00:27:15Z
- **Completed:** 2026-06-13T00:58:18Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Added Zod validation and admin-only server actions for explicit physical variants, variant price overrides, variant removal, and inventory adjustment.
- Added effective variant pricing that uses a saved variant override first and falls back to the parent product market offer.
- Added `product_variants.display_order` so admin variant order is explicit and database-backed.
- Built the protected `/admin/catalog/[productId]/variants` page and a focused variant/inventory editor.
- Added unit coverage for D-07 through D-10 and Playwright coverage for product-level and variant-level inventory workflows.

## Task Commits

1. **Task 1 RED: Variant rule contract** - `67cc187` (test)
2. **Task 1 GREEN: Variant rules and inventory actions** - `3772bc3` (feat)
3. **Task 2 RED: Admin variants workflow spec** - `1ab52a8` (test)
4. **Task 2 GREEN: Admin variants inventory editor** - `14583fb` (feat)

## Files Created/Modified

- `src/catalog/variant-schemas.ts` - Variant, override, removal, and inventory input validation.
- `src/catalog/variant-actions.ts` - Admin-only variant, price override, removal, and inventory mutations.
- `src/catalog/variant-pricing.ts` - Effective price helper for override-then-parent fallback.
- `src/app/admin/catalog/[productId]/variants/page.tsx` - Protected server-rendered variants and inventory route.
- `src/components/admin/catalog/variant-editor.tsx` - Client editor for product-level stock, explicit variants, stock, optional images, and overrides.
- `tests/unit/catalog/variants.test.ts` - Focused rule, pricing, authorization, and action tests.
- `tests/e2e/admin-variants.spec.ts` - Browser coverage for product inventory and variant inventory journeys.
- `supabase/migrations/20260613003000_variant_display_order.sql` - Additive variant display-order migration.
- `src/types/supabase.ts` - Generated type surface updated for `product_variants.display_order`.
- `src/auth/redirect.ts` - Safe redirect allow-list includes the nested variants admin route.

## Decisions Made

- Kept variant order as an explicit integer column instead of deriving order from SKU or creation time.
- Treated missing variant overrides as fallback behavior rather than storing disabled override rows.
- Kept product-level and variant-level inventory as separate UI modes so admin does not accidentally convert ownership.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added variant display order to the database**
- **Found during:** Task 1
- **Issue:** The existing `product_variants` table did not include `display_order`, but the plan requires explicit variant ordering and browser reordering.
- **Fix:** Added an additive migration and updated Supabase types for `product_variants.display_order`.
- **Files modified:** `supabase/migrations/20260613003000_variant_display_order.sql`, `src/types/supabase.ts`
- **Verification:** `npm run db:reset`, `npm run typecheck`, `npm run build`, and `npm run test:e2e -- tests/e2e/admin-variants.spec.ts`.
- **Committed in:** `3772bc3`

**2. [Rule 2 - Missing Critical] Allowed safe redirects to the variants admin route**
- **Found during:** Task 2
- **Issue:** Nested admin routes must be explicit safe redirect targets; `/admin/catalog/:id/variants` was not allow-listed.
- **Fix:** Added the variants path pattern to `src/auth/redirect.ts`.
- **Files modified:** `src/auth/redirect.ts`
- **Verification:** `npm run test:e2e -- tests/e2e/admin-variants.spec.ts`.
- **Committed in:** `14583fb`

**3. [Rule 1 - Bug] Cleared stale mutation messages before variant actions**
- **Found during:** Task 2 E2E verification
- **Issue:** A previous "Variant saved" message could remain visible while a later reorder save was still pending, making browser verification race the database update.
- **Fix:** Clear editor messages before each mutation so success text represents the current action.
- **Files modified:** `src/components/admin/catalog/variant-editor.tsx`
- **Verification:** `npm run test:e2e -- tests/e2e/admin-variants.spec.ts`.
- **Committed in:** `14583fb`

---

**Total deviations:** 3 auto-fixed (2 missing critical, 1 bug).
**Impact on plan:** All fixes were required for the planned behavior; no unrelated scope was added.

## Issues Encountered

- The local dev/build cache produced a stale `.next/dev/types/routes.d.ts` parse error during typecheck after repeated Playwright/dev server runs. Removing the generated `.next` cache resolved it; source files were unchanged.
- Because this plan added a migration, `npm run db:reset` was run before final browser verification so the local database contained `product_variants.display_order`.

## User Setup Required

None.

## Verification

Passed:

```text
npm run test:unit -- tests/unit/catalog/variants.test.ts
npm run typecheck
npm run build
npm run test:e2e -- tests/e2e/admin-variants.spec.ts
```

Additional setup/verification:

```text
npm run db:reset
```

Evidence:

- Variant unit spec passed 11/11 tests.
- TypeScript checking completed with no errors.
- Production build completed and included `/admin/catalog/[productId]/variants`.
- Admin variants Playwright spec passed 2/2 tests.
- Local Supabase reset applied `20260613003000_variant_display_order.sql`.

## Known Stubs

None.

## Threat Flags

None - the new admin mutation boundary was already covered by the plan threat model and each mutation calls `requireAdmin()`.

## Next Phase Readiness

- Ready for market-isolated catalog queries to consume parent offers, variant overrides, and variant inventory.
- Product detail can now render explicit variants with effective market prices and availability.

## Self-Check: PASSED

- Planned schema, action, pricing, route, component, unit test, browser spec, and display-order migration files exist.
- Task commits `67cc187`, `3772bc3`, `1ab52a8`, and `14583fb` exist.
- No tracked files were deleted by the plan commits.
- Every mutation in `src/catalog/variant-actions.ts` calls `requireAdmin()` before creating a Supabase client.

---
*Phase: 02-market-aware-catalog*
*Completed: 2026-06-13*
