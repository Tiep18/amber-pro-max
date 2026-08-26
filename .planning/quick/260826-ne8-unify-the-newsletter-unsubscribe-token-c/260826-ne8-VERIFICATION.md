---
phase: quick-260826-ne8
quick_id: 260826-ne8
verified: 2026-08-26T10:30:51Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
---

# Quick 260826-ne8: Newsletter Unsubscribe Token Contract Verification Report

**Task Goal:** Unify newsletter unsubscribe tokens around the exact worker-produced unpadded base64url-43 HMAC token, with one shared validation contract, hash-only durable/RPC boundaries, no legacy hex compatibility, and a real derivation-to-render-to-redemption test.
**Verified HEAD:** `d9b37daa9b8c89551b399e8549cb255a20c792a8`
**Verified:** 2026-08-26T10:30:51Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | The newsletter bearer is exactly the worker HMAC-SHA-256 base64url output: 43 URL-safe characters without padding. | VERIFIED | `src/newsletter/unsubscribe-token.ts:11-18` accepts only `^[A-Za-z0-9_-]{43}$` and performs no normalization. `src/fulfillment/email-outbox.ts:39-47` derives with `digest('base64url')` and validates the newsletter result before returning it. Focused tests passed 66/66. |
| 2 | A real worker-derived token survives rendering and URL extraction, then redeems with only its independently computed SHA-256 hex hash at RPC. | VERIFIED | `tests/unit/newsletter/consent.test.ts:142-170` calls the production derivation, renderer, URL parser, and `unsubscribeNewsletter`, then independently computes SHA-256 with Node `createHash`. The test passed in the fresh focused run. |
| 3 | Legacy 64-hex, padding, whitespace, `+`, `/`, and malformed non-string values create neither a URL nor an RPC call. | VERIFIED | Exact validator at `src/newsletter/unsubscribe-token.ts:11-18`; renderer guard at `src/emails/transactional.ts:154-159`; redemption guard at `src/newsletter/consent.ts:129-141`. The table-driven renderer/redemption corpus at `tests/unit/newsletter/consent.test.ts:179-219` passed. |
| 4 | Raw tokens are limited to transient preparation and the intended delivery URL; durable, RPC, monitoring, audit/outbox, and client boundaries are hash-only or token-free. | VERIFIED | Repository validates before table access and inserts only `normalized_email`, `token_hash`, `expires_at`, and `source_email_outbox_id` at `src/fulfillment/email-outbox.server.ts:254-275`. RPC gets only `p_token_hash` at `src/newsletter/consent.ts:139-141`. Monitoring facts are generic at `src/newsletter/consent.ts:59-83` and `src/fulfillment/email-outbox.ts:312-335`. Newsletter outbox SQL payload contains only `consentSource` at migration lines 967-976. Persistence/hash-only test and 6/6 explicit boundary checks passed. |
| 5 | Database schema, RPC, TTL, replay behavior, and public result vocabulary remain unchanged. | VERIFIED | No migration, generated type, package, page, or dependency file changed. Existing table enforces lowercase 64-hex hashes at migration lines 1003-1011; RPC validates hash input and preserves `invalid`/`unavailable`/`unsubscribed` at lines 1022-1087. Worker TTL remains `30 * DAY_MS` at `src/fulfillment/email-outbox.ts:254-265`. `NewsletterUnsubscribeResult` remains `unsubscribed | unavailable | invalid | error` at `src/newsletter/consent.ts:57`. |

**Score:** 5/5 truths verified

## Locked Decision Verification

