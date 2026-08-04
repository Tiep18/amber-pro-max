---
phase: 10-checkout-and-payment-ux-stabilization-for-vietnamese-and-int
plan: "04"
subsystem: checkout-support
tags: [next-intl, accessibility, idempotency, server-config, incident-recovery, security]

# Dependency graph
requires:
  - phase: 10-checkout-and-payment-ux-stabilization-for-vietnamese-and-int
    provides: Plan 10-03 shared checkout lock seam and bounded checkout/support/order message keys
  - phase: 04-trusted-payments-and-orders
    provides: Guest proof, order authorization, idempotent checkout, reservation, and immutable order authority
provides:
  - Two-stage aria-busy checkout submission with synchronous duplicate protection and success-only router navigation
  - Server-validated optional email/Zalo support projection and configurable store timezone fallback
  - Localized contact routes, copyable opaque incident references, and generic guest-order access recovery
affects: [10-05-payment-recovery, 10-07-regression-uat, checkout, order-access, support]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server pages project narrow validated public support facts into client checkout UI
    - Unknown submit outcomes preserve draft and idempotency while directing customers to authorized recovery
    - Order denial remains one generic branch with guest recovery primary and conditional support secondary

key-files:
  created:
    - src/support/config.ts
    - src/components/support/incident-reference.tsx
    - src/components/support/support-links.tsx
    - src/app/[locale]/contact/page.tsx
    - tests/unit/support/config.test.ts
  modified:
    - src/app/[locale]/checkout/page.tsx
    - src/components/checkout/checkout-page.tsx
    - src/checkout/submit-error-copy.ts
    - src/components/payments/order-payment-page.tsx
    - src/i18n/routing.ts
    - src/lib/env/server.ts
    - .env.example
    - tests/security/checkout-boundaries.test.mjs
    - tests/security/payment-boundaries.test.mjs

key-decisions:
  - "Checkout submission uses explicit checking-total and creating-order stages plus an immediate ref guard; all existing requote, guest recovery, idempotency, snapshot, reservation, and completion authority remains unchanged."
  - "Support values stay server-read, tolerate malformed optional configuration, and cross into clients only as PublicSupportConfig with validated mailto/HTTPS facts."
  - "The contact and order-denial surfaces render no placeholder channel, sensitive order fact, provider fact, or raw operational error."

patterns-established:
  - "Narrow public configuration seam: server resolver to server page to serializable DTO prop to conditional client rendering."
  - "Honest unknown outcome: keep recovery evidence, forbid immediate resubmit, and navigate to account orders or guest-order recovery."

requirements-completed: [MKT-01, CART-03, CART-04, CART-05, ACC-03, OPS-04]

# Metrics
duration: 13min
completed: 2026-08-04
---

# Phase 10 Plan 04: Honest Checkout Submission and Contextual Support Summary

**Idempotent two-stage checkout locking with server-validated optional support, copyable opaque incidents, localized contact, and non-enumerating guest-order recovery**

## Performance

- **Duration:** 13 min
- **Started:** 2026-08-04T08:26:49Z
- **Completed:** 2026-08-04T08:39:27Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments

- Locked the complete editable checkout region through localized checking-total and creating-order stages, prevented same-tick duplicate activation, retained entered values and idempotency, and replaced direct location assignment with success-only localized router navigation.
- Distinguished known rejections from genuinely uncertain signed-in outcomes; unknown outcomes retain draft/idempotency evidence and direct customers to account orders or localized guest recovery instead of resubmission.
- Added optional server-only email/Zalo/timezone configuration with exact HTTPS `zalo.me` validation, malformed-value omission, and `Asia/Ho_Chi_Minh` display fallback.
- Added `/vi/lien-he` and `/en/contact`, conditional zero/one/two-channel rendering, copyable opaque incident IDs with manual selection fallback, and generic order-denial recovery without order/provider enumeration.
- Preserved server authority over payment pairing, authoritative requote, reservation, inventory, immutable snapshots, guest proof, verified-paid state, and private entitlements.

## Task Commits

Each task used a RED then GREEN commit:

1. **Task 1: Lock the editable checkout region and preserve idempotent honest submission**
   - `b7432cca` — test: add failing submit lifecycle contracts
   - `006d82dc` — feat: lock checkout through honest submission
2. **Task 2: Validate public support/timezone config and publish the bilingual contact surface**
   - `40b8b40d` — test: add failing public support config contracts
   - `175f0b51` — feat: publish validated bilingual support contact
3. **Task 3: Add copyable incident and non-enumerating contextual recovery**
   - `c4312d98` — test: add failing incident and recovery boundaries
   - `310dc73c` — feat: add safe incident and access recovery

## Files Created/Modified

