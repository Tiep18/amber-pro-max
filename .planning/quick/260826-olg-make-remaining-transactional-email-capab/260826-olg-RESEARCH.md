# Quick Task 260826-olg: Research

**Date:** 2026-08-26
**Scope:** Remaining transactional-email capability issuance and readiness

## Current implementation

- Digital download issuance already uses `issue_digital_access_token_for_outbox`, a service-role-only `security definer` RPC with database timestamp comparison and version fencing.
- Guest-order and newsletter issuance still call `from(...).select()`, then `insert()`, then optionally re-read after a unique-index race. This costs multiple Supabase API requests and compares PostgREST timestamp strings byte-for-byte.
- The worker route and immediate trigger consider Resend key/from-address sufficient readiness. An absent or weak token secret is discovered only after rows have been claimed.
- Raw tokens are deterministic HMAC values derived from outbox ID and purpose. Hash-only capability rows already have a partial unique index on `source_email_outbox_id`.

## Recommended approach

### One narrow capability RPC

Add one service-role-only RPC for the remaining capability types. It accepts only `source_email_outbox_id` and a SHA-256 token hash. The database locks and reads the authoritative outbox row, derives capability type, purpose, subject, and canonical expiry from its event and `created_at`, then atomically reuses or inserts one matching capability.

Supported mappings:

| Outbox event                               | Capability             | Lifetime |
| ------------------------------------------ | ---------------------- | -------- |
| `guest_order_reopen`                       | guest `reopen_order`   | 24 hours |
| `guest_order_claim`                        | guest `claim_order`    | 24 hours |
| guest `order_created` / `payment_received` | guest `reopen_order`   | 24 hours |
| `newsletter_subscribed`                    | newsletter unsubscribe | 30 days  |

The RPC must verify guest ownership from `checkout_orders.owner_user_id is null`, normalize the authoritative recipient email, reject expired issuance, and return the stored database `timestamptz`. Existing mismatched, consumed, or inactive rows fail closed.

This removes PostgREST race handling from TypeScript, uses one request per preparation, and adds no infrastructure or free-tier cost.

### Canonical expiry handling

For guest/newsletter capabilities, do not send a client-computed expiry into the RPC. PostgreSQL computes `outbox.created_at + interval ...` and compares stored `timestamptz` values directly. TypeScript validates that the returned value is a parseable future instant and uses its canonical serialized form for rendering. Digital issuance remains unchanged because Quick 1 already fences its client candidate in the database.

### Readiness boundary

Centralize the token-secret contract: exact string, at least 32 characters, no leading/trailing whitespace. Include it in `getServerEnv().transactionalEmail` readiness and check it again at the pure batch boundary before `claimDueRows`. Both the scheduled route and immediate trigger therefore stop before claiming work.

### Rotation

Use pause → drain → rotate → resume. Pending/retrying tokenized rows must be drained under the old secret because raw tokens are derived from that secret. Already delivered links remain valid after rotation because redemption hashes the submitted raw token and compares it with the stored database hash.

## Test strategy

- Unit: readiness rejects absent/weak/padded secrets before claim.
- Unit: guest/newsletter repository methods make exactly one RPC call, never access token tables directly, pass only hashes, and accept canonical database expiry even when its textual timezone representation differs.
- Unit: provider retry renders the same deterministic guest/newsletter link on both attempts.
- pgTAP: RPC privileges are service-role only; duplicate calls reuse one guest/newsletter row; mismatched retry is rejected; canonical expiry derives from outbox timestamp; unsupported/non-guest rows cannot mint capabilities.
- Security boundary: assert the new migration uses `security definer`, locked search path, service-role-only execute, and no raw-token storage.

## Pitfalls avoided

- No generalized client-supplied table name, email, purpose, or expiry.
- No `upsert` against partial unique indexes.
- No dual-secret configuration or paid queue.
- No changes to the digital lifecycle contract delivered in Quick 1.
