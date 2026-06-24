---
phase: 07-content-seo-and-launch-readiness
plan: "05"
status: complete
completed_at: "2026-06-24T02:44:28.000Z"
requirements: [SEO-02, SEO-04]
decisions: [D-05, D-07, D-08]
---

# Phase 07 Plan 05 Summary: Sitemaps, robots, and private URL exclusion

## Outcome

Added a dynamic sitemap index, locale-specific public sitemaps, and crawler rules that exclude private and operational routes.

## Implemented

- Added `/sitemap.xml` with English and Vietnamese sitemap locations.
- Added locale sitemap routes generated only from public catalog, published blog, and published policy projections.
- Added `robots.txt` rules that disallow admin, API, auth, account, order, and checkout surfaces.
- Added XML generation helpers with escaping and absolute site URL handling.
- Excluded physical sitemap routes from locale proxy rewriting.
- Added Playwright, security boundary, and unit coverage for public URL inclusion and private URL exclusion.

## Verification

- `npm run test:e2e -- tests/e2e/sitemap-robots.spec.ts` passed: 3 tests.
- `node --test tests/security/content-boundaries.test.mjs` passed: 2 tests.
- `npm run test:unit -- tests/unit/content/seo.test.ts` passed: 1 file, 3 tests.
- `npm run typecheck` passed.
- `npm run lint` passed with 8 pre-existing warnings and 0 errors.

## Deviations from Plan

- Added `src/proxy.ts` to the implementation scope so `/sitemaps/{locale}` remains a physical route instead of being redirected by locale middleware.
- Updated the existing SEO unit test to cover XML escaping; this file was omitted from the plan frontmatter but was already named in the plan verification command.

## Commits

| Commit | Description |
|--------|-------------|
| `4af6d5aa` | Add public sitemaps, robots rules, proxy bypass, and focused tests |

## Self-Check: PASSED

All declared artifacts exist, the production commit is present, and every plan verification command exits successfully.
