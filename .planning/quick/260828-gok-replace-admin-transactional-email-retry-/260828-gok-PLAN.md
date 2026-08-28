---
quick_id: 260828-gok
status: planned
mode: quick-full
must_haves:
  truths:
    - 'Admin retry is one atomic RPC guarded by row status, lease state, capability validity, and an expected outbox version.'
    - 'Sent, cancelled, actively leased, not-yet-due, stale-form, expired-capability, and superseded rows cannot be reset to pending.'
    - 'Digital resend trusts only entitlement identity and expected version; PostgreSQL derives the order, recipient, locale, paid gate, and relationship.'
    - 'Digital resend revokes old links and creates the replacement outbox plus audit event in one transaction.'
    - 'Same-outbox retry preserves provider idempotency and does not reset historical attempt count.'
    - 'The implementation adds no infrastructure beyond the existing Vercel and Supabase free-tier architecture.'
  artifacts:
    - 'supabase/migrations/20260828130000_atomic_admin_email_recovery.sql'
    - 'src/fulfillment/admin-email-actions.ts'
    - 'src/components/admin/fulfillment/email-recovery-actions.tsx'
    - 'src/payments/queries.ts'
    - 'src/types/supabase.ts'
    - 'tests/unit/fulfillment/email-outbox.test.ts'
    - 'supabase/tests/database/05_email_outbox.test.sql'
    - 'tests/security/fulfillment-boundaries.test.mjs'
  key_links:
    - 'The admin retry form carries the outbox version loaded from the admin query, and the server action passes only ID plus expected version to the RPC.'
    - 'The retry RPC validates source-linked capability state before changing outbox status and increments the outbox version under the same row lock.'
    - 'The resend RPC locks entitlement and order authority before revoking tokens, incrementing version, and writing outbox and audit rows.'
---

# Atomic Admin Email Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make admin transactional-email retry and digital resend authoritative, atomic, concurrency-safe, and free-tier compatible.

**Architecture:** Two narrow security-definer RPCs own the state transitions. TypeScript server actions become validation and result-mapping adapters; forms submit only opaque identifiers plus expected versions, while PostgreSQL derives all commerce identity and relationship fields.

**Tech Stack:** PostgreSQL/PLpgSQL, Supabase RPC/RLS, Next.js server actions, TypeScript, Vitest, Node security tests, pgTAP.

**Spec:** `.planning/quick/260828-gok-replace-admin-transactional-email-retry-/260828-gok-CONTEXT.md`

## Global Constraints

- Keep Retry and Resend as separate admin actions.
- Do not reset outbox attempt history during manual retry.
- Preserve paid-gate, private-token, provider-idempotency, and audit invariants.
- Add no Redis, paid queue, new scheduler, or external service.

---

### Task 1: Define failing atomic recovery contracts

**Files:**

- Modify: `tests/unit/fulfillment/email-outbox.test.ts`
- Modify: `supabase/tests/database/05_email_outbox.test.sql`
- Modify: `tests/security/fulfillment-boundaries.test.mjs`

**Interfaces:**

- Consumes: Existing admin form actions, outbox schema, entitlement reissue flow, and capability source links.
- Produces: Executable behavior contracts for `admin_retry_transactional_email(uuid, integer)` and the hardened `reissue_digital_access_token(uuid, integer)` RPC.

- [ ] **Step 1: Add focused unit tests** proving retry calls one RPC with `emailId + expectedVersion`, maps queued/stale/error results safely, and resend no longer accepts order or recipient authority from the form.
- [ ] **Step 2: Run the focused Vitest tests** and confirm they fail because the retry action still performs PostgREST select/update and the form lacks an outbox version.
- [ ] **Step 3: Add pgTAP tests** for sent rows, active leases, expired capabilities, stale versions, forged relationships, concurrent calls, and transaction rollback.
- [ ] **Step 4: Add security tests** that reject direct outbox mutations and untrusted order/recipient fields in recovery actions.
- [ ] **Step 5: Commit the RED contracts** as an atomic test commit.

### Task 2: Implement the authoritative RPCs and application adapters

**Files:**

- Create: `supabase/migrations/20260828130000_atomic_admin_email_recovery.sql`
- Modify: `src/fulfillment/admin-email-actions.ts`
- Modify: `src/components/admin/fulfillment/email-recovery-actions.tsx`
- Modify: `src/payments/queries.ts`
- Modify: `src/types/supabase.ts`

**Interfaces:**

- Consumes: `admin_retry_transactional_email(p_outbox_id uuid, p_expected_version integer)` returning JSON status, and `reissue_digital_access_token(p_entitlement_id uuid, p_expected_version integer)` returning JSON status/version.
- Produces: Versioned admin recovery forms and safe `AdminEmailActionResult` mappings with no direct outbox table mutation.

- [ ] **Step 1: Add the forward-only migration** with an outbox version fence, row-locking retry RPC, capability checks for digital/guest/newsletter rows, service-role/admin privileges, and a hardened resend RPC that derives all commerce facts from locked database records.
- [ ] **Step 2: Replace the retry read-then-write adapter** with one RPC call and strict response mapping; remove `validateRetryCandidate` and direct admin-client outbox updates.
- [ ] **Step 3: Narrow resend input and forms** to entitlement identity plus expected version, pass outbox version for retry, and update admin queries/types to project the version.
- [ ] **Step 4: Run focused unit/security tests** until green, then reset local Supabase, run pgTAP, and regenerate or minimally synchronize generated database types.
- [ ] **Step 5: Commit the GREEN implementation** as an atomic fix commit.

### Task 3: Review, verify, and close Quick 4

**Files:**

- Create: `.planning/quick/260828-gok-replace-admin-transactional-email-retry-/260828-gok-SUMMARY.md`
- Create: `.planning/quick/260828-gok-replace-admin-transactional-email-retry-/260828-gok-REVIEW.md`
- Create: `.planning/quick/260828-gok-replace-admin-transactional-email-retry-/260828-gok-VERIFICATION.md`
- Modify: `.planning/STATE.md`

**Interfaces:**

- Consumes: Completed migration, adapters, forms, and RED/GREEN evidence.
- Produces: Review findings, verification status, implementation summary, and GSD state record.

- [ ] **Step 1: Run the complete relevant quality gates**: unit tests, database tests, security tests, typecheck, lint, and production build.
- [ ] **Step 2: Review the changed code** against every must-have, with special attention to SQL privileges, lease races, token expiry, payload leakage, and transaction rollback.
- [ ] **Step 3: Write review, verification, and summary artifacts** with exact commands and outcomes.
- [ ] **Step 4: Update STATE.md and commit GSD artifacts** only after fresh verification evidence is green.
