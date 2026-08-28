---
status: passed
quick_id: 260828-is9
verified_at: 2026-08-28
implementation_commit: b932cd52
---

# Quick 260828-is9 Verification

## Result

All must-haves are verified against implementation commit `b932cd52` and a clean local Supabase reset.

## Must-have Evidence

| Must-have | Evidence | Result |
| --- | --- | --- |
| Existing newsletter subscription is idempotent | Real database assertions keep one subscriber, consent event, and outbox row; worker trigger is gated by `emailQueued` | PASS |
| Approved cooldown and hourly budgets are atomic | 42 functional pgTAP assertions cover newsletter 15m/3h, guest 10m/5h, and shared IP 20h | PASS |
| Concurrent requests cannot bypass quota | Two real dblink sessions return the same public result while creating one outbox row and one target allowance | PASS |
| Public results resist enumeration | Unit and database tests keep missing, mismatched, cooldown, hourly, and IP denials generic | PASS |
| Rate identities are privacy-safe | HMAC unit/security tests and private-table assertions prove fixed hashes with no raw IP/email/order columns | PASS |
| Critical email receives claim capacity first | Database claims payment, reissued/granted digital access, other transactional email, then newsletter; FIFO is preserved within a tier | PASS |
| Free-tier architecture is preserved | PostgreSQL, existing Supabase RPC, and Next.js Server Actions only; no dependency or external service added | PASS |

## Fresh Verification Evidence

- `npm run lint` — exit 0.
- `npm run typecheck` — exit 0.
- `npm run check:vi-diacritics` — exit 0.
- `npm run test:unit` — 118 files, 1,064 tests passed.
- `npm run test:security` — 82 tests passed.
- `supabase db reset --local --yes` — all migrations through `20260828160000_public_email_quota_guards.sql` applied successfully.
- `npm run db:lint` — no schema errors.
- `npm run db:test` after the clean reset — 44 files, 1,126 tests passed; two explicitly gated rehearsals skipped by existing policy.
- `npm run db:types` plus `git diff --exit-code -- src/types/supabase.ts` — generated types match the committed schema.
- `npm run build` — Next.js production build completed successfully, including 129 static pages.

## TDD Evidence

- RED commit `2e133431` failed because public email HMAC evidence, quota RPCs/table, atomic guest adapters, idempotent newsletter outcome, and claim priority did not exist.
- GREEN commit `b932cd52` implemented the PostgreSQL authority, trusted adapters, generated types, and priority ordering.
- During database GREEN, pgTAP exposed invalid schema qualification of PostgreSQL special forms (`COALESCE`, `LEAST`, and `GREATEST`); the SQL was corrected before the implementation commit and the clean full suite.
