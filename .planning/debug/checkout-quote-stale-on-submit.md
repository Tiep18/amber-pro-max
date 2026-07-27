---
status: resolved
trigger: "Tôi vẫn bị thông báo: Báo giá đã thay đổi. Hãy xem lại tổng tiền và thử lại khi click tạo đơn."
created: 2026-07-27T13:15:27+07:00
updated: 2026-07-27T13:23:33+07:00
---

# Debug Session: Checkout Quote Stale On Submit

## Symptoms

- Expected behavior: A customer who has reviewed the current destination and totals can click Create order and proceed with the derived VietQR or PayPal flow.
- Actual behavior: Clicking Create order returns a stale-quote warning and no order is created.
- Error messages: "Báo giá đã thay đổi. Hãy xem lại tổng tiền và thử lại."
- Timeline: Still reproducible after the checkout quote-transition fix.
- Reproduction: Open checkout, complete the visible fields and destination, accept any displayed quote change, then click Create order.

## Current Focus

- hypothesis: Confirmed source divergence. Quote refresh derived intent lines from the accepted quote, while submit sent the independent raw cart lines.
- test: Completed source tracing, direct-Vietnam and Vietnam-to-international browser checkout, regression tests, and security-boundary verification.
- expecting: Refresh, saved-address requote, guest recovery, and submit all use the same accepted-quote line evidence.
- next_action: Resolved; ask the reporter to reload any checkout tab that predates this build.

## Evidence

- The Postgres `submit_checkout` boundary compares each submitted intent line's product, variant, requested quantity, and `marketAtAdd` with the accepted quote and returns `stale_commercial_quote` on any divergence.
- `requestQuote` rebuilt intent lines from `acceptedQuote.lines`, but `submitInput.lines` used `cart.lines`; Phase 9 market synchronization and long-lived tabs can make those two snapshots differ.
- The previous object/hash fix is active: a direct Vietnam checkout created pending VietQR order `ATB-6B66C0C9CF`.
- The exact Vietnam-to-Australia material-change flow also created pending PayPal order `ATB-69C7890FB6`, confirming provider selection and the shared RPC are healthy on the current build.
- Both browser test orders remain unpaid/pending; no payment confirmation, fulfillment, entitlement, or shipping transition was triggered.
- After the fix, quote refresh and submit use `quoteIntentLines(refreshedQuote)` as one canonical source.

## Eliminated

- VietQR and PayPal are not the root cause; both order-creation paths succeeded before provider payment.
- Guest recovery is not generally broken; both synthetic guest checkouts completed order creation.
- Server commercial and shipping revalidation remains authoritative and was not weakened.

## Resolution

- root_cause: Checkout had two independent commercial intent snapshots. The quote shown to the customer was refreshed from accepted quote lines, but order creation sent raw cart lines. A cart updated by market synchronization, another tab, or a prior checkout state could therefore display a current total while failing the database's exact line-evidence comparison.
- fix: Added one `quoteIntentLines` projection and use it for destination requotes, saved-address requotes, and final submit. The final RPC now receives the exact product, variant, requested quantity, and market evidence used to calculate the accepted server quote.
- files_changed:
  - `src/checkout/quote-intent.ts`
  - `src/checkout/saved-addresses.ts`
  - `src/components/checkout/checkout-page.tsx`
  - `tests/unit/checkout/quote-intent.test.ts`
  - `tests/security/checkout-boundaries.test.mjs`
- verification:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test:unit` (86 files, 734 tests)
  - `npm run test:security` (52 tests)
  - Real-browser VietQR order creation
  - Real-browser Vietnam-to-Australia quote acceptance and PayPal order creation
