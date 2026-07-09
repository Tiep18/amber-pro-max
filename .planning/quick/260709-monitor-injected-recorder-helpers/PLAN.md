---
status: in-progress
created: 2026-07-09
---

# Injected Recorder Helper Monitoring

## Goal

Make helper-level injected operational recorders best-effort so callers that pass `recordOperationalFailure` cannot have business results changed by monitoring failures.

## Scope

- Wrap injected recorder helpers in newsletter, fulfillment entitlement/download/email/physical/admin newsletter modules.
- Preserve sanitized facts and existing public results.
- Add focused regression coverage for representative recorder-failure paths.
- Run focused tests plus typecheck and lint.