- `src/support/config.ts` — Server-only sanitizer for optional support channels and store timezone.
- `src/components/support/support-links.tsx` — Narrow public DTO type and conditional channel/contact rendering.
- `src/components/support/incident-reference.tsx` — Opaque incident copy action, polite status, and manual-selection fallback.
- `src/app/[locale]/contact/page.tsx` — Bilingual 720px contact surface with configured channels and safe recovery navigation.
- `src/app/[locale]/checkout/page.tsx` — Server-only resolver invocation and narrow DTO handoff.
- `src/components/checkout/checkout-page.tsx` — Submit stages, duplicate guard, busy region, safe navigation, incidents, and contextual support.
- `src/checkout/submit-error-copy.ts` — Explicit known/unknown outcome and retry-allowed presentation facts.
- `src/components/payments/order-payment-page.tsx` — Generic access denial with guest recovery and optional support.
- `src/i18n/routing.ts` — Localized contact pathname and helper.
- `src/lib/env/server.ts`, `.env.example` — Optional server-read support/timezone settings.
- `tests/unit/support/config.test.ts` — Nine zero/email/Zalo/both/malformed/timezone cases.
- `tests/security/checkout-boundaries.test.mjs` — Submit lock, DTO seam, forbidden client imports, and incident-data assertions.
- `tests/security/payment-boundaries.test.mjs` — Generic denial, guest recovery, and non-enumeration assertions.

## Decisions Made

- A synchronous `submitInFlightRef` protects the state-update gap before React renders the disabled controls; visible state still comes from the explicit submit stage.
- The resolver returns a complete narrow DTO even when no channels are valid, allowing contact to render a neutral state while contextual `SupportLinks` returns no dead link.
- `getSupportEnv` parses only optional raw support/timezone strings; `getPublicSupportConfig` owns validation and is the only public projection seam.
- Unauthorized and missing order results continue through the same pre-existing generic branch; recovery links do not contain the requested order number or guest proof.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added the required credential/access-link warning without expanding file ownership**
- **Found during:** Task 2 contact-page implementation
- **Issue:** Plan 10-03 provisioned support heading/body/channel/empty-state keys, but no dedicated warning key for the required instruction not to share passwords, bank credentials, or private order-access links. The binding 14-file scope prohibited reopening message catalogs.
- **Fix:** Added concise bilingual warning copy directly in the declared server-rendered contact page while continuing to consume all provisioned support keys for its main content and actions.
- **Files modified:** `src/app/[locale]/contact/page.tsx`
- **Verification:** Vietnamese diacritic scan, typecheck, and lint passed; the warning contains no business identity, credential, or URL value.
- **Committed in:** `175f0b51`

---

**Total deviations:** 1 auto-fixed (1 Rule 2 missing critical).
**Impact on plan:** The security warning was required by the plan, remained bilingual and inside declared ownership, and introduced no new authority or file overlap.

## Issues Encountered

- The initial Task 2 typecheck exposed that current Node typings require `NODE_ENV` on `ProcessEnv`; the support-only resolver now accepts a read-only string map so isolated configuration tests can supply minimal sources without weakening runtime parsing.
- Task 3 extended the unknown-outcome alert, so its source test was narrowed to the exact recovery branch rather than scanning into later submit controls. Behavior and authority were unchanged.

## Verification

- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run check:vi-diacritics` — passed.
- `npm run test:unit -- tests/unit/support/config.test.ts` — 9 passed.
- `node --test tests/security/checkout-boundaries.test.mjs tests/security/payment-boundaries.test.mjs` — 26 passed.
- Declared-scope diff — exactly 14/14 plan files changed; zero out-of-scope files.
- Stub scan — no TODO, FIXME, coming-soon, placeholder, or not-available marker in declared files.
- Threat-surface scan — contact/support/config surfaces are fully covered by planned T10-07; no unplanned endpoint, schema, payment mutation, storage, or credential surface was added.

## TDD Gate Compliance

- Task 1 RED `b7432cca` precedes GREEN `006d82dc`.
- Task 2 RED `40b8b40d` precedes GREEN `175f0b51`.
- Task 3 RED `c4312d98` precedes GREEN `310dc73c`.

## Known Stubs

None in files changed by this plan.

## Authentication Gates

None.

## User Setup Required

Optional deployment values may be configured for `SUPPORT_EMAIL`, `SUPPORT_ZALO_URL`, and `STORE_TIME_ZONE`. Their absence is a valid tested state and does not block checkout or contact rendering.

## Next Phase Readiness

- Plan 10-05 can preserve the generic access-denial branch while changing only authorized payment-state composition and recovery.
- Plan 10-07 can promote the server/client support seam, incident copy, responsive lock, and bilingual contact behavior into browser fixtures.
- No blocker remains.

## Self-Check: PASSED

- All 14 declared implementation/test files and the canonical summary exist on disk.
- All six RED/GREEN task commits exist in git history.
- Exact plan verification, declared-scope comparison, stub scan, and threat-surface review passed.

---
*Phase: 10-checkout-and-payment-ux-stabilization-for-vietnamese-and-int*
*Completed: 2026-08-04*
