---
phase: 07-content-seo-and-launch-readiness
plan: "03"
status: complete
completed_at: "2026-06-24T02:00:00.000Z"
requirements: [BLOG-01, BLOG-02]
decisions: [D-02, D-03, D-04]
---

# Phase 07 Plan 03 Summary: Public localized blog rendering

## Outcome

Rendered bilingual public blog index and detail pages for published posts only, with localized category names, optional tags, related product links, localized metadata alternates, and Vietnamese public aliases under `/vi/bai-viet`.

## Implemented

- Added public blog query helpers for published index/detail reads.
- Added public blog index and detail pages under the internal `/blog` route.
- Added Vietnamese physical alias routes under `/bai-viet` and proxy bypass support to avoid localized redirect loops.
- Added localized blog path helpers and route pathname mappings.
- Added a public projection migration so anon/authenticated visitors can read only published, non-future blog data through safe RPCs.
- Added Playwright coverage for EN/VI public blog rendering and draft/future exclusion.
- Regenerated Supabase types for the updated blog RPC signatures.

## Verification

- `npm run db:reset` passed.
- `npm run db:test` passed: 21 files, 515 tests.
- `npm run db:types` passed.
- `npm run test:unit -- tests/unit/content/blog-taxonomy.test.ts` passed: 1 file, 3 tests.
- `npm run test:e2e -- tests/e2e/blog.spec.ts` passed: 2 tests.
- `npm run typecheck` passed.
- `npm run lint` passed with 8 pre-existing warnings and 0 errors.

## Notes

- The plan's file list did not include a migration, but the public page implementation required updating the published blog RPCs to include social images, tags, related products, and safe public execution.
- Initial E2E caught a `/vi/bai-viet` redirect loop; adding the Vietnamese blog alias to the proxy's physical-path bypass resolved it.
