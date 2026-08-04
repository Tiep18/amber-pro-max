---
phase: 10-checkout-and-payment-ux-stabilization-for-vietnamese-and-int
plan: "02"
subsystem: checkout
tags: [vietnam-address, zod, session-storage, server-actions, supabase-rls, vitest]

# Dependency graph
requires:
  - phase: 03-cart-checkout-and-trusted-order-creation
    provides: Trusted checkout address validation and server-owned order creation boundaries
  - phase: 04-payments-orders-and-fulfillment
    provides: Authenticated customer address RPC/RLS path and payment authority separation
  - phase: 09-independent-locale-and-market-commerce-projection
    provides: Destination authority and final accepted-quote checkout semantics
provides:
  - Reviewed 34-province and 3,321-ward Vietnam administrative snapshot with pure parent-pair lookup
  - Shared Vietnamese mobile and address normalization at checkout and saved-address boundaries
  - Strict versioned 12-hour, 16KiB editable draft lifecycle with authority-free session storage
  - Authenticated optional checkout address-save action using the existing RPC/RLS authority
affects: [10-03-checkout-interaction, checkout, account-addresses, shipping, security]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Reviewed static administrative data replaces runtime address API dependency
    - Browser draft persistence uses a strict expiring allowlist and remains non-authoritative
    - Optional checkout address saves derive identity server-side and report independently from order success

key-files:
  created:
    - src/checkout/data/vietnam-administrative-units-2025-07-01.json
    - src/checkout/vietnam-address.ts
    - src/checkout/vietnam-phone.ts
    - src/checkout/editable-draft.ts
  modified:
    - src/checkout/shipping-address.ts
    - src/checkout/shipping-address-ui.ts
    - src/checkout/schemas.ts
    - src/account/addresses.ts
    - src/account/address-actions.ts
    - tests/security/checkout-boundaries.test.mjs

key-decisions:
  - "Vietnam destinations persist canonical human-readable province and ward names after validating official code/name pairs."
  - "Vietnam mobile input accepts only domestic 0-prefix or +84 mobile forms and persists canonical +84 numbers."
  - "Editable checkout drafts contain only version, timestamps, email, and address intent for exactly 12 hours and at most 16KiB."
  - "Checkout address-save requests use a strict caller-ID-free payload and the existing authenticated save_customer_shipping_address RPC path."
  - "Plan 10-02 owns only four exhaustive Vietnam issue mappings in shipping-address-ui; Plan 10-03 retains interaction and copy ownership."

patterns-established:
  - "Shared boundary normalization: browser-facing helpers and final server parsers call the same pure Vietnam pair/mobile normalizers."
  - "Optional persistence isolation: address-save failure returns not_saved and cannot downgrade checkout or order success."

requirements-completed: [MKT-06, CART-03, CART-04, CART-05, SHIP-03, SHIP-09, SHIP-11, SHIP-12, SHIP-13, ACC-03, OPS-04]

# Metrics
duration: 16min
completed: 2026-08-04
---

# Phase 10 Plan 02: Vietnam Address, Draft, and Authenticated Save Summary

**Official two-level Vietnam address and mobile normalization, bounded editable draft persistence, and server-authenticated optional address saving without expanding browser commerce authority**

## Performance

- **Duration:** 16 min
- **Started:** 2026-08-04T06:59:58Z
- **Completed:** 2026-08-04T07:16:17Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments

- Checked in the reviewed Decision 19/2025/QD-TTg snapshot with 34 unique provinces, 3,321 unique parented ward-level units, and source SHA-256 `213966723785859dedd7c88965d6f12f8c3c508c91796e003804cf60a1054fc2`.
- Added shared pure Vietnam address-pair and mobile normalizers, then enforced them at final checkout and customer saved-address boundaries while preserving US and international rules.
- Added a current-version-only editable draft API that trims and stores only email/address intent, expires at exactly 12 hours, caps UTF-8 storage at 16KiB, and removes invalid records.
- Added a strict authenticated checkout address-save action that accepts no caller identity, revalidates twice, reuses the existing RPC/RLS path, and reports optional save failure separately.

## Task Commits

Each task was committed atomically with TDD RED and GREEN gates:

1. **Task 1: Official Vietnam address and mobile contracts**
   - `b6bda53c` — test: add failing Vietnam address contracts
   - `e4c99afc` — feat: enforce Vietnam address contracts
2. **Task 2: Strict 12-hour editable draft contract**
   - `0c3a44c4` — test: add failing editable draft contracts
   - `ca2118ff` — feat: implement bounded editable checkout draft
3. **Task 3: Authenticated validated-address save contract**
   - `d7a09677` — test: add failing authenticated address save contracts
   - `f9db1792` — feat: add authenticated checkout address save

**Approved plan amendment:** `2822a6f0` — docs: add `shipping-address-ui.ts` ownership for four exhaustive mappings.

## Files Created/Modified

