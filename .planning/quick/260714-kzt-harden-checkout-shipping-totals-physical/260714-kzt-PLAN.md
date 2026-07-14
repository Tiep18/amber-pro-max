---
quick_id: 260714-kzt
status: complete
created_at: '2026-07-14T15:00:00+07:00'
description: Harden checkout shipping totals, physical-submit idempotency, non-US regions, and per-line allocation evidence
must_haves:
  truths:
    - Checkout order prices, subtotal, discount, shipping, and total are recomputed or fully verified from current database facts inside the submit transaction; a caller cannot lower the payable amount by editing acceptedQuote or its hash.
    - A stale price, discount, availability, or shipping configuration produces a stable stale response before an order or payment row is created.
    - Repeating a physical checkout with the same actor and idempotency key returns the original order without creating another reservation or shipping-allocation snapshot.
    - Free-form region text for a non-US address remains in the immutable address snapshot but is always normalized to null before entering the US-only shipping-adjustment resolver.
    - checkout_order_lines.shipping_allocation_minor equals the matching v2 per-line allocated_shipping_minor, and both per-line representations sum exactly to checkout_orders.shipping_minor.
    - Existing PayPal and VietQR handoff continues to use the database-owned checkout_orders.total_minor and currency_code.
    - The highest-first-once package-grouping algorithm is unchanged and explicitly deferred from this quick task.
  artifacts:
    - supabase/migrations/20260714150000_harden_checkout_submit_authority.sql
    - supabase/tests/database/08_checkout_shipping_submit_hardening.test.sql
    - src/checkout/shipping-address.ts
    - src/checkout/quote.ts
    - src/checkout/saved-addresses.ts
    - src/checkout/quote-lifecycle.ts
    - src/types/supabase.ts
    - tests/unit/checkout/shipping-address-ui.test.ts
    - tests/unit/checkout/saved-addresses.test.ts
    - tests/unit/checkout/quote-lifecycle.test.ts
    - tests/unit/checkout/submit-checkout.test.ts
    - tests/security/checkout-boundaries.test.mjs
  key_links:
    - Browser cart intent supplies only product, variant, quantity, destination, and discount intent; the submit RPC resolves current catalog offers, discount eligibility, shipping rules, arithmetic, and immutable snapshots transactionally.
    - The public submit function performs its actor/idempotency lookup before snapshot insertion and delegates new-order persistence only once.
    - The same country-aware region normalizer feeds manual quote refresh, saved-address refresh, lifecycle comparison, and final database shipping resolution.
    - Authoritative v2 allocations feed both checkout_order_lines.shipping_allocation_minor and checkout_order_shipping_allocations in the same transaction.
    - Payment creation reads the authoritative checkout_orders.total_minor produced by the hardened submit boundary; no client amount is introduced into payment handoff.
---

# Quick Task 260714-kzt: Harden checkout shipping totals and physical submit

## Task 1 - Lock regression contracts before changing checkout behavior

**Files**

- `supabase/tests/database/08_checkout_shipping_submit_hardening.test.sql`
- `tests/unit/checkout/shipping-address-ui.test.ts`
- `tests/unit/checkout/saved-addresses.test.ts`
- `tests/unit/checkout/quote-lifecycle.test.ts`
- `tests/unit/checkout/submit-checkout.test.ts`
- `tests/security/checkout-boundaries.test.mjs`

**Action**

- Add database fixtures for a published product/variant, current market offer, physical inventory, discount rule, shipping profile/rule, and two physical lines so submit behavior is exercised against real authoritative tables rather than source-string assertions.
- Prove a payload that keeps matching shipping evidence but tampers `unitPriceMinor`, line subtotal, discount amount/allocation, subtotal, or `totalMinor` cannot create a cheaper order. Assert the RPC returns a stable stale/invalid commercial-quote code, creates no order/payment/reservation rows for the rejected attempt, and accepts the untouched quote.
- Prove a current quote becomes stale after a catalog price or applicable discount rule changes, while an untouched accepted quote persists arithmetic satisfying `total = subtotal - discount + shipping`.
- Submit the same successful physical payload twice with one actor/idempotency key. Assert the same order id/number is returned and counts for order lines, inventory reservations, payment rows, and shipping allocation snapshots remain unchanged on retry.
- Cover a non-US manual and saved address with a long free-form region such as `Ho Chi Minh City`: the address snapshot retains the text, quote and submit both send `null` to the shipping adjustment resolver, and checkout succeeds on a country rule. Retain strict two-letter controlled-region coverage for US addresses.
- For a two-line physical order, assert every `checkout_order_lines.shipping_allocation_minor` equals its `checkout_order_shipping_allocations.allocated_shipping_minor`, digital lines remain zero, and both sums equal `checkout_orders.shipping_minor`.
- Strengthen the static security contract so anon/authenticated callers can execute only the public submit RPC and cannot invoke any new private commercial resolver or persistence helper directly.

**Verify**

- Run the new pgTAP file and confirm its new assertions fail against `20260712080300_checkout_shipping_quote_snapshot.sql` for tampered totals, physical retry, non-US long region, and legacy per-line allocation.
- `npm run test:unit -- tests/unit/checkout/shipping-address-ui.test.ts tests/unit/checkout/saved-addresses.test.ts tests/unit/checkout/quote-lifecycle.test.ts tests/unit/checkout/submit-checkout.test.ts`
- `node --test tests/security/checkout-boundaries.test.mjs`

**Done**

- Each reported risk has a behavioral regression test at the boundary where it can cause data or payment corruption, and failures are observed before implementation.

