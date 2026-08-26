---
phase: quick-260826-olg
plan: 01
subsystem: transactional-email
status: complete
tags: [supabase, rpc, security, retry, resend, vercel-free]
requires:
  - phase: quick-260817-k94
    provides: Version-fenced digital capability issuance RPC
  - phase: quick-260826-ne8
    provides: Exact newsletter unsubscribe bearer-token contract
provides:
  - Atomic one-RPC guest and newsletter capability issuance
  - Canonical database-owned capability expiry
  - Strong signing-secret readiness before outbox claims
  - Free-tier-safe signing-secret rotation runbook
affects: [transactional-email, guest-order-access, newsletter, operations]
duration: 21min
completed: 2026-08-26
---

# Quick Task 260826-olg Summary

Guest and newsletter email capability preparation now uses one service-role-only Supabase RPC per attempt, with PostgreSQL owning identity, purpose, expiry, locking, and idempotent reuse.

## Accomplishments

- Removed the guest/newsletter PostgREST `select → insert → reread` sequence.
- Added `issue_transactional_email_capability_for_outbox`, keyed only by `source_email_outbox_id` plus a token hash.
- Made database `timestamptz` values authoritative and normalized the returned canonical expiry for rendering.
- Required an exact, non-padded token secret of at least 32 characters before any worker claims rows.
- Proved provider failure followed by retry reuses the same guest/newsletter link and leaves one capability row.
- Added a maintenance-window pause → drain → rotate → deploy → resume runbook that uses only existing Vercel and Supabase facilities.

## TDD evidence

- RED: focused unit tests failed 8 contract cases and security failed on the absent migration/RPC.
- GREEN: focused email suite passed 43/43 after implementation.
- Database: an initial lint run caught an ambiguous PL/pgSQL variable; the variable was corrected before final reset and verification.

## Task commits

1. `b7501e44` — RED contract tests.
2. `5d33c11d` — atomic RPC, repository refactor, readiness, generated types.
3. `32008606` — initial rotation documentation.
4. `d9eb5847` — review fix for immediate-trigger-safe rotation.

## Verification

- Unit: 1,063/1,063 passed.
- Database: 1,057/1,057 passed after clean reset; schema lint clean.
- Security: 80/80 passed.
- Lint, TypeScript, Vietnamese text check, generated-type diff, and production build passed.
- Code review: passed with one operational documentation finding fixed and no remaining findings.

## Deviations

- The implementation used one shared narrow RPC for guest and newsletter instead of separate table-specific RPCs. This follows the approved design and reduces both request count and duplicated authorization logic.
- The final rotation runbook adds a short producer maintenance window because Cron pause alone cannot suppress immediate triggers.

## Known stubs

None.
