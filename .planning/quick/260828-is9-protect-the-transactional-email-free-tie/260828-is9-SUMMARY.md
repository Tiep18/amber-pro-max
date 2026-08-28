---
status: complete
quick_id: 260828-is9
completed_at: 2026-08-28
implementation_commit: b932cd52
---

# Quick 260828-is9 Summary

**Public transactional-email requests now consume an atomic PostgreSQL quota before enqueueing, while payment and download messages win limited provider capacity.**

## Delivered

- Made repeated subscribe for an existing newsletter address a true no-op.
- Added rolling-hour HMAC counters with bounded cleanup and no raw IP storage.
- Enforced newsletter 15-minute/3-per-hour target limits.
- Enforced guest reopen and claim-email 10-minute/5-per-hour action limits.
- Enforced a shared 20-per-hour IP budget across all three public boundaries.
- Replaced guest read-then-insert flows with one service-role-only authoritative RPC.
- Moved newsletter subscription behind the trusted server boundary and trigger the worker only when an email was actually queued.
- Prioritized payment, granted/reissued digital access, other transactional messages, then newsletter in outbox claims.
- Added real abuse, concurrency, privacy, privilege, idempotency, and quota-priority coverage.

## Commits

- `2e133431` — RED contracts exposing public quota abuse and concurrency gaps.
- `b932cd52` — atomic PostgreSQL quota authority and trusted application adapters.

## Verification

- 1,064 unit tests passed.
- 1,126 database tests passed after a clean reset.
- 82 security tests passed.
- ESLint, TypeScript, Vietnamese diacritic check, schema lint, generated-type drift check, and production build passed.

See `260828-is9-VERIFICATION.md` for exact evidence and `260828-is9-REVIEW.md` for the security/free-tier review.
