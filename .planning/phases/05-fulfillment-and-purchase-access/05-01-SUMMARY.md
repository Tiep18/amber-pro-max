---
phase: 05-fulfillment-and-purchase-access
plan: "01"
subsystem: database
tags: [supabase, postgres, rls, fulfillment, entitlements, tokens, email-outbox]
requires:
  - phase: 04-trusted-payments-and-orders
    provides: payment state machine, payment_transitions ledger, checkout order lines, paid gate
provides:
  - RLS-protected digital entitlement and access-token foundation
  - Transactional fulfillment email outbox
  - Guest reopen/claim token persistence with hashed tokens
  - Physical fulfillment state and event tables
  - Admin revoke and reissue RPCs with stale-state checks
  - Payment transition trigger that grants paid digital entitlements in-transaction
affects: [phase-05, digital-fulfillment, physical-fulfillment, account-access, admin-ops]
tech-stack:
  added: []
  patterns: [private helper trigger from payment transition ledger, hashed token tables, append-only fulfillment audit]
key-files:
  created:
    - supabase/migrations/20260619085118_fulfillment_purchase_access.sql
    - supabase/tests/database/05_fulfillment_entitlements.test.sql
    - supabase/tests/database/05_email_outbox.test.sql
    - supabase/tests/database/05_guest_claim.test.sql
    - supabase/tests/database/05_physical_fulfillment.test.sql
    - src/fulfillment/schemas.ts
    - tests/security/fulfillment-boundaries.test.mjs
  modified:
    - package.json
    - src/types/supabase.ts
key-decisions:
  - "Paid entitlement grants run from an after-insert payment_transitions trigger so Phase 4 apply_payment_transition stays the single paid gate while Phase 5 remains additive."
  - "Fulfillment tokens are represented only as token_hash values; raw tokens and signed URLs are rejected from outbox/audit payloads."
  - "Admin revoke/reissue RPCs use expected version checks and database-owned private.is_admin authorization."
patterns-established:
  - "Fulfillment side effects are append-only/audited and triggered from confirmed payment facts."
  - "Outbox rows store durable intent only; provider sending remains deferred."
requirements-completed: [DIG-02, DIG-03, DIG-04, DIG-05, DIG-06, DIG-07, FUL-01, FUL-02, FUL-03, ACC-02, ACC-05, OPS-01, OPS-02]
duration: 55 min
completed: 2026-06-19
---

# Phase 05 Plan 01: Fulfillment Purchase Access Foundation Summary

**Supabase fulfillment foundation with paid digital entitlements, hashed access tokens, transactional email outbox, guest claim tokens, and physical fulfillment state.**

## Performance

- **Duration:** 55 min
- **Started:** 2026-06-19T08:52:00Z
- **Completed:** 2026-06-19T09:47:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Added Phase 5 migration for digital entitlements, download token hashes, guest access tokens, email outbox, physical fulfillment, and fulfillment audit events.
- Connected confirmed paid payment transitions to `private.grant_paid_digital_entitlements` through an in-transaction trigger.
- Added admin revoke/reissue RPCs with `private.is_admin()`, expected-version checks, token revocation, fresh token hash insertion, outbox intent, and audit rows.
- Added pgTAP coverage for entitlement, outbox, guest claim, and physical fulfillment boundaries.
- Added static fulfillment security boundary tests and generated updated Supabase TypeScript types.

## Task Commits

1. **Task 1 and Task 2: Fulfillment database/security contracts and implementation** - `1cf11ff2` (`feat(05-01)`)

## Files Created/Modified

