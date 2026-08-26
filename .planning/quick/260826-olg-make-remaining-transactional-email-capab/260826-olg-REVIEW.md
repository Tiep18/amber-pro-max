---
quick_id: 260826-olg
reviewed: 2026-08-26T18:03:01+07:00
status: passed
blocking_findings: 0
advisory_findings: 0
fixed_findings: 1
---

# Quick 260826-olg Code Review

## Result

**PASS — no unresolved correctness, security, or maintainability findings.**

## Scope reviewed

- Atomic capability migration and generated Supabase RPC type.
- Guest/newsletter repository issuance and canonical expiry handling.
- Token-secret readiness in environment and batch boundaries.
- Provider retry and pgTAP regression coverage.
- Free-tier deployment and secret-rotation documentation.

## Security and correctness checks

- The RPC accepts only source outbox ID and a lowercase SHA-256 hash; table, email, purpose, and expiry are derived from authoritative rows.
- `security definer` uses an empty search path and execute is granted only to `service_role`.
- The source outbox row is locked before reuse/insert, so concurrent or repeated calls serialize behind one capability identity.
- Guest ownership and recipient identity are verified from `checkout_orders`; newsletter identity must exist in subscriber state.
- Existing mismatched, consumed, inactive, expired, or unsupported issuance fails closed.
- Raw bearer values remain transient and never cross the RPC or durable persistence boundary.
- Missing, short, or whitespace-padded signing secrets are rejected before `claimDueRows` at both environment and pure batch boundaries.
- Quick 1 digital issuance and Quick 2 newsletter token normalization remain intact.

## Finding resolved during review

### [P2] Rotation runbook did not fully stop immediate triggers — fixed

Pausing Supabase Cron alone would not stop checkout/payment/newsletter immediate triggers. The runbook now requires a short producer maintenance window, provides a query for all tokenized pending/sending event classes, drains with the current secret, and resumes traffic only after the new Vercel secret is deployed.

## Remaining findings

None.
