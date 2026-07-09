---
status: in-progress
created: 2026-07-09
---

# Admin Dashboard Query Monitoring

## Goal

Migrate admin dashboard loader failure recording to the shared monitored action wrapper so operational logging remains best-effort.

## Scope

- Replace direct `recordOperationalFailure` use in `src/admin/dashboard-queries.ts`.
- Preserve existing sanitized facts and public error result.
- Add regression coverage for recorder failures.
- Run focused admin-system loader tests plus typecheck and lint.

