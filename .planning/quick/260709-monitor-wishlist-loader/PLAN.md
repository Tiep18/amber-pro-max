---
status: in-progress
created: 2026-07-09
---

# Wishlist Loader Monitoring

## Goal

Migrate customer wishlist loader failure recording to the shared monitored action wrapper so operational logging is best-effort.

## Scope

- Replace direct `recordOperationalFailure` use in `src/account/wishlist.ts`.
- Preserve existing sanitized facts and public error result.
- Add regression coverage for recorder failures.
- Run focused wishlist tests plus typecheck and lint.

