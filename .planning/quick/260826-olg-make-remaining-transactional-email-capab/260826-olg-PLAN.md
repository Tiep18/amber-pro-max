---
quick_id: 260826-olg
status: planned
mode: quick-full
must_haves:
  truths:
    - 'Guest and newsletter capability preparation performs one Supabase RPC request per attempt and never uses PostgREST select-insert-reread.'
    - 'Database timestamp semantics determine and validate canonical expiry; equivalent timestamp strings cannot cause retry failure.'
    - 'Provider failure followed by retry reuses the same bearer link and creates at most one capability for an outbox row.'
    - 'Missing, short, or whitespace-padded TRANSACTIONAL_EMAIL_TOKEN_SECRET prevents every worker entry point from claiming outbox rows.'
    - 'Secret rotation is documented as pause, drain, rotate, resume without paid infrastructure.'
  artifacts:
    - 'supabase/migrations/20260826120000_atomic_transactional_email_capability_issuance.sql'
    - 'src/fulfillment/email-outbox.server.ts'
    - 'src/fulfillment/email-outbox.ts'
    - 'src/lib/env/server.ts'
    - 'tests/unit/fulfillment/email-outbox.test.ts'
    - 'supabase/tests/database/05_email_outbox.test.sql'
    - 'README.md'
  key_links:
    - 'The worker derives a raw token once, hashes it, and sends only the hash plus source_email_outbox_id to the RPC.'
    - 'The RPC derives guest/newsletter identity, purpose, and expiry from transactional_email_outbox and returns its canonical expiry.'
    - 'Route, immediate trigger, and batch processor share the same token-secret readiness contract before claimDueRows.'
---

# Quick Task 260826-olg Plan

## Goal

Finish atomic, retry-safe preparation for guest and newsletter transactional-email capabilities while preserving Quick 1 digital issuance and Quick 2 newsletter token normalization. Keep the implementation inside the current Vercel + Supabase free-tier architecture.

## Task 1: Specify the failure and database contracts

**Files:**

- `tests/unit/fulfillment/email-outbox.test.ts`
- `tests/security/fulfillment-boundaries.test.mjs`
- `supabase/tests/database/05_email_outbox.test.sql`

**Action:** Add failing tests for a single hash-only capability RPC, canonical timestamp handling, provider-retry link reuse, service-role-only privileges, duplicate-free database issuance, and readiness rejection before claim. Ensure coverage includes both guest and newsletter branches and proves no raw token reaches persistence calls.

**Verify:** Run the focused Vitest file and fulfillment security test to observe contract failures before implementation. Database assertions are exercised after the migration is applied by reset.

**Done:** Tests encode every must-have and fail for the expected missing RPC/readiness behavior.

## Task 2: Implement atomic issuance and readiness

**Files:**

- `supabase/migrations/20260826120000_atomic_transactional_email_capability_issuance.sql`
- `src/fulfillment/email-token-secret.ts`
- `src/fulfillment/email-outbox.ts`
- `src/fulfillment/email-outbox.server.ts`
- `src/lib/env/server.ts`
- `src/app/api/fulfillment/email-outbox/route.ts`
- `src/types/supabase.ts`

**Action:** Create a locked-search-path, service-role-only `security definer` RPC keyed by source outbox ID. Derive capability subject, purpose, normalized email, and expiry from authoritative database rows; atomically insert or validate a single existing row and return canonical expiry. Replace guest/newsletter table operations with one RPC mapping and instant-based response validation. Centralize the strong-secret rule and make environment, route, immediate trigger, and batch readiness fail before claims. Leave the digital RPC behavior intact.

**Verify:** Run focused unit/security tests, reset Supabase, run pgTAP, regenerate database types, typecheck, and lint.

**Done:** All focused tests pass; guest/newsletter issuance is one round trip; invalid readiness cannot claim work; generated types include the RPC.

## Task 3: Document operations and complete quality gates

**Files:**

- `.env.example`
- `README.md`
- `.planning/quick/260826-olg-make-remaining-transactional-email-capab/260826-olg-SUMMARY.md`
- `.planning/quick/260826-olg-make-remaining-transactional-email-capab/260826-olg-REVIEW.md`
- `.planning/quick/260826-olg-make-remaining-transactional-email-capab/260826-olg-VERIFICATION.md`

**Action:** Document exact secret readiness and the pause → drain → rotate → resume runbook, including why already-sent links survive rotation. Run full unit, database, security, typecheck, and lint gates; review changed source/migration code for security and retry regressions; record evidence against each must-have.

**Verify:** All required commands exit zero and verification reports `passed`.

**Done:** Documentation is operationally safe, review has no unresolved blocking findings, and Quick 3 is verified and summarized.
