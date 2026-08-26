---
phase: quick-260826-ne8
plan: 01
subsystem: newsletter
tags: [security, base64url, sha256, transactional-email, tdd]
requires:
  - phase: quick-260812-uwo
    provides: domain-separated transactional-email HMAC token derivation and source-linked issuance
provides:
  - Exact unpadded base64url-43 newsletter unsubscribe token contract
  - Hash-only newsletter persistence and redemption boundaries
  - End-to-end derivation, rendering, URL extraction, and redemption coverage
affects: [newsletter, transactional-email, consent, security]
tech-stack:
  added: []
  patterns: [branded validated bearer types, validate-before-hash boundaries, hash-only durable capability storage]
key-files:
  created:
    - src/newsletter/unsubscribe-token.ts
    - tests/security/newsletter-unsubscribe-token-boundaries.test.mjs
  modified:
    - src/newsletter/consent.ts
    - src/fulfillment/email-outbox.ts
    - src/fulfillment/email-outbox.server.ts
    - src/emails/transactional.ts
    - tests/unit/newsletter/consent.test.ts
    - tests/unit/fulfillment/email-outbox.test.ts
key-decisions:
  - "Accept only unchanged 43-character unpadded base64url newsletter bearer values; legacy 64-hex raw values have no compatibility path."
  - "Validate with one server-only branded contract before hashing, rendering, persistence access, or redemption RPC access."
patterns-established:
  - "Capability boundary: validate an untrusted raw newsletter bearer once, then hash only the branded value for durable and RPC use."
requirements-completed: []
duration: 10min
completed: 2026-08-26
---

# Quick Task 260826-ne8: Newsletter Unsubscribe Token Contract Summary

**One branded base64url-43 contract now governs newsletter HMAC derivation, localized delivery URLs, hash-only persistence, and SHA-256 redemption.**

## Performance

- **Duration:** 10 min
- **Completed:** 2026-08-26T17:25:42+07:00
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Replaced the split 43-character HMAC versus 64-hex raw-token behavior with an exact, non-normalizing base64url-43 contract.
- Proved the production derivation → renderer → URL extraction → redemption path sends only an independently calculated lowercase SHA-256 hash to `unsubscribe_newsletter`.
- Added fail-closed rendering, persistence preparation, and redemption guards while preserving the existing database schema, TTL, replay behavior, and public result vocabulary.
- Added newsletter-specific security checks for shared-contract use and exclusion of raw bearer material from inserts, RPC arguments, monitoring, client results, and durable outbox payloads.

## RED Evidence

Before production changes, the focused Vitest gate failed 13 of 66 tests for the expected contract mismatch: the real base64url-43 HMAC token redeemed as `invalid`, the 64-hex legacy raw token was accepted, malformed renderer inputs produced output instead of throwing, and valid 43-character operational-error coverage could not reach the RPC path. The newsletter security gate failed 5 of 6 checks because the dedicated shared contract and its four boundary calls were absent. The combined RED wrapper exited zero only because both underlying gates failed.

## GREEN Evidence

After the implementation commit, the focused gate passed 66/66 Vitest tests and 6/6 newsletter-specific security checks. Persistence tests independently calculated the SHA-256 hash and observed only normalized email, token hash, expiry, and source outbox ID in database calls.

## REFACTOR Evidence

The temporary consent hash-helper re-export was removed. Tests and production consumers now import the branded type, validator/normalizer, and hash helper from `src/newsletter/unsubscribe-token.ts`, and the renderer path accepts the branded token type directly.

## Task Commits

1. **RED — expose newsletter token contract mismatch** — `be1ff02e`
2. **GREEN — unify newsletter token validation** — `f623bc21`
3. **REFACTOR — isolate unsubscribe token contract** — `d9b37daa`

## Verification

- Full unit suite: 117 files, 1056 tests passed.
- TypeScript: `tsc --noEmit` passed.
- Lint: `eslint .` passed.
- Aggregate security suite: 79/79 passed.
- Newsletter security suite: 6/6 passed.
- `git diff --check` passed.
- Exact newest-first commit-order gate passed.
- Changed-path allowlist passed with exactly the eight authorized paths.
- No migration, generated Supabase type, dependency, package, rate-limit, cleanup, admin retry, or webhook file changed.
- Source inspection confirmed the intended rendered email URL and transient preparation are the only raw newsletter bearer surfaces; Supabase inserts and redemption RPC arguments contain hashes only.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

All eight changed source/test files exist, all three task commits are present in the required order, and the summary is intentionally uncommitted per orchestrator instruction.

---
*Quick task: 260826-ne8*
*Completed: 2026-08-26*
