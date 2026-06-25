---
status: resolved
trigger: Vietnamese login, register, and forgot-password pages return 404
created: "2026-06-25T17:39:11.6363490+07:00"
updated: "2026-06-25T17:39:32.0000000+07:00"
---

# Debug Session: vi-auth-pages-404

## Symptoms

- Expected behavior: `/vi/dang-nhap`, `/vi/dang-ky`, and `/vi/quen-mat-khau` render the Vietnamese auth pages.
- Actual behavior: those pages return 404.
- Error messages: browser-visible 404, no TypeScript error.
- Timeline: Started after auth wrappers reintroduced locale guards during route-cleanup fixes.
- Reproduction: Visit the Vietnamese auth URLs.

## Current Focus

- hypothesis: `next-intl` rewrites localized Vietnamese auth slugs to the internal English route files, so EN wrappers must not require `locale === 'en'`.
- test: Remove EN-only guards from internal auth wrapper files and verify routing/build.
- expecting: VI localized auth URLs render again while Vietnamese physical wrapper files still reject EN mismatches.
- next_action: patch auth wrapper calls and run targeted auth/routing tests plus build.

## Evidence

- timestamp: 2026-06-25T17:39:11+07:00
  observation: `src/i18n/routing.ts` maps `/sign-in` to `vi: /dang-nhap`, while `src/app/[locale]/(auth)/sign-in/page.tsx` currently calls `expectedLocale: 'en'`.

## Resolution

- root_cause: `next-intl` localized pathnames route canonical Vietnamese auth slugs such as `/vi/dang-nhap` through the internal English route files, but those files were requiring `locale === 'en'` and returned `notFound()` for `vi`.
- fix: Removed the EN-only `expectedLocale` argument from the internal auth route wrappers for sign in, register, forgot password, and reset password.
- verification: Targeted auth/routing unit tests passed, `npm run typecheck` passed, `npm run build` passed, and HTTP checks against the existing dev server returned `200 OK` for `/vi/dang-nhap`, `/vi/dang-ky`, `/vi/quen-mat-khau`, and `/vi/dat-lai-mat-khau`.
- files_changed: `src/app/[locale]/(auth)/sign-in/page.tsx`, `src/app/[locale]/(auth)/register/page.tsx`, `src/app/[locale]/(auth)/forgot-password/page.tsx`, `src/app/[locale]/(auth)/reset-password/page.tsx`.
