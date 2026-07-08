---
status: complete
created: 2026-07-09
slug: monitoring-wrapper-hardening
---

# Quick Task: Monitoring Wrapper Hardening

Fix code-review findings in `src/operations/monitoring.ts`:

- Monitoring recorder failures must never change action/query business results.
- Recorder failures must never escape from `runMonitoredAction` or `runMonitoredQuery`.
- Add dynamic facts hooks for error/result-specific context.

## Verification

- Add failing tests first.
- `npm run test:unit -- tests/unit/operations/monitoring.test.ts`
- `npm run typecheck`
- `npm run lint`
