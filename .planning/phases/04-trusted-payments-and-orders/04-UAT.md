---
status: testing
phase: 04-trusted-payments-and-orders
source: [04-VERIFICATION.md]
started: 2026-06-16T09:56:02Z
updated: 2026-06-16T09:56:02Z
---

## Current Test

number: 1
name: Complete a PayPal sandbox USD create/capture through a public HTTPS webhook endpoint.
expected: |
  PayPal delivers a verified webhook; the local order records exactly one paid transition,
  one inventory finalization, and no duplicate business effects after retry delivery.
awaiting: user response

## Tests

### 1. PayPal Sandbox Webhook Delivery

expected: PayPal delivers a verified webhook; the local order records exactly one paid transition, one inventory finalization, and no duplicate business effects after retry delivery.
result: [pending]

### 2. VietQR Seller Bank Evidence

expected: Customer instructions show the approved bank/account, exact VND amount, immutable order reference, and deadline; admin confirm accepts exact evidence and reject handles mismatch with audit and inventory release.
result: [pending]

### 3. Managed Supabase Cron Dashboard

expected: The payment-expiry job is scheduled or an operational blocker is recorded; direct deadline checks and expire RPC remain available as correctness fallback.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
