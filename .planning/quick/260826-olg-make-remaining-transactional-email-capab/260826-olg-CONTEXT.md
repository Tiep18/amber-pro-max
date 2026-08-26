# Quick Task 260826-olg: Atomic transactional email capability preparation - Context

**Gathered:** 2026-08-26
**Status:** Ready for planning

<domain>
## Task Boundary

Make the remaining guest-order and newsletter transactional-email capability preparation atomic and retry-safe. Preserve the digital token issuance RPC delivered by Quick 1 and the newsletter raw-token contract delivered by Quick 2. Keep the solution compatible with Vercel Free and Supabase Free.

</domain>

<decisions>
## Implementation Decisions

### Capability issuance

- Replace the guest and newsletter PostgREST select-insert-reread paths with narrow `security definer` Supabase RPC issuance keyed by `source_email_outbox_id`.
- Perform identity and expiry checks using PostgreSQL values and timestamp semantics, returning the canonical database expiry to the application.
- Do not redesign or duplicate the digital issuance RPC completed in Quick 1.

### Worker readiness

- A transactional-email worker is ready only when the Resend configuration and a strong `TRANSACTIONAL_EMAIL_TOKEN_SECRET` are present.
- Reject missing, short, or whitespace-padded token secrets before claiming any outbox rows.

### Secret rotation

- Use a pause, drain, rotate, resume runbook.
- Do not add dual-secret or versioned-secret storage. Existing delivered links remain redeemable because redemption checks the stored token hash.

### Free-tier constraints

- Add no paid queue, external scheduler, or additional infrastructure.
- Reuse the current Vercel route, Supabase Cron/RPC, and bounded batch processing.

</decisions>

<specifics>
## Specific Ideas

- Add unit coverage for readiness and repository RPC mapping.
- Add real pgTAP/database coverage for idempotent retry issuance and absence of duplicate capability rows.
- Document operational secret rotation alongside transactional-email setup.

</specifics>

<canonical_refs>

## Canonical References

- `docs/superpowers/specs/2026-08-12-transactional-email-retry-token-design.md`
- Quick 1 artifacts under `.planning/quick/260817-k94-*`
- Quick 2 artifacts under `.planning/quick/260826-ne8-*`

</canonical_refs>
