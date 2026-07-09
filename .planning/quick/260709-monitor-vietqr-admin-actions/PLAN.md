---
status: in-progress
created: 2026-07-09
---

# VietQR Admin Action Monitoring

## Goal

Make VietQR admin action operational recording best-effort through the shared monitored action wrapper.

## Scope

- Replace direct `recordOperationalFailure` use in `src/payments/admin-actions.ts`.
- Preserve existing sanitized facts and public action results.
- Add regression coverage for recorder failures.
- Run focused VietQR tests plus typecheck and lint.

