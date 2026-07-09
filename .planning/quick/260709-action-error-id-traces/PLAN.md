---
slug: action-error-id-traces
status: complete
---

# Quick Task: Action Error ID Traces

Make monitored action failures return a safe `errorId` whenever an operational error row is created, so users and admins can correlate UI failures with `operational_errors`.

## Steps

1. Add default `errorId` decoration to `runMonitoredAction` for thrown failures and result-based recorded failures.
2. Preserve custom decoration as an override for callers that need a different public trace field.
3. Update wishlist mutation failures to keep safe Supabase diagnostics in operational facts and return an `errorId`.
4. Show wishlist customers the safe `errorId` reference on real mutation failures.
5. Document the project convention.
6. Verify with focused unit tests, full unit tests, typecheck, and lint.
