---
quick_id: 260727-ekq
status: human_needed
verified_at: '2026-07-27T10:45:23+07:00'
verified_commits:
  - 4ed7e9c7
---

# Verification: checkout payment and destination authority

## Result

`human_needed`

All source-level must-haves pass static, unit, and security gates. Final browser confirmation is blocked only because the required local Supabase service is offline and Docker Desktop is not running.

## Must-have assessment

| Must-have | Status | Evidence |
| --- | --- | --- |
| One payment method derived from accepted market/currency | Satisfied | `checkoutPaymentIntentFor` accepts only `vn/VND` and `intl/USD`; the UI renders a summary instead of selectable methods. |
| Server does not trust a browser-selected payment method | Satisfied | Both guest recovery and checkout server actions replace the submitted intent with the canonical value from the accepted quote before reaching the lower boundary. |
| Forged invalid pairs remain fail-closed | Satisfied | Existing submit and database constraints remain in place; the checkout security suite explicitly checks exact payment pairs before persistence. |
| Shipping destination remains market authority | Satisfied | A committed physical destination triggers a fresh destination-aware quote when upstream cart context changes; stale responses remain governed by latest-request-wins. |
| Phase 9 context changes do not overwrite checkout destination | Satisfied in source | The browser regression changes the real header market after a Vietnam destination and asserts that destination/payment remain Vietnam/VietQR. |
| Retry identifier contains no customer email | Satisfied | The client stores an opaque `crypto.randomUUID()` key per accepted quote snapshot. |
| Accessible automatic payment presentation | Satisfied | The payment summary is non-interactive, localized, labelled by the section heading, and announced with `aria-live="polite"`. |
| Automated regression gates | Partial due environment | Lint, typecheck, 727 unit tests, and 50 security tests pass; Playwright could not reach local Supabase fixtures. |

## Verification gates

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test:unit`: passed, 84 files / 727 tests.
- Focused checkout Vitest: passed, 4 files / 48 tests.
- `npm run test:security`: passed, 50 / 50 tests.
- `git diff --check`: passed.
- Focused Playwright: attempted in an isolated worktree; Next.js started successfully, then fixture/data requests failed with `ECONNREFUSED 127.0.0.1:55431` before application assertions.
- Supabase health probe: unavailable.
- Docker probe: Docker Desktop Linux engine pipe was absent.

## Required environment rerun

With Docker Desktop running:

1. Run `npm run db:reset`.
2. Run `npx playwright test tests/e2e/checkout.spec.ts tests/e2e/checkout-market-change.spec.ts --project=chromium`.
3. Confirm the four selected checkout cases pass.

Until that environment-backed journey runs, verification remains `human_needed` rather than `passed`.
