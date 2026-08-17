# Quick Task 260817-k94: Digital Download Token Lifecycle - Research

**Researched:** 2026-08-17  
**Domain:** Supabase/Postgres capability issuance, entitlement authorization, private Storage  
**Confidence:** HIGH for repository behavior; MEDIUM for externally documented platform behavior

<user_constraints>
## User Constraints (from CONTEXT.md)

The following locked decisions are copied verbatim from `260817-k94-CONTEXT.md`. [VERIFIED: CONTEXT.md]

### Locked Decisions

#### Manual reissue invalidation
- A successful admin reissue revokes every currently active digital access token for the entitlement immediately.
- Provider retry of the same transactional-email outbox row is not a manual reissue and must continue to reuse the source-linked capability for that outbox.
- Expected entitlement version plus a row lock prevents concurrent admin reissues from creating two replacement email intents.

#### Legacy token handling
- The project has not entered production, so the forward migration may revoke all active digital access tokens whose `source_email_outbox_id` is null.
- No compatibility grace window or backfill is required.
- New paid entitlement grants and admin reissues must not create a token hash whose raw token is discarded.

#### Authorization boundary
- Use one `security definer` Supabase RPC, executable only by `service_role`, to authorize and resolve one digital asset.
- The Next.js route obtains the authenticated user through `auth.getUser()`, hashes any raw digital-email token and guest-order cookie on the server, and passes only normalized IDs and hashes to the RPC.
- The RPC grants access only when the order paid gate is open, the entitlement is active, the requested product belongs to that entitlement/order, and at least one trusted proof succeeds: authenticated owner, active unexpired digital token, or valid guest-order cookie.
- The RPC returns only the minimum asset metadata needed by server code. The Next.js server creates the private Storage signed URL; browser code never receives service credentials or direct storage paths from the authorization RPC.

#### Capability lifetime
- A digital email token is reusable until its 24-hour expiry.
- Every successful download authorization creates a fresh Storage signed URL with the existing 300-second lifetime.
- Authorization does not consume or increment a usage counter.
- Account ownership and a valid guest-order cookie remain alternative access proofs after the emailed bootstrap token expires, subject to paid gate and active-entitlement checks.

#### Customer-safe failures
- Invalid input, missing order, closed paid gate, inactive entitlement, mismatched product, invalid/expired/revoked token, invalid guest cookie, and unauthorized user all produce the same customer-facing `404 not_found` response.
- Database and Storage failures use existing operational monitoring with safe identifiers only.
- Raw tokens, token hashes, guest secrets, object paths, signed URLs, service-role credentials, and provider payloads must not be written to logs, outbox payloads, audit metadata, or client responses.

#### Testing discipline
- Apply strict red-green-refactor: each changed behavior begins with a test that fails for the expected reason before production code changes.
- Database coverage must prove verified-paid grant creates entitlement plus outbox but no orphan token; unpaid or review-required state creates no entitlement or access.
- Authorization coverage must include owner, digital token, guest cookie, multiple historical tokens, product/order mismatch, expired and revoked tokens, closed paid gate, inactive entitlement, and unauthorized callers.
- Reissue coverage must include immediate revocation, one new outbox plus audit event, stale expected version, and concurrent duplicate protection.
- Route and security tests must preserve generic failures, private Storage isolation, hash-only persistence, and the 300-second signed URL lifetime.

### the agent's Discretion

None stated. [VERIFIED: CONTEXT.md]

### Deferred Ideas (OUT OF SCOPE)

Newsletter token compatibility, general email retry administration, public abuse controls, retention cleanup, and provider delivery webhooks remain separate quick tasks. [VERIFIED: CONTEXT.md]
</user_constraints>

## Summary

The defect is caused by two competing issuers. `private.grant_paid_digital_entitlements` creates an active token value that has no deliverable raw counterpart, then creates an outbox row. Admin reissue similarly generates a raw secret in TypeScript, persists only its hash, discards the raw value, and creates another outbox row. Later, the email worker deterministically derives the actual raw link from `(server secret, outbox id, purpose)`, hashes it, and inserts a second active token linked by `source_email_outbox_id`. The download adapter queries active tokens with `maybeSingle()`, so multiple rows collapse to no token; it also compares the guest-order cookie hash to a digital-token hash instead of `checkout_orders.guest_secret_hash`. [VERIFIED: `src/fulfillment/entitlements.ts`, `src/fulfillment/email-outbox.ts`, `src/fulfillment/email-outbox.server.ts`, `src/fulfillment/downloads.server.ts`, `src/fulfillment/downloads.ts`]

