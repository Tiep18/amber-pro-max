---
status: complete
completed: 2026-07-10
---

# Account Orders Polish Summary

## Completed

- Replaced the dashboard-like order history card with a lighter customer-facing section.
- Reworked order items into compact receipt rows with payment status, localized date, digital/physical fulfillment states, total, and open affordance.
- Made the empty state lighter while preserving the shop CTA.
- Polished the route error alert without changing query or auth behavior.
- Preserved authenticated order visibility, customer order query behavior, localized routes, and order detail links.

## Verification

- `npm run typecheck` passed.
- `npm run lint` passed.
- Unauthenticated `/en/account/orders` still redirects to sign-in.

## Notes

- No forms or submit actions were changed.
