---
phase: 01-secure-bilingual-foundation
plan: "05"
subsystem: auth-foundation
tags: [supabase, auth, ssr, safe-redirects, zod, vitest]

requires:
  - phase: 01-02
    provides: Localized routing and translated auth slugs
  - phase: 01-04
    provides: Supabase schema, generated types, and RLS test harness
provides:
  - Supabase browser, server, and proxy SSR clients
  - Zod-backed auth schemas
  - Server actions for register, sign-in, sign-out, reset request, and password update
  - Auth callback route for Supabase code exchange
  - Safe localized redirect validation
affects:
  - 01-06-auth-pages
  - 01-07-protected-shells
  - 01-08-foundation-verification

tech-stack:
  added: []
  patterns:
    - `@supabase/ssr` browser/server clients using publishable keys
    - Server action result codes instead of raw provider errors
    - Same-origin localized relative redirects only
    - Proxy composition that preserves next-intl behavior while refreshing auth cookies

key-files:
  created:
    - src/app/auth/callback/route.ts
    - src/auth/actions.ts
    - src/auth/redirect.ts
    - src/auth/schemas.ts
    - src/lib/env/client.ts
    - src/lib/env/server.ts
    - src/lib/supabase/client.ts
    - src/lib/supabase/server.ts
    - src/lib/supabase/proxy.ts
    - tests/unit/auth/redirect.test.ts
    - tests/unit/auth/schemas.test.ts
  modified:
    - next-env.d.ts
    - src/proxy.ts
    - vitest.config.ts

key-decisions:
  - "No service-role or secret-key client is created in Phase 1 app code; normal auth paths use session-bound publishable-key clients."
  - "Password reset requests return generic success after valid input so email existence is not enumerated."
  - "Proxy auth refresh is best-effort for public routes so missing local Supabase env does not break localized shell verification."

patterns-established:
  - "Auth forms will submit to server actions and consume stable result codes."
  - "Safe redirects accept only known localized route mappings from `src/i18n/routing.ts`."
  - "Vitest now resolves the `@` alias through `fileURLToPath`, making Windows unit imports stable."

requirements-completed:
  - ACC-01
  - ADM-02
  - SEC-02

duration: 20 min
completed: 2026-06-12
---

# Phase 01 Plan 05: Supabase Auth Foundation Summary

**Session-bound Supabase auth foundation with safe localized redirects, SSR cookie refresh, and server action boundaries**

## Performance

- **Duration:** 20 min
- **Completed:** 2026-06-12
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments

- Added lazy Zod environment validation for public Supabase and site URL configuration.
- Added browser, server, and proxy Supabase clients using `@supabase/ssr`.
- Composed Supabase auth cookie refresh into `src/proxy.ts` without dropping next-intl redirects.
- Added registration, sign-in, sign-out, reset request, and password update server actions.
- Added `/auth/callback` to exchange Supabase auth codes and return to safe localized destinations.
- Added unit coverage for auth schemas and safe redirect rejection/allowlist behavior.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Supabase SSR clients and composed auth proxy refresh** - `2fd9382` (feat)
2. **Task 2: Implement auth schemas, actions, callback, and safe redirects** - `2fd9382` (feat)

**Plan metadata:** committed after this summary.

## Files Created/Modified

- `src/lib/env/client.ts` - public environment validation.
- `src/lib/env/server.ts` - server-side environment accessor without exposing secret config.
- `src/lib/supabase/client.ts` - browser Supabase client.
- `src/lib/supabase/server.ts` - cookie-aware server Supabase client.
- `src/lib/supabase/proxy.ts` - proxy session refresh and cookie propagation.
- `src/proxy.ts` - next-intl and Supabase auth refresh composition.
- `src/auth/schemas.ts` - Zod validation for auth flows.
- `src/auth/redirect.ts` - safe localized redirect allowlist.
- `src/auth/actions.ts` - server actions for ACC-01 flows.
- `src/app/auth/callback/route.ts` - Supabase code exchange callback.
- `tests/unit/auth/*` - schema and redirect unit coverage.
- `vitest.config.ts` - Windows-stable `@` alias resolution.

## Decisions Made

- Used only publishable Supabase keys for browser, server request, and proxy clients.
- Kept environment parsing lazy so production build and public shell tests do not require configured Supabase credentials.
- Converted Supabase provider failures to stable action result codes and did not surface raw provider messages.
- Allowed nested `next` query preservation only when the nested path is also a known localized route.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Vitest alias failed on Windows**
- **Found during:** Task 2 unit verification
- **Issue:** `new URL('./src', import.meta.url).pathname` produced a Windows path that Vitest could not resolve for `@/auth/*` imports.
- **Fix:** Switched alias resolution to `fileURLToPath(new URL('./src', import.meta.url))`.
- **Files modified:** `vitest.config.ts`
- **Verification:** `npm run test:unit` passes.
- **Committed in:** `2fd9382`

**2. [Rule 3 - Blocking] Generic Zod helper created unstable TypeScript inference**
- **Found during:** Typecheck/build
- **Issue:** A generic password-confirmation helper caused TypeScript to lose known `password` and `confirmPassword` fields.
- **Fix:** Expanded registration and password update schemas explicitly.
- **Files modified:** `src/auth/schemas.ts`
- **Verification:** `npm run typecheck` and `npm run build` pass.
- **Committed in:** `2fd9382`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes keep behavior unchanged while making verification deterministic.

## Issues Encountered

- `next-env.d.ts` was updated by Next.js build from dev route types to production route types and was included with the plan code commit to keep the working tree clean.
- Supabase proxy refresh is intentionally best-effort when local environment variables are absent; actual auth actions still require validated configuration when invoked.

## User Setup Required

Before exercising real auth flows outside tests, configure:

```bash
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

## Verification

Passed:

```bash
npm run test:unit -- tests/unit/auth
npm run test:unit
npm run lint
npm run typecheck
npm run build
npm run test:e2e -- tests/e2e/localization.spec.ts
rg -n "service_role|SUPABASE_SECRET|secret key|sb_secret" src tests .env.example
```

The `rg` check returned no matches.

## Next Phase Readiness

Ready for Plan 01-06 to build localized auth pages on top of these server actions and callback routes.

---
*Phase: 01-secure-bilingual-foundation*
*Completed: 2026-06-12*
