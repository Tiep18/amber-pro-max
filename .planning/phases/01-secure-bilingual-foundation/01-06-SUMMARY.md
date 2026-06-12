---
phase: 01-secure-bilingual-foundation
plan: "06"
subsystem: auth-ui
tags: [auth, i18n, playwright, server-actions, accessibility]

requires:
  - phase: 01-03
    provides: Public shell, UI primitives, and localized language switching
  - phase: 01-05
    provides: Supabase auth server actions, callback, and safe redirects
provides:
  - Localized sign-in, register, forgot-password, and reset-password pages
  - Vietnamese physical auth slugs for translated routes
  - Reusable auth form and auth page components
  - Auth browser coverage for forms, generic errors, reset messaging, and route safety
affects:
  - 01-07-protected-shells
  - 01-08-foundation-verification

tech-stack:
  added: []
  patterns:
    - Client auth forms use `useActionState` with server actions
    - Auth UI renders stable localized result codes, never raw provider messages
    - Auth E2E runs serially to avoid Next dev cache races on dynamic route generation

key-files:
  created:
    - src/app/[locale]/(auth)/auth-pages.tsx
    - src/app/[locale]/(auth)/register/page.tsx
    - src/app/[locale]/(auth)/dang-ky/page.tsx
    - src/app/[locale]/(auth)/forgot-password/page.tsx
    - src/app/[locale]/(auth)/quen-mat-khau/page.tsx
    - src/app/[locale]/(auth)/reset-password/page.tsx
    - src/app/[locale]/(auth)/dat-lai-mat-khau/page.tsx
    - src/components/auth/auth-forms.tsx
    - src/components/auth/auth-page.tsx
    - tests/e2e/auth.spec.ts
  modified:
    - src/app/[locale]/(auth)/sign-in/page.tsx
    - src/app/[locale]/(auth)/dang-nhap/page.tsx
    - src/app/auth/callback/route.ts
    - src/auth/actions.ts
    - src/messages/en.json
    - src/messages/vi.json
    - src/proxy.ts
    - playwright.config.ts
    - next-env.d.ts

key-decisions:
  - "Added physical Vietnamese auth slug routes to preserve D-04 without relying on localized middleware redirects."
  - "Password reset requests return generic success even when the provider is slow or fails, preventing email enumeration."
  - "Recovery reset pages require an explicit recovery marker created by the callback route."

patterns-established:
  - "Auth page renderers validate the expected locale and call `notFound()` for wrong-locale physical slugs."
  - "Auth form fields use visible labels, 48px-ready controls, and `aria-describedby` for inline action errors."
  - "Playwright auth tests cover localized forms, registration success state, generic invalid sign-in, reset request, invalid recovery, and reset form rendering."

requirements-completed:
  - MKT-01
  - ACC-01
  - SEC-02

duration: 28 min
completed: 2026-06-12
---

# Phase 01 Plan 06: Localized Auth Pages Summary

**Localized authentication pages connected to server actions, with generic safe error states and browser coverage**

## Performance

- **Duration:** 28 min
- **Completed:** 2026-06-12
- **Tasks:** 2
- **Files modified:** 20

## Accomplishments

- Replaced placeholder sign-in pages with full localized auth pages.
- Added register, forgot-password, and reset-password pages for English and Vietnamese slugs.
- Added reusable auth page and form components backed by Plan 01-05 server actions.
- Added localized auth copy for labels, submit states, generic errors, and success states.
- Updated callback handling so reset links can land on reset-password pages with a recovery marker.
- Added Playwright coverage for localized forms, registration pending state, generic reset messaging, generic invalid sign-in errors, invalid recovery links, and reset form rendering.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement localized auth pages and messages** - `3bbbee2` (feat)
2. **Task 2: Add localized auth journey E2E coverage** - `3bbbee2`, `b2ea74a` (feat/test)

**Plan metadata:** committed after this summary.

## Files Created/Modified

- `src/app/[locale]/(auth)/*` - localized auth route pages and shared renderers.
- `src/components/auth/auth-forms.tsx` - client forms using `useActionState`.
- `src/components/auth/auth-page.tsx` - shared card layout and adjacent auth links.
- `src/app/auth/callback/route.ts` - recovery marker support for reset-password pages.
- `src/auth/actions.ts` - generic reset timeout behavior to avoid email enumeration.
- `src/messages/en.json` and `src/messages/vi.json` - auth page copy.
- `src/proxy.ts` - bypass list for physical auth slugs.
- `tests/e2e/auth.spec.ts` - auth page and action outcome coverage.

## Decisions Made

- Kept all visible text generic around reset and provider failures.
- Scoped auth test assertions to page sections or explicit IDs where Next route announcer/header links create duplicate accessible roles.
- Ran auth E2E serially because parallel Next dev route generation produced transient `.next/dev` parse errors.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Next dev cache race during parallel auth E2E**
- **Found during:** Task 2 verification
- **Issue:** Parallel workers hit auth dynamic routes while `.next/dev` generated route data and produced transient JSON parse errors.
- **Fix:** Marked `tests/e2e/auth.spec.ts` serial.
- **Files modified:** `tests/e2e/auth.spec.ts`
- **Verification:** `npm run test:e2e -- tests/e2e/auth.spec.ts` passes.
- **Committed in:** `b2ea74a`

**2. [Rule 3 - Blocking] Reset request could hang on provider email call**
- **Found during:** Task 2 verification
- **Issue:** Local Supabase password reset could leave the form pending long enough to make generic reset UX unreliable.
- **Fix:** Added a short non-enumerating settle timeout and still returns generic success.
- **Files modified:** `src/auth/actions.ts`
- **Verification:** forgot-password E2E passes.
- **Committed in:** `3bbbee2`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes reinforce the security requirement for generic reset/error handling and stable local verification.

## Issues Encountered

- `next-env.d.ts` continues to switch between dev and production route type references depending on the last Next command run. The current committed state reflects the final Playwright dev-server run.
- Full email-confirmation link extraction from Mailpit was not added in this plan; coverage verifies registration form submission reaches the verification-pending state and that reset/sign-in error paths remain generic.

## User Setup Required

For real auth testing outside Playwright, configure local or hosted public Supabase env:

```bash
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

## Verification

Passed:

```bash
npm run lint
npm run typecheck
npm run build
npm run test:unit
npm run test:e2e -- tests/e2e/auth.spec.ts
npm run test:e2e -- tests/e2e/localization.spec.ts
```

Build, unit, and Playwright runs that need process spawning or Google Font network access were run outside the sandbox after approval.

## Next Phase Readiness

Ready for Plan 01-07 to add protected account/admin shells and server-side authorization on top of the auth pages and RLS foundation.

---
*Phase: 01-secure-bilingual-foundation*
*Completed: 2026-06-12*
