# Deferred Items

- Pre-existing ESLint warnings in `tests/unit/catalog/storefront-projection.test.ts:202-203`: the `_input` callback parameters are unused. They are owned by Plan 09-06 and do not affect Plan 09-05 verification.
- Full CI still emits pre-existing Next.js image diagnostics for the home category `fill` parents and the above-the-fold brand logo loading mode. The browser suite remains green; visual/performance cleanup belongs to a later UI-focused phase.
- Local Playwright runs exercise Supabase Storage through `127.0.0.1`, which Next.js image optimization rejects as a private upstream. Existing fallbacks keep the suite green; production-hosted media should be checked separately rather than weakening the private-IP guard.
