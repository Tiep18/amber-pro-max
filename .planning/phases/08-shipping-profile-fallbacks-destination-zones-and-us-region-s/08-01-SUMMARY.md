---
phase: 08-shipping-profile-fallbacks-destination-zones-and-us-region-s
plan: "01"
subsystem: database
tags: [postgres, supabase, pgtap, rls, shipping, migration]

requires:
  - phase: 03-mixed-cart-and-checkout
    provides: Shipping profiles, exact-country rules, checkout orders, and order lines
  - phase: 04-trusted-payments-and-orders
    provides: Immutable commercial order boundaries and approved non-production Supabase project
provides:
  - Explicit zero-or-one active shipping store default with atomic admin replacement
  - Exact-country and per-profile/currency fallback rule invariants
  - Normalized surcharge or replacement region adjustments
  - Immutable order-line shipping allocation evidence schema
  - Least-privilege RLS, grants, and fail-closed v2 quote wrapper
  - Verified non-production migration push and forward-repair rehearsal
affects: [08-02-resolver, 08-03-checkout-snapshots, 08-04-admin-actions, shipping]

tech-stack:
  added: []
  patterns: [partial unique indexes, append-only evidence, fixed-search-path RPCs, forward-only migration repair]

key-files:
  created:
    - supabase/migrations/20260712080100_shipping_profile_fallbacks_regions.sql
    - supabase/tests/database/08_shipping_schema.test.sql
    - supabase/tests/database/08_shipping_allocation_schema.test.sql
    - supabase/tests/rehearsals/08_shipping_forward_repair.sql
  modified: []

key-decisions:
  - "Store-default state remains separate from shipping profiles and starts empty; no profile or fallback is selected implicitly."
  - "Existing shipping rules are classified as exact_country without changing IDs, countries, currencies, fees, or active state."
  - "Plan 08-03 remains the sole owner of the checked-in Supabase type refresh."
  - "When hosted preview branching was unavailable, recovery was rehearsed in a disposable local database restored from the approved remote schema."

patterns-established:
  - "Destination rule shape: exact_country requires a normalized country; fallback requires null and is unique per profile/currency."
  - "Shipping evidence is append-only, one row per physical order line, with database-checked allocation arithmetic."

requirements-completed: [SHIP-07, SHIP-08, SHIP-10, SHIP-12]

duration: 34 min across checkpoint
completed: 2026-07-12
---

# Phase 08 Plan 01: Additive Shipping Schema and Compatibility Gate Summary

**Additive PostgreSQL shipping defaults, destination fallbacks, region adjustments, and immutable allocation evidence deployed to the approved non-production Supabase project with unchanged exact-row checksums.**

## Performance

- **Duration:** 34 min across checkpoint
- **Started:** 2026-07-12T03:12:47Z
- **Completed:** 2026-07-12T03:46:46Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Added an explicit empty-by-default store-default table and atomic admin RPC that serializes replacement and rejects inactive profiles.
- Added unambiguous exact/fallback rule shapes, partial uniqueness, normalized surcharge/replace regions, and immutable allocation evidence protected by RLS.
- Proved forced-failure rollback, clean reapply, and forward-only repair against a disposable database restored from the approved remote schema.
- Pushed only migration `20260712080100` to approved non-production project `kpnazmkprosboeiuhgea` and completed linked lint and API smoke verification.

## Task Commits

1. **Task 1: Wave 0 failing compatibility and invariant contracts** - `935221a` (test)
2. **Task 2: Additive schema, RLS, compatibility, and recovery implementation** - `faada2e` (feat)
3. **Task 3: Approved non-production rehearsal, push, and verification** - remote operation; evidence recorded here
4. **Out-of-scope baseline record** - `ce9c1e0` (docs)

## Files Created/Modified

- `supabase/migrations/20260712080100_shipping_profile_fallbacks_regions.sql` - Defaults, rule shapes, regions, allocation evidence, RLS/grants, and hardened functions.
- `supabase/tests/database/08_shipping_schema.test.sql` - Compatibility, uniqueness, normalization, RLS, grant, and wrapper contracts.
- `supabase/tests/database/08_shipping_allocation_schema.test.sql` - Allocation shape, arithmetic, ownership, privacy, and immutability contracts.
- `supabase/tests/rehearsals/08_shipping_forward_repair.sql` - Guarded forced-failure, rollback, clean-reapply, and forward-repair drill.
- `.planning/phases/08-shipping-profile-fallbacks-destination-zones-and-us-region-s/deferred-items.md` - Unrelated pre-existing security harness failures.

## Verification Evidence

### Local

- `npm run db:reset`: passed with migration `20260712080100` applied.
- `npm run db:lint`: passed with no schema errors.
- `npm run db:test`: passed, 25 files and 629 assertions; the guarded remote rehearsal is intentionally skipped in normal pgTAP runs.
- `npm run test:security`: 32/34 passed. Two unrelated existing catalog/newsletter static-harness failures are recorded in `deferred-items.md`; no Plan 08-01 file caused either failure.

### Non-production identity and push

- Approved linked ref: `kpnazmkprosboeiuhgea` (`amber-pro-max`), previously approved in project state and explicitly reconfirmed by the user.
- The separately identified `amber-prod` project was never linked or targeted.
- Pre-push migration history matched through `20260709155446`.
- Dry run listed only `20260712080100_shipping_profile_fallbacks_regions.sql`.
- Post-push migration history showed local and remote `20260712080100` aligned.
- Linked database lint passed with no schema errors.

