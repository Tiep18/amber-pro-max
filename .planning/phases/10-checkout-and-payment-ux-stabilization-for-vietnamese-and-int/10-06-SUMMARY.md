---
phase: 10-checkout-and-payment-ux-stabilization-for-vietnamese-and-int
plan: "06"
subsystem: payments-ui-security
tags: [vietqr, next-intl, streaming, access-control, payments]

requires:
  - phase: 10-03
    provides: Authorized order payment projection and customer order composition
  - phase: 10-05
    provides: Payment status and terminal recovery surfaces
  - phase: 04
    provides: Server-authoritative payment and entitlement boundaries
provides:
  - Durable three-step VietQR transfer instructions with manual fallback facts
  - Authorized, bounded, same-origin VietQR PNG attachment route
  - Verified-paid success composition with fulfillment-specific next steps
affects: [10-07-regression-uat, payments, order-downloads]

tech-stack:
  added: []
  patterns:
    - Same-origin attachment derived from an authorized order and server-only provider configuration
    - Verified-paid UI branching exclusively from the server-authoritative payment projection

key-files:
  created:
    - src/app/[locale]/orders/[orderNumber]/qr/route.ts
  modified:
    - src/payments/vietqr/instructions.ts
    - src/components/payments/vietqr-instructions.tsx
    - src/components/payments/order-payment-page.tsx
    - src/i18n/routing.ts
    - tests/unit/payments/vietqr.test.ts
    - tests/security/payment-boundaries.test.mjs

key-decisions:
  - "The QR attachment ignores caller-supplied upstream details and rebuilds the image request from the authorized order plus server configuration."
  - "Paid success renders only when the authorized projection reports paid and not refunded; digital delivery continues through the existing entitlement-authorized route."
  - "No confirmation time is displayed until an authoritative paid timestamp is exposed by the authorized projection."

patterns-established:
  - "Payment attachments authorize first, constrain upstream fetches, bound response bodies, and return private no-store responses."
  - "Failure-prone downloads preserve the current page and keep manual payment facts visible."

requirements-completed: [INV-04, ORD-01, ORD-02, PAY-05, PAY-06, PAY-07, PAY-08, OPS-04]

duration: 15min
completed: 2026-08-04
---

# Phase 10 Plan 06: VietQR Transfer, Attachment, and Verified-Paid Success Summary

Localized VietQR guidance now provides durable manual transfer facts and a private, authorized QR attachment, while verified-paid orders lead with trustworthy fulfillment-specific next steps.

## Performance

- **Duration:** 15 min
- **Started:** 2026-08-04T09:49:14Z
- **Completed:** 2026-08-04T10:03:26Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Reorganized pending VietQR payment into three numbered steps with the amount emphasized, manual bank facts always visible, copy/select fallbacks, and localized declaration guidance.
- Added a localized same-origin QR download path backed by order authorization, fixed provider derivation, redirect and timeout rejection, PNG validation, a 1 MiB streaming cap, and private attachment headers.
- Added a verified-paid success composition driven only by server payment facts, including confirmed total, masked email, entitled digital downloads, and physical tracking or preparation guidance.
- Kept QR download failures on the order page so customers retain access to the manual transfer details.

## Task Commits

Each task was implemented through explicit RED and GREEN gates:

1. **Task 1: Durable VietQR transfer instructions**
   - `a309d7b7` — `test(10-06): add failing VietQR presentation contracts`
   - `f3d024d5` — `feat(10-06): organize durable VietQR transfer steps`
2. **Task 2: Authorized bounded VietQR attachment**
   - `dcf6e803` — `test(10-06): add failing VietQR attachment boundaries`
   - `148d8802` — `feat(10-06): add authorized bounded VietQR attachment`
3. **Task 3: Verified-paid success and next steps**
   - `f6d4c5ab` — `test(10-06): add failing verified-paid composition gates`
   - `29bccefa` — `feat(10-06): lead verified paid orders with next steps`