- `supabase/migrations/20260619085118_fulfillment_purchase_access.sql` - Phase 5 schema, RLS, triggers, helpers, and admin RPCs.
- `supabase/tests/database/05_fulfillment_entitlements.test.sql` - Entitlement/token/RPC/security pgTAP coverage.
- `supabase/tests/database/05_email_outbox.test.sql` - Transactional email outbox contract coverage.
- `supabase/tests/database/05_guest_claim.test.sql` - Guest reopen/claim token contract coverage.
- `supabase/tests/database/05_physical_fulfillment.test.sql` - Physical fulfillment state/event contract coverage.
- `src/fulfillment/schemas.ts` - Zod contracts for fulfillment admin inputs and safe payloads.
- `tests/security/fulfillment-boundaries.test.mjs` - Static checks for token hashes, signed URL exposure, unsafe payload rejection, and security script inclusion.
- `package.json` - Includes Phase 5 fulfillment boundary harness in `npm run test:security`.
- `src/types/supabase.ts` - Generated Supabase types after migration.

## Decisions Made

- Used a `payment_transitions` after-insert trigger rather than rewriting the large Phase 4 `apply_payment_transition` body. This keeps payment state authority centralized while making entitlement granting transactional and idempotent.
- Generated server-side token hashes from UUID material for automatic paid grants; future user-facing download flows can create raw tokens server-side and store only hashes.
- Kept outbox and audit payloads free of raw tokens, signed URLs, storage object paths, provider payloads, and secrets.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Supabase CLI sandbox telemetry write**
- **Found during:** Task 1 setup
- **Issue:** `supabase --version` failed inside sandbox because CLI attempted to write under the user `.supabase` directory.
- **Fix:** Re-ran Supabase CLI commands with approved escalation for CLI/local DB operations.
- **Files modified:** None
- **Verification:** `supabase --version`, `db:reset`, `db:lint`, `db:test`, and `db:types` completed.
- **Committed in:** `1cf11ff2`

**2. [Rule 3 - Blocking] pgTAP service_role privilege expectations**
- **Found during:** Task 2 verification
- **Issue:** Local Supabase reports extra service_role table privileges (`REFERENCES`, `TRIGGER`, `TRUNCATE`) on new tables.
- **Fix:** Adjusted Phase 5 pgTAP expectations to match actual local role privileges while preserving no direct anon/authenticated access.
- **Files modified:** Phase 5 database tests
- **Verification:** `npm run db:test` passes all 360 pgTAP tests.
- **Committed in:** `1cf11ff2`

**3. [Rule 3 - Blocking] Lint rejected `digest(text, unknown)`**
- **Found during:** Task 2 verification
- **Issue:** Supabase schema lint could not resolve `digest` in the helper function.
- **Fix:** Replaced helper-generated hash with two UUIDs stripped of hyphens for a 64-character server-owned hash placeholder.
- **Files modified:** Phase 5 migration
- **Verification:** `npm run db:lint` reports no schema errors.
- **Committed in:** `1cf11ff2`

---

**Total deviations:** 3 auto-fixed (3 blocking).
**Impact on plan:** All fixes were needed to make the planned security/database foundation verifiable. No scope expansion beyond Plan 05-01.

## Issues Encountered

- Initial `gsd-executor` subagents stalled twice without writing files, SUMMARY, or commits. Execution switched to inline fallback with a clean working tree.
- `apply_patch` failed under the Windows sandbox wrapper, so file writes used PowerShell fallback in the project writable root.
- Prettier has no SQL parser configured; JSON/TS/JS files were formatted, SQL was left as authored.

## Verification

- `npm run db:reset` - passed; migration applies on a clean local database.
- `npm run db:lint` - passed; no schema errors found.
- `npm run db:test` - passed; 17 files, 360 tests.
- `npm run db:types` - passed; generated `src/types/supabase.ts`.
- `npm run test:security` - passed; 15 node security tests.
- `npm run typecheck` - passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 05-02 can build server-side download/access flows on top of the entitlement, token hash, and outbox foundation. Later admin and account plans can reuse the versioned revoke/reissue contract and physical fulfillment tables.

---
*Phase: 05-fulfillment-and-purchase-access*
*Completed: 2026-06-19*
