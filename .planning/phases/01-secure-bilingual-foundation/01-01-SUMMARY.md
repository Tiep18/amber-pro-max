---
phase: 01-secure-bilingual-foundation
plan: "01"
subsystem: infra
tags: [nextjs, react, typescript, tailwind, eslint, prettier, shadcn, supabase, sec-02]

requires: []
provides:
  - Approved package manifest and generated npm lockfile
  - Next.js App Router scaffold with strict TypeScript configuration
  - Tailwind CSS 4 PostCSS, ESLint, Prettier, and shadcn source configuration
  - Public-only environment variable example for SEC-02
affects:
  - 01-02-i18n-routing
  - 01-03-public-shell
  - 01-04-supabase-foundation
  - 01-05-auth-foundation

tech-stack:
  added:
    - next@16.2.9
    - react@19.2.7
    - react-dom@19.2.7
    - next-intl@4.13.0
    - "@supabase/supabase-js@2.108.1"
    - "@supabase/ssr@0.12.0"
    - tailwindcss@4.3.0
    - "@tailwindcss/postcss@4.3.0"
    - zod@4.4.3
    - vitest@4.1.8
    - "@playwright/test@1.60.0"
    - eslint@10.4.1
    - eslint-config-next@16.2.9
    - prettier@3.8.4
    - lucide-react@1.17.0
  patterns:
    - Exact dependency pins with npm lockfile
    - Public-only NEXT_PUBLIC environment contract
    - Minimal App Router bootstrap before localized routes are introduced

key-files:
  created:
    - .nvmrc
    - .gitignore
    - package.json
    - package-lock.json
    - tsconfig.json
    - next.config.ts
    - postcss.config.mjs
    - eslint.config.mjs
    - prettier.config.mjs
    - components.json
    - .env.example
    - src/app/layout.tsx
    - src/app/page.tsx
    - .planning/phases/01-secure-bilingual-foundation/01-USER-SETUP.md
  modified:
    - .planning/config.json

key-decisions:
  - "Package install proceeded only after the user approved official npm lineage metadata."
  - "The root App Router page redirects to `/vi` as a temporary bootstrap until Plan 01-02 installs full locale negotiation."
  - "ESLint 10 is retained per plan, while Phase 1 lint config uses the compatible Next TypeScript flat config path because eslint-plugin-react 7.37.5 does not peer-support ESLint 10."

patterns-established:
  - "Dependency pins are exact in package.json and audited through package-lock.json."
  - "Only `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are documented for browser-visible configuration."
  - "Generated build outputs and dependency directories are excluded through .gitignore."

requirements-completed:
  - SEC-02

duration: 10 min
completed: 2026-06-12
---

# Phase 01 Plan 01: Dependency and Configuration Foundation Summary

**Approved Next.js 16 scaffold with pinned dependencies, strict TypeScript, public-only environment configuration, and passing lint/typecheck/build gates**

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-12T10:04:00Z
- **Completed:** 2026-06-12T10:14:35Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments

- Verified package lineage metadata before the initial install and continued only after human approval.
- Created the pinned npm manifest and generated `package-lock.json` from the approved package set.
- Added Next.js, TypeScript, Tailwind PostCSS, ESLint, Prettier, shadcn, and public environment scaffolding.
- Added a minimal App Router root that redirects to `/vi` so `next build` passes before the localized routing plan lands.

## Task Commits

Each task was committed atomically:

1. **Task 1: Verify official package lineage before initial install** - checkpoint approved by user; evidence recorded in this summary and `01-USER-SETUP.md`
2. **Task 2: Initialize package and base project configuration** - `d1cf3a9` (chore)

**Plan metadata:** committed after this summary.

## Files Created/Modified

- `.nvmrc` - pins Node 22 for project and CI alignment.
- `.gitignore` - excludes dependencies, Next build output, local env files, test output, and editor state.
- `package.json` - defines exact dependency versions and scripts for dev, lint, typecheck, build, unit, E2E, security, and CI.
- `package-lock.json` - records the approved install graph.
- `tsconfig.json` - enables strict TypeScript, App Router support, and `@/*` source alias.
- `next.config.ts` - initializes typed Next.js configuration.
- `postcss.config.mjs` - wires Tailwind CSS 4 through `@tailwindcss/postcss`.
- `eslint.config.mjs` - configures ESLint flat config for TypeScript/Next-compatible linting.
- `prettier.config.mjs` - sets deterministic formatting defaults.
- `components.json` - configures official shadcn/ui source generation with Lucide icons.
- `.env.example` - documents only publishable browser-visible variables.
- `src/app/layout.tsx` - minimal App Router root layout.
- `src/app/page.tsx` - temporary root redirect to `/vi`.
- `.planning/phases/01-secure-bilingual-foundation/01-USER-SETUP.md` - records the completed package approval checkpoint.

## Decisions Made

- Package approval was treated as blocking and completed before `npm install`.
- Added a minimal `src/app` entrypoint even though later plans own localized routing/UI because Next.js build requires an App Router entrypoint.
- Kept the plan-pinned ESLint 10 version and used the compatible Next TypeScript config path after confirming `eslint-plugin-react@7.37.5` does not peer-support ESLint 10.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added minimal App Router entrypoint**
- **Found during:** Task 2 (Initialize package and base project configuration)
- **Issue:** `next build` cannot verify a project with no `app` or `pages` directory.
- **Fix:** Added `src/app/layout.tsx` and a temporary `src/app/page.tsx` redirecting to `/vi`.
- **Files modified:** `src/app/layout.tsx`, `src/app/page.tsx`
- **Verification:** `npm run build` passes.
- **Committed in:** `d1cf3a9`

**2. [Rule 3 - Blocking] Adjusted ESLint config for ESLint 10 compatibility**
- **Found during:** Task 2 (Initialize package and base project configuration)
- **Issue:** `eslint-config-next@16.2.9` pulls `eslint-plugin-react@7.37.5`, whose peer range does not include ESLint 10 and crashes on React rules.
- **Fix:** Used the Next TypeScript flat config path for Phase 1 linting while retaining the plan-pinned ESLint package.
- **Files modified:** `eslint.config.mjs`
- **Verification:** `npm run lint` passes.
- **Committed in:** `d1cf3a9`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes are narrow scaffold enablers. Package pins, SEC-02 environment scope, and future localized routing boundaries remain intact.

## Issues Encountered

- `npm audit --json` reports 3 moderate findings related to `postcss` as a transitive dependency inside `next@16.2.9`; npm's suggested fix is an invalid major downgrade path for this locked Next.js stack. The direct project `postcss` dependency is `8.5.15`, outside the vulnerable range. This remains a dependency advisory to recheck when Next.js publishes a patched dependency graph.

## User Setup Required

Package legitimacy setup is complete. See [01-USER-SETUP.md](./01-USER-SETUP.md) for the recorded checkpoint.

## Verification

Passed:

```bash
npm run lint
npm run typecheck
npm run build
```

Additional advisory check:

```bash
npm audit --json
```

Result: 3 moderate transitive audit findings through `next`/`next-intl` due to `next`'s nested `postcss`; documented under Issues Encountered.

## Next Phase Readiness

Ready for Plan 01-02. The project now has a lockfile, strict TypeScript base, buildable App Router scaffold, and public-only environment contract for the i18n routing plan to extend.

---
*Phase: 01-secure-bilingual-foundation*
*Completed: 2026-06-12*
