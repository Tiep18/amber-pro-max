---
phase: 10-checkout-and-payment-ux-stabilization-for-vietnamese-and-int
plan: "05"
subsystem: payment-status-recovery
tags: [payments, recovery, polling, i18n, security, tdd]

# Dependency graph
requires:
  - phase: 10-checkout-and-payment-ux-stabilization-for-vietnamese-and-int
    provides: Plan 10-03 bounded payment messages and Plan 10-04 authorized order/support seam
  - phase: 04-trusted-payments-and-orders
    provides: Authorized order projection, immutable order snapshots, reservation facts, and verified-paid authority
provides:
  - Server-fact payment presentation with one dominant next action and pending-only deadline ownership
  - Terminal restore-to-cart recovery with localized catalog fallback and no same-order retry
  - Absolute cooldown and polling windows with visible-tab scheduling and one localized stop announcement
affects: [10-07-regression-uat, payments, order-recovery, cart, localization]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pure server-projection presentation models decide status hierarchy without granting client authority
    - Terminal recovery restores immutable local intent through existing cart authority and always creates a future new order
    - Recheck scheduling derives every render from absolute timestamps and pauses network work while hidden

key-files:
  created:
    - src/payments/order-recovery.ts
    - src/payments/recheck-model.ts
    - tests/unit/payments/order-recovery.test.ts
    - tests/unit/payments/recheck-model.test.ts
  modified:
    - src/payments/status.ts
    - src/payments/format.ts
    - src/components/payments/order-payment-page.tsx
    - src/components/payments/payment-state-panel.tsx
    - src/components/payments/payment-status-recheck.tsx
    - src/components/payments/order-recovery-banner.tsx
    - tests/unit/payments/status-mapping.test.ts
    - tests/unit/payments/format.test.ts
    - tests/security/payment-boundaries.test.mjs

key-decisions:
  - "Payment presentation models next action and deadline visibility from authorized server facts without granting payment, inventory, reservation, or entitlement authority to the client."
  - "Terminal recovery restores an eligible immutable snapshot through cart authority or routes to the localized catalog; it never retries or mutates the same order."
  - "Recheck cooldowns and polling retain one absolute deadline, and customer-visible timestamps use an explicit validated store timezone with Asia/Ho_Chi_Minh fallback."

patterns-established:
  - "One-state-one-action composition: the authorized page renders at most one primary next action and one deadline owner for each projected payment state."
  - "Absolute timer model: rerenders and tab visibility changes cannot extend the original cooldown or polling window."

requirements-completed: [INV-02, INV-03, INV-04, INV-05, ORD-01, ORD-02, PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, PAY-07, PAY-08, OPS-04]

# Metrics
duration: 19min
completed: 2026-08-04
---

# Phase 10 Plan 05: Payment Status, Recovery, and Timer Stabilization Summary

**Server-projected payment hierarchy with restore-to-cart terminal recovery, absolute recheck timers, single pending deadlines, and locale/store-timezone formatting**

## Performance

- **Duration:** 19 min
- **Started:** 2026-08-04T09:24:55Z
- **Completed:** 2026-08-04T09:43:58Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments

- Extended the canonical payment presentation to identify provider, recheck, support, and recovery actions while keeping paid and terminal states free of live reservation deadlines.
- Added pure recovery policy that restores an eligible immutable order snapshot into the localized cart and falls back to the localized catalog when restoration is unavailable, with same-order retry explicitly forbidden.
- Added absolute cooldown and polling models so manual rechecks wake at the exact deadline, background tabs perform no network work, and the original polling window cannot be extended by rerenders or visibility changes.
- Consolidated authorized order-page composition so VietQR owns its pending deadline, paid fulfillment is disclosed only after confirmed payment, refund/terminal states expose no provider controls, and support/recovery actions remain state-specific.
- Applied locale and validated store-timezone formatting to every recheck surface, including the nested VietQR recheck control, with a single polite polling-stop announcement.
- Preserved server authority for payment confirmation, inventory, reservations, fulfillment, and entitlements; client recovery only reads an existing local snapshot and calls the established cart restore API.

## Task Commits

Each task used a RED then GREEN commit:

1. **Task 1: Model truthful payment hierarchy and terminal recovery**
   - `30ac3757` — test: add failing payment recovery contracts
   - `2fc62950` — feat: enforce truthful terminal payment recovery
2. **Task 2: Stabilize cooldown, polling, and timestamp behavior**
   - `f4fe7d7a` — test: add failing payment timer contracts
   - `7aa1f7ba` — feat: stabilize payment recheck scheduling
3. **Task 3: Compose authorized payment states with one action and deadline owner**
   - `15c2cb0c` — test: add failing payment composition gates
   - `3d1d3e42` — feat: compose authorized payment states by action

## Files Created/Modified

- `src/payments/status.ts` — Canonical state hierarchy, next-action type, deadline ownership, and same-order retry prohibition.
- `src/payments/order-recovery.ts` — Pure terminal recovery eligibility and restore/catalog action selection.
- `src/payments/recheck-model.ts` — Absolute cooldown and polling-window calculations.
- `src/payments/format.ts` — Locale formatting with validated store-timezone fallback.
- `src/components/payments/order-payment-page.tsx` — Authorized state composition and single deadline/action ownership.
- `src/components/payments/payment-state-panel.tsx` — State-specific provider, recheck, support, and recovery presentation.
- `src/components/payments/payment-status-recheck.tsx` — Exact timers, visible-tab polling, scoped locale/timezone, and one stop announcement.
- `src/components/payments/order-recovery-banner.tsx` — Snapshot restoration through cart authority with catalog fallback.
- `tests/unit/payments/*.test.ts` — Table-driven hierarchy, recovery, timing, and formatting contracts.
- `tests/security/payment-boundaries.test.mjs` — Source gates forbidding client authority shortcuts and duplicate payment controls.

## Decisions Made

- Payment state presentation remains a pure interpretation of the authorized server projection; it does not infer or mutate authoritative commerce state.
- A terminal order is never retried in place. Recovery either restores eligible purchase intent to the cart or offers localized catalog browsing.
- Recheck deadlines are immutable timestamps. Visibility changes only suspend network activity and cannot reset elapsed time.
- The pending reservation deadline has exactly one owner: VietQR instructions when present, otherwise the generic pending/verifying state panel.

## Deviations from Plan

None - plan executed exactly as written.

## Authentication Gates

None.

## Known Stubs

None.

## Verification

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm run check:vi-diacritics` — passed
- Focused Vitest payment suite — 4 files, 34 tests passed
- Payment security boundary harness — 14 tests passed
- Scope audit — exactly the 13 plan-declared implementation and test files changed from base commit `cb305a2f`
- Stub scan — no blocking placeholder, TODO, FIXME, or empty UI data flow introduced in the plan files
- Threat-surface scan — no new endpoint, schema, authentication path, privileged mutation, or unplanned trust boundary introduced

## Self-Check: PASSED

- All 13 created/modified plan files exist.
- All six RED/GREEN task commits are present in git history.
- The worktree was clean before summary/state close-out.

---
*Phase: 10-checkout-and-payment-ux-stabilization-for-vietnamese-and-int*
*Completed: 2026-08-04*
