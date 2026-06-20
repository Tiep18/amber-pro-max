---
phase: 06-customer-retention-and-trust
plan: "01"
subsystem: account
tags: [supabase, postgres, rls, account, addresses, next-intl, server-actions]
requires:
  - phase: 03-shopping-cart-and-checkout
    provides: checkout shipping-address schema and immutable order shipping snapshots
  - phase: 04-trusted-payments-and-orders
    provides: account authentication guards and order evidence model
provides:
  - Owner-scoped customer saved shipping address table with RLS
  - Account address query and mutation helpers derived from authenticated user context
  - English and Vietnamese saved-address account routes
  - Address book and address form UI for create, edit, delete, and default selection
  - Unit, pgTAP, and listed Playwright contracts for ACC-03
affects: [phase-06, account, checkout, customer-retention, saved-addresses]
tech-stack:
  added: []
  patterns: [server-owned account mutations, owner-scoped saved convenience records, immutable order snapshot separation]
key-files:
  created:
    - supabase/migrations/20260620102618_customer_retention_trust.sql
    - src/account/addresses.ts
    - src/account/address-actions.ts
    - src/app/[locale]/account/addresses/address-book-page.tsx
    - src/app/[locale]/account/addresses/page.tsx
    - src/app/[locale]/tai-khoan/dia-chi/page.tsx
    - src/components/account/address-book.tsx
    - src/components/account/address-form.tsx
  modified:
    - supabase/tests/database/06_customer_retention.test.sql
    - src/types/supabase.ts
    - src/messages/en.json
    - src/messages/vi.json
    - tests/unit/account/addresses.test.ts
    - tests/e2e/account-retention.spec.ts
key-decisions:
  - "Saved addresses are mutable account convenience records only; checkout orders keep independent shipping snapshots and have no FK to customer_shipping_addresses."
  - "Address mutations use authenticated RPCs and server-owned auth.uid()/requireUser boundaries; browser input never supplies owner id."
  - "Account address routes reuse one shared renderAddressBookPage implementation with locale-specific route guards."
patterns-established:
  - "Account convenience data uses owner-scoped RLS plus server action wrappers that revalidate both localized routes."
  - "Phase 6 shared migration starts with customer address tables/RPCs and is intended to be appended by later retention plans."
requirements-completed: [ACC-03]
duration: 38 min
completed: 2026-06-20
---

# Phase 06 Plan 01: Saved Address Account Management Summary

**Owner-scoped saved shipping addresses with Supabase RLS, authenticated server actions, and localized account address-book UI.**

## Performance

- **Duration:** 38 min active execution, plus local Supabase image/setup wait
- **Started:** 2026-06-20T21:20:00+07:00
- **Completed:** 2026-06-20T21:58:00+07:00
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments

- Added RED contracts for ACC-03 saved-address ownership, one-default enforcement, immutable order snapshot separation, and localized E2E account address flows.
- Added `customer_shipping_addresses` with owner RLS, one-default partial unique index, authenticated RPC mutations, and no order-table dependency on saved-address rows.
- Added account address query/action helpers that derive ownership from authenticated server context and expose safe result unions.
- Added localized `/en/account/addresses` and `/vi/tai-khoan/dia-chi` pages with address list, create/edit forms, delete warning copy, and default badge/actions.
- Regenerated Supabase types so the new table and RPCs are represented in `src/types/supabase.ts`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add saved-address contracts** - `06056e5` (`test(06-01)`)
2. **Task 2: Implement saved-address schema, services, and account UI** - `bd4692e` (`feat(06-01)`)

## Files Created/Modified

- `supabase/migrations/20260620102618_customer_retention_trust.sql` - Phase 6 customer address table, indexes, RLS policies, grants, and RPC mutations.
- `supabase/tests/database/06_customer_retention.test.sql` - pgTAP coverage for address table shape, owner RLS, one-default enforcement, and immutable order snapshot separation.
- `src/account/addresses.ts` - Saved-address input parsing, row mapping, and owner-scoped query helper.
- `src/account/address-actions.ts` - Authenticated create/update/delete/default server actions and RPC wrappers.
- `src/app/[locale]/account/addresses/address-book-page.tsx` - Shared localized server-rendered address-book page implementation.
- `src/app/[locale]/account/addresses/page.tsx` - English account address route.
- `src/app/[locale]/tai-khoan/dia-chi/page.tsx` - Vietnamese account address route.
- `src/components/account/address-book.tsx` - Address list, edit/delete/default controls, and new-address section.
- `src/components/account/address-form.tsx` - Address create/update form with visible labels and default checkbox.
- `src/messages/en.json` - English address-book labels and status copy.
- `src/messages/vi.json` - Vietnamese address-book labels and status copy.
- `src/types/supabase.ts` - Generated types for the new table and RPCs.
- `tests/unit/account/addresses.test.ts` - Unit contracts for parsing, mapping, owner query, and safe action states.
- `tests/e2e/account-retention.spec.ts` - Skipped Playwright contracts to be activated with authenticated fixtures in Plan 06-10.

