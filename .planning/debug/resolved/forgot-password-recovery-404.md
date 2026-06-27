---
status: resolved
trigger: "Quen mat khau: Supabase recovery email link opens a 404 instead of redirecting to /vi/dat-lai-mat-khau. Link: https://kpnazmkprosboeiuhgea.supabase.co/auth/v1/verify?token=pkce_6adbb03ade8d518763ebe4233a3de9c9b4f703eabab9e4f931c6da41&type=recovery&redirect_to=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback%3Flocale%3Dvi%26next%3D%252Fvi%252Fdat-lai-mat-khau"
created: 2026-06-27
updated: 2026-06-27
---

# Debug Session: forgot-password-recovery-404

## Symptoms

- expected_behavior: "After opening the Supabase password recovery link, the user should land on the localized reset password page `/vi/dat-lai-mat-khau` with an authenticated recovery session."
- actual_behavior: "Opening the link shows a 404 page."
- error_messages: "Browser shows 404. User suspects `proxy.ts` route handling."
- timeline: "Reported on 2026-06-27; no prior working status provided."
- reproduction: "Request forgot password, receive Supabase recovery email, open the verify link whose redirect_to is `/auth/callback?locale=vi&next=%2Fvi%2Fdat-lai-mat-khau`."

## Current Focus

- hypothesis: "Resolved: `/auth/callback` was incorrectly classified as an unprefixed customer path by proxy route handling."
- test: "Regression test verifies `/auth/callback` is not locale-prefixed."
- expecting: "Supabase recovery redirect reaches `src/app/auth/callback/route.ts`, which then redirects to `/vi/dat-lai-mat-khau?recovery=1`."
- next_action: "none"
- reasoning_checkpoint:
- tdd_checkpoint:

## Evidence

- timestamp: 2026-06-27
  observation: "`src/app/auth/callback/route.ts` implements `/auth/callback` and redirects safe reset-password destinations with `recovery=1`."
- timestamp: 2026-06-27
  observation: "`src/proxy.ts` previously treated every non-locale path that was not `/api`, `/admin`, `/sitemaps`, or a public file as a customer path."
- timestamp: 2026-06-27
  observation: "The Supabase email redirects to `/auth/callback?locale=vi&next=%2Fvi%2Fdat-lai-mat-khau`; proxy would rewrite that to `/vi/auth/callback`, which has no matching app route."
- timestamp: 2026-06-27
  observation: "Added regression coverage for `/auth/callback` classification. `npx vitest run tests/unit/proxy.test.ts` passed."
- timestamp: 2026-06-27
  observation: "`npm run typecheck` passed."

## Eliminated

- hypothesis: "The localized reset-password route `/vi/dat-lai-mat-khau` is missing."
  reason: "`src/app/[locale]/(auth)/dat-lai-mat-khau/page.tsx` exists, and routing maps `/reset-password` to Vietnamese `/dat-lai-mat-khau`."
- hypothesis: "The auth callback route itself is missing."
  reason: "`src/app/auth/callback/route.ts` exists; the issue was proxy path classification before that route could run."

## Resolution

- root_cause: "`src/proxy.ts` locale-prefixed `/auth/callback`, turning the Supabase recovery redirect into `/vi/auth/callback`, a non-existent route."
- fix: "Bypass locale-prefixing for `/auth/*` system routes and keep session refresh behavior for those routes."
- verification: "`npx vitest run tests/unit/proxy.test.ts`; `npm run typecheck`; `npm run lint` completed with existing warnings only."
- files_changed: "src/proxy.ts, src/proxy-paths.ts, tests/unit/proxy.test.ts"
