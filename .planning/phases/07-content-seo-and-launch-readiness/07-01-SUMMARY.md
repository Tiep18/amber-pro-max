---
phase: 07-content-seo-and-launch-readiness
plan: "01"
subsystem: database
tags: [supabase, postgres, rls, blog, publish-checks, vitest, pgtap]
requires:
  - phase: 02-market-aware-catalog
    provides: catalog publish-check and RLS patterns reused for blog content
provides:
  - Blog content tables, translations, taxonomy, related products, RLS, and public projections
  - Blog publish issue and publish functions
  - Blog input schemas and publish blocker mapping
  - Unit and database contracts for BLOG-01 and BLOG-02 foundations
affects: [content, blog, seo, admin, public-storefront]
tech-stack:
  added: []
  patterns:
    - Supabase RLS base tables with admin-only management
    - Public projection functions for published content
    - Stable publish blocker mapping that does not expose raw database details
key-files:
  created:
    - supabase/migrations/20260623070100_content_blog.sql
    - supabase/tests/database/07_content_blog.test.sql
    - src/content/blog/schemas.ts
    - src/content/blog/publish-checks.ts
    - tests/unit/content/blog.test.ts
    - tests/unit/content/blog-taxonomy.test.ts
    - tests/unit/content/publish-checks.test.ts
  modified:
    - src/types/supabase.ts
key-decisions:
  - "Blog publishing uses first-party Supabase tables and RLS, not a CMS dependency."
  - "Scheduled visibility is a public projection predicate on `status = 'published'` and `published_at <= now()`."
  - "Publish issue mapping drops raw database detail before surfacing blockers to admin UI."
patterns-established:
  - "Blog content mirrors catalog publish checks: database issue rows become stable typed blockers."
  - "Public blog reads go through projection functions instead of exposing base tables."
requirements-completed: [BLOG-01, BLOG-02]
duration: 35 min
completed: 2026-06-23
---

# Phase 07 Plan 01: Blog Database and Publish Contracts Summary

**Supabase blog content foundation with bilingual translations, taxonomy, publish checks, RLS, public projections, and typed blocker contracts**

## Performance

- **Duration:** 35 min
- **Started:** 2026-06-23T17:33:00+07:00
- **Completed:** 2026-06-23T18:08:00+07:00
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Added blog tables for posts, translations, categories, tags, post tags, and related products.
- Added admin-only RLS for blog base tables and public projection functions that exclude drafts and future-scheduled posts.
- Added publish issue and publish functions for category, bilingual translation, slug, title, description, and social image requirements.
- Added Zod schemas and safe publish blocker mapping for downstream admin UI.
- Added Vitest and pgtap coverage for blog schema, taxonomy, publish blockers, scheduled visibility, related products, and RLS.

## Task Commits

1. **Tasks 1-2: Blog database contracts and implementation** - `5ba3d0f9` (`feat(07-01): add blog content contracts`)

## Files Created/Modified

- `supabase/migrations/20260623070100_content_blog.sql` - Blog schema, RLS, publish checks, publish function, and public projections.
- `supabase/tests/database/07_content_blog.test.sql` - pgtap tests for schema, publish issues, scheduled visibility, related products, and RLS.
- `src/content/blog/schemas.ts` - Blog draft Zod schema and types.
- `src/content/blog/publish-checks.ts` - Stable database issue to admin blocker mapper.
- `src/types/supabase.ts` - Generated Supabase types for blog tables and functions.
- `tests/unit/content/blog.test.ts` - Blog post draft/schedule schema coverage.
- `tests/unit/content/blog-taxonomy.test.ts` - Category, optional tags, and related-product schema coverage.
- `tests/unit/content/publish-checks.test.ts` - Publish blocker mapping coverage.

## Decisions Made

- Used first-party Supabase tables and SQL functions for blog content instead of adding CMS infrastructure.
- Kept blog base tables admin-only under RLS and exposed public content through projection functions.
- Treated scheduled posts as published records that become public only when `published_at <= now()`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Generated Supabase types changed before commit**
- **Found during:** Plan-level verification
- **Issue:** `git diff --exit-code src/types/supabase.ts` failed immediately after `npm run db:types` because the new blog migration legitimately changed generated types.
- **Fix:** Committed generated `src/types/supabase.ts` together with migration and tests, then reran the diff check after commit.
- **Files modified:** `src/types/supabase.ts`
- **Verification:** `git diff --exit-code src/types/supabase.ts` passed after `5ba3d0f9`.
- **Committed in:** `5ba3d0f9`

---

**Total deviations:** 1 auto-fixed (blocking verification order).
**Impact on plan:** No scope change. The generated type diff was expected for a schema migration and is now committed.

## Issues Encountered

- Initial `npm run db:test` failed before reset because the local database had stale seed/test data and did not yet include the new migration. Running `npm run db:reset` applied all migrations, after which `db:test` passed.
- One pgtap assertion initially checked publish issues on a complete post. The test was corrected to inspect a new incomplete draft so the admin publish-issue check proves the intended behavior.

## Verification Evidence

- `npm run test:unit -- tests/unit/content/blog.test.ts tests/unit/content/blog-taxonomy.test.ts tests/unit/content/publish-checks.test.ts` - passed, 3 files / 8 tests.
- `npm run db:test` - passed, 19 files / 487 tests.
- `npm run db:types` - passed.
- `git diff --exit-code src/types/supabase.ts` - passed after commit.
- `npm run typecheck` - passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 07-02 can build admin blog authoring on top of the blog schema, publish issue functions, and typed blocker mapper created here.

---
*Phase: 07-content-seo-and-launch-readiness*
*Completed: 2026-06-23*
