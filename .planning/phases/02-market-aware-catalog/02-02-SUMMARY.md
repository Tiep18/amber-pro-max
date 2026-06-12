---
phase: 02-market-aware-catalog
plan: "02"
subsystem: admin-catalog
tags: [nextjs, admin, catalog, server-actions, playwright, zod]

requires:
  - phase: 02-market-aware-catalog
    plan: "01"
    provides: Catalog schema, publish RPCs, RLS, generated Supabase types, and catalog domain contracts
provides:
  - Admin-only product draft, publish, archive, translation, taxonomy, collection, and offer actions
  - Bilingual product basics editor for PDF pattern and physical finished product drafts
  - Stable publish blocker presentation backed by the database publish RPC
  - Browser coverage for admin create/edit and customer denial
affects:
  - 02-03-catalog-media
  - 02-04-variants-inventory
  - 02-08-product-detail

tech-stack:
  added: []
  patterns:
    - Admin server routes call requireAdmin before loading catalog data
    - Client product form calls server actions and never sets published status directly
    - Publish UI maps database issue codes to stable field/group labels

key-files:
  created:
    - src/catalog/schemas.ts
    - src/catalog/actions.ts
    - src/catalog/publish-checks.ts
    - src/app/admin/catalog/page.tsx
    - src/app/admin/catalog/new/page.tsx
    - src/app/admin/catalog/[productId]/page.tsx
    - src/app/admin/catalog/catalog-data.ts
    - src/components/admin/catalog/product-form.tsx
    - tests/unit/catalog/publish-checks.test.ts
    - tests/e2e/admin-product.spec.ts
  modified:
    - src/auth/redirect.ts
    - .planning/STATE.md
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Draft save and publish stay separate: server actions persist incomplete drafts while the database RPC decides publishability."
  - "Admin catalog nested paths are explicit safe redirect targets instead of allowing arbitrary admin path redirects."
  - "Media/PDF and variants are linked from the product editor but left to their dedicated Phase 2 plans."

patterns-established:
  - "Catalog admin pages are force-dynamic and server-protected before rendering."
  - "Product forms submit typed object payloads to server actions; browser-submitted status is ignored."
  - "E2E test data uses unique product slugs so repeated runs do not collide with prior failed runs."

requirements-completed: [MKT-03, MKT-04, CAT-01, CAT-03, CAT-04, SEO-01]

duration: 52 min
completed: 2026-06-13
---

# Phase 02 Plan 02: Admin Product Basics Summary

**Protected admin catalog workflow for bilingual product drafts, market offers, taxonomy, publish blockers, and customer denial**

## Performance

- **Duration:** 52 min
- **Started:** 2026-06-12T17:18:00Z
- **Completed:** 2026-06-13T00:59:00+07:00
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- Added Zod validation for bilingual product draft input, localized slugs, JSON specifications, taxonomy IDs, collection ordering, and VN/INTL market offers.
- Implemented admin-only server actions for saving drafts, publishing through `publish_catalog_product`, archiving, and mapping database publish blockers without exposing raw database details.
- Built protected `/admin/catalog`, `/admin/catalog/new`, and `/admin/catalog/[productId]` routes with a reusable product basics form.
- Added safe redirect support for the explicit nested admin catalog paths needed by the protected workflow.
- Covered admin draft creation/editing, publish blocker display, workflow links, and customer denial with Playwright.

## Task Commits

1. **Task 1 RED: Admin catalog action contract** - `6decdd4` (test)
2. **Task 1 GREEN: Authorized catalog draft actions** - `eb1a58f` (feat)
3. **Task 2 GREEN: Admin product basics editor and E2E workflow** - `ed4db7a` (feat)

## Files Created/Modified