### Failure, reapply, and forward repair rehearsal

- Supabase preview branching was unavailable on the organization plan, so the approved remote schema was dumped read-only and restored to a separate disposable local database.
- Before exact-row checksum: `7c104668fba855bd93c9ac7235775527`.
- Before legacy shipping-rule constraint checksum: `46e8b8101fedecae505291f05e1f4022`.
- Before legacy shipping-rule index checksum: `b3ebb8e96482c8bd1a74170f0f91218b`.
- Forced SQLSTATE `P0001` rolled the migration transaction back; exact rows, legacy catalog checksums, and migration history remained unchanged.
- Clean canonical reapply passed.
- Forward repair restored `shipping_rules_destination_shape_check` and `shipping_rules_fallback_unique_idx`.
- After exact-row checksum: `7c104668fba855bd93c9ac7235775527` (identical).
- Final Phase 8 constraint checksum: `bfd3a1fe0fb688c0cf0ef32ef0124be4`.
- Final Phase 8 index checksum: `ae32682a7dc0bd72428fe6f4bae8925b`.
- Defaults after reapply/repair: `0`; synthesized fallbacks: `0`.
- Disposable database was removed after verification.

### Remote smoke and type check

- Anonymous direct reads of shipping configuration were denied.
- Anonymous `get_checkout_shipping_quote_v2` returned `resolver_not_ready` without exposing configuration.
- Service-role exact, fallback, region, and explicit-default fixtures round-tripped successfully.
- A duplicate profile/currency fallback was rejected; all smoke fixtures were removed afterward.
- Fresh local and linked generated types both contain all four Phase 8 interfaces. Their only diff is linked PostgREST `14.5` metadata plus EOF newline formatting.
- `src/types/supabase.ts` was intentionally not changed; Plan 08-03 owns the single checked-in refresh.

## Decisions Made

- Kept defaults in a separate table because profile activation and store-default selection are independent business decisions.
- Used partial unique indexes for exact, fallback, active-default, and active-region membership invariants.
- Stored complete line-level allocation arithmetic and rejected update/delete at the database trigger boundary.
- Used a disposable schema clone when hosted branching was unavailable, avoiding experiments against shared non-production data.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Made exact-country null rejection explicit**
- **Found during:** Task 2 GREEN pgTAP run
- **Issue:** A PostgreSQL check expression could evaluate to null and therefore accept an exact rule with no country.
- **Fix:** Added an explicit `country_code is not null` condition to the canonical and repair constraints.
- **Files modified:** Migration and rehearsal SQL.
- **Verification:** Malformed exact-rule pgTAP assertion and full 629-test suite pass.
- **Committed in:** `faada2e`

**2. [Rule 3 - Blocking] Used a disposable restored database when preview branching was unavailable**
- **Found during:** Task 3 recovery rehearsal
- **Issue:** Supabase returned HTTP 402 because preview branches require a higher organization plan.
- **Fix:** Restored a read-only approved-remote schema dump into a separate local database, ran the canonical failure/reapply/repair rehearsal, then removed it.
- **Verification:** Identical pre/post exact checksum and all rehearsal success markers.

**3. [Rule 3 - Blocking] Replaced linked pgTAP smoke with trust-boundary API smoke**
- **Found during:** Task 3 post-push verification
- **Issue:** Supabase's temporary linked-test login role lacks `USAGE` on the remotely preinstalled pgTAP `extensions` schema.
- **Fix:** Retained linked schema lint, then exercised anonymous denial/wrapper behavior and service-role configuration constraints through PostgREST without displaying or recording keys.
- **Verification:** All smoke checks and cleanup passed.

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking environment issues)
**Impact on plan:** All database invariants and remote verification goals were preserved without touching production or shared remote data beyond the canonical migration and cleaned smoke fixtures.

## Issues Encountered

- Initial Supabase access returned 403 and the linked ref was not visible. Execution stopped at the blocking checkpoint until the user logged in and reconfirmed the correct non-production project.
- The management session later returned 403 after verification had completed; no retry or re-push was attempted because migration, smoke, and type evidence had already been captured.

## Known Stubs

- `public.get_checkout_shipping_quote_v2(jsonb,text,text,text)` intentionally returns `resolver_not_ready`. Plan 08-02 replaces only its hardened body while preserving the signature and grants.

## User Setup Required

None. The approved non-production migration is already applied.

## Next Phase Readiness

- Plan 08-02 can replace the fail-closed wrapper with the deterministic resolver against the deployed schema.
- Plan 08-03 must perform the sole checked-in `src/types/supabase.ts` refresh after all Phase 8 database interfaces exist.
- The two unrelated static security-harness failures remain deferred and do not affect shipping schema correctness.

## Self-Check: PASSED

- All four Plan 08-01 SQL artifacts and this summary exist.
- Task commits `935221a`, `faada2e`, and `ce9c1e0` exist in git history.
- No tracked files were deleted, temporary inspection artifacts are absent, and `next-env.d.ts` remains unstaged.

---
*Phase: 08-shipping-profile-fallbacks-destination-zones-and-us-region-s*
*Completed: 2026-07-12*
