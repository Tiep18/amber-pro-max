---
phase: 01-secure-bilingual-foundation
plan: "02"
subsystem: i18n
tags: [next-intl, routing, proxy, localization, playwright, vitest]

requires:
  - phase: 01-01
    provides: Approved Next.js scaffold, package scripts, and lockfile
provides:
  - Always-prefixed Vietnamese and English routing contract
  - Translated public auth slugs for `/vi/dang-nhap` and `/en/sign-in`
  - Locale negotiation proxy for first unprefixed visits
  - Unit and browser localization tests
affects:
  - 01-03-public-shell
  - 01-05-auth-foundation
  - 01-06-auth-pages

tech-stack:
  added: []
  patterns:
    - next-intl `defineRouting` and typed navigation helpers
    - Browser locale negotiation through `src/proxy.ts`
    - Vitest route-contract tests and Playwright localization checks

key-files:
  created:
    - src/i18n/routing.ts
    - src/i18n/navigation.ts
    - src/i18n/request.ts
    - src/messages/en.json
    - src/messages/vi.json
    - src/proxy.ts
    - tests/unit/i18n/routing.test.ts
    - tests/e2e/localization.spec.ts
    - vitest.config.ts
    - playwright.config.ts
    - .github/workflows/ci.yml
    - src/app/[locale]/layout.tsx
    - src/app/[locale]/page.tsx
    - src/app/[locale]/(auth)/sign-in/page.tsx
    - src/app/[locale]/(auth)/dang-nhap/page.tsx
  modified:
    - next.config.ts
    - next-env.d.ts

key-decisions:
  - "Browser locale negotiation uses Vietnamese only when the browser locale is Vietnamese; all other first visits default to English."
  - "Playwright uses a dedicated port and does not reuse existing local servers, preventing cross-project server contamination."
  - "Vietnamese and English sign-in slugs are backed by physical routes during Phase 1 to avoid a next-intl self-redirect loop in dev."

patterns-established:
  - "Route-contract helpers expose localized paths and equivalent-page switching from a single `src/i18n/routing.ts` source."
  - "Localization tests assert locked decisions D-01 through D-04 directly."
  - "Public auth route pages reject the wrong locale slug with `notFound()` to avoid duplicate public content."

requirements-completed:
  - MKT-01
  - SEC-02

duration: 12 min
completed: 2026-06-12
---

# Phase 01 Plan 02: Locale Routing Contract Summary

**Always-prefixed Vietnamese/English routing with translated auth slugs, first-visit locale negotiation, and automated route-contract coverage**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-12T10:14:35Z
- **Completed:** 2026-06-12T10:26:15Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments

- Added `next-intl` routing config for `/vi` and `/en` with `localePrefix: 'always'`.
- Encoded translated auth slugs, including `/vi/dang-nhap` and `/en/sign-in`.
- Added proxy handling for first unprefixed visits and safe prefixed route enforcement.
- Added Vitest and Playwright coverage for D-01, D-02, D-03, and D-04.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define always-prefixed localized route contracts** - `d863514` (feat)
2. **Task 2: Add proxy locale negotiation and browser localization tests** - `d863514` (feat)

**Plan metadata:** committed after this summary.

## Files Created/Modified

- `src/i18n/routing.ts` - locale list, translated pathnames, locale preference, localized path helpers, and equivalent switching.
- `src/i18n/navigation.ts` - typed next-intl navigation helpers.
- `src/i18n/request.ts` - request-scoped next-intl message loading.
- `src/messages/en.json` - English Phase 1 message scaffold.
- `src/messages/vi.json` - Vietnamese Phase 1 message scaffold.
- `src/proxy.ts` - first-visit locale negotiation and next-intl middleware composition.
- `tests/unit/i18n/routing.test.ts` - route-contract and message-key tests.
- `tests/e2e/localization.spec.ts` - browser coverage for negotiation, prefixed routes, and auth slug switching.
- `vitest.config.ts` - unit test configuration.
- `playwright.config.ts` - dedicated-port E2E configuration.
- `.github/workflows/ci.yml` - lint, typecheck, unit, build, and localization E2E CI.
- `src/app/[locale]/*` - minimal localized pages required for routing tests.
- `next.config.ts` - next-intl plugin wiring.

## Decisions Made

- Kept locale detection explicit in `src/proxy.ts` so Vietnamese is selected only when the browser actually prefers Vietnamese.
- Used Playwright browser context `locale` rather than manually setting `Accept-Language`, matching browser behavior more reliably.
- Used physical auth slug pages for `/vi/dang-nhap` and `/en/sign-in` because the next-intl pathname middleware produced a self-redirect loop for the Vietnamese auth slug in dev.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Isolated Playwright from stale local servers**
- **Found during:** Task 2 (Add proxy locale negotiation and browser localization tests)
- **Issue:** Playwright reused an unrelated server on port 3000 and read stale `ambertinybear` HTML from another process.
- **Fix:** Switched Playwright to port `3210` and set `reuseExistingServer: false`.
- **Files modified:** `playwright.config.ts`
- **Verification:** `npm run test:e2e -- tests/e2e/localization.spec.ts` passes.
- **Committed in:** `d863514`

**2. [Rule 3 - Blocking] Avoided next-intl self-redirect on Vietnamese auth slug**
- **Found during:** Task 2 (Add proxy locale negotiation and browser localization tests)
- **Issue:** `/vi/dang-nhap` produced `ERR_TOO_MANY_REDIRECTS` when middleware canonicalized the localized pathname.
- **Fix:** Added physical localized auth routes and bypassed middleware for the two public auth slugs.
- **Files modified:** `src/proxy.ts`, `src/app/[locale]/(auth)/sign-in/page.tsx`, `src/app/[locale]/(auth)/dang-nhap/page.tsx`
- **Verification:** `npm run test:e2e -- tests/e2e/localization.spec.ts` passes.
- **Committed in:** `d863514`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes preserve the locked routing decisions while making the browser verification deterministic.

## Issues Encountered

- Build output still lists generated route patterns for both physical auth folders under `[locale]`, but wrong-locale slug pages call `notFound()` and are not exposed by routing helpers or navigation tests.

## User Setup Required

None - no external service configuration required.

## Verification

Passed:

```bash
npm run test:unit -- tests/unit/i18n
npm run lint
npm run typecheck
npm run build
npm run test:e2e -- tests/e2e/localization.spec.ts
```

## Next Phase Readiness

Ready for Plan 01-04 in Wave 2 and for the public shell/auth plans that consume the route map.

---
*Phase: 01-secure-bilingual-foundation*
*Completed: 2026-06-12*
