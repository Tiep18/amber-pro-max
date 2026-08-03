---
status: resolved
trigger: Supabase remote migration 20260801160000 fails with PostgreSQL 42P16 because order_payment_statuses view column order differs from the local reset baseline
created: "2026-08-03T14:35:00+07:00"
updated: "2026-08-03T15:03:17+07:00"
---

# Debug Session: supabase-view-column-drift

## Symptoms

- Expected behavior: The 13 reviewed local-only Supabase migrations apply to the linked remote and local/remote migration histories converge.
- Actual behavior: The push fails on the first pending migration before any migration version is recorded; all 13 remain local-only.
- Error messages: PostgreSQL `42P16` reports that replacing `public.order_payment_statuses` would rename existing view column `currency_code` to `payment_intent`.
- Timeline: Reproduced on 2026-08-03 during the authorized linked push after local reset, lint, database tests, and linked dry-run all passed.
- Reproduction: Run `supabase db push --linked --yes` against the verified linked project with `20260801160000_vietqr_customer_declaration.sql` as the first pending migration.

## Current Focus

hypothesis: Confirmed — post-application edits created two legitimate view layouts, and the pending migration had to preserve either exact existing prefix.
test: Completed; historical and reset-style layouts both apply successfully, and scoped static and diff checks are clean.
expecting: Satisfied; archive and commit only the four authorized files.
next_action: Move this resolved session to `.planning/debug/resolved/` and create the scoped debug commit.

## Evidence

- timestamp: 2026-08-03T14:32:15+07:00
  observation: Local reset, schema lint, 942 database tests, and linked dry-run passed; the actual push failed on the first pending migration with `42P16`, and remote migration history remained unchanged.
- timestamp: 2026-08-03T14:36:40+07:00
  observation: Applicable debugger, test-first, verification, payment, and Supabase security rules were loaded. The repository-specific ambertinybear source documents referenced by the global skills are absent in this workspace, so `AGENTS.md` and the checked-in migration/test patterns remain the available source of truth.
- timestamp: 2026-08-03T14:37:16+07:00
  observation: The knowledge base has no matching migration/view-drift pattern. Source search found the view created in `20260615034000`, conditionally replaced in `20260617064230` and `20260618093000`, then unconditionally replaced by the first failing pending migration `20260801160000`; existing database tests check selected columns and behavior but not projection ordinals or upgrade compatibility. The worktree has no tracked modifications; only this debug session and an existing quick-task directory are untracked.
- timestamp: 2026-08-03T14:39:13+07:00
  observation: Git history proves commit `d7925225` edited already-created migration `20260615034000` to insert `payment_intent` between `market` and `currency_code`. Migration `20260618093000` was later amended in `1065695b` with two compatibility projections: reset-style schemas keep `payment_intent` at ordinal 8, while historical schemas keep `currency_code` at ordinal 8 and append `payment_intent` immediately before `shipping_address`. The linked `42P16` names this exact divergence when `20260801160000` emits only the reset-style projection.
- timestamp: 2026-08-03T14:43:17+07:00
  observation: An isolated local PostgreSQL transaction recreated the historical 24-column projection and applied the pending projection order. PostgreSQL reproduced the linked failure exactly: SQLSTATE `42P16`, `cannot change name of view column "currency_code" to "payment_intent"`. The transaction aborted and left no local schema state.
- timestamp: 2026-08-03T14:45:26+07:00
  observation: The new rehearsal correctly detected a local reset through `20260801150000`, but `supabase test db <file>` mounts only the selected test path inside its runner container, so psql could not resolve the relative `\\ir` migration include. This is a test-harness limitation, not evidence against the root-cause hypothesis; the rehearsal must expand the checked-in migration on the host before streaming it to local psql.
- timestamp: 2026-08-03T14:46:23+07:00
  observation: After adding a local rehearsal runner that expands the checked-in migration include, the new regression test reached the production DDL and failed RED for the intended reason: PostgreSQL rejected renaming ordinal 8 from `currency_code` to `payment_intent`. No production migration had been changed at that point.
- timestamp: 2026-08-03T14:47:46+07:00
  observation: With the guarded migration change, the same historical-boundary rehearsal applied the full production migration past both view replacement and function creation. Its assertions then stopped because direct psql does not install pgTAP's `plan()` helper; this is an assertion-harness issue after the formerly failing DDL, so the test will use direct `DO` assertions like the existing forward-repair rehearsal.
- timestamp: 2026-08-03T14:48:31+07:00
  observation: The unchanged historical boundary and production migration now complete GREEN. Direct assertions verified the full historical 24-column prefix remained unchanged, `customer_transfer_declared_at` was appended, and both customer functions existed; the rehearsal rolled the transaction back.