**Primary recommendation:** make outbox processing the only raw-capability issuer, make reissue one locked database transaction, version-gate outbox issuance so a delayed old worker cannot resurrect access, and replace the download fan-out with one service-role authorization RPC. [VERIFIED: CONTEXT.md] [ASSUMED]

## Project Constraints (from AGENTS.md)

- Digital fulfillment cannot open until the whole order is confirmed paid; PDFs stay in private Storage behind expiring access-controlled links. [VERIFIED: AGENTS.md]
- Guest checkout is mandatory, so owner, emailed capability, and order-cookie proof must remain independent valid paths. [VERIFIED: AGENTS.md]
- Service credentials remain server-only; browser code receives neither database authority nor asset metadata from the RPC. [VERIFIED: AGENTS.md]

## Architectural Responsibility Map

| Capability | Primary tier | Secondary tier | Responsibility |
|---|---|---|---|
| Paid grant / reissue / issuance fencing | Database | Email worker | Postgres owns entitlement version, revocation, outbox intent, audit, and concurrency. [VERIFIED: codebase] |
| Proof acquisition and hashing | Next.js server | Supabase Auth | Route obtains `auth.getUser()`, reads HttpOnly cookie, hashes raw proofs, and sends hashes only. [VERIFIED: CONTEXT.md; codebase] |
| Download authorization | Database RPC | Next.js server | One bounded RPC resolves at most one authorized private asset. [VERIFIED: CONTEXT.md] |
| Signed URL creation | Next.js server | Supabase Storage | Admin client signs the returned path for exactly 300 seconds. [VERIFIED: codebase] |

## Exact Current Flow and Integration Points

1. An applied paid transition fires `payment_transition_grants_digital_entitlements`; the helper locks the paid/open order, inserts one entitlement per digital order line, inserts an orphan active token, an outbox row, and an audit row. [VERIFIED: `20260619085118_fulfillment_purchase_access.sql`]
2. The worker claims outbox rows atomically, derives the raw token with HMAC from the outbox ID, fixes expiry at `outbox.created_at + 24h`, and uses the outbox ID as provider idempotency key. Its partial unique index and insert/reread adapter preserve the same capability across retries. [VERIFIED: `email-outbox.ts`, `email-outbox.server.ts`, `20260812162048_transactional_email_retry_tokens.sql`, focused unit tests]
3. `/api/downloads` obtains the verified user, raw email query token, and hashed order cookie. The admin adapter then performs order + entitlement + per-entitlement token + per-entitlement asset queries before signing. [VERIFIED: `route.ts`, `downloads.server.ts`]
4. Two manual-new-email paths exist: the entitlement action calls the three-argument reissue RPC, while `resendDownloadEmailAction` directly inserts outbox and audit rows non-atomically and does not revoke tokens or check entitlement version. Provider retry in `retryTransactionalEmailAction` is correctly distinct and must remain unchanged. [VERIFIED: `admin-entitlement-actions.ts`, `admin-email-actions.ts`]

## Forward Migration and Atomicity Blueprint

Use one forward migration, with these operations in transaction order. [ASSUMED]

