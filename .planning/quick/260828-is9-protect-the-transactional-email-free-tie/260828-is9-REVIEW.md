---
status: passed
quick_id: 260828-is9
reviewed_at: 2026-08-28
implementation_commit: b932cd52
---

# Quick 260828-is9 Code Review

## Verdict

PASS — no correctness, security, or free-tier-blocking findings remain.

## Reviewed Boundaries

- HMAC identities are derived only in server code from a validated server-only secret with separate target, IP, and consent-user-agent domains.
- Anonymous and authenticated roles cannot execute quota-authoritative subscribe/recovery RPCs or inspect private counter state.
- PostgreSQL serializes IP and target counters before authoritative subscriber/order lookup and outbox insertion.
- Unknown, mismatched, throttled, and configuration-failed guest requests keep the same public `sent` result.
- Existing newsletter subscription is a true no-op: no preference rewrite, consent event, outbox row, or worker trigger.
- Counter arrays are bounded to twenty entries, expired rows are indexed, and each request prunes at most fifty expired identities.
- Claim priority puts payment first, granted/reissued downloads second, other transactional events third, and newsletter last with FIFO tie-breaking.

## Accepted Tradeoffs

- Sustained payment/download backlog may delay newsletter delivery. This is intentional quota protection; newsletter is the only lowest-priority class.
- Rotating `TRANSACTIONAL_EMAIL_TOKEN_SECRET` changes rate-limit identities and effectively resets active counters. Domain separation prevents cross-purpose token reuse, and the existing rotation runbook already treats this secret as coordinated operational state.
- The protection is scoped to provider-email quota and PostgreSQL mutation load. It does not claim to replace platform-level DDoS protection.
