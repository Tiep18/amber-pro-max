# Quick Task 260828-gok: Atomic admin transactional-email retry and digital resend - Context

**Gathered:** 2026-08-28
**Status:** Ready for planning

<domain>
## Task Boundary

Replace the admin transactional-email retry read-then-write flow and the digital resend form trust boundary with authoritative atomic Supabase RPCs. Preserve paid-gate, entitlement-version, outbox-lease, capability-expiry, provider-idempotency, and audit guarantees while remaining compatible with Vercel Free and Supabase Free.

</domain>

<decisions>
## Implementation Decisions

### Retry versus resend

- Keep Retry and Resend as separate explicit admin actions.
- Retry may reuse the same outbox row only while its bearer capability, when applicable, remains active and unexpired.
- Expired or superseded digital access must return a stale result; the admin must use Resend to create a fresh outbox intent.

### Atomic authority

- Retry accepts only the outbox identifier and an expected outbox version, locks the row, and rejects sent, cancelled, not-yet-due, stale-form, or actively leased work.
- Resend accepts only the entitlement identifier and expected entitlement version. Order, recipient, locale, paid status, and relationships are derived inside PostgreSQL.
- Resend revokes old active download tokens, advances entitlement version, and inserts the new outbox plus audit event in the same transaction.

### Retry budget and provider identity

- Preserve the outbox identifier so Resend provider idempotency remains stable for same-outbox retry.
- Do not reset historical attempt count. A manual retry grants one controlled provider attempt; another transient provider failure returns the row to failed rather than starting a fresh automatic retry budget.

### Free-tier constraints

- Use PostgreSQL row locks, constraints, and RPCs only.
- Add no Redis, paid queue, new scheduler, or external rate-limit dependency.

</decisions>

<specifics>
## Specific Ideas

- Add an outbox version column so stale admin forms are rejected without trusting timestamps serialized by the browser.
- Return safe typed statuses such as queued, stale, or invalid; never expose recipient, provider payload, token hash, or database detail.
- Prove concurrency and rollback behavior with real pgTAP tests, with focused unit and security boundary coverage for the application adapter.

</specifics>

<canonical_refs>
## Canonical References

- Quick 1 artifacts under `.planning/quick/260817-k94-*`
- Quick 3 artifacts under `.planning/quick/260826-olg-*`
- `supabase/migrations/20260817120000_repair_digital_download_token_lifecycle.sql`
- `supabase/migrations/20260826120000_atomic_transactional_email_capability_issuance.sql`

</canonical_refs>
