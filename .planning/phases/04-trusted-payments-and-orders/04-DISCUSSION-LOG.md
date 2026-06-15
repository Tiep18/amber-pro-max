# Phase 4: Trusted Payments and Orders - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-15
**Phase:** 4-Trusted Payments and Orders
**Areas discussed:** Payment lifecycle and state display, PayPal webhook/callback and VietQR admin confirmation, Inventory finalization/release and audit trail

---

## Payment Lifecycle and State Display

| Option | Description | Selected |
|--------|-------------|----------|
| Payment as source of truth | Payment records/events drive paid transitions. | yes |
| Order status as source of truth | Update order status directly. | |
| Separate payment plus summary order status | Keep both, with order status derived/summarized. | |

**User's choice:** Payment record/event is the source of truth for paid transition.
**Notes:** Customer-facing status remains simple while admin gets provider/audit/deadline/event detail. Refund states are modeled/displayed, but full refund workflow is deferred. Fulfillment is gated but not created in Phase 4. Expired, failed, cancelled, or rejected orders are terminal for that order and require a fresh checkout/order.

---

## PayPal Webhook/Callback and VietQR Admin Confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| Webhook primary | PayPal webhook is the primary paid confirmation; return/capture only shows pending or triggers recheck. | yes |
| Capture primary | Server capture after approval is primary, webhook reconciles. | |
| Shared capture/webhook confirmation | Both can confirm through one idempotent command. | |

**User's choice:** PayPal webhook is the primary paid confirmation path.
**Notes:** PayPal return before webhook confirmation shows a verifying-payment state. PayPal paid requires signature/authenticity, provider order mapping, merchant/receiver, amount, currency, and dedupe validation. VietQR is manual: customer transfers by bank app, admin checks the bank account, then confirms or rejects in admin. VietQR confirmation stores reference, amount, received date/time, with note/screenshot optional. Wrong amount/reference is rejected and releases inventory. All provider/admin transitions use one idempotent state-machine command.

---

## Inventory Finalization/Release and Audit Trail

| Option | Description | Selected |
|--------|-------------|----------|
| Finalize reservation exactly once | Paid consumes/finalizes reservation and permanently reflects sold stock. | yes |
| Mark reservation paid only | Do not permanently decrement stock yet. | |
| Delete reservation after paid | Remove reservation row after payment. | |

**User's choice:** Paid finalizes/consumes reservation exactly once and duplicate paid events cannot decrement stock again.
**Notes:** Failed, cancelled, rejected, and expired reservations become released/expired and stay in the database for audit. Audit trail focuses on money, stock, and paid-gate transitions rather than every view/click. Admin order detail should show a timeline with payment, inventory, audit actor/source, amount/reference, customer email, and immutable line snapshots.

---

## the agent's Discretion

- Exact enum/status names, bilingual UI copy, and admin timeline layout may be chosen during planning if they preserve the locked behavior.

## Deferred Ideas

- Full refund initiation workflow is deferred; Phase 4 only models and displays refund states.
