---
quick_id: 260714-mhn
status: passed
verified_at: '2026-07-14T17:12:00+07:00'
verified_commits:
  - 52da2eba
  - d586f9c7
  - edf054ed
  - cb712144
---

# Verification: secure guest checkout retry recovery

## Verdict

PASSED. The remediation commit closes both previously reported gaps. Guest retry recovery is metadata-only, hash-backed, proof-independent at the attempt boundary, recoverable across both response-loss states, and compatible with signed-in checkout. The zero-discount path no longer executes discount-rule allocation SQL, while positive-discount allocation retains the prior formula and has a concrete regression assertion.

No blocking credential disclosure, duplicate order graph, authorization regression, shipping regression, or discount correctness issue was found.

## Closed gaps

| Prior gap | Result | Evidence |
| --- | --- | --- |
| Zero-discount path still entered the old NULL-sensitive CTE | CLOSED | Forward migration `20260714170000_refine_checkout_discount_allocation_guard.sql` replaces v1 with explicit branches. `expected_discount = 0` checks each allocation directly. The `discount_rule.id`/eligible-subtotal guard and `WITH candidates` allocation CTE exist only in the positive `else` branch. Static security coverage verifies this source ordering and absence of the CTE from the zero branch. |
| No exact positive-discount allocation regression | CLOSED | The physical fixture applies `SAVE10` to 4,000 and 3,000 minor-unit lines and verifies the authoritative commercial function accepts the exact 400/300 allocations before the rule changes. After the rule changes, the same quote is rejected as stale. |
| No committed full-order two-session race | CLOSED | `08_checkout_guest_retry_concurrency.test.sql` runs two concurrent dblink sessions using one attempt and different proofs through complete digital checkout. It asserts one success, one generic conflict, one claim, one order, one payment and one line graph. The test passed in the fresh full database suite. |
| Transport-loss states were not executable contracts | CLOSED | Action tests now execute two submits against the same prepared recovery state for both modeled cases: no submit headers/body retained, and order-cookie headers retained while navigation/body is lost. Both retries set the order cookie again and neither submit clears recovery. Acknowledgement remains the only clearing path. |
| No signed-in wrapper regression | CLOSED | Unit and database tests submit as an authenticated user without guest recovery, preserve `auth.uid()` ownership, create no guest claim, and do not set a guest order-access cookie. |
| Raw attempt/proof absence was incomplete | CLOSED | Concurrency pgTAP asserts both public responses omit all raw credentials and `guestAccessToken`; the committed order/payment snapshots and idempotency evidence contain neither attempt nor either proof. Claim columns enforce 64-character hash shape, and the winning order stores SHA-256(proof). |

## Must-have verification

- Preparation remains a required pre-submit Server Action for anonymous checkout and returns no credentials.
- Attempt and proof are independently generated from 32 random bytes and remain only in an HttpOnly, SameSite=Lax, bounded recovery cookie.
- Missing/malformed recovery is rejected before persistence; a different proof for the same attempt receives only a generic conflict.
- The claim primary key is SHA-256(attemptId); `INSERT ... ON CONFLICT DO NOTHING` plus `SELECT ... FOR UPDATE` serializes competing proofs.
- Public submit strips legacy tokens and returns only handoff metadata.
- Order/payment idempotency uses `guest-attempt:<SHA-256(attemptId)>`; access uses SHA-256(proof).
- Submit never clears recovery. The authorized order page verifies the order cookie and order lookup before acknowledgement deletes recovery.
- Physical retry still has one payment, one line/reservation/allocation graph, authoritative shipping sums, and preserved non-US region behavior.
- Signed-in submit bypasses guest recovery and remains auth-owned.
- Zero discount rejects any nonzero line allocation without entering the discount allocation CTE.
- Positive discount requires a concrete rule and positive eligible subtotal before running the unchanged proportional floor/largest-remainder implementation.

## Automated evidence

- Fresh `npm run db:reset`: PASS; all forward migrations apply cleanly.
- `npm run db:lint`: PASS; no schema errors.
- `npm run db:test`: PASS, 29 files and 729 assertions, including the committed full-order two-session race.
- After portability commit `cb712144`, a fresh reset plus the focused concurrency pgTAP file passed 13/13 assertions using Supabase's internal `db:5432` network alias. The parent full-suite rerun also remained at 729 passing assertions.
- Targeted guest/checkout unit suite: PASS, 3 files and 23 tests.
- Expanded checkout/payment unit suite: PASS, 15 files and 144 tests.
- Targeted checkout/payment security boundaries: PASS, 12 tests.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `src/types/supabase.ts`: zero diff.
- Production build from the implementation verification passed with 104 static pages; remediation commit `edf054ed` changes only SQL migrations and test files, with typecheck/lint re-run after it.
- Full security baseline remains 35/37 because of the pre-existing catalog public-media regex and newsletter-retention UI regex, neither of which touches these commits or checkout recovery.

## Non-blocking notes

- The committed concurrency fixture intentionally leaves its graph in the disposable local test database because commerce audit rows are append-only. The project CI already resets the database before `db:test`.
- `git show --check edf054ed` reports one extra blank line at the end of the new migration. This is cosmetic and does not affect migration, lint, database tests, or behavior.
- The dblink fixture now uses Supabase's internal `db:5432` service alias, removing the prior Windows/Docker host-port dependency and keeping the race inside the Supabase network.

## Scope and workspace

- Shipping formulas, package grouping, inventory/payment state machines, fulfillment gates, and historical migrations remain unchanged.
- The user's pre-existing `.gitignore` modification remains unstaged and untouched.
- No source files were edited during verification; only this report was updated.