## Task 2 - Make checkout submit authoritative, atomic, and retry-safe

**Files**

- `supabase/migrations/20260714150000_harden_checkout_submit_authority.sql`
- `src/types/supabase.ts`

**Action**

- Add a forward-only migration; do not rewrite historical migrations. Replace the public wrapper/legacy split with a single authoritative transaction boundary plus narrowly scoped private helpers as needed. Revoke `PUBLIC`, `anon`, and `authenticated` execution from every private/helper function and grant browser roles only the public `submit_checkout(jsonb)` entry point.
- Derive the idempotency actor with the existing signed-in/guest rule and check `(idempotency_actor, idempotency_key)` before commercial or shipping snapshot insertion. Return the existing order handoff for a retry; preserve the current guest-token rule and handle the unique-race path without attempting duplicate allocation inserts.
- Treat `p_payload.lines`, market/locale, destination, discount code, and exception grant as intent only. Resolve current published product/variant availability and effective `product_market_offers` / `variant_market_offers` prices under the submit transaction, validate market/currency/payment intent, recalculate integer line subtotals, and reject mismatches with a stable stale result. Do not use acceptedQuote price, subtotal, discount, shipping, or total as persisted values.
- Revalidate the discount at submit time from `discount_codes` and its customer/product/category/collection scopes, dates, market/currency, minimum subtotal, and usage limit; calculate deterministic per-line allocations using the same rounding/remainder rules as `src/checkout/discounts.ts`. Preserve the existing exception-grant scope/consumption and inventory locking/reservation behavior.
- Resolve shipping again from physical authoritative line identities/quantities. Pass a region only when the normalized country is `US`; otherwise pass `null` while persisting the original validated address region. Compare the accepted quote's material commercial and shipping evidence with the authoritative result so price/discount/config changes return stale before persistence.
- Build and persist a server-owned canonical `quote_snapshot`, order arithmetic, and line snapshots. Feed each v2 shipping allocation into both immutable stores at insert time: `checkout_order_lines.shipping_allocation_minor` and `checkout_order_shipping_allocations.allocated_shipping_minor`. Do not update immutable lines after insertion.
- Add/validate database invariants for `discount_minor <= subtotal_minor`, `total_minor = subtotal_minor - discount_minor + shipping_minor`, and per-order allocation sums. Use a migration-safe validation/preflight for existing rows and fail loudly if historical data violates the new constraint rather than silently rewriting order evidence.
- Keep payment handoff compatible: `checkout_orders.total_minor`, `currency_code`, order id/number, reservation expiry, the payment row trigger/function, and the submit result shape remain unchanged. Regenerate `src/types/supabase.ts` after the migration.

**Verify**

- `npm run db:reset`
- `npm run db:lint`
- `npm run db:test`
- Query the new fixture order and verify order arithmetic, line arithmetic, shipping allocation equality/sums, one payment row, and one reservation set.
- `npm run typecheck`

**Done**

- Only database-resolved commercial and shipping facts reach immutable orders and payments; stale/tampered requests create nothing; retries return the original physical order without duplicating dependent rows.

## Task 3 - Align all region callers and run the checkout/payment regression gate

**Files**

- `src/checkout/shipping-address.ts`
- `src/checkout/quote.ts`
- `src/checkout/saved-addresses.ts`
- `src/checkout/quote-lifecycle.ts`
- `tests/unit/checkout/shipping-address-ui.test.ts`
- `tests/unit/checkout/saved-addresses.test.ts`
- `tests/unit/checkout/quote-lifecycle.test.ts`
- `tests/unit/checkout/submit-checkout.test.ts`
- `tests/security/checkout-boundaries.test.mjs`

**Action**

- Introduce one pure country-aware resolver-region helper: normalize a valid US subdivision to its controlled two-letter code and return `null` for every non-US country. Keep `shippingAddress.region` unchanged so free-form international administrative-area text is not lost from fulfillment data.
- Use the helper in manual quote input, saved-address quote refresh, quote lifecycle destination comparison/readiness, and final quote RPC arguments. Ensure manual and saved-address paths produce identical `{countryCode, regionCode}` resolver intent and that moving away from US clears US adjustment state without treating a non-US free-form region as quote material.
- Keep final address validation unchanged in intent: US requires a canonical state/territory and postal code; non-US may retain optional free-form region/postal values. Do not broaden database region-adjustment behavior beyond US in this task.
- Run the complete checkout, shipping, security, and payment handoff regression suite. Confirm PayPal still creates from the local authoritative USD order total and VietQR still displays/settles the authoritative VND order total.

**Verify**

- `npm run test:unit -- tests/unit/checkout tests/unit/payments/paypal-client.test.ts tests/unit/payments/vietqr.test.ts`
- `npm run test:security`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run db:test`

**Done**

- Quote and submit agree for US and non-US regions, all four risk regressions pass, and downstream payment providers receive only the authoritative order total.

## Boundaries

- Defer finding 4: do not change D-14/D-15, the single combined physical shipping group, winner selection, or highest-first-once/additional-item package algorithm.
- Do not change shipping profile precedence, exact-country/fallback selection, region surcharge/replace formulas, payment provider state machines, reservation durations, or guest-checkout ownership semantics.
- Do not trust a new client-side signature/hash as a substitute for database re-resolution.
- Do not mutate historical order evidence to make new constraints pass; surface any pre-existing inconsistency for an explicit follow-up decision.
- Preserve the user's existing `.gitignore` modification and exclude it from every task commit.
