# Quick Task 260828-is9: Protect transactional-email free-tier quota at public boundaries - Context

**Gathered:** 2026-08-28
**Status:** Ready for planning

<domain>
## Task Boundary

Protect the transactional-email quota consumed by newsletter subscribe, guest order reopen, and guest claim-email requests. Enforcement must remain inside the existing Next.js, PostgreSQL, Supabase, and Vercel architecture and must not add Redis, a paid queue, or another rate-limit provider.

</domain>

<decisions>
## Implementation Decisions

### Quota policy

- A newsletter address that is already subscribed returns success without another consent event or email outbox row.
- New newsletter subscriptions and resubscriptions use a 15-minute email cooldown and at most three accepted email requests per normalized address per rolling hour.
- Guest reopen and guest claim-email use separate action identities, a 10-minute email cooldown, and at most five accepted email requests per order/email/action per rolling hour.
- All three boundaries share a maximum of twenty public email requests per request IP identity per rolling hour.

### Privacy and public behavior

- Rate-limit identities use domain-separated keyed HMACs; no raw IP is stored.
- Invalid, unknown, mismatched, or throttled guest requests keep the existing generic `sent` response so callers cannot enumerate orders or customer emails.
- Newsletter requests keep a generic success response when safely handled; internal throttling detail is not exposed to the browser.

### Database authority

- PostgreSQL owns rate-limit consumption, authoritative order/subscriber lookup, idempotency, and outbox insertion in one transaction.
- Public forms call server-side service-role RPC adapters. Caller-controlled hashes or direct anonymous outbox mutations are not authoritative.
- Expired rate-limit state is pruned in bounded PostgreSQL batches; no external cache or scheduler is required.

### Outbox quota priority

- `payment_received` is claimed first.
- `digital_access_granted` and `digital_access_reissued` are claimed next.
- Other transactional messages are claimed after paid/download-critical messages.
- `newsletter_subscribed` is claimed last, with FIFO ordering inside each priority tier.

</decisions>

<specifics>
## Specific Ideas

- Reuse the existing transactional-email secret through a distinct HMAC domain so the policy needs no additional paid infrastructure or public secret.
- Count denied attempts against the shared IP budget, but only accepted sends advance the per-target cooldown.
- Prove missing-order privacy, concurrency, idempotent existing subscriptions, and priority ordering against the real database.

</specifics>

<canonical_refs>
## Canonical References

- `.planning/quick/260828-gok-replace-admin-transactional-email-retry-/260828-gok-CONTEXT.md`
- `supabase/migrations/20260828130000_atomic_admin_email_recovery.sql`
- `supabase/migrations/20260620102618_customer_retention_trust.sql`
- `src/newsletter/consent.ts`
- `src/fulfillment/order-claim.ts`

</canonical_refs>
