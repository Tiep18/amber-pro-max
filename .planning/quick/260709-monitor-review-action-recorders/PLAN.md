---
status: in-progress
created: 2026-07-09
---

# Review Action Recorder Monitoring

## Goal

Make review action injected operational recorders best-effort through the shared monitored action wrapper.

## Scope

- Replace direct injected recorder calls in `src/reviews/actions.ts`.
- Preserve existing sanitized facts and public review action results.
- Add regression coverage for recorder failures.
- Run focused review tests plus typecheck and lint.

