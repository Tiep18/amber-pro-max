---
quick_id: 260714-kzt
status: passed
verified_at: 2026-07-14T15:49:00+07:00
commits:
  - 5abf9b4b
  - 2d06db21
  - a1f123d8
  - 68d700c0
---

# Verification: Checkout shipping submit hardening

## Verdict

Passed. All checkout and shipping must-haves are implemented and verified.

## Must-have results

- PASS: Database-owned catalog, discount, shipping, arithmetic, and canonical snapshots reach immutable orders and payments.
- PASS: Tampered totals and stale price, discount, or shipping attempts create no order graph.
- PASS: Retrying a physical checkout returns the same order without duplicate lines, reservations, payments, or shipping allocations.
- PASS: A non-US free-form region remains in the address snapshot and is normalized to `null` before the US-only resolver.
- PASS: Both per-line shipping allocation representations match and sum exactly to order shipping.
- PASS: PayPal and VietQR continue to use database-owned order totals and currency.
- PASS: Finding 4 remains deferred; highest-first-once package grouping is unchanged.

## Evidence

- Database reset and migration application passed.
- Database suite passed: 27 files, 691 assertions.
- Hardening pgTAP passed all 35 assertions.
- Checkout/payment unit suite passed: 127 tests.
- Checkout security, application-schema database lint, ESLint, TypeScript, and production build passed.
- Generated Supabase types match the local schema exactly: 3,984 lines, zero drift.

## Non-task baseline

The full security script retains two pre-existing catalog/newsletter source-regex failures unrelated to these checkout commits. Unscoped database lint reports only pgTAP extension diagnostics; the `private` and `public` application schemas are clean.
