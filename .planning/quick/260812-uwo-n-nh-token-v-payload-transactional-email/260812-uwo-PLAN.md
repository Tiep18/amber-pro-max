---
quick_id: 260812-uwo
status: complete
created_at: '2026-08-12T00:00:00+07:00'
completed_at: '2026-08-12T23:48:54+07:00'
source_commits:
  - 9b87a39
  - 953fbae
description: Stabilize transactional-email bearer links and Resend payloads across retries with outbox-scoped HMAC tokens
type: tdd
autonomous: true
files_modified:
  - tests/unit/fulfillment/email-outbox.test.ts
  - tests/security/fulfillment-boundaries.test.mjs
  - supabase/tests/database/05_email_outbox.test.sql
  - supabase/tests/database/05_fulfillment_entitlements.test.sql
  - supabase/tests/database/05_guest_claim.test.sql
  - supabase/tests/database/06_customer_retention.test.sql
  - supabase/migrations/20260812162048_transactional_email_retry_tokens.sql
  - src/types/supabase.ts
  - src/fulfillment/email-outbox.ts
  - src/fulfillment/email-outbox.server.ts
  - src/lib/env/server.ts
  - src/app/api/fulfillment/email-outbox/route.ts
  - .env.example
  - README.md
user_setup:
  - service: Vercel
    why: "Only the Node.js transactional-email worker may use the HMAC signing secret."
    env_vars:
      - name: TRANSACTIONAL_EMAIL_TOKEN_SECRET
        source: "Generate a new long random value and store it as an encrypted Vercel server environment variable for every deployed environment that runs the worker."
    dashboard_config:
      - task: "Deploy the migration and code before rotating this secret; do not rotate it until pending tokenized outbox rows have drained."
        location: "Vercel Project Settings -> Environment Variables"
must_haves:
  truths:
    - "A retry of the same tokenized transactional-email outbox row produces the identical URL, rendered HTML/text, and Resend payload while retaining idempotency key transactional-email:<outbox-id>."
    - "HMAC-derived bearer tokens are deterministic only for the same outbox UUID and capability purpose, and differ for another outbox UUID or purpose."
    - "A tokenized email stores only a hash plus its source outbox reference; a retry reuses the original database row and expiry anchored to the outbox creation time."
    - "Missing or invalid signing material, malformed claimed creation time, or an inconsistent persisted token record prevents a bearer-link message from being sent and records only a bounded retry/failure code; emails without bearer links keep their existing behavior."
    - "The additive migration preserves existing token rows and uses only Supabase Postgres, the existing Vercel worker, and Resend."
  artifacts:
    - path: "src/fulfillment/email-outbox.ts"
      provides: "Server-only HMAC token derivation, bearer-link purpose mapping, fail-closed batch behavior, and outbox-created expiry input"
    - path: "src/fulfillment/email-outbox.server.ts"
      provides: "Idempotent source-outbox token lookup/insert for download, guest, and newsletter token tables"
    - path: "supabase/migrations/20260812162048_transactional_email_retry_tokens.sql"
      provides: "Nullable source_email_outbox_id foreign keys and partial unique indexes for all three token tables"
    - path: "src/lib/env/server.ts"
      provides: "Server-only TRANSACTIONAL_EMAIL_TOKEN_SECRET projection without client exposure"
  key_links:
    - from: "src/fulfillment/email-outbox.ts"
      to: "src/fulfillment/email-outbox.server.ts"
      via: "Derived raw HMAC token and outbox-created expiry passed to idempotent token preparation"
      pattern: "sourceEmailOutboxId|source_email_outbox_id"
    - from: "src/fulfillment/email-outbox.server.ts"
      to: "public.digital_access_tokens, public.guest_order_access_tokens, public.newsletter_unsubscribe_tokens"
      via: "Hash-only insert/select keyed by source_email_outbox_id"
      pattern: "source_email_outbox_id"
    - from: "src/lib/env/server.ts"
      to: "src/fulfillment/email-outbox.ts"
      via: "Both protected worker entry points pass the server-only signing secret in TransactionalEmailConfig"
      pattern: "TRANSACTIONAL_EMAIL_TOKEN_SECRET|tokenSecret"
---

# Quick Task 260812-uwo: Stable transactional-email retry tokens and payloads

## Objective

Implement the approved design in [transactional-email-retry-token-design.md](../../../docs/superpowers/specs/2026-08-12-transactional-email-retry-token-design.md): outbox-scoped, domain-separated HMAC bearer tokens make a retried email byte-for-byte stable at the Resend request boundary without persisting a raw token or adding infrastructure.

Purpose: a durable Resend idempotency key must no longer be paired with a newly minted bearer link on every send attempt.

## Task 1 — RED: lock retry stability, persistence, and secrecy contracts

**Files**

