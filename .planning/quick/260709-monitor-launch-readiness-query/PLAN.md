---
status: in-progress
created: 2026-07-09
---

# Launch Readiness Query Monitoring

## Goal

Migrate admin launch readiness load failure recording to the shared monitored action wrapper so operational logging is best-effort.

## Scope

- Replace direct `recordOperationalFailure` use in `src/launch/settings.ts`.
- Preserve existing sanitized facts and public error result.
- Add regression coverage for recorder failures.
- Run focused admin-system loader tests plus typecheck and lint.

