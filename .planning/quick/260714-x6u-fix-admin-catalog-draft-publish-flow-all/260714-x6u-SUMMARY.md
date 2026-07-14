---
quick_id: 260714-x6u
status: complete
completed_at: '2026-07-15T00:29:00+07:00'
commits:
  - 157b48c
  - db5a785
  - 0828690
---

# Quick Task 260714-x6u Summary

Implemented a strict separation between draft persistence and publish readiness, then made publish save the exact editor snapshot before invoking the authoritative database publish boundary.

## Commits

- `157b48c fix(catalog): persist incomplete drafts 260714-x6u`
- `db5a785 fix(catalog): publish current draft snapshot 260714-x6u`
- `0828690 test(catalog): cover draft publish regression 260714-x6u`

## Files

- `supabase/migrations/20260714220000_allow_incomplete_catalog_drafts.sql`
- `supabase/tests/database/02_atomic_catalog_product_save.test.sql`
- `supabase/tests/database/02_catalog_model.test.sql`
- `src/catalog/schemas.ts`
- `src/catalog/actions.ts`
- `src/components/admin/catalog/product-form.tsx`
- `src/app/admin/catalog/catalog-data.ts`
- `src/types/supabase.ts`
- `tests/unit/catalog/publish-checks.test.ts`
- `tests/e2e/admin-product.spec.ts`

## Verification

- `npm run db:reset` — passed.
- `npm run db:lint` — passed with no schema errors.
- `npm run db:test` — passed: 32 files, 794 assertions.
- Local type generation through the explicit local database URL passed. The shorthand `npm run db:types` encountered a local Supabase pg-meta password-authentication failure after reset; the generated schema delta was verified to contain only the three expected nullable `product_translations.slug` type changes.
- `npm run test:unit -- tests/unit/catalog/publish-checks.test.ts` — passed: 20 tests.
- `npm run test:unit -- tests/unit/catalog` — passed: 12 files, 77 tests.
- Focused ESLint and `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run build` — passed, including 104 generated static pages.
- `git diff --check` — passed for every code commit.
- Targeted Playwright was attempted but could not use the normal config because an existing user-owned Next dev process (PID 24600) held the workspace dev lock. Reusing that older server on port 3000 reached a mismatched/stale auth environment and could not sign in. The process was not terminated, and this browser gate is reported as unavailable rather than passed.

## Behavioral Result

- Admins can save incomplete bilingual titles/slugs and enabled offers without a price as drafts.
- Empty slugs persist as `null`, so incomplete drafts do not collide on locale slug uniqueness.
- Publish-time blockers and invariant triggers still prevent or demote ineligible public products.
- Publish saves the exact submitted ProductForm snapshot before checking blockers and never publishes after a save failure.
- The catalog browser contract now uses current Radix Select, locale tab, Toggle, taxonomy multi-select, and table semantics.

## Known Baseline

`npm run test:security` is intentionally not a blocking gate for this quick task. `tests/security/catalog-boundaries.test.mjs` still contains the previously identified unrelated generic `object_path` regex false-positive; it was not modified or suppressed.
