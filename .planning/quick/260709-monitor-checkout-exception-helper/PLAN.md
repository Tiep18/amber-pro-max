---
status: in-progress
created: 2026-07-09
---

# Checkout Exception Monitoring Helper

## Goal

Make checkout exception operational recording best-effort through the shared monitored action wrapper.

## Scope

- Replace direct `recordOperationalFailure` use in `src/checkout/exceptions.ts`.
- Preserve existing sanitized facts and public result codes.
- Add regression coverage for recorder failures on both error-return and continue-after-warning paths.
- Run focused checkout exception tests plus typecheck and lint.

