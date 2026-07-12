---
phase: 08-shipping-profile-fallbacks-destination-zones-and-us-region-s
plan: "02"
subsystem: shipping
tags: [postgres, supabase, pgtap, shipping, security-definer, least-privilege, vitest]

requires:
  - phase: 08-01
    provides: Exact/fallback rules, explicit store default, region adjustments, immutable allocation schema, and approved non-production ref
provides:
  - Deterministic variant/product/store-default exact and fallback resolver
  - Same-currency surcharge and replacement region arithmetic
  - Security-invoker private resolver restricted to owner/service_role
  - Fixed-search-path public wrapper callable by anon and authenticated
  - Pure TypeScript resolver and unchanged highest-first shipping aggregation
affects: [08-03-checkout-snapshots, 08-04-admin-actions, checkout, shipping]

tech-stack:
  added: []
  patterns: [wrapper-only browser RPC access, six-tier candidate precedence, evidence-rich shipping allocations, all-or-error resolution]

key-files:
  created:
    - supabase/migrations/20260712080200_shipping_resolver.sql
    - supabase/tests/database/08_shipping_resolver_security.test.sql
    - src/checkout/shipping-resolution.ts
    - tests/unit/checkout/shipping-resolution.test.ts
  modified:
    - src/checkout/shipping.ts
    - tests/unit/checkout/shipping.test.ts
    - supabase/tests/database/08_shipping_schema.test.sql

key-decisions:
  - "The canonical private resolver remains SECURITY INVOKER and grants direct execution only to service_role; browser roles enter through the hardened public wrapper."
  - "Resolver responses are all-or-error, retain complete canonical fee evidence, and never emit a zero-cost placeholder for unsupported physical lines."
  - "The aggregation adapter prefers canonical final allocation fees while retaining legacy exact-rule compatibility until Plan 08-03 completes quote-boundary integration."

patterns-established:
  - "Shipping precedence: variant exact, variant fallback, product exact, product fallback, store-default exact, store-default fallback."
  - "RPC exposure: revoke PUBLIC/anon/authenticated from private functions, then expose a schema-qualified fixed-path definer wrapper with explicit browser grants."

requirements-completed: [SHIP-08, SHIP-09, SHIP-10]

duration: 56 min across authentication checkpoints
completed: 2026-07-12
---

# Phase 08 Plan 02: Deterministic Resolver and Least-Privilege Wrapper Summary

**Six-tier exact/fallback shipping resolution with normalized region arithmetic, evidence-rich final fees, and wrapper-only browser access deployed to the approved non-production project.**

## Performance

- **Duration:** 56 min across authentication checkpoints
- **Started:** 2026-07-12T03:53:50Z
- **Completed:** 2026-07-12T04:50:05Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Implemented deterministic variant, product, and store-default resolution with exact-before-fallback precedence, active filtering, currency isolation, bounded intent validation, and sanitized all-or-error failures.
- Applied normalized region surcharge and replacement values to both first-item and additional-item fees without changing the existing highest-first-once aggregation algorithm.
- Revoked private resolver execution from PUBLIC, anon, and authenticated; retained owner/service-role execution and exposed a fixed-search-path, constrained public wrapper.
- Deployed only migration `20260712080200` to approved non-production ref `kpnazmkprosboeiuhgea`; `amber-prod` was never targeted.

## Task Commits

1. **Task 1: Wave 0 resolver and privilege contracts** - `f7b6c20` (test)
2. **Task 2: Canonical resolver, hardened wrapper, and aggregation adapter** - `8faa230` (feat)

## Files Created/Modified

- `supabase/migrations/20260712080200_shipping_resolver.sql` - Canonical private resolver, explicit privilege revocation/grant, and constrained wrapper.
- `supabase/tests/database/08_shipping_resolver_security.test.sql` - Six-tier, region, failure, metadata, actual denial, service path, and wrapper callability evidence.
- `src/checkout/shipping-resolution.ts` - Owned semantic unions, pure candidate resolution, validation, and complete allocation evidence.
- `src/checkout/shipping.ts` - Aggregation adapter that consumes canonical final fees while preserving existing exact behavior.
- `tests/unit/checkout/shipping-resolution.test.ts` - Table-driven precedence, ordering, inactive, currency, region, and failure contracts.
- `tests/unit/checkout/shipping.test.ts` - Mixed-profile, free-shipping, deterministic tie, and canonical-final-fee aggregation regressions.
- `supabase/tests/database/08_shipping_schema.test.sql` - Replaced the completed Plan 08-01 placeholder expectation with the installed resolver's empty-intent failure contract.

## Verification Evidence

### Local

- `npm run db:reset`: passed with migrations through `20260712080200`.
- `npm run db:lint`: passed with no schema errors.
- `npm run db:test`: passed, 26 files and 656 assertions.
- Focused resolver and aggregation Vitest command: passed, 22 tests.
- `npm run typecheck`: passed.
- `npm run test:security`: 32/34 passed; the same unrelated catalog/newsletter static-harness baseline failures recorded by Plan 08-01 remain, and no shipping check failed.