- `tests/unit/fulfillment/email-outbox.test.ts`
- `tests/security/fulfillment-boundaries.test.mjs`
- `supabase/tests/database/05_email_outbox.test.sql`
- `supabase/tests/database/05_fulfillment_entitlements.test.sql`
- `supabase/tests/database/05_guest_claim.test.sql`
- `supabase/tests/database/06_customer_retention.test.sql`

**Action**

- Before implementation, extend the existing unit suite with failing contracts for a server-only `deriveTransactionalEmailToken(secret, outboxId, purpose)` primitive. Assert URL-safe HMAC-SHA-256 output is deterministic for equal inputs and changes for each of the four exact purposes (`digital_download`, `guest_reopen_order`, `guest_claim_order`, `newsletter_unsubscribe`) and for a different outbox UUID. Do not put a production secret or a raw-token fixture into logs, snapshot names, operational facts, or database assertions.
- Exercise two processing attempts for the same claimed outbox ID, including a later worker time. Assert the repository receives the same raw token and source outbox ID, the sender receives identical `to`, `from`, `subject`, `html`, and `text`, and both attempts retain `transactional-email:<outbox-id>`. Cover digital access, guest reopen/claim, guest `order_created`/`payment_received`, and newsletter paths. Assert the non-guest/no-bearer path still sends when the signing secret is absent.
- Make the RED tests require `created_at` from the claim result, expiry calculated from that outbox timestamp (24 hours for download/guest and 30 days for newsletter), and repository reuse of the stored `expires_at` rather than a later `now`. Assert a missing/too-short secret, malformed creation time, absent required entity, or an existing source-linked row whose purpose/hash/expiry is inconsistent calls no sender and transitions with one stable, sanitized token-preparation code; raw token, secret, recipient, and provider payload stay out of recorded facts.
- Add pgTAP assertions for every token table: nullable `source_email_outbox_id` foreign key to `transactional_email_outbox`, a unique partial index applying only when the source is non-null, legacy rows without a source still inserting, and duplicate non-null source association rejecting. Retain/extend RLS and privilege assertions proving `anon` and `authenticated` cannot read or mutate any token table. Use token hashes only in fixtures and verify no `raw_token`/`token` column was introduced.
- Update the fulfillment security boundary test to require that `TRANSACTIONAL_EMAIL_TOKEN_SECRET` is server-only and that the email/outbox/operational paths neither persist raw bearer values nor include the signing secret in rendered client-facing configuration or monitored facts.

**Verify**

- `npm run test:unit -- tests/unit/fulfillment/email-outbox.test.ts` initially fails for the deterministic token, fail-closed, and payload-equality assertions.
- `npm run db:reset && npm run db:test` initially fails for the missing source-outbox columns/indexes and compatibility assertions.

**Done**

- Executable RED contracts cover all four bearer capabilities, replay-stable payloads, created-at expiry anchoring, service-role/RLS boundaries, old-row compatibility, and no raw bearer/secret persistence.

## Task 2 — GREEN: add additive outbox-to-token persistence and regenerate types

**Files**

- `supabase/migrations/20260812162048_transactional_email_retry_tokens.sql`
- `src/types/supabase.ts`

**Action**

- Create one forward-only, additive migration; do not edit historical fulfillment, guest-access, newsletter, or outbox migrations. Add nullable `source_email_outbox_id uuid references public.transactional_email_outbox(id)` to `digital_access_tokens`, `guest_order_access_tokens`, and `newsletter_unsubscribe_tokens`, with one partial unique index per table on the non-null source. Preserve each table's existing token-hash checks, token lifecycle, RLS, and service-role-only data access. Do not backfill or invalidate legacy records.
- Make the migration safe on an already populated database: the nullable default keeps existing rows valid, the foreign key preserves referential integrity, and the partial unique indexes apply only to newly outbox-driven issuance. Keep raw token material out of DDL, data migrations, outbox payloads, and error/audit rows.
- Use the repository's standard local schema workflow, in this order: `npm run db:reset`, `npm run db:lint`, `npm run db:test`, then `npm run db:types`. Treat generated `src/types/supabase.ts` as generated output: do not hand-edit it, inspect the diff, and retain only expected additions for the three source columns and any regenerated claim/outbox shape.

**Verify**

- `npm run db:reset && npm run db:lint && npm run db:test`
- `npm run db:types && git diff --check -- src/types/supabase.ts`

**Done**

- All three token tables can associate exactly one new issuance with an outbox row, legacy unlinked tokens remain valid, direct browser access remains denied, and generated Supabase types match the migrated local schema.

## Task 3 — GREEN: derive, persist, render, and operate stable bearer links fail-closed

**Files**

- `src/fulfillment/email-outbox.ts`
- `src/fulfillment/email-outbox.server.ts`
- `src/lib/env/server.ts`
- `src/app/api/fulfillment/email-outbox/route.ts`
- `.env.example`
- `README.md`

**Action**

