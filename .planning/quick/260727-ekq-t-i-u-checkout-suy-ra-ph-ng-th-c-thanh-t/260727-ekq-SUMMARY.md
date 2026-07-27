---
quick_id: 260727-ekq
status: human_needed
completed_at: '2026-07-27T10:45:23+07:00'
commits:
  - 4ed7e9c7
---

# Quick task 260727-ekq summary

## Outcome

Checkout now derives exactly one v1 payment method from the accepted quote: Vietnam/VND uses VietQR and international/USD uses PayPal. The customer no longer sees or controls an invalid cross-market payment choice. Client submission and guest recovery use the derived value, while the server action canonicalizes it again and the lower checkout/database boundaries continue rejecting forged invalid pairs.

For physical carts, a committed shipping destination is now the market authority. If Phase 9 storefront context changes later, checkout requotes the latest cart against that destination through the existing latest-request-wins lifecycle instead of replacing the accepted destination quote with a browsing-market quote. Currency, totals, shipping, and payment therefore converge as one accepted snapshot.

Retry idempotency is stable per accepted quote and uses an opaque UUID. Customer email is no longer embedded in the idempotency key.

## UI/UX changes

- Replaced the two-button payment selector with one localized, non-interactive payment summary.
- Kept the selected method synchronized with the quote rather than asking customers to resolve a business rule.
- Added an accessible live-region boundary for payment-method changes.
- Preserved entered contact/address state during upstream market changes and required normal material-change acceptance when commercial facts change.

## Implementation commit

- `4ed7e9c7` aligns payment derivation, server canonicalization, destination authority, retry privacy, and checkout regression coverage.

## Verification

- ESLint: passed.
- TypeScript: passed.
- Full Vitest suite: 84 files / 727 tests passed.
- Security suite: 50 / 50 tests passed.
- Focused checkout unit suite: 4 files / 48 tests passed.
- `git diff --check`: passed.
- Focused checkout Playwright specs were attempted in an isolated worktree. The application server started, but all selected cases stopped during fixture/data loading with `ECONNREFUSED 127.0.0.1:55431` because Docker Desktop and local Supabase were unavailable; no checkout assertion failed.

## Human action remaining

Start Docker Desktop, run `npm run db:reset`, then run:

`npx playwright test tests/e2e/checkout.spec.ts tests/e2e/checkout-market-change.spec.ts --project=chromium`

The implementation is complete at source level. The quick task remains `human_needed` only for the environment-backed browser confirmation.