- `src/checkout/data/vietnam-administrative-units-2025-07-01.json` — Immutable reviewed province/ward snapshot and source metadata.
- `src/checkout/vietnam-address.ts` — Pure official pair lookup and canonical two-level address validation.
- `src/checkout/vietnam-phone.ts` — Vietnamese mobile-only parser and canonical `+84` normalization.
- `src/checkout/shipping-address.ts` — Shared final/preview destination normalization with field-specific Vietnam issue codes.
- `src/checkout/shipping-address-ui.ts` — Four approved exhaustive mappings for the new Vietnam issue codes.
- `src/checkout/schemas.ts` — Final checkout server boundary normalization after strict parsing.
- `src/checkout/editable-draft.ts` — Versioned, expiring, size-bounded editable intent storage lifecycle.
- `src/account/addresses.ts` — Saved-address parsing through the shared official Vietnam normalizers.
- `src/account/address-actions.ts` — Strict authenticated optional checkout save action over the existing RPC.
- `tests/unit/checkout/vietnam-address.test.ts` — Official counts, parent-pair, district-free, and boundary evidence.
- `tests/unit/checkout/vietnam-phone.test.ts` — Accepted typing forms and rejected fixed-line/prefix/length evidence.
- `tests/unit/checkout/editable-draft.test.ts` — Read/write/clear, expiry, malformed, version, and size-cap evidence.
- `tests/unit/account/addresses.test.ts` — Saved-address normalization, server identity, and optional-save isolation evidence.
- `tests/security/checkout-boundaries.test.mjs` — Session-storage allowlist and caller-identity boundary scans.

## Decisions Made

- The checked-in official snapshot is the sole Vietnam administrative membership source; production performs no runtime address lookup.
- Canonical province and ward names are persisted into the existing `region` and `locality` fields, avoiding schema or RLS changes.
- The draft module validates structural allowlists and lifecycle only; draft values remain untrusted intent and are revalidated by final checkout.
- The checkout save action parses the strict request, authenticates server-side, then passes normalized data through the existing save parser again before RPC execution.
- The user-approved scope amendment adds only the exhaustive mappings needed for compilation; Plan 10-03 still owns searchable controls, touched-state behavior, consent, and final copy.

## Deviations from Plan

### Approved Scope Amendment

- **Found during:** Task 1 GREEN verification
- **Issue:** Extending `ShippingAddressIssueCode` made the existing exhaustive UI mapping fail typechecking, but that file was not originally owned by Plan 10-02.
- **Decision:** The user approved adding `src/checkout/shipping-address-ui.ts` to Task 1 ownership for exactly four mappings while preserving strict issue codes.
- **Files modified:** `.planning/phases/10-checkout-and-payment-ux-stabilization-for-vietnamese-and-int/10-02-PLAN.md`, `src/checkout/shipping-address-ui.ts`
- **Verification:** Focused tests and `npm run typecheck` passed.
- **Commits:** `2822a6f0`, `e4c99afc`

No automatic Rule 1-3 deviations were required after the approved amendment.

## Issues Encountered

- Task 1 typechecking correctly exposed the missing exhaustive mappings. Execution paused at the scope gate, then resumed after the user selected the minimal ownership amendment.
- The project-specific skill references point to `docs/ai/*` files that are not present in this workspace; the assembled `AGENTS.md` project, stack, architecture, and workflow directives remained the binding source.

## Verification

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm run test:unit -- tests/unit/checkout/vietnam-address.test.ts tests/unit/checkout/vietnam-phone.test.ts tests/unit/checkout/editable-draft.test.ts tests/unit/account/addresses.test.ts` — 39 passed
- `node --test tests/security/checkout-boundaries.test.mjs` — 11 passed
- Official snapshot structural check — 34 unique provinces and 3,321 unique ward codes under their reviewed parent provinces
- Stub scan — no TODO, FIXME, placeholder, coming-soon, or not-available markers in plan-owned files
- Threat-surface scan — no new endpoint, runtime fetch, migration, package, service-role path, private-storage path, payment fact, or credential surface

## TDD Gate Compliance

- Task 1 has RED `b6bda53c` before GREEN `e4c99afc`.
- Task 2 has RED `0c3a44c4` before GREEN `ca2118ff`.
- Task 3 has RED `d7a09677` before GREEN `f9db1792`.

## Known Stubs

None in the files changed by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 10-03 can now wire searchable Vietnam destination controls, touched-field errors, 12-hour draft hydration, explicit unchecked save consent, and post-order optional saving against stable contracts.
- No package, migration, RLS, payment, quote, inventory, or fulfillment blocker remains.

## Self-Check: PASSED

- All 14 declared implementation/test files exist.
- The approved amendment and all six TDD task commits exist in git history.
- Overall lint, typecheck, focused unit, security, stub, and threat-surface verification passed.

---
*Phase: 10-checkout-and-payment-ux-stabilization-for-vietnamese-and-int*
*Completed: 2026-08-04*
