---
quick_id: 260727-jc0
title: Clear only successfully ordered cart quantities
status: complete
completed: 2026-07-27
implementation_commit: 58f54175
---

# Summary

Checkout now reconciles the guest cart immediately after successful order creation.

## Delivered

- Added a pure quantity-subtraction helper keyed by product and variant.
- Removed only quantities included in the final accepted quote.
- Preserved unrelated lines, inventory-capped surplus, and quantities added concurrently.
- Left the cart unchanged for stale quotes, validation failures, and failed order creation.
- Cleared persisted quote evidence before a hard handoff to the order page, avoiding a checkout requote/navigation race.
- Added unit and security boundary coverage for the completion contract.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm run test:unit` — 87 files, 740 tests passed
- `npm run test:security` — 54 tests passed
- `npm run build`
- Remote browser checkout on port 3000 created VietQR order `ATB-C0B58B2D10`, navigated to its order page, and showed cart count 0.
- Test orders `ATB-37FCB70E34` and `ATB-C0B58B2D10` were cancelled through `apply_payment_transition`; both report cancelled order and payment status.