| Decision | Status | Evidence |
|---|---|---|
| LD-01 exact unpadded base64url-43 | VERIFIED | One regex-backed shared contract; production HMAC derivation test asserts 43 URL-safe characters and no `=`. |
| LD-02 no legacy hex compatibility or normalization | VERIFIED | Legacy generator removed; no newsletter 64-hex raw-token branch remains. `.trim()`, padding conversion, decoding, and character translation are absent from the token module. The remaining 64-hex `hashSchema` in consent is correctly limited to IP/user-agent evidence hashes. |
| LD-03 validate at derivation, renderer, repository, redemption | VERIFIED | All four production consumers import and call `normalizeNewsletterUnsubscribeToken`. Repository validation precedes `client.from`; redemption validation precedes hashing/RPC. |
| LD-04 hash-only durable and RPC boundaries | VERIFIED | Insert/RPC argument inspection, source-specific security gate, and behavior test all show digest-only boundaries. Raw material exists only in transient worker preparation/render context and the intended HTML/text URL. |
| LD-05 real derivation-to-redemption integration | VERIFIED | The test uses four production seams and an independent expected digest rather than the production hash helper. |
| LD-06 strict RED/GREEN/REFACTOR | VERIFIED | Exact commits and path classifications verified; historical RED was freshly rerun in an isolated detached worktree and both gates failed for the intended mismatch. |

## Required Artifacts