### Approved non-production deployment

- Linked ref and API hostname both resolved to `kpnazmkprosboeiuhgea` before inspection, dry run, push, and verification.
- Pre-push history was aligned through `20260712080100`; dry run listed only `20260712080200_shipping_resolver.sql`.
- Post-push history shows local and remote `20260712080200` aligned.
- Remote database lint passed with no schema errors.
- Remote schema metadata proves the private function is SECURITY INVOKER with fixed search path, PUBLIC revoked, service_role granted, and no anon/authenticated grant.
- Remote schema metadata proves the public wrapper is SECURITY DEFINER with `public, pg_temp`, a schema-qualified private call, PUBLIC revoked, and explicit anon/authenticated grants.
- Actual remote calls under anon and authenticated failed direct private access; service_role direct execution returned sanitized `invalid_lines`.
- Anonymous public wrapper execution returned sanitized `invalid_lines`; a rollback-only valid remote fixture resolved as `ready`, source `product`, final first fee `777`, then rolled back.

## Decisions Made

- Kept the private function as a security invoker so its direct path never becomes an accidental privilege bridge.
- Used a narrowly constrained definer wrapper because browser roles need quote access without table or private-function access.
- Kept monetary resolution in integer minor units and rejected overflow as `resolver_invariant`.
- Preserved insertion-order independence through numeric precedence and deterministic evidence ordering.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected replacement-mode test arithmetic**
- **Found during:** Task 2 GREEN implementation
- **Issue:** The RED fixture expected replacement additional fee `125` even though the configured replacement value was `75`.
- **Fix:** Corrected the expected value to the complete replacement amount.
- **Files modified:** `tests/unit/checkout/shipping-resolution.test.ts`
- **Verification:** All 22 focused Vitest tests pass.
- **Committed in:** `8faa230`

**2. [Rule 1 - Bug] Initialized optional SQL region evidence safely**
- **Found during:** Task 2 first pgTAP GREEN run
- **Issue:** An unassigned PL/pgSQL record raised SQLSTATE `55000` when no region was supplied.
- **Fix:** Replaced the optional record with explicit nullable scalar fields.
- **Files modified:** `supabase/migrations/20260712080200_shipping_resolver.sql`
- **Verification:** All 656 pgTAP assertions and remote no-region calls pass.
- **Committed in:** `8faa230`

**3. [Rule 3 - Blocking] Updated the superseded resolver placeholder assertion**
- **Found during:** Task 2 full database verification
- **Issue:** The Plan 08-01 schema test still required `resolver_not_ready` after Plan 08-02 installed the resolver.
- **Fix:** Updated only that assertion to require sanitized `invalid_lines` for empty input.
- **Files modified:** `supabase/tests/database/08_shipping_schema.test.sql`
- **Verification:** Full pgTAP suite passes.
- **Committed in:** `8faa230`

**4. [Rule 3 - Blocking] Used the authorized database password after Management API access remained unavailable**
- **Found during:** Task 2 remote gate
- **Issue:** Cached CLI Management API access returned 403 and non-TTY browser login could not proceed.
- **Fix:** After the user supplied `SUPABASE_DB_PASSWORD`, used linked/direct database CLI paths, verified the exact ref and pending set, then pushed only `20260712080200`.
- **Verification:** Remote history, lint, ACL dump, actual role calls, and rollback fixture all passed without displaying credentials.

---

**Total deviations:** 4 auto-fixed (2 bugs, 2 blocking issues)
**Impact on plan:** All changes were required for resolver correctness, current test compatibility, or the mandated approved-remote gate; no production project or unrelated source implementation was touched.

## Authentication Gates

- Supabase Management API inspection initially returned 403. Execution paused twice until an authorized direct database password was made available in `.env.local`.
- The project API `SUPABASE_SECRET_KEY` was correctly treated as a project API key, never as a Management API token.
- No credential value was printed, staged, or committed.

## Issues Encountered

- `npm run test:security` retains the two pre-existing catalog/newsletter static-harness failures documented in `08-01-SUMMARY.md`. They are unrelated to all Plan 08-02 files and remain deferred.
- The Supabase reset helper required one bounded retry while local services restarted; the final required chain completed successfully through the security baseline.

## Known Stubs

None.

## User Setup Required

None. Migration `20260712080200` is applied to the approved non-production project.

## Next Phase Readiness

- Plan 08-03 can integrate this canonical resolver into quote/submit revalidation and immutable allocation snapshots.
- Plan 08-03 remains the sole owner of the checked-in Supabase type refresh.
- Browser roles have wrapper-only quote access, and unsupported physical lines cannot become zero-cost shipping.

## Self-Check: PASSED

- All four created Plan 08-02 artifacts and this summary exist.
- TDD commits `f7b6c20` and `8faa230` exist in git history in RED-to-GREEN order.
- No tracked file was deleted, no credential was staged, and user-owned `next-env.d.ts` remains unstaged.

---
*Phase: 08-shipping-profile-fallbacks-destination-zones-and-us-region-s*
*Completed: 2026-07-12*
