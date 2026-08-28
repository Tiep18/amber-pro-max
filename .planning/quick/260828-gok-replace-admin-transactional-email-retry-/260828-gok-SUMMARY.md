# Quick 260828-gok Summary

**Atomic admin transactional-email retry and digital resend now use authoritative, version-fenced PostgreSQL transactions without additional paid infrastructure.**

## Delivered

- Added an outbox version fence advanced by worker claim, worker transition, and admin retry.
- Replaced admin retry read-then-write with `admin_retry_transactional_email`.
- Prevented retry of sent, cancelled, active-lease, future-pending, stale-version, forged-relationship, expired-capability, and superseded rows.
- Kept Retry and Resend separate: late or expired digital access requires a fresh resend.
- Hardened digital resend so the browser submits only entitlement ID and expected version.
- Made PostgreSQL derive order, recipient, locale, paid gate, and entitlement relationship.
- Kept token revocation, entitlement version, outbox, and audit mutations atomic.
- Preserved same-outbox Resend idempotency and historical attempt counts.
- Updated admin queue projection, generated Supabase types, unit/security contracts, and pgTAP coverage.

## Commits

- `73b9e41c` — RED tests exposing recovery races and trust gaps.
- `51a16771` — atomic recovery migration and adapters.
- `47a6e665` — preserve existing reissue null-version and cache revalidation contracts.

## Verification

- 1,063 unit tests passed.
- 1,081 database tests passed after a clean reset.
- 81 security tests passed.
- ESLint, TypeScript, Vietnamese diacritic check, database lint, generated-type drift check, and production build passed.

See `260828-gok-VERIFICATION.md` for the exact evidence and `260828-gok-REVIEW.md` for the security/concurrency review.
