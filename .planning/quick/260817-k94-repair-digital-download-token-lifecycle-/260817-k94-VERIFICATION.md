---
phase: 260817-k94-repair-digital-download-token-lifecycle
verified: 2026-08-17T11:20:24Z
status: passed
score: 6/6 must-haves verified
overrides_applied: 0
gaps: []
human_verification: []
---

# Quick 260817-k94: Digital Download Token Lifecycle Verification Report

**Goal:** Repair the paid digital entitlement, token issuance/reissue, and private-download authorization lifecycle without orphan capabilities, stale-worker resurrection, table fan-out, or customer-visible diagnostics.

**Verified:** 2026-08-17T11:20:24Z  
**Status:** PASSED  
**Mode:** Initial goal-backward verification; no previous verification file existed.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Code and behavioral evidence |
|---|---|---|---|
| 1 | Verified-paid/open grant creates entitlements, versioned email intents, and audits without orphan tokens; closed gates create no access. | VERIFIED | `private.grant_paid_digital_entitlements` gates on paid/open at migration lines 11-34, inserts entitlement/outbox/audit but no token at lines 41-110, and emits `entitlementVersion` at line 88. Fresh pgTAP passed assertions for two grants/outboxes/audits, zero tokens, unpaid/review-required denial, and legacy cleanup (`05_fulfillment_entitlements.test.sql:130-138`). |
| 2 | Manual reissue is row-locked/versioned, revokes all active tokens immediately, increments once, and emits exactly one replacement intent/audit without a token. | VERIFIED | Migration lines 130-219 use `FOR UPDATE`, null-safe `IS DISTINCT FROM`, set-based revocation, one version increment, one versioned outbox, and one version-keyed audit. Lifecycle pgTAP passes success/stale/null-version invariants; the dblink suite passes 9/9, including one winner, one stale result, one increment/outbox/audit, zero tokens, and fixture cleanup. |
| 3 | The worker is the only raw digital capability issuer; same-outbox retry is deterministic while superseded work cannot issue/reactivate a token and is terminal. | VERIFIED | HMAC derivation is keyed by outbox ID/purpose in `email-outbox.ts:25-34`; worker hashes ephemeral raw material then calls only `issue_digital_access_token_for_outbox` in `email-outbox.server.ts:193-221`. SQL lines 222-299 lock/check active entitlement, paid gate, source outbox, exact 24h expiry and entitlement version, and accept only exact idempotent reuse. Superseded rows are failed once without provider send/retry at `email-outbox.ts:387-396`; focused tests prove identical RPC/payload reuse and terminal cancellation. |
| 4 | One service-role-only security-definer RPC authorizes at most one asset using paid/active/order/product scope plus owner, emailed-token, or guest-cookie proof. | VERIFIED | SQL lines 303-400 implement the proof matrix with token `EXISTS`, paid gate, active entitlement, private asset, product scope and `LIMIT 1`. Live catalog inspection confirms `authorize_digital_download` is `SECURITY DEFINER`, has only `search_path=""`, is non-executable by PUBLIC/anon/authenticated, and executable by service_role. App adapter makes exactly one RPC at `downloads.server.ts:62-82`; fresh unit and pgTAP proof matrices passed. |
| 5 | No-product token self-scopes; ambiguous no-product owner/cookie is denied; same-product duplicates are deterministic. | VERIFIED | SQL `allowed` selection at lines 367-400 prefers a valid token, permits owner/cookie only for one distinct eligible product, then orders by token proof, order line, entitlement and limits one. Fresh pgTAP passed token self-scope, ambiguous owner/cookie denial, product mismatch, invalid/expired/revoked token denial, independent owner proof, and earliest-order-line same-product selection (`05_fulfillment_entitlements.test.sql:187-250`). |
| 6 | Each success creates a fresh 300-second private signed URL; every denial/error is the same 404 and sensitive material is not leaked. | VERIFIED | `downloads.ts:6,93-145` authorizes before each `createSignedUrl(..., 300)` call; `downloads.server.ts:89-94` keeps signing in the server-only adapter. Route hashes the bounded raw token, obtains auth and guest proof server-side, redirects 303 only on success, and maps all results/exceptions to `404 {status:'not_found'}` at `route.ts:9-56`. Unit tests cover dependency exceptions, database/storage failures, hash-only delegation and 303/404 behavior; 35/35 security checks found no raw/hash/path/credential/provider leakage. |

**Score:** 6/6 truths verified.

## Required Artifacts

| Artifact | Level 1: Exists | Level 2: Substantive | Level 3/4: Wired and flowing | Status |
|---|---:|---:|---|---|
| `supabase/migrations/20260817120000_repair_digital_download_token_lifecycle.sql` | Yes, 420 lines | Four complete lifecycle functions/cleanup/grants; no stub markers | Applied by two clean resets; full pgTAP and live privilege inspection passed | VERIFIED |
| `supabase/tests/database/05_fulfillment_entitlements.test.sql` | Yes | 89 behavioral/security assertions | Collected and passed in the full DB suite | VERIFIED |
| `supabase/tests/database/05_fulfillment_entitlements_concurrency.test.sql` | Yes | Two dblink sessions plus nine assertions and cleanup | Passed 9/9 in full DB suite | VERIFIED |
| `src/fulfillment/email-outbox.server.ts` | Yes | Hash-only issuance adapter with strict expiry/result validation | Called by production email worker; unit tests prove RPC-only digital persistence | VERIFIED |
| `src/fulfillment/downloads.server.ts` | Yes | Strict zero/one-row mapper and server-only signer | Called by `/api/downloads`; one RPC result flows into Storage signing | VERIFIED |
| `src/app/api/downloads/route.ts` | Yes | Auth/cookie acquisition, token hashing, generic denial and redirect | Built as dynamic Next.js route; route tests passed all result/exception paths | VERIFIED |
| `src/types/supabase.ts` | Yes | Contains two-argument reissue plus issuance/authorization signatures | Regenerated after a clean reset; `git diff --exit-code` passed | VERIFIED |

