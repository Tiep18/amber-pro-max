---
quick_id: 260803-jzl
status: planned
description: Inspect, dry-run, and safely push missing Supabase migrations
---

# Quick Task 260803-jzl Plan

## Goal

Safely reconcile the linked Supabase project's migration history by reviewing every local-only migration, proving the exact push set with a dry run, applying only migrations missing from the remote history, and confirming both histories match afterward.

## Scope and Safety Gates

- The linked Supabase remote and `.env.local` are authorized. Use `.env.local` only inside a short-lived process to verify project identity; never print, copy, commit, or pass secret values on a command line.
- Do not use `--debug`, `--include-all`, `--include-seed`, `--include-roles`, `migration repair`, or direct SQL against the remote. Do not modify migration SQL, `supabase/config.toml`, `.env.local`, or planning state during this task.
- Stop before pushing if the linked project reference does not match `NEXT_PUBLIC_SUPABASE_URL`, if history contains a remote-only/divergent version, or if the dry-run set differs from the reviewed local-only set. Report the mismatch instead of rewriting history.
- If authentication or the database password is unavailable, pause for an authentication gate. Do not expose credentials in logs or persist them in shell history.

## Task 1: Verify the linked project and reconcile history

**Files/targets:** `.env.local` (read-only), `supabase/.temp/project-ref` (read-only), `supabase/migrations/*.sql` (read-only), linked `supabase_migrations.schema_migrations` history (read-only)

**Action:** In an isolated Node process, derive the expected project reference from `NEXT_PUBLIC_SUPABASE_URL` and compare it with the linked reference without printing either value. Then list linked migration history and classify each version as matched, local-only, or remote-only. Record only migration versions/filenames needed for the review. A remote-only version, duplicate version, name mismatch, or ordering gap is a blocking divergence.

**Verify:**

```powershell
node --env-file=.env.local --input-type=module -e "import fs from 'node:fs'; const url = process.env.NEXT_PUBLIC_SUPABASE_URL; if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is missing'); const expected = new URL(url).hostname.split('.')[0]; const linked = fs.readFileSync('supabase/.temp/project-ref', 'utf8').trim(); if (!expected || expected !== linked) throw new Error('Linked Supabase project does not match .env.local'); console.log('Linked Supabase project identity verified');"
supabase migration list --linked
```

**Done:** The linked project identity is verified, the exact ordered local-only migration set is known, and no remote-only or divergent history exists.

## Task 2: Review pending SQL and prove the push set

**Files/targets:** Only the `supabase/migrations/<version>_*.sql` files identified as local-only in Task 1 (read-only), local Supabase database

**Action:** Read every pending SQL file in timestamp order. Reject unexplained destructive DDL/DML, broad grants to `public`/`anon`/`authenticated`, tables exposed without appropriate RLS, `SECURITY DEFINER` functions without a fixed `search_path` and least-privilege grants, unsafe policy replacements, or non-idempotent data changes that conflict with existing rows. Run the complete local reset, lint, and database tests. Then dry-run the linked push and compare its ordered filenames exactly with the reviewed local-only set. A zero-pending result skips Task 3's push and proceeds to final verification.

**Verify:**

```powershell
npm run db:reset
npm run db:lint
npm run db:test
supabase db push --linked --dry-run
```

**Done:** Local migrations and RLS/security contracts pass, and the dry run names only the reviewed missing migrations in ascending order, with no seed or role changes.

## Task 3: Push missing migrations and verify convergence

**Files/targets:** Linked Supabase database migration history and schema

**Action:** Run the standard linked push once, using `--yes` only after Tasks 1-2 pass. Do not add any include flags. If the push fails or is interrupted, stop, re-list history, and report the partially applied boundary; do not retry blindly or repair history. After success, verify complete local/remote equality, confirm a second dry run has nothing to apply, and lint the linked schema for errors.

**Verify:**

```powershell
supabase db push --linked --yes
supabase migration list --linked
supabase db push --linked --dry-run
supabase db lint --linked --level error --fail-on error
```

**Done:** Every local migration version has the same remote version, neither side has an unmatched entry, the follow-up dry run reports no pending migrations, and linked schema lint exits successfully.

## Threat Model

| Threat | Mitigation |
|---|---|
| Wrong linked project | Compare the linked reference with the `.env.local` URL-derived reference without printing identifiers or secrets. |
| Migration-history tampering | Fail closed on remote-only/divergent rows; forbid repair and `--include-all`. |
| Data loss or availability impact | Review the exact local-only SQL set, require local reset/tests, and require an exact dry-run match before push. |
| RLS or privilege regression | Inspect policies, grants/revokes, and every `SECURITY DEFINER` boundary; require database tests and linked lint. |
| Secret disclosure | Never echo `.env.local`, use `--debug`, pass passwords on the command line, or persist diagnostic output containing credentials. |

## Source Coverage Audit

| Source | Item | Plan coverage | Status |
|---|---|---|---|
| GOAL | Inspect history, review pending SQL, dry-run, push only missing migrations, and verify equality | Tasks 1-3 | COVERED |
| REQ | No roadmap requirement IDs apply to this quick operational task | N/A | COVERED |
| RESEARCH | Existing Supabase CLI/config and database test conventions | Tasks 1-3 | COVERED |
| CONTEXT | Remote and `.env.local` authorized; secrets and RLS/payment data remain protected | Safety gates, Tasks 1-3 | COVERED |