The automated artifact query reported 7/7 declared artifacts present and substantive. The repository file, although specified as a key-link artifact rather than in the frontmatter artifact list, was also checked at all levels.

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/newsletter/unsubscribe-token.ts` | Shared branded validator and SHA-256 boundary | VERIFIED | 23 substantive lines; server-only; exact regex; branded type; hash helper accepts branded input. |
| `src/fulfillment/email-outbox.ts` | Guard real newsletter HMAC derivation and transient preparation | VERIFIED | Shared validator is called immediately after HMAC digest for the newsletter purpose; malformed output throws into the existing token-preparation failure path. |
| `src/emails/transactional.ts` | Fail-closed URL rendering | VERIFIED | Requires a branded validated token before URL construction; malformed or missing values throw before output. |
| `src/newsletter/consent.ts` | Validate, hash, then redeem | VERIFIED | Shared validator precedes SHA-256 and `unsubscribe_newsletter`; public results and monitoring remain generic. |
| `src/fulfillment/email-outbox.server.ts` | Validate before table access and persist hash-only metadata | VERIFIED | Validation is at lines 255-258, before `client.from` at line 259; insert contains no raw-token field/value. |
| `tests/unit/newsletter/consent.test.ts` | Real derivation/render/URL/redemption contract | VERIFIED | Uses production functions and independent SHA-256 expectation; malformed corpus checks no RPC/no rendered URL. |
| `tests/unit/fulfillment/email-outbox.test.ts` | Derivation and hash-only persistence regression | VERIFIED | Asserts base64url-43 derivation and exact insert shape with an independently computed hash. |
| `tests/security/newsletter-unsubscribe-token-boundaries.test.mjs` | Static raw-token boundary gate | VERIFIED | 6/6 checks passed explicitly. |

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `src/fulfillment/email-outbox.ts` | `src/newsletter/unsubscribe-token.ts` | Validate newsletter HMAC output | WIRED | Import at line 5; newsletter purpose branch and validator at lines 42-47. The generic key-link query reported a false negative because its plan regex uses `.*` across multiple lines; direct source inspection and executable derivation tests prove the link. |
| `src/emails/transactional.ts` | `src/newsletter/unsubscribe-token.ts` | Validate context before constructing URL | WIRED | Shared import at lines 3-6; guard at lines 154-159; exact token passed to URL helper. |
| Unsubscribe page | `src/newsletter/consent.ts` | Forward untrusted query input into guarded action | WIRED | `src/app/[locale]/newsletter/unsubscribe/page.tsx:19-22` passes only a string or null to `unsubscribeNewsletter`; consent validates before RPC. |
| `src/fulfillment/email-outbox.server.ts` | `newsletter_unsubscribe_tokens` | Validated token to SHA-256 insert | WIRED | Guard precedes table access; only hash and safe metadata enter lookup/insert calls. |

## Data-Flow Trace

| Stage | Data | Source/Consumer | Boundary Result | Status |
|---|---|---|---|---|
| Derivation | Raw 43-char bearer | HMAC-SHA-256 `digest('base64url')` | Shared validator accepts only unchanged base64url-43 | FLOWING |
| Persistence | SHA-256 lowercase hex | Validated bearer -> hash helper -> Supabase insert | Raw token excluded; source-linked metadata retained | FLOWING |
| Delivery | Raw bearer in intended URL | Transient render context -> localized email HTML/text | Exact token survives URL encoding/extraction | FLOWING |
| Redemption | SHA-256 lowercase hex | Query bearer -> shared validator -> hash helper -> RPC | RPC argument contains only `p_token_hash` | FLOWING |
| Monitoring/client | Generic facts/status | Error branches and page result | No raw token or token hash returned/recorded | FLOWING |

## Behavioral Spot-Checks and Gates

| Check | Result | Status |
|---|---|---|
| Historical RED focused suite at `be1ff02e` in isolated detached worktree | 1 file failed, 1 passed; 13/66 tests failed for the legacy-hex/render mismatch | PASS (expected RED) |
| Historical RED security gate at `be1ff02e` | 5/6 checks failed because the shared contract and boundary guards did not exist | PASS (expected RED) |
| Focused unit suite at HEAD | 2 files, 66/66 tests passed | PASS |
| Explicit newsletter security gate | 6/6 passed | PASS |
| Full unit suite | 117 files, 1,056/1,056 tests passed | PASS |
| Typecheck | `tsc --noEmit` exited 0 | PASS |
| Lint | `eslint .` exited 0 | PASS |
| Aggregate security | 79/79 passed | PASS |
| Diff check | `git diff --check 34846635..d9b37daa` exited 0 | PASS |
| Exact commit-order gate | Newest-first REFACTOR -> GREEN -> RED subjects matched exactly | PASS |
| Eight-path/no-migration gate | Exactly 8 authorized paths; no migration, generated type, package, or unrelated file | PASS |

## TDD Commit Audit

| Commit | Role | Changed Paths | Status |
|---|---|---|---|
| `be1ff02e` | RED | Three test files only; zero production paths | VERIFIED |
| `f623bc21` | GREEN | Five production files only; zero test paths | VERIFIED |
| `d9b37daa` | REFACTOR | Shared-type/import cleanup and test typing; assertions not weakened | VERIFIED |

## Requirements Coverage

No ROADMAP requirement IDs apply to this bounded quick task. LD-01 through LD-06 are all verified above.

## Probe Execution

SKIPPED — the plan declares no probe script or probe-based acceptance criterion.

## Anti-Patterns and Disconfirmation Pass

| Finding | Classification | Assessment |
|---|---|---|
| `TBD`, `FIXME`, `XXX` in changed files | None | No debt-marker blocker found. |
| `return null` in `email-outbox.server.ts` | Info | These are substantive fail-closed issuance/race/error paths, including invalid newsletter input before table access; they are not stubs. |
| Duplicate newsletter raw-token regex/generator | None | One production newsletter regex exists, in the shared module. The unrelated recovery-token regex and 64-hex evidence/hash schemas remain correctly scoped. |
| Static key-link query for derivation | Info | False negative caused by a non-multiline `.*` plan regex; direct source and tests prove the connection. |
| Malformed repository input behavior test | Info | There is no dedicated Vitest assertion that invalid `issueNewsletterToken` input leaves `from` untouched. The exact source ordering and newsletter-specific security gate verify the behavior programmatically, so this is a test-granularity observation, not a goal gap. |
| Uncovered external/runtime path | None | No external service or visual behavior is needed to establish the scoped contract; all relevant boundaries are deterministic and programmatically verified. |

## Human Verification Required

None.

## Gaps Summary

No blocking gaps, warnings, overrides, or deferred items. All five must-have truths and all six locked decisions are verified against source, history, and fresh executable gates.

---

_Verified: 2026-08-26T10:30:51Z_
_Verifier: Codex (gsd-verifier)_