- timestamp: 2026-08-03T14:50:09+07:00
  observation: A complete local reset applied all migrations and seed successfully. The subsequent verification was incorrectly parallelized: `supabase test db` installed pgTAP objects in the `extensions` schema while `db:lint` was scanning it, producing pgTAP-internal lint errors unrelated to project SQL. This run is confounded and is not accepted as verification; the documented reset -> lint -> test order will be rerun sequentially.
- timestamp: 2026-08-03T14:51:27+07:00
  observation: Fresh sequential verification passed: complete reset with all 13 pending migrations and seed, local schema lint with zero errors, 41 database test files with 942 assertions passing and both opt-in rehearsals safely skipped, ESLint for the new runner, and all 58 security boundary tests. The historical upgrade rehearsal separately passed at the pre-migration boundary.
- timestamp: 2026-08-03T14:52:22+07:00
  observation: The linked project identity again matched `.env.local` without printing either identifier. Migration history still has one clean matched prefix through `20260801150000` and exactly the same 13 local-only versions with no remote-only rows. A fresh linked dry-run names exactly those 13 reviewed migrations in ascending order and no seed or role changes.
- timestamp: 2026-08-03T14:52:49+07:00
  observation: One standard linked push applied all 13 reviewed migrations in order and exited successfully. No include, seed, role, repair, direct SQL, or debug flags were used.
- timestamp: 2026-08-03T14:53:33+07:00
  observation: Post-push linked migration history is fully converged through `20260802180000`, a follow-up dry-run reports the remote database is up to date, and linked lint across `extensions`, `private`, and `public` reports zero schema errors.
- timestamp: 2026-08-03T14:53:56+07:00
  observation: Final scope audit found one tracked migration modification plus the new runner, rehearsal, and debug session. `git diff --check` passed. The pre-existing untracked quick-task directory was not modified, no secrets or project references were printed, and no commit was created.
- timestamp: 2026-08-03T15:00:30+07:00
  observation: Human verification was received and accepted: the successful remote migration reconciliation represents the intended real workflow outcome. Finalization remains limited to the migration, rehearsal, runner, and archived debug session; the remote push will not be rerun.
- timestamp: 2026-08-03T15:01:38+07:00
  observation: Fresh local verification reset the disposable database through `20260801150000` and ran the historical-boundary rehearsal. The production migration completed, the exact historical view prefix remained unchanged, both customer functions existed, `VIETQR_VIEW_UPGRADE_REHEARSAL_OK` was emitted, and the transaction rolled back.
- timestamp: 2026-08-03T15:02:44+07:00
  observation: A fresh complete local reset then restored the disposable database through migration `20260802180000` with seed data. The guarded migration applied successfully in the reset-style layout as well as the separately rehearsed historical layout.
- timestamp: 2026-08-03T15:03:17+07:00
  observation: Scoped ESLint for `scripts/run-db-rehearsal.mjs` and `git diff --check` passed. GSD planning configuration allows documentation commits. The session is resolved by accepted human verification plus fresh local historical-layout and reset-layout verification.

## Eliminated

- hypothesis: Migration history divergence or a wrong linked project caused the failure.
  reason: Project identity was verified without exposing identifiers, and migration history had a clean matched prefix followed by exactly 13 local-only versions.

## Resolution

- root_cause: Applied migration `20260615034000_trusted_payments_orders.sql` was later edited to insert `payment_intent` at view ordinal 8. Local resets replay that edited history, but the linked project retained the original view and later compatibility logic appended `payment_intent` near the end. Pending migration `20260801160000_vietqr_customer_declaration.sql` assumes only the reset layout and violates PostgreSQL's `CREATE OR REPLACE VIEW` requirement that all existing columns keep their names and ordinals.
- fix: Changed the still-unapplied `20260801160000` migration to inspect the complete existing view-column array, preserve either exact known prefix when replacing the view, append only `customer_transfer_declared_at`, and raise SQLSTATE `55000` for any unknown layout. Added an executable historical-boundary rehearsal and local include-expanding runner.
- verification: Historical-boundary rehearsal failed RED with the original view-column error before the fix and passed GREEN after it. Fresh complete reset, local schema lint, 942 database assertions, runner ESLint, and 58 security tests passed. The authorized standard linked push applied all 13 migrations; post-push history is fully equal, the follow-up dry-run is empty, and linked lint reports zero schema errors. Human verification accepted the successful remote reconciliation. Finalization reran the historical-boundary rehearsal successfully and restored the local database through `20260802180000` with the guarded migration applied.
- files_changed:
  - supabase/migrations/20260801160000_vietqr_customer_declaration.sql
  - supabase/tests/rehearsals/05_order_payment_status_view_upgrade.sql
  - scripts/run-db-rehearsal.mjs
  - .planning/debug/supabase-view-column-drift.md
