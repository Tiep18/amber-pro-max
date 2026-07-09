---
status: in-progress
created: 2026-07-09
---

# PayPal Route Monitoring

## Goal

Make PayPal create, capture, and webhook route operational recording best-effort through the shared monitored action wrapper.

## Scope

- Replace direct `recordOperationalFailure` use in PayPal route helpers.
- Preserve sanitized operational facts and existing HTTP responses.
- Add regression coverage for recorder failures in create/capture/webhook failure paths.
- Run focused PayPal route tests plus typecheck and lint.