1. Revoke legacy orphans with one set-based update: active `digital_access_tokens` where `source_email_outbox_id is null` become `revoked` with `revoked_at = now()`. [VERIFIED: CONTEXT.md]
2. Replace `private.grant_paid_digital_entitlements(uuid,uuid)` without token generation/insertion; preserve paid/open locking, deterministic line order, entitlement `ON CONFLICT`, one outbox, one audit, and fulfillment-status update. Put the new entitlement version in the internal outbox payload for issuance fencing. [VERIFIED: codebase] [ASSUMED]
3. Revoke and explicitly drop `public.reissue_digital_access_token(uuid,integer,text)`, then create `public.reissue_digital_access_token(uuid,integer)`. Changing argument types does **not** replace the old overload. [CITED: https://www.postgresql.org/docs/current/sql-createfunction.html]
4. In reissue: verify admin via the authenticated session, `SELECT ... FOR UPDATE` the entitlement, reject non-active/stale rows, revoke **all** active tokens, increment/return the version, and insert exactly one replacement outbox plus one version-keyed audit event. PostgreSQL holds the row lock to transaction end, so a concurrent call waits and then sees the new version as stale. [CITED: https://www.postgresql.org/docs/17/explicit-locking.html; VERIFIED: CONTEXT.md]
5. Route every manual “Resend download email” control through this canonical reissue RPC and supply the displayed entitlement version; do not retain the direct outbox/audit inserts. Keep retrying the same failed outbox row on the existing retry path. [VERIFIED: codebase] [ASSUMED]
6. Version-gate source-linked token issuance in one database transaction (recommended: a service-role-only issuance RPC used by `issueDownloadToken`). Lock the entitlement, require an active entitlement and a grant/reissue outbox whose embedded version equals the current entitlement version, then upsert/read by `source_email_outbox_id`. This preserves byte-stable retry for the same row but rejects an older worker after manual reissue. Without this guard, a delayed worker can insert an active old token after reissue has revoked existing rows. [ASSUMED]

## Authorization RPC Contract

Create a `SECURITY DEFINER` function in `public` (for PostgREST RPC visibility), with `SET search_path = ''`, all relations schema-qualified, `REVOKE EXECUTE` from `PUBLIC`, `anon`, and `authenticated`, and `GRANT EXECUTE` only to `service_role`. Functions are executable by `PUBLIC` by default, RLS does not secure function execution, and a definer owned by `postgres` can read the RLS-protected tables. [CITED: https://supabase.com/docs/guides/database/functions; CITED: https://supabase.com/docs/guides/api/securing-your-api; CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]

Suggested inputs: normalized `order_number`, nullable `product_id`, nullable trusted `owner_user_id`, nullable 64-hex `download_token_hash`, and nullable 64-hex `guest_secret_hash`. Return one row containing only `entitlement_id`, `product_id`, `bucket_id`, `object_path`, and `file_name`; the server adapter signs it and never serializes it to the client. [VERIFIED: CONTEXT.md]

The SQL predicate must require `checkout_orders.paid_gate_status = 'open'`, active entitlement joined to that order, a private digital asset joined through the entitlement product, and this proof disjunction: `(order.owner_user_id = trusted owner id) OR EXISTS(active, unexpired, matching digital token for this entitlement) OR (order.guest_secret_hash = supplied cookie hash)`. Use `EXISTS` for tokens so history rows cannot multiply results. [VERIFIED: CONTEXT.md; codebase schema]

Determinism rule: a supplied product scopes the result; a no-product email request is resolved by its globally unique token hash; a no-product owner/cookie request with more than one eligible product returns no row. Same-product duplicates resolve with `ORDER BY order_line_id, entitlement_id LIMIT 1`; assets are one-row-per-product. [VERIFIED: codebase schema] [ASSUMED]

The route validates before RPC, hashes the raw email token with `hashFulfillmentAccessToken`, obtains the guest cookie hash from `getGuestOrderAccessHashFromServer`, and calls the RPC once through the admin client. Invalid/zero-row outcomes remain `404 {status:'not_found'}`; only RPC/Storage failures are monitored with order/product/entitlement identifiers. `createSignedUrl(bucket,path,300)` remains the final server-only step. [VERIFIED: CONTEXT.md; codebase]

## RLS, Grants, Types, and Pitfalls

- Use empty `search_path` and qualified names; do not copy a definer with an unsafe writable schema resolution path. [CITED: https://supabase.com/docs/guides/database/functions; CITED: https://www.postgresql.org/docs/17/perm-functions.html]
- Reissue should use `createSupabaseServerClient()` after `requireAdmin()`, not the service client, because `private.is_admin()` and audit `auth.uid()` need the authenticated admin JWT. The download RPC alone is service-role-only. [VERIFIED: `guards.ts`, `admin-entitlement-actions.ts`, `private.is_admin()` migration]
- Regenerate `src/types/supabase.ts`: remove `p_new_token_hash`, add the two-argument reissue signature, and add new RPC args/returns. No new package is required. [VERIFIED: generated types]
- Private `pattern-pdfs` access remains server-signed; Supabase documents private downloads as authenticated access or time-limited signed URLs. [CITED: https://supabase.com/docs/guides/storage/buckets/fundamentals; CITED: https://supabase.com/docs/reference/javascript/file-buckets-createsignedurl]

## Validation Architecture (Red-Green Order)

| Layer | Exact red test to add/modify |
|---|---|
| Database grant | Extend `05_fulfillment_entitlements.test.sql`: paid/open with two digital lines yields 2 entitlements + 2 outboxes + 2 audits and **0** tokens; unpaid/review-required yields none. [VERIFIED: existing seam; CONTEXT.md] |
| Database reissue | Assert only `(uuid,integer)` exists; seed multiple active tokens; one call revokes all, increments once, emits one outbox/audit and no token; stale call adds nothing. Add a `dblink` test modeled on `08_checkout_guest_retry_concurrency.test.sql`: one `reissued`, one `stale`. [VERIFIED: existing seam] [ASSUMED] |
| Database authorization | Service-role cases: owner, active token, guest cookie, multiple historical/active token rows, product/order mismatch, expired/revoked token, closed gate, inactive entitlement, and ambiguous no-product owner/cookie. Assert zero/one row only. [VERIFIED: CONTEXT.md] |
| Grants/security | Assert `prosecdef`, fixed/empty `proconfig`, no execute for PUBLIC/anon/authenticated, service-role execute only, no direct token/asset exposure, and old overload absent. [CITED: https://supabase.com/docs/guides/database/functions] [VERIFIED: existing pgTAP patterns] |
| Unit/route | Rewrite `downloads.test.ts` around one RPC call and hash-only args; prove raw email token never reaches RPC, cookie hash uses the guest-order column path, generic denial is stable, and signed URL TTL is 300. Reissue wrapper sends only ID/version. [VERIFIED: existing seams; CONTEXT.md] |
| Retry/security | Keep the existing stable-retry tests green; add superseded-outbox rejection and static checks that no raw/hash/path leaks reach logs, payloads, audits, or client components. [VERIFIED: `email-outbox.test.ts`, `fulfillment-boundaries.test.mjs`] [ASSUMED] |

Quick verification commands: `npm run test:unit -- tests/unit/fulfillment/downloads.test.ts tests/unit/fulfillment/email-outbox.test.ts`; `node --test tests/security/fulfillment-boundaries.test.mjs`; then `npm run db:reset && npm run db:lint && npm run db:test && npm run db:types && git diff --exit-code src/types/supabase.ts`. [VERIFIED: package.json]

Focused unit tests currently pass (49 tests) and the fulfillment security harness passes (13 tests). Supabase CLI 2.107.0 is installed, but Docker Desktop's Linux engine is not running, so database red/green tests, migration lint, and type regeneration cannot currently execute until Docker is started. [VERIFIED: local commands, 2026-08-17]

## Security Domain

ASVS V2/V3/V4/V5/V6 apply: verified session identity, HttpOnly guest proof, server-only access control, UUID/hash validation, SHA-256/HMAC capability handling, and private signed delivery. Do not compare secrets after fetching rows, expose the RPC to browser roles, trust public owner IDs, or log raw/hash/path/signed URLs. [VERIFIED: CONTEXT.md; AGENTS.md]

## Sources

- Repository sources listed in `260817-k94-CONTEXT.md`, plus `src/app/api/downloads/route.ts`, `src/payments/guest-access.ts`, `src/fulfillment/admin-email-actions.ts`, `src/auth/guards.ts`, `src/types/supabase.ts`, and focused tests. [VERIFIED: codebase]
- Supabase Database Functions and API Security: https://supabase.com/docs/guides/database/functions and https://supabase.com/docs/guides/api/securing-your-api [CITED: official Supabase docs]
- Supabase RLS and private Storage signed URLs: https://supabase.com/docs/guides/database/postgres/row-level-security and https://supabase.com/docs/guides/storage/buckets/fundamentals [CITED: official Supabase docs]
- PostgreSQL function replacement and row locking: https://www.postgresql.org/docs/current/sql-createfunction.html and https://www.postgresql.org/docs/17/explicit-locking.html [CITED: official PostgreSQL docs]

## Assumptions Log

| # | Claim | Risk if wrong |
|---|---|---|
| A1 | Embed entitlement version in each digital outbox payload and enforce it in guarded issuance; this is a recommended new concurrency fence, not a locked schema choice. [ASSUMED] | A different explicit relational fence is acceptable, but omitting any fence permits post-reissue token resurrection. |
| A2 | Reject ambiguous owner/cookie requests without `product_id`; current UIs normally provide product scope while email token hashes self-scope. [ASSUMED] | If a product-less multi-download UX is required, the route must present a selection instead of arbitrarily returning a file. |
| A3 | Treat the failed-email queue's “Resend download email” as manual reissue and route it through the versioned reissue RPC; retain only same-row provider retry as non-reissue. [ASSUMED] | Leaving the direct insert path creates a second unversioned manual issuer that bypasses revocation and audit atomicity. |