## Decisions Made

- Saved addresses deliberately remain separate from `checkout_orders.shipping_address`; order shipping evidence is immutable snapshot data, not a live link to account convenience records.
- Address mutation RPCs run as `security invoker` and rely on `auth.uid()` plus RLS, while server actions still call `requireUser` before creating the Supabase server client.
- The UI keeps one top-level address-book card and uses inline row editing to avoid nested page cards while still giving customers complete CRUD/default controls.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Subagent quota cut execution after RED commit**
- **Found during:** Task 2 execution
- **Issue:** The executor subagent stopped with provider usage-limit after committing Task 1, leaving production edits uncommitted and no SUMMARY.md.
- **Fix:** Resumed inline from the dirty working tree, completed Task 2, verified, and committed the implementation.
- **Files modified:** Task 2 implementation files listed above.
- **Verification:** `npm run test:unit -- tests/unit/account/addresses.test.ts`, `npm run typecheck`, `npm run db:lint`, and `npm run db:test` passed.
- **Committed in:** `bd4692e`

**2. [Rule 3 - Blocking] Vitest server-only boundary for server actions**
- **Found during:** Task 2 unit verification
- **Issue:** Importing `address-actions.ts` in Vitest pulled `server-only` through `requireUser`, and the local test dependency graph did not include that runtime package.
- **Fix:** Followed existing repo test pattern by mocking `server-only`, `next/cache`, `@/auth/guards`, and `@/lib/supabase/server` in `tests/unit/account/addresses.test.ts`.
- **Files modified:** `tests/unit/account/addresses.test.ts`
- **Verification:** Address unit tests pass.
- **Committed in:** `bd4692e`

**3. [Rule 3 - Blocking] Missing installed Resend dependency in local node_modules**
- **Found during:** Task 2 typecheck
- **Issue:** `npm run typecheck` failed because `node_modules/resend` was missing even though `resend` was already declared in `package.json` and `package-lock.json`.
- **Fix:** Ran `npm install` to restore the dependency tree without changing package manifests.
- **Files modified:** None tracked.
- **Verification:** `npm run typecheck` passed.
- **Committed in:** Not applicable; dependency restore only.

---

**Total deviations:** 3 auto-fixed (3 blocking).
**Impact on plan:** The fixes were required to resume after quota interruption and make the planned contracts verifiable. No scope expansion beyond Plan 06-01.

## Issues Encountered

- `npm run db:reset` applied all migrations, including `20260620102618_customer_retention_trust.sql`, but failed readiness after three attempts because the local Supabase Storage API reported a bucket query schema mismatch: `UNION types text and uuid cannot be matched`.
- The database itself remained usable after the failed readiness check: `npm run db:lint` passed and `npm run db:test` passed all 372 pgTAP tests, including `06_customer_retention.test.sql`.

## Verification

- `npm run test:unit -- tests/unit/account/addresses.test.ts` - passed; 5 tests.
- `npm run test:e2e -- tests/e2e/account-retention.spec.ts --list` - passed; 5 skipped fixture-activation contracts listed.
- `npm run typecheck` - passed.
- `npm run db:lint` - passed; no schema errors.
- `npm run db:test` - passed; 18 files, 372 tests.
- `npm run db:types` - passed; generated `src/types/supabase.ts`.
- `npm run db:reset` - migration apply succeeded, but final Supabase Storage readiness failed after three attempts due local Storage schema mismatch.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 06-02 can wire saved-address selection into checkout using the owner-scoped `customer_shipping_addresses` table, `getCustomerShippingAddresses`, and the localized account address management routes. The remaining caution is local Supabase Storage readiness during full `db:reset`; Postgres lint/test gates are passing.

---
*Phase: 06-customer-retention-and-trust*
*Completed: 2026-06-20*