- In `email-outbox.ts`, add the server-only deterministic token contract using Node `createHmac('sha256', secret)` and base64url output. Use one fixed, documented domain-separation prefix plus the outbox UUID and exactly one approved purpose; reject missing, blank, or insufficiently long signing material. Extend `ClaimedTransactionalEmailRow`/claim mapping with a validated `createdAt` from the RPC's existing `created_at`, and derive expiry from that immutable timestamp rather than the processing clock.
- Map bearer capabilities precisely: digital access granted/reissued → `digital_download`; guest reopen, guest `order_created`, and guest `payment_received` only when `payload.isGuest === true` → `guest_reopen_order`; guest claim → `guest_claim_order`; newsletter subscription → `newsletter_unsubscribe`. Require token preparation for each mapped capability. If it cannot establish the expected record, use a bounded token-preparation error code with the existing retry/failed state machine, skip `sender.send`, and record no secret/raw token/provider payload. Keep non-bearer email rendering and sending unchanged when the secret is unavailable.
- Change the production repository to accept the already-derived raw token and candidate expiry, hash it with the existing fulfillment/newsletter hash functions, and idempotently prepare the matching row by `source_email_outbox_id`. First read an existing source-linked row; accept it only when its purpose, hash, and stored expiry match the expected deterministic issuance, returning that stored expiry. Otherwise insert the hash-only row with source ID; on a unique race, re-read and validate the winner. Never replace a token, extend expiry, silently fall back to a bare order link, or use PostgREST `upsert` against the partial index. Map malformed query responses or mismatches to the bounded failure path.
- Preserve the Resend sender call shape and its idempotency key exactly as `transactional-email:<outbox-id>`. Pass `tokenSecret` from `getServerEnv()` into both worker entry points (`triggerTransactionalEmailOutboxNow` and the protected route) without exposing it to `getClientEnv`, API responses, or the Supabase scheduler. The worker secret remains independent and unchanged.
- Add `TRANSACTIONAL_EMAIL_TOKEN_SECRET` to the server environment schema, `.env.example`, and README hosted setup. State that it is a distinct long random Vercel encrypted environment value, never a Supabase service key/Resend key/worker secret; uses no paid service; and may be rotated only after tokenized pending emails drain so retries continue to reproduce their original bearer link.

**Verify**

- `npm run test:unit -- tests/unit/fulfillment/email-outbox.test.ts`
- `npm run db:reset && npm run db:lint && npm run db:test && npm run db:types`
- `npm run lint && npm run typecheck && npm run build && npm run test:security`
- `git diff --check` and inspect that only the files listed by this plan changed; confirm the generated type diff is schema-derived and no raw token or signing-secret value appears in migrations, outbox payloads, tests' operational facts, or documentation examples.

**Done**

- Every retry of a tokenized outbox row reuses the same HMAC bearer value, persisted row, expiry, rendered email, and Resend payload; any unsafe token-preparation state fails closed; and the documented deployment remains compatible with Supabase Free and Vercel Free.

## Threat Model

| Threat | Boundary | Mitigation |
|---|---|---|
| Token substitution or payload drift | outbox worker → Resend | Domain-separated HMAC derives one raw token per outbox/purpose; the existing Resend idempotency key and payload-equality tests guard retries. |
| Raw bearer/secret disclosure | worker → Postgres, monitoring, client bundle | Store only SHA-256 hashes and source IDs; keep the signing secret server-only; record bounded codes and safe facts only. |
| Duplicate or replacement token record | concurrent/reclaimed worker → Postgres | Source-outbox partial unique index plus read/insert/re-read validation accepts only an exact existing record and never rotates expiry. |
| Invalid deployment secret | Vercel environment → tokenized worker | Validate at bearer-token use; tokenized messages fail closed without calling Resend while non-bearer messages remain functional. |

## Source Coverage Audit

| Source | Required item | Coverage |
|---|---|---|
| GOAL | Stable bearer-link token and Resend payload across retries | Tasks 1 and 3 |
| REQ | No roadmap requirement IDs apply to this quick task | Not applicable |
| APPROVED DESIGN | Four HMAC purposes, hash-only storage, outbox-created expiry, idempotent source linkage, fail-closed behavior, and Free-tier architecture | Tasks 1–3 |
| CONTEXT | Preserve the existing Resend idempotency key and do not add paid/external infrastructure | Tasks 1 and 3 |

## Boundaries

- Do not store a raw bearer token, HMAC signing secret, rendered provider payload, or customer recipient in a token table, outbox payload, log, or operational error record.
- Do not alter payment confirmation, entitlement/download authorization, token redemption semantics, the Supabase Cron worker architecture, or historical token rows.
- Do not add queues, Redis, Vercel Cron, a new token service, dependencies, or paid infrastructure.
- Do not rotate `TRANSACTIONAL_EMAIL_TOKEN_SECRET` while tokenized rows that may retry remain pending or leased.
