---
status: complete
completed: 2026-07-10
---

# Account Overview Polish Summary

## Completed

- Reworked the shared account shell from a boxed dashboard sidebar into a lighter navigation rail.
- Made the mobile account menu trigger smaller and more consistent with the storefront surface language.
- Refined the signed-in account profile treatment with a tighter avatar, divider, and text hierarchy.
- Reworked `/account` overview from a large card plus four card tiles into a lighter account home with a welcome header, compact account facts, and action rows.
- Preserved auth guard behavior, sign-out action, localized account paths, account navigation labels, and overview links.

## Verification

- `npm run typecheck` passed.
- `npm run lint` passed.
- Unauthenticated `/en/account` still redirects to `/en/sign-in?next=%2Fen%2Faccount` with `307`.

## Notes

- Authenticated visual smoke was not captured because the current local browser context is not signed in.
- Existing unrelated worktree changes were left untouched.
