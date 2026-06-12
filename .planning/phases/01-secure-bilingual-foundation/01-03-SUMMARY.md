---
phase: 01-secure-bilingual-foundation
plan: "03"
subsystem: public-shell
tags: [ui, i18n, next-intl, shadcn-style, playwright]

requires:
  - phase: 01-02
    provides: Always-prefixed localized routing and equivalent auth slugs
provides:
  - Warm handmade studio design tokens and global styles
  - Localized public shell for `/vi` and `/en`
  - Header, footer, mobile menu, and route-preserving language control
  - Phase 1 UI primitives scoped to shell/auth foundations
affects:
  - 01-05-auth-foundation
  - 01-06-auth-pages
  - 01-07-admin-shell

tech-stack:
  added: []
  patterns:
    - Semantic CSS variables layered under Tailwind utilities
    - Be Vietnam Pro loaded from the root App Router layout
    - Dependency-free shadcn-style local primitives for Phase 1 controls
    - Route-preserving locale switcher with a safe query allowlist

key-files:
  created:
    - src/app/globals.css
    - src/components/locale-switcher.tsx
    - src/components/site-header.tsx
    - src/components/site-footer.tsx
    - src/components/ui/alert.tsx
    - src/components/ui/button.tsx
    - src/components/ui/card.tsx
    - src/components/ui/separator.tsx
    - src/components/ui/sheet.tsx
    - src/components/ui/skeleton.tsx
    - src/lib/utils.ts
  modified:
    - src/app/layout.tsx
    - src/app/[locale]/layout.tsx
    - src/app/[locale]/page.tsx
    - src/messages/en.json
    - src/messages/vi.json
    - src/types/supabase.ts
    - tests/e2e/localization.spec.ts

key-decisions:
  - "Used local shadcn-style primitives instead of adding Radix packages because the approved dependency set for Phase 1 did not include additional UI runtime packages."
  - "Kept public navigation to Home, Sign in, language, and mobile menu only; commerce destinations remain absent until their plans exist."
  - "Allowed only safe relative `next` query values during language switching so the control cannot become an open redirect."

patterns-established:
  - "Localized layouts load messages server-side and pass locale to the public shell components."
  - "Responsive header hides primary navigation on mobile and exposes the same Phase 1 destinations through a sheet."
  - "Playwright localization tests cover the shell, mobile no-overflow behavior, and equivalent auth page switching."

requirements-completed:
  - MKT-01
  - SEC-02

duration: 16 min
completed: 2026-06-12
---

# Phase 01 Plan 03: Public Shell Summary

**Localized public UI foundation with warm handmade tokens, responsive shell navigation, and safe route-preserving language switching**

## Performance

- **Duration:** 16 min
- **Completed:** 2026-06-12
- **Tasks:** 2
- **Files modified:** 18

## Accomplishments

- Added the Phase 1 visual token layer in `src/app/globals.css`.
- Added local UI primitives for buttons, cards, alerts, sheet navigation, separators, and skeleton loading states.
- Built localized `/vi` and `/en` public home shells with restrained studio copy and no commerce navigation.
- Added header, footer, mobile menu, and VI/EN language switching that preserves equivalent routes.
- Expanded Playwright coverage for mobile no-overflow behavior, visible shell navigation, and auth slug switching.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement semantic tokens and UI primitives** - `c43f527` (feat)
2. **Task 2: Build localized public shell and route-preserving language control** - `c43f527` (feat)

**Plan metadata:** committed after this summary.

## Files Created/Modified

- `src/app/globals.css` - semantic color, radius, focus, and base typography tokens.
- `src/app/layout.tsx` - root font and global stylesheet wiring.
- `src/app/[locale]/layout.tsx` - localized shell wrapper with `NextIntlClientProvider`, header, and footer.
- `src/app/[locale]/page.tsx` - localized public shell content.
- `src/components/locale-switcher.tsx` - VI/EN route-preserving language control with safe query filtering.
- `src/components/site-header.tsx` - responsive Phase 1 public header and mobile sheet navigation.
- `src/components/site-footer.tsx` - localized footer and language access.
- `src/components/ui/*` - local shadcn-style primitives used by the public shell.
- `src/messages/en.json` and `src/messages/vi.json` - shell, navigation, footer, and home copy.
- `tests/e2e/localization.spec.ts` - updated browser assertions for the completed shell.

## Decisions Made

- Kept the UI dependency surface unchanged after the package approval checkpoint.
- Chose accessible text labels for language links while displaying compact `VI` and `EN` labels.
- Scoped test assertions to banner navigation where duplicate language controls exist in header and footer.
- Preserved only the allowlisted `next` query parameter during language switching.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Playwright strict locators collided with completed shell copy**
- **Found during:** Task 2 verification
- **Issue:** After adding header/footer/shell copy, broad locators matched multiple elements.
- **Fix:** Scoped language assertions to the banner and used exact text where needed.
- **Files modified:** `tests/e2e/localization.spec.ts`
- **Verification:** `npm run test:e2e -- tests/e2e/localization.spec.ts` passes.
- **Committed in:** `c43f527`

**2. [Rule 3 - Blocking] Mobile viewport test expected desktop nav links**
- **Found during:** Task 2 verification
- **Issue:** The 320px viewport correctly hides primary navigation behind the mobile menu, but the test expected desktop Home and Sign in links.
- **Fix:** Asserted the mobile menu at 320px, checked no horizontal overflow, then asserted desktop navigation at 1024px.
- **Files modified:** `tests/e2e/localization.spec.ts`
- **Verification:** `npm run test:e2e -- tests/e2e/localization.spec.ts` passes.
- **Committed in:** `c43f527`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes align verification with the intended responsive shell behavior.

## Issues Encountered

- `src/types/supabase.ts` was regenerated as UTF-8 after a previous PowerShell redirection created a binary/UTF-16-like diff. This keeps TypeScript tooling stable.
- The UI primitives are source-compatible local primitives rather than newly generated official shadcn/Radix components because no additional UI runtime packages were part of the approved dependency set.

## User Setup Required

None.

## Verification

Passed:

```bash
npm run lint
npm run typecheck
npm run build
npm run test:e2e -- tests/e2e/localization.spec.ts
```

## Next Phase Readiness

Ready for Plan 01-05 auth foundation to consume the localized shell, route helpers, and RLS-backed profile/role foundation.

---
*Phase: 01-secure-bilingual-foundation*
*Completed: 2026-06-12*
