---
phase: 07-content-seo-and-launch-readiness
plan: "02"
subsystem: admin-content
tags: [nextjs, admin, blog, server-actions, publish-checks, playwright, vitest]
requires:
  - phase: 07-content-seo-and-launch-readiness
    plan: "01"
    provides: blog schema, publish RPCs, and blocker mapping
provides:
  - Protected admin blog listing, new-post, and edit-post pages
  - Server actions for draft save, publish, schedule, and unpublish
  - Admin form for bilingual content, taxonomy, related products, schedule, and blocker display
  - Redirect allowlist coverage for blog admin routes
  - E2E coverage for admin blog authoring and customer denial
affects: [admin, blog, content, seo, auth-redirects]
tech-stack:
  added: []
  patterns:
    - requireAdmin-gated server actions before database access
    - Admin form mirrors catalog authoring patterns
    - Publish blockers surface stable labels without raw database detail
key-files:
  created:
    - src/app/admin/blog/page.tsx
    - src/app/admin/blog/new/page.tsx
    - src/app/admin/blog/[postId]/page.tsx
    - src/components/admin/blog/blog-post-form.tsx
    - src/content/blog/actions.ts
    - src/content/blog/queries.ts
    - supabase/migrations/20260623070200_blog_service_role_grants.sql
    - tests/e2e/blog-admin.spec.ts
  modified:
    - src/auth/redirect.ts
    - tests/unit/content/blog.test.ts
key-decisions:
  - "Blog authoring follows the catalog admin pattern with server actions, not client-side Supabase writes."
  - "Admin must save a draft before publish, schedule, or unpublish actions can mutate post state."
  - "Blog admin redirects are explicitly allowlisted by safeRedirect."
patterns-established:
  - "Blog admin queries compose base tables server-side after requireAdmin page guards."
  - "Service-role fixture access to blog tables is granted by migration for local automated admin E2E setup."
requirements-completed: [BLOG-02]
duration: 45 min
completed: 2026-06-23
---

# Phase 07 Plan 02: Blog Admin Authoring Workflow Summary

**Protected admin blog authoring with bilingual draft editing, scheduling controls, publish blockers, and access-boundary tests**

## Performance

- **Duration:** 45 min
- **Started:** 2026-06-23T18:09:00+07:00
- **Completed:** 2026-06-23T18:54:00+07:00
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Added protected `/admin/blog`, `/admin/blog/new`, and `/admin/blog/[postId]` pages.
- Added blog server actions for saving drafts, publishing now, scheduling a publish timestamp, and unpublishing back to draft.
- Added admin blog form controls for shared category/schedule, Vietnamese and English content, SEO fields, social image references, tags, and related products.
- Added safe blocker display for missing publish requirements without exposing raw database details.
- Added blog admin routes to the safe auth redirect allowlist so login returns to the requested admin page.
- Added service-role grants for blog tables so local E2E fixtures can create and clean admin test data.
- Added Vitest coverage for admin guard ordering and blocker mapping, plus Playwright coverage for admin authoring and customer denial.

## Task Commits

1. **Tasks 1-2: Blog admin workflow and verification** - `5b3de188` (`feat(07-02): add blog admin authoring`)

## Files Created/Modified

- `src/app/admin/blog/page.tsx` - Admin blog list with draft/scheduled/published status and create link.
- `src/app/admin/blog/new/page.tsx` - Protected new blog post route.
- `src/app/admin/blog/[postId]/page.tsx` - Protected edit blog post route.
- `src/components/admin/blog/blog-post-form.tsx` - Bilingual admin editor and publish action controls.
- `src/content/blog/actions.ts` - requireAdmin-gated save, publish, schedule, and unpublish server actions.
- `src/content/blog/queries.ts` - Server-only admin list, form, taxonomy, and related-product query helpers.
- `src/auth/redirect.ts` - Blog admin route allowlist entries.
- `supabase/migrations/20260623070200_blog_service_role_grants.sql` - Service-role grants for automated fixture setup.
- `tests/e2e/blog-admin.spec.ts` - Admin authoring and customer denial browser coverage.
- `tests/unit/content/blog.test.ts` - Admin action authorization and blocker mapping coverage.

## Decisions Made

- Reused the catalog admin workflow shape instead of introducing a separate content-management abstraction.
- Required drafts to exist before publish/schedule/unpublish actions, keeping state-changing RPC calls tied to persisted post IDs.
- Kept public blog rendering out of scope for 07-02; public localized routes remain owned by 07-03.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Blog admin login redirected to home**
- **Found during:** Playwright E2E.
- **Issue:** `safeRedirect` did not allow `/admin/blog`, `/admin/blog/new`, or `/admin/blog/[postId]`, so sign-in fell back to the localized home page.
- **Fix:** Added blog admin paths to the safe admin redirect allowlist.
- **Files modified:** `src/auth/redirect.ts`
- **Verification:** `npm run test:e2e -- tests/e2e/blog-admin.spec.ts` passed.
- **Committed in:** `5b3de188`

**2. [Rule 3 - Blocking] Service-role fixtures could not insert blog taxonomy**
- **Found during:** Playwright E2E.
- **Issue:** Blog base tables granted admin-authenticated access but not local service-role REST fixture privileges, causing 403 setup failures.
- **Fix:** Added `20260623070200_blog_service_role_grants.sql`.
- **Files modified:** `supabase/migrations/20260623070200_blog_service_role_grants.sql`
- **Verification:** `npm run db:reset`, `npm run db:test`, and blog admin E2E passed.
- **Committed in:** `5b3de188`

---

**Total deviations:** 2 auto-fixed blocking issues.
**Impact on plan:** No scope change. Both fixes were required to make the protected admin workflow reachable and verifiable.

## Issues Encountered

- Playwright fixture payload initially included `description` for blog tags, but `blog_tag_translations` intentionally has no description column. The fixture now sends description only for categories.
- Sign-in page has both auth and newsletter email inputs, so the E2E helper uses explicit `#email` and `#password` selectors.
- Running the Next dev server rewrote `next-env.d.ts` line endings/import path locally; it was not staged or committed.

## Verification Evidence

- `npm run test:unit -- tests/unit/content/blog.test.ts` - passed, 1 file / 5 tests.
- `npm run typecheck` - passed.
- `npm run lint` - passed with 0 errors and 8 pre-existing warnings outside this plan.
- `npm run db:reset` - passed after applying the service-role grant migration.
- `npm run db:test` - passed, 19 files / 487 tests.
- `npm run test:e2e -- tests/e2e/blog-admin.spec.ts` - passed, 2 tests.
- `git diff --exit-code src/types/supabase.ts` - passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 07-03 can render public localized blog pages from the published projection functions and admin-authored content created here.

---
*Phase: 07-content-seo-and-launch-readiness*
*Completed: 2026-06-23*
