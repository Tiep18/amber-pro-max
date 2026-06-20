---
status: in-progress
created: 2026-06-20
---

# Immediate Paid Email Trigger

## Goal

Trigger the transactional email outbox immediately after a verified paid transition so successful customers are not dependent on the hosted scheduler interval.

## Scope

- Keep the durable database outbox as the source of email work.
- Keep the hosted scheduler/worker route as fallback retry infrastructure.
- Add a server-only best-effort worker kick after paid transitions complete.
- Cover PayPal capture, verified PayPal webhook, and VietQR admin confirmation.
- Do not let email worker errors roll back or mask successful payment confirmation.

## Verification

- Add focused unit tests for immediate kick behavior.
- Run fulfillment/payment unit tests and core static checks.
