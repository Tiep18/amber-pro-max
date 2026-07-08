---
status: in_progress
created_at: 2026-07-08
---

# Quick Task 260708-ops: Operational Error Checkout Instrumentation

## Goal

Connect the existing operational error queue to the highest-leverage user-facing failure path: checkout quote and checkout submit failures. Preserve the existing user-safe error codes while returning an optional `errorId` that can be shown or reported later.

## Scope

- Add a safe operational failure helper around `recordOperationalError`.
- Instrument `refreshCheckoutQuoteAction` and `submitCheckoutAction`.
- Add unit coverage proving failures are recorded and returned with an `errorId`.
- Do not redesign the admin operations UI in this task.
- Do not touch unrelated dirty worktree changes such as `next-env.d.ts`.

## Verification

- `npm run test:unit -- tests/unit/operations/recording.test.ts tests/unit/checkout/actions.test.ts`
- `npm run typecheck`

## Follow-Up Candidates

- Route PayPal logging through the same helper.
- Add Next.js `error.tsx` / `global-error.tsx` reference-id fallback.
- Add dedupe/fingerprint support to `operational_errors`.