Additional correction:

- `65d4489d` — `fix(10-06): preserve manual facts on QR download failure`

## Files Created/Modified

- `src/app/[locale]/orders/[orderNumber]/qr/route.ts` — Authorizes the order before fetching and streaming a constrained VietQR PNG attachment.
- `src/payments/vietqr/instructions.ts` — Produces sanitized QR attachment filenames alongside authoritative transfer facts.
- `src/components/payments/vietqr-instructions.tsx` — Renders numbered instructions, copy fallbacks, and resilient in-page QR downloads.
- `src/components/payments/order-payment-page.tsx` — Composes verified-paid confirmation and fulfillment-specific next steps.
- `src/i18n/routing.ts` — Defines localized order QR attachment paths.
- `tests/unit/payments/vietqr.test.ts` — Covers instruction hierarchy, localization, fallbacks, and download behavior.
- `tests/security/payment-boundaries.test.mjs` — Enforces attachment authorization, upstream limits, privacy, immutability, and paid-success boundaries.

## Decisions Made

- Caller input never selects the QR provider URL, receiving account, amount, or attachment filename; all values derive from the authorized order and server configuration.
- Verified-paid success requires `status.isPaid && !status.isRefunded`, keeping refunded and terminal states out of the success branch.
- Existing entitlement authorization remains the only digital-download boundary.
- The paid timestamp requested in the task narrative was not rendered because the live authorized projection exposes no authoritative paid time. Confirmed total and masked email are shown; a future projection change can add time without fabrication.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Preserved manual payment facts when the QR attachment fails**

- **Found during:** Overall verification
- **Issue:** A normal attachment navigation could replace the order page with an error response, hiding the manual bank-transfer facts customers need as the fallback.
- **Fix:** Intercepted the localized same-origin download, fetched it with credentials and no-store semantics, validated the PNG response, downloaded it as a blob, and displayed a localized inline error without leaving the order page.
- **Files modified:** `src/components/payments/vietqr-instructions.tsx`, `tests/unit/payments/vietqr.test.ts`
- **Commit:** `65d4489d`

### Scope-Gate Adjustment

- The task narrative requested a confirmed payment time, but neither the authorized RPC nor `CustomerOrderPaymentProjection` exposes one. Adding a truthful value would require query and database migration changes outside this plan's locked seven-file scope, while a client-derived value would violate the server-authoritative payment contract. The success surface therefore shows only authoritative confirmed total, masked email, and fulfillment next steps.

## TDD Gate Compliance

- Task 1 RED: `a309d7b7`; GREEN: `f3d024d5`
- Task 2 RED: `dcf6e803`; GREEN: `148d8802`
- Task 3 RED: `f6d4c5ab`; GREEN: `29bccefa`

All RED commits failed for the intended missing behavior before their corresponding GREEN commits passed.

## Verification

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm run check:vi-diacritics` — passed
- `npm run test:unit -- tests/unit/payments/vietqr.test.ts` — 23 passed
- `node --test tests/security/payment-boundaries.test.mjs` — 19 passed

## Known Stubs

None.

## Authentication Gates

None.

## Issues Encountered

- Project skill references to repository-local `docs/ai/*` guidance were unavailable in this checkout. Execution followed `AGENTS.md`, Phase 10 contracts, the loaded project skills, and live implementation patterns.

## User Setup Required

None.

## Next Phase Readiness

- Plan 10-07 can run the final checkout and payment regression/UAT pass against the completed VietQR and verified-paid flows.
- A future explicitly scoped projection/database change is required before the UI can display an authoritative payment confirmation timestamp.

## Self-Check: PASSED

- All seven declared implementation/test files exist.
- All seven task and correction commits are present in git history.
- The plan modified no code or test files outside its declared scope.

---
*Phase: 10-checkout-and-payment-ux-stabilization-for-vietnamese-and-int*
*Completed: 2026-08-04*
