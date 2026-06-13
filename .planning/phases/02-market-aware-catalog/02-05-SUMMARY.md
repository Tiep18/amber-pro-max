---
phase: 02-market-aware-catalog
plan: "05"
subsystem: catalog
tags: [market, money, i18n, nextjs, playwright]

requires:
  - phase: 02-market-aware-catalog
    provides: Catalog product and offer foundations from Plan 02-01
provides:
  - Validated active-market resolution from cookie and country signal
  - Safe server action for persisting shopper market choice
  - Integer minor-unit VND/USD formatting helper
  - Visible bilingual market switcher in desktop and mobile header
affects: [catalog queries, public catalog pages, checkout, pricing]

tech-stack:
  added: []
  patterns:
    - Market context is independent from locale
    - Cookie-backed shopper preference wins over deployment country suggestion
    - Money formatting uses explicit currency codes and integer minor units

key-files:
  created:
    - src/catalog/market.ts
    - src/catalog/money.ts
    - src/catalog/market-actions.ts
    - src/components/market-switcher.tsx
    - tests/unit/catalog/market.test.ts
    - tests/unit/catalog/money.test.ts
    - tests/e2e/catalog-market.spec.ts
  modified:
    - src/proxy.ts
    - src/components/site-header.tsx
    - src/messages/en.json
    - src/messages/vi.json

key-decisions:
  - "The ACTIVE_MARKET cookie is the authoritative explicit shopper choice; x-vercel-ip-country only seeds a valid initial suggestion."
  - "Market switching preserves the current localized path through a server-validated relative return path."
  - "Money display rejects market/currency mismatches instead of converting between VND and USD."

patterns-established:
  - "Market resolver helpers stay pure and are tested separately from server actions."
  - "Header controls receive localized labels from server translations while the form component stays client-side for pathname access."

requirements-completed: [MKT-02, MKT-05]

duration: 25 min
completed: 2026-06-13
---

# Phase 02 Plan 05: Market Selection and Money Formatting Summary

**Cookie-backed market selection with safe persistence, visible bilingual controls, and integer VND/USD formatting**

## Performance

- **Duration:** 25 min
- **Started:** 2026-06-13T01:34:00Z
- **Completed:** 2026-06-13T01:59:15Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Added active-market resolution where a valid cookie wins over country suggestion and invalid values fall back deterministically.
- Added a safe server action that writes `ACTIVE_MARKET` with restricted cookie options and rejects unsafe return paths.
- Added market-aware money formatting for VND whole units and USD cents with market/currency mismatch protection.
- Added a localized market switcher to desktop and mobile header layouts with Playwright coverage for suggestion, persistence, switching, locale independence, and unsafe redirects.

## Task Commits

Each task was committed atomically:

1. **Task 1: Market resolution and money formatting RED tests** - `8d8040b` (test)
2. **Task 1: Market resolution, persistence, and money formatting** - `209eddd` (feat)
3. **Task 2: Market switcher RED browser tests** - `e4e0825` (test)
4. **Task 2: Visible bilingual market control** - `ed18752` (feat)

**Plan metadata:** pending in docs commit

## Files Created/Modified

- `src/catalog/market.ts` - Market code validation, country suggestion, active-market resolution, cookie options, safe return-path handling, and proxy cookie helper.
- `src/catalog/market-actions.ts` - Server action that persists the selected market and redirects only to validated localized relative paths.
- `src/catalog/money.ts` - Integer minor-unit formatter for VND and USD with market/currency validation.
- `src/components/market-switcher.tsx` - Accessible market switcher forms using localized labels and current pathname return targets.
- `src/components/site-header.tsx` - Resolves active market server-side and renders the switcher in desktop and mobile header surfaces.
- `src/messages/en.json` - English market-control labels.
- `src/messages/vi.json` - Vietnamese market-control labels in the repo's current ASCII style.
- `src/proxy.ts` - Applies the initial active-market suggestion cookie without dropping existing next-intl and Supabase proxy behavior.
- `tests/unit/catalog/market.test.ts` - Unit coverage for resolver priority, country suggestion, invalid values, safe cookies, and redirect fallback.
- `tests/unit/catalog/money.test.ts` - Unit coverage for VND/USD formatting and mismatch rejection.
- `tests/e2e/catalog-market.spec.ts` - Browser coverage for market visibility, persistence, locale independence, and unsafe return paths.

## Decisions Made

- The market cookie is `httpOnly`, `sameSite=lax`, scoped to `/`, long-lived for 180 days, and `secure` only in production.
- The switcher posts explicit `vn` or `intl` values; invalid form submissions degrade to `intl` rather than trusting arbitrary shopper input.
- Return paths must be localized relative paths, preventing open redirects and preserving market/locale independence.

## Deviations from Plan

None - plan executed exactly as written.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope changes.

## Issues Encountered

- The spawned executor completed code commits but did not create the required summary before shutdown. The orchestrator verified the work, committed the remaining Task 2 implementation, and completed this metadata closeout.

## Verification

- `npm run test:unit -- tests/unit/catalog/market.test.ts tests/unit/catalog/money.test.ts` - passed, 8 tests.
- `npm run typecheck` - passed.
- `npm run build` - passed.
- `npm run test:e2e -- tests/e2e/catalog-market.spec.ts --grep "suggestion|visible|switch|locale|refresh"` - passed, 5 tests.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Market context and money presentation are ready for Plan 02-06 public catalog queries. Public assortment and price isolation can now consume explicit `vn`/`intl` market state without inferring from locale.

---
*Phase: 02-market-aware-catalog*
*Completed: 2026-06-13*
