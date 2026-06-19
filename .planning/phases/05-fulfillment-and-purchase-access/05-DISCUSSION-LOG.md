# Phase 5: Fulfillment and Purchase Access - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-19
**Phase:** 5-Fulfillment and Purchase Access
**Areas discussed:** PDF access, Guest access, Email outbox, Physical fulfillment

---

## PDF Access

| Question | Option | Description | Selected |
|----------|--------|-------------|----------|
| Entitlement level | Per order line | Each paid digital line creates its own entitlement for mixed-order clarity and audit. | yes |
| Entitlement level | Per product | Simpler, but weaker for file/version history and per-purchase audit. | |
| Entitlement level | Agent decides | Planner chooses while preserving the paid gate. | |
| Pattern library display | Group by pattern, keep purchase history | Customer library stays clean while entitlement/order history remains auditable. | yes |
| Pattern library display | Show every purchase separately | Clear to the customer, but cluttered for duplicate purchases. | |
| Pattern library display | Agent decides | Planner chooses the cleanest UX while preserving audit. | |
| Email link lifetime | 24 hours | Convenient across time zones while still short-lived. | yes |
| Email link lifetime | 1 hour | Tighter security, but easier to miss. | |
| Email link lifetime | 7 days | Convenient, but broader than preferred short-lived access. | |
| Expired link regeneration | Order/library page | User requests a fresh link after entitlement validation. | yes |
| Expired link regeneration | Expired link self-resend | Convenient for guests, but requires more anti-abuse handling. | |
| Expired link regeneration | Admin-only resend | Controlled but too manual for normal customer access. | |

**User's choice:** Per-order-line entitlements, grouped pattern library, 24-hour email links, and entitlement-checked regeneration from order/library pages.
**Notes:** Digital links must stay short-lived and private; no public PDF URLs or email attachments.

---

## Guest Access

| Question | Option | Description | Selected |
|----------|--------|-------------|----------|
| Guest reopen method | Email magic token | Fits guest checkout and validates email/order access before fresh download links. | yes |
| Guest reopen method | Order number + email form | Less dependent on link email, but needs stronger anti-enumeration controls. | |
| Guest reopen method | Checkout cookie only | Simple but not durable across devices or lost cookies. | |
| Magic token lifetime | 24 hours | Matches download-link lifetime and remains short-lived. | yes |
| Magic token lifetime | 15 minutes | Stronger security but likely too short. | |
| Magic token lifetime | 7 days | Convenient but too broad for order/download access. | |
| Claim verification | Signed in with same email + email token | Proves both account and email control. | yes |
| Claim verification | Signed in with same email only | Smoother but weaker for edge cases. | |
| Claim verification | Admin-only claim | Safe but too manual for self-service. | |
| Old token after claim | Revoke old guest tokens | Long-term access moves to the account and guest surface shrinks. | yes |
| Old token after claim | Keep until expiry | Less disruptive, but leaves parallel access paths. | |
| Old token after claim | Agent decides | Planner chooses while preventing cross-user leakage. | |

**User's choice:** Guest reopen uses a 24-hour email magic token; claim requires same account email plus token; guest tokens are revoked after claim.
**Notes:** Long-term access should flow through signed-in account ownership after claim.

---

## Email Outbox

| Question | Option | Description | Selected |
|----------|--------|-------------|----------|
| Email request timing | Same fulfillment/entitlement transaction | Durable request is written with fulfillment work; sending happens later. | yes |
| Email request timing | Send directly in paid transition | Simpler, but provider failures can interfere with paid transition reliability. | |
| Email request timing | Cron scans paid orders | Works after the fact but weakens explicit audit of email intent. | |
| Failure retry | Automatic backoff + admin visibility | Handles transient failures while keeping admin in control. | yes |
| Failure retry | Admin-only retry | Controlled but too manual for transient failures. | |
| Failure retry | Fixed retries then give up | Too weak for OPS-01/OPS-02. | |
| Download resend | New email with new token/link | Avoids stale link reuse and creates a clear audit trail. | yes |
| Download resend | Reuse link if still valid | Fewer records, but less clear audit and lifecycle. | |
| Download resend | Agent decides | Planner chooses while avoiding expired or public links. | |
| Failed email UI | Compact queue in admin orders/ops | Shows order, email type, attempts, sanitized error, next retry, and retry/resend. | yes |
| Failed email UI | Full dedicated email dashboard | Powerful but beyond Phase 5 MVP. | |
| Failed email UI | Order-detail only | Contextual, but hard to manage many failures. | |

**User's choice:** Durable transactional outbox, automatic backoff retry, fresh tokens on resend, and compact failed-email queue.
**Notes:** Errors shown to admin must be sanitized.

---

## Physical Fulfillment

| Question | Option | Description | Selected |
|----------|--------|-------------|----------|
| Physical status flow | Awaiting -> Packing -> Shipped -> Delivered | Clear enough for handmade/manual shipping without overbuilding v1. | yes |
| Physical status flow | Awaiting -> Shipped -> Delivered | Simpler, but misses preparation state. | |
| Physical status flow | More detailed states | More complete, but likely beyond MVP. | |
| Tracking requirement | Carrier + tracking optional but encouraged | Realistic for manual shipping; does not block shipment without tracking. | yes |
| Tracking requirement | Carrier + tracking required | Clearer for customers, but may block valid shipments. | |
| Tracking requirement | Freeform note only | Flexible but less professional. | |
| Mixed order status | Separate digital ready / physical in progress | Avoids implying the whole order is complete when only PDF is ready. | yes |
| Mixed order status | One combined status | Simpler, but risks conflating workflows. | |
| Mixed order status | Agent decides | Planner chooses while preserving separation. | |
| Shipping emails | Shipped required, delivered optional | Sends the most important customer update and avoids notification noise. | yes |
| Shipping emails | Every status change | Transparent but may spam customers. | |
| Shipping emails | No shipping email in Phase 5 | Too weak for FUL-03. | |

**User's choice:** Manual physical flow `awaiting -> packing -> shipped -> delivered`, optional tracking, split mixed-order status, and shipped email required with delivered email optional.
**Notes:** Physical fulfillment remains independent from completed digital delivery.

---

## the agent's Discretion

- Exact enum/table/function names, rate limits, token storage details, and UI copy may be selected during planning as long as the locked decisions are preserved.

## Deferred Ideas

None.
