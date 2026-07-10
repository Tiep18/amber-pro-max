---
status: in-progress
created: 2026-07-10
---

# Account Orders Polish

## Goal

Refine the account order history page so it matches the lighter account overview direction while preserving authenticated order visibility, customer order query behavior, localized routes, and order detail links.

## Scope

- Replace the dashboard-like card wrapper with a lighter customer-facing order history layout.
- Present order rows like compact receipts with clearer total, payment status, and digital/physical fulfillment status.
- Make empty and error states lighter without changing behavior.
- Avoid form/action changes; this page is read-only apart from navigation links.

## Verification

- Typecheck.
- Lint.
- Route guard smoke for unauthenticated account orders.

## Progress

- [x] Created quick task context.
- [x] Refine order history UI.
- [x] Run verification.