## Key Link Verification

| From | To | Status | Evidence |
|---|---|---|---|
| Paid grant | versioned digital email outbox | WIRED | Migration lines 41-96; safe payload is exactly order number, version and 24h lifetime. |
| Email worker | fenced issuance RPC | WIRED | `email-outbox.server.ts:193-221`; only source outbox ID, SHA-256 hash and expiry cross the boundary. |
| Admin resend surfaces | canonical two-argument reissue | WIRED | `entitlements.ts:136-177`, `admin-entitlement-actions.ts:34-87`, and `admin-email-actions.ts:175-218`; authenticated session client is used, while generic same-row retry at lines 99-173 remains separate. |
| Download route | authorization RPC | WIRED | Route derives trusted proofs at lines 17-44; server adapter sends five normalized fields in one call at lines 62-69. |
| Authorization result | private Storage | WIRED | Only five asset fields are mapped; signing occurs after authorization for 300 seconds and only the signed redirect reaches the customer. |

## Data-Flow Trace

| Flow | Source | Durable boundary | Consumer | Status |
|---|---|---|---|---|
| Email capability | HMAC(secret, outbox ID, purpose) in worker memory | SHA-256 hash + source outbox ID + fixed expiry through guarded RPC | Email renderer receives raw token; DB retains hash only | FLOWING |
| Manual reissue | Authenticated admin + displayed entitlement version | Row-locked RPC updates version/revocation and creates one safe outbox/audit row | Worker later issues capability only for the new version | FLOWING |
| Download authorization | Auth user ID, SHA-256 email token, existing guest-cookie hash | One service-role RPC returns minimum asset metadata | Server-only Storage signer creates fresh 300s URL | FLOWING |

## Behavioral Spot-Checks

| Behavior | Command/result | Status |
|---|---|---|
| Docker and clean migration application | Docker server 28.5.1; `npm run db:reset` completed twice with Auth/PostgREST/Storage healthy | PASS |
| Schema safety | `npm run db:lint` — no schema errors | PASS |
| Database lifecycle/concurrency/proof matrix | `npm run db:test` — 42 files, 1,040 tests; two intentional rehearsal skips | PASS |
| Generated type reproducibility | Clean reset, `npm run db:types`, then `git diff --exit-code src/types/supabase.ts` | PASS |
| Focused application contracts | Five-file Vitest command — 5 files, 67/67 tests | PASS |
| Static security boundaries | Fulfillment/payment Node test command — 35/35 tests | PASS |
| Type safety | `npm run typecheck` | PASS |
| Production compilation | `npm run build` — Next.js 16.2.9, 129 pages, `/api/downloads` dynamic route | PASS |
| SQL runtime privileges | Direct local Postgres query of `prosecdef`, `proconfig`, and role privileges | PASS |

## Commit/TDD Audit

The history preserves all three RED-before-GREEN pairs:

1. `4a7d0176` tests → `4592e804` implementation
2. `8a9c8efe` tests → `04c9889e` implementation
3. `7f86f861` tests → `4afe4081` implementation

Review fixes then land as `afb0f23d`, `08d2018e`, `d2268afa`, `64a0ea45`, `31a5743d`, `b4de0065`, and `8e27dde3`. Source and generated types are clean at current HEAD; only orchestrator-owned planning artifacts are untracked.

## Requirements Coverage

This quick task declares no ROADMAP requirement IDs. All six PLAN must-haves and five key links are covered above; newsletter compatibility, general retry administration, public abuse controls, retention cleanup, and provider delivery webhooks remain explicitly out of scope and are not gaps.

## Anti-Patterns and Disconfirmation Pass

- No `TBD`, `FIXME`, `XXX`, `TODO`, `HACK`, or placeholder marker exists in a changed file.
- The scanned `return null` branches are deliberate denial/malformed-result paths with callers and tests; none is a stub.
- Static regex security tests alone would not prove runtime authorization, but the same claims are independently covered by live pgTAP privilege/proof tests and TypeScript unit tests.
- No uncovered must-have error path was found after checking RPC errors, malformed/multi-row authorization, auth/cookie/client exceptions, signing failure, stale/null reissue version, superseded issuance, expired/revoked token, closed gate, inactive entitlement, and missing proof.
- `gsd-tools` is not installed on PATH in this workspace, so artifact/key-link helper queries could not run; equivalent existence, substantive, wiring, runtime, and data-flow checks were performed manually and through the project gates above.

## Probe Execution

No probe script is declared by the PLAN/SUMMARY and this is not a probe-based phase. The database, unit, security, type and build gates above are the executable contract.

## Human Verification Required

None for this code-completion gate. No production/provider-delivery behavior was claimed; real Resend delivery/webhook verification is explicitly outside this quick task.

## Gaps Summary

No blocker, warning, orphaned artifact, broken key link, secret leak, or deferred-in-scope gap was found. The implementation achieves the quick-task goal and retains the free-tier-oriented shape: one bounded authorization RPC, no new queue/service, deterministic retries, and immediate terminal cancellation of superseded email work.

---

_Verified: 2026-08-17T11:20:24Z_  
_Verifier: the agent (gsd-verifier)_
