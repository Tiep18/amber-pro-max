# Transactional Email Retry Token Stability Design

## Goal

Make every retry of a transactional email produce the same bearer-link token
and therefore the same Resend request payload. This removes the conflict
between a durable Resend idempotency key and the current per-attempt random
token generation.

The change covers digital-download links, guest-order reopen and claim links,
and newsletter unsubscribe links. It uses only the existing Next.js worker and
Supabase database, so it remains suitable for Vercel Free and Supabase Free.

## Constraints

- Raw bearer tokens must not be stored in Postgres, outbox payloads, logs, or
  operational failure records.
- The existing Resend idempotency key remains
  `transactional-email:<outbox-id>`.
- Token expiry is anchored to the outbox creation time; a delayed retry must
  not extend customer access.
- A missing or invalid signing secret must fail closed for emails that require
  a bearer link. Emails without a bearer link retain their current behavior.
- No queue, Redis, paid Vercel Cron, or external token service is introduced.

## Design

### Server-only signing secret

Add `TRANSACTIONAL_EMAIL_TOKEN_SECRET` to server environment validation, the
environment example, and the hosted setup instructions. Production stores the
value only in Vercel's encrypted environment settings. It must be a long,
random, independent secret and must not reuse the Supabase service-role key,
Resend API key, or worker endpoint secret.

### Deterministic link tokens

A server-only helper derives a token with HMAC-SHA-256 using the new secret,
the outbox UUID, and a fixed domain-separated purpose string. The result is
encoded as a URL-safe bearer token.

The purpose identifies the exact link capability:

- `digital_download`
- `guest_reopen_order`
- `guest_claim_order`
- `newsletter_unsubscribe`

The same outbox ID and purpose always yield the same token. Different outbox
rows or purposes yield different tokens. No component outside server-only
fulfillment code receives the signing secret.

### Idempotent database records

Each token table gains a nullable `source_email_outbox_id` that references the
transactional outbox, plus a partial unique index for non-null values. The
tables are:

- `digital_access_tokens`
- `guest_order_access_tokens`
- `newsletter_unsubscribe_tokens`

When processing a tokenized email, the repository hashes the deterministic
raw token exactly as it does today and performs an idempotent insert keyed by
`source_email_outbox_id`. A retry reads the original row instead of creating a
second record or changing its expiry. Existing tokens remain unchanged because
the new column is nullable and applies only to new outbox-driven delivery.

### Expiry and send flow

The outbox query exposes `created_at` to the worker. Initial issuance computes
the expiry from that timestamp and the existing link lifetime. The newly
created database record retains the expiry. Each later claim recreates the
same raw token, finds the same record, and renders the same URL and message
body before calling Resend with the existing idempotency key.

If token preparation cannot establish the expected idempotent record, the
worker records a bounded error code and follows the existing retry/failed
state machine. It never sends a message with an untracked or replacement
bearer token.

## Security and Operations

- RLS, service-role access, token hashing, one-time download consumption, and
  current entitlement/order authorization remain authoritative.
- The signing secret is required only by the Vercel worker; the Supabase Cron
  endpoint invocation still uses `TRANSACTIONAL_EMAIL_WORKER_SECRET` from
  Vault and does not need the token secret.
- Rotating the token secret must be coordinated after pending tokenized emails
  have drained. A documented runbook will state this deployment ordering.
- The database migration is additive and safe for existing token rows.

## Verification

- Unit tests prove that two processing attempts for the same tokenized outbox
  row use the same raw token, rendered link, and Resend payload.
- Unit tests prove that different purposes and outbox IDs derive different
  tokens, and that a missing secret fails closed.
- Repository tests prove retries preserve the original expiry and do not create
  duplicate token records.
- Database tests verify the foreign keys, partial unique indexes, RLS boundary,
  and migration compatibility.
- Typecheck, lint, focused unit/database tests, and the relevant security gate
  run before commit.

## Non-Goals

- Replacing the existing Supabase Cron + protected Vercel worker architecture.
- Changing payment confirmation, fulfillment state transitions, or download
  authorization rules.
- Backfilling prior token rows or invalidating existing customer links.
- Adding automatic secret rotation or a paid background-processing service.
