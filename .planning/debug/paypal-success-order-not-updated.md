---
status: investigating
trigger: "PayPal payment succeeds in sandbox/provider logs, but order-payment-page.tsx does not update after successful account entry and payment."
created: 2026-06-17
updated: 2026-06-17
---

# Debug Session: PayPal Success Order Not Updated

## Symptoms

- Expected behavior: After PayPal payment succeeds, the order payment page should show the updated paid/confirmed state.
- Actual behavior: `order-payment-page.tsx` appears unchanged after PayPal payment success.
- External evidence: PayPal dashboard shows `Checkout order approved` and `Payment capture completed`, both success at 2026-06-17 08:30 AM.
- External IDs from screenshots:
  - PayPal order/resource ID: `3WC65849B2296793F`
  - PayPal capture/resource ID: `1UW89837H9726913E`
  - Capture webhook event ID: `WH-1PU51671AB828134G-79E27102GF8521150`
  - Approved webhook event ID: `WH-3RY71741SK645364U-45J446779D2494159`
  - PayPal API logs: `POST /v2/checkout/orders` and `POST /v2/checkout/orders/3WC65849B2296793F/capture` returned `201 OK`.
- Error messages: None reported in UI; PayPal logs show success.
- Timeline: Reproduced during manual Phase 4 PayPal UAT on 2026-06-17.
- Reproduction: Complete checkout with PayPal sandbox account, return to order payment page, observe no visible state change.

## Current Focus

- hypothesis: PayPal provider success can leave `order-payment-page.tsx` visually unchanged when the capture/webhook path returns a non-paid transition outcome while the client ignores the capture response and only performs one `router.refresh()`.
- test: Report local code flow and concrete failure points with file/function evidence.
- expecting: Final report distinguishes provider success from local `apply_payment_transition` success and identifies response/projection/polling gaps.
- next_action: Return data flow, likely failure points, and exact evidence references without editing source.

## Evidence

- timestamp: 2026-06-17
  checked: Active debug sessions and existing PayPal debug file
  found: Existing session `.planning/debug/paypal-success-order-not-updated.md` already captures the PayPal order ID `3WC65849B2296793F`, capture ID `1UW89837H9726913E`, and webhook event IDs from the user-provided screenshots.
  implication: Continue the existing debug record and focus on local code path evidence; treat IDs as data only.

- timestamp: 2026-06-17
  checked: `src/components/payments/order-payment-page.tsx`
  found: The page reads `getAuthorizedOrderPayment` once on server render, maps `paymentStatus`/`customerPaymentStatus` into the visible status, and shows PayPal only when the mapped status is `awaiting_payment` with USD.
  implication: The page changes only if the server projection returned by `get_order_payment_status` changes or the route is refreshed after that change.

- timestamp: 2026-06-17
  checked: `src/components/payments/paypal-buttons.tsx`
  found: `onApprove` posts to `/api/paypal/orders/{paypalOrderId}/capture` but ignores the response status/body, then calls `router.refresh()` once.
  implication: Any local capture result other than an already-visible DB transition can be hidden from the user; provider capture success does not guarantee a page update.

- timestamp: 2026-06-17
  checked: PayPal create and capture routes
  found: Create route stores `payments.provider_order_id` after provider create. Capture route later finds the local payment by that provider order ID, captures with PayPal, reconciles provider facts, and only then calls `applyPaymentTransition`.
  implication: A successful PayPal `/capture` log only proves provider capture happened; the page depends on reconciliation and transition applying afterward.

- timestamp: 2026-06-17
  checked: PayPal webhook route and verification
  found: Webhook route verifies signature, ignores duplicate provider event IDs, derives local order from `resource.invoice_id` and `resource.custom_id`, ignores unsupported events such as `CHECKOUT.ORDER.APPROVED`, and transitions only reconciled capture events.
  implication: PayPal dashboard can show webhook delivery success for events that intentionally do not update the order, or for ignored/unmatched capture events returned as 202/200.

- timestamp: 2026-06-17
  checked: SQL projection and transition RPC
  found: `order_payment_statuses` projects `payments.status`; `get_order_payment_status` returns that projection; `apply_payment_transition` inserts event/transition rows and updates both `payments` and `checkout_orders` only for non-stale outcomes.
  implication: If `apply_payment_transition` returns invalid/stale/error or reconciliation is rejected before calling it, the customer page can continue rendering the old pending/awaiting state.

- timestamp: 2026-06-17
  checked: Relevant tests
  found: Unit tests verify PayPal capture delegates to `applyPaymentTransition`, webhooks delegate completed captures and ignore approved events, and the PayPal button test is static source-boundary coverage rather than behavioral coverage for response handling/polling.
  implication: Existing tests protect server contracts but do not prove the browser page updates when capture returns 202/409/502 or when webhook success does not apply a transition.

- timestamp: 2026-06-17
  checked: Remote Supabase payment events for PayPal order `3WC65849B2296793F` and capture `1UW89837H9726913E`
  found: Remote DB has `PAYMENT.CAPTURE.COMPLETED`, source `paypal_recheck`, verification `verified`, amount `3650` USD minor units, and provider order `3WC65849B2296793F`.
  implication: PayPal capture reached the application and was recorded locally; this is not a missing-webhook-only failure.

- timestamp: 2026-06-17
  checked: Remote Supabase payment transition for payment `582f6cbf-5159-4bc4-a35c-e16c624d88f4`
  found: Transition `paypal-recheck:1UW89837H9726913E` has `from_status = pending`, `to_status = review_required`, `result = review_required`, `reason = late_payment_detected`, and `inventory_effect = expired`.
  implication: The local payment state did not become paid; it entered the late-payment/manual-review path.

- timestamp: 2026-06-17
  checked: Remote Supabase order projection for order `ATB-C52D9229AA`
  found: `order_payment_statuses` still projected `payment_status = pending`, `customer_payment_status = awaiting_payment`, and `fulfillment_gate_status = locked`, while the underlying checkout order had `paid_gate_status = review_required`, `payment_terminal_at` set, and `review_reason = late_payment_detected`.
  implication: The UI stayed unchanged because the customer-facing projection masked the review-required paid gate behind the stale pending payment status.

## Eliminated

- PayPal provider failure: eliminated. Screenshots show PayPal API capture and webhook delivery success.
- Missing local capture attempt: eliminated. Remote DB contains a `paypal_recheck` event and transition for the capture ID.
- Missing `provider_order_id` persistence for this run: eliminated. Remote payment row contains `provider_order_id = 3WC65849B2296793F`.

## Resolution

- Root cause: A late/review-required local payment outcome can be represented on `checkout_orders.paid_gate_status` and `review_reason` while `order_payment_statuses` still projects from `payments.status = pending`, so `order-payment-page.tsx` maps the order back to `awaiting_payment`.
- Fix implemented locally:
  - Added migration `20260617064230_fix_payment_review_projection.sql` so `order_payment_statuses` projects an effective `review_required` status when paid gate or review reason requires manual review.
  - Added TypeScript mapping defense so a review-required gate or `late_payment_detected` reason cannot render as awaiting payment.
  - Added unit and pgTAP coverage for this lagging-status case.
- Remote data was inspected but not mutated.