- `src/catalog/schemas.ts` - Draft payload validation for product basics, localized metadata, taxonomy, collections, and market offers.
- `src/catalog/actions.ts` - Admin-only save, publish, and archive server actions.
- `src/catalog/publish-checks.ts` - Stable publish issue mapping for UI-safe blocker display.
- `src/app/admin/catalog/page.tsx` - Protected admin product list.
- `src/app/admin/catalog/new/page.tsx` - Protected new product page.
- `src/app/admin/catalog/[productId]/page.tsx` - Protected edit product page.
- `src/app/admin/catalog/catalog-data.ts` - Server-only catalog option/list/detail loaders for admin pages.
- `src/components/admin/catalog/product-form.tsx` - Accessible bilingual product basics form.
- `tests/unit/catalog/publish-checks.test.ts` - Validation, action, authorization, and publish mapping unit tests.
- `tests/e2e/admin-product.spec.ts` - Admin product basics and customer denial browser coverage.
- `src/auth/redirect.ts` - Explicit safe redirect allow-list for nested admin catalog routes.

## Decisions Made

- Kept the editor focused on product basics; it links to media/PDF and variants/inventory workflows instead of implementing those concerns in this plan.
- Used the database publish RPC as the only publish gate, so UI state cannot partially publish a product.
- Added only explicit admin catalog paths to `safeRedirect` to preserve the existing redirect hardening.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Safe redirect blocked nested admin catalog paths**
- **Found during:** Task 2 E2E verification
- **Issue:** Admin sign-in could safely redirect to `/admin` but not the new nested catalog paths.
- **Fix:** Added an explicit allow-list for `/admin/catalog`, `/admin/catalog/new`, and UUID edit paths.
- **Files modified:** `src/auth/redirect.ts`
- **Verification:** `npm run test:unit -- tests/unit/auth/redirect.test.ts` and `npm run test:e2e -- tests/e2e/admin-product.spec.ts`.
- **Committed in:** `ed4db7a`

**2. [Rule 1 - Test Robustness] Product E2E slug collisions after failed runs**
- **Found during:** Task 2 E2E verification
- **Issue:** Failed E2E attempts could leave a product row that made the next fixed-slug run hit unique constraints.
- **Fix:** Made product slugs unique per test run.
- **Files modified:** `tests/e2e/admin-product.spec.ts`
- **Verification:** Re-ran the admin product Playwright spec after a clean database reset.
- **Committed in:** `ed4db7a`

### Process Deviation

Task 2 was resumed inline after the executor subagent hit a provider quota error. The E2E test file existed as uncommitted work from the interrupted attempt, but the RED failure state was not recoverable as a separate committed gate. The completed task was committed as one outcome commit after the browser workflow passed.

---

**Total deviations:** 2 auto-fixed implementation/test issues, 1 process deviation from interrupted subagent execution.
**Impact on plan:** Product behavior and authorization scope match the plan; TDD commit granularity is imperfect for Task 2 due to the quota interruption.

## Issues Encountered

- Subagent execution for `02-02` stopped with a provider usage limit after Task 1. Work resumed inline from the partial commits.
- TypeScript incremental cache briefly reported existing `.tsx` files as missing after Playwright/Next dev runs. Removing `tsconfig.tsbuildinfo` resolved the stale cache; source files were intact.

## User Setup Required

None.

## Verification

Passed:

```text
npm run test:unit -- tests/unit/catalog/publish-checks.test.ts
npm run test:unit -- tests/unit/auth/redirect.test.ts
npm run typecheck
npm run build
npm run db:reset
npm run test:e2e -- tests/e2e/admin-product.spec.ts
```

Evidence:

- Catalog action unit tests passed 11/11.
- Redirect unit tests passed 24/24.
- TypeScript checking completed with no errors.
- Production build completed successfully.
- Supabase reset applied Phase 1 and Phase 2 catalog migrations successfully.
- Admin product Playwright spec passed 2/2 tests.

## Known Stubs

- `/admin/catalog/[productId]/media` and `/admin/catalog/[productId]/variants` are links only in this plan; implementation is owned by Plans 02-03 and 02-04.

## Next Phase Readiness

- Ready for Plan 02-03 media/PDF management and Plan 02-04 variants/inventory.
- Product editor already surfaces publish blockers those plans will clear.

## Self-Check: PASSED

- Planned action, schema, publish mapping, admin route, form, unit test, and E2E files exist.
- Every mutation in `src/catalog/actions.ts` calls `requireAdmin()` before database access.
- `publishProductAction` calls `publish_catalog_product` and maps blockers through `catalog_publish_issues`.
- Verification commands listed above pass.

---
*Phase: 02-market-aware-catalog*
*Completed: 2026-06-13*
