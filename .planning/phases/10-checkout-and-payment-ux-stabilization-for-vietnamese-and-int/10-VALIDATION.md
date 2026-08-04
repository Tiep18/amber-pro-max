---
phase: 10
slug: checkout-and-payment-ux-stabilization-for-vietnamese-and-int
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-04
---

# Phase 10 — Validation Strategy

> Feedback contract for the seven checkout and payment UX stabilization plans. Current code and tests are the baseline; audit observations are not accepted without executable evidence.

## Test Infrastructure

| Property | Value |
|---|---|
| **Unit framework** | Vitest 4.1.8 (`vitest.config.ts`) |
| **Browser framework** | Playwright 1.60.0 (`playwright.config.ts`, Chromium, one worker) |
| **Security framework** | Node test boundary suites via `npm run test:security` |
| **Database framework** | Supabase reset/lint, pgTAP, generated type diff; no Phase 10 migration is planned |
| **Quick run command** | `npm run test:unit -- <owned-test-files>` |
| **Full suite command** | `npm run ci` |
| **Expected quick feedback** | Under 120 seconds for owned unit/security files |

## Sampling Rate

- **After every task commit:** run the task's owned Vitest file(s), `npm run typecheck`, and the relevant checkout/payment security file when a trust boundary changes.
- **After every plan:** run `npm run lint && npm run typecheck && npm run check:vi-diacritics && npm run test:unit && npm run test:security`.
- **Before `$gsd-verify-work`:** run `npm run ci`; the suite must be green.
- **No watch mode:** every command terminates and returns an exit code.

## Plan-Level Verification Map

| Plan | Decisions / preserved requirements | Threat refs | Secure behavior | Automated evidence | Wave 0 gap |
|---|---|---|---|---|---|
| 10-01 Cart and PDP | D-02, D-11, D-13, D-14; CART-01–05, INV-03 | T10-01 duplicate/unauthorized checkout intent | Controls never override authoritative line eligibility or totals | Extend `tests/unit/catalog/add-to-cart.test.ts`; `tests/e2e/cart.spec.ts`; `tests/e2e/checkout-ux.spec.ts` | checkout UX browser fixture |
| 10-02 VN address and draft | D-04–D-10; MKT-06, SHIP-03/09/11–13, ACC-03 | T10-02 forged admin pair; T10-03 draft leakage; T10-04 cross-user address save | Server validates official pair and mobile phone; strict 12-hour draft allowlist; save identity comes from server session | New `vietnam-address.test.ts`, `vietnam-phone.test.ts`, `editable-draft.test.ts`; extend checkout security/E2E | three unit files plus browser fixture |
| 10-03 Checkout presentation and copy | D-10–D-14 | T10-05 hidden blocker or stale duplicate state | One responsive source of truth; complete blocker copy; localized accessible names | `check:vi-diacritics`; message parity assertions; `checkout-ux.spec.ts` responsive/keyboard matrix | bounded namespace parity and browser cases |
| 10-04 Submit, incidents and support | D-11, D-15, D-16; CART-03–05 | T10-06 duplicate submit; T10-07 unsafe support config or incident leak | Locked `aria-busy` form preserves idempotency; public support DTO is validated and omits secrets | Existing submit/idempotency tests; new `tests/unit/support/config.test.ts`; checkout security/E2E | support config unit/browser cases |
| 10-05 Payment status and recovery | D-16–D-19, D-22–D-24; INV-02–05, ORD-01/02, PAY-01–08 | T10-08 same-order retry; T10-09 client-forged paid state | Terminal states restore cart into a fresh order; paid state remains server-projected; deadlines only pending | Extend status mapping; new `order-recovery.test.ts`, `recheck-model.test.ts`; `payment-ux.spec.ts`; payment security | recovery/timing unit and payment browser fixtures |
| 10-06 VietQR and success | D-18–D-23; PAY-05–08 | T10-10 SSRF/oversized QR response; T10-11 private entitlement bypass | QR route re-derives fixed upstream under order authorization; no client paid mutation; downloads remain entitlement-gated | Extend VietQR/status tests, payment security and `payment-ux.spec.ts` | authorized QR/state browser cases |
| 10-07 Regression and UAT | D-01–D-24; OPS-04 and every preserved authority requirement | T10-01–T10-11 | Full bilingual/responsive/payment-state matrix and all authority/security suites pass | `npm run ci` plus recorded manual UAT | executable fixtures from Plans 01–06 |

## Wave 0 Requirements

- [ ] `tests/unit/checkout/vietnam-address.test.ts` — snapshot metadata/counts/codes, parent-child validation, optional legacy district mapping.
- [ ] `tests/unit/checkout/vietnam-phone.test.ts` — `0…`/`+84…` mobile forms, normalization, invalid boundaries.
- [ ] `tests/unit/checkout/editable-draft.test.ts` — versioned allowlist, 12-hour TTL, size cap, malformed/expired cleanup, clear-on-success.
- [ ] `tests/unit/support/config.test.ts` — absent/valid/malformed email and Zalo values; safe public DTO and no placeholders.
- [ ] `tests/unit/payments/recheck-model.test.ts` — exact cooldown wake, absolute poll window, tab visibility, one-time terminal announcement.
- [ ] `tests/unit/payments/order-recovery.test.ts` — status-specific recovery, primary cart restore, catalog fallback, no same-order retry.
- [ ] `tests/e2e/checkout-ux.spec.ts` — bilingual address/draft/touched/mobile/submit/support/accessibility flows.
- [ ] `tests/e2e/payment-ux.spec.ts` — authorized state fixtures, guest recovery, deadlines/recheck, VietQR download, paid hierarchy.
- [ ] Extend `tests/security/checkout-boundaries.test.mjs` for the reviewed draft module and forbidden-field exclusions.
- [ ] Extend `tests/security/payment-boundaries.test.mjs` for QR authorization, fixed allowlisted upstream, redirect rejection, response bounds and no paid mutation.
- [ ] Add key-parity assertions for bounded Phase 10 `next-intl` namespaces.

Wave 0 means create the smallest red/green test seam inside the owning implementation plan; it does not authorize a separate eighth plan.

## Required Responsive and State Matrix

- Locales: `/vi` and `/en`; active-locale accessible names only.
- Viewports: `375x812`, `390x844`, `768x1024`, `1024x768`, `1440x900`.
- Accessibility: keyboard-only country/province/ward selection, 200% zoom/reflow, no horizontal overflow, 44px targets, no hidden duplicate tab stops, complete wrapped blockers.
- Payment fixtures: pending PayPal, pending VietQR, verifying, review-required, paid, failed, cancelled, rejected, expired, partially refunded, refunded, unauthorized guest, signed-in owner and missing recovery snapshot.
- Commerce authority: exact `vn + VND -> VietQR` and `intl + USD -> PayPal`, authoritative requote, accepted material-change evidence, atomic reservation, verified-paid transition, inventory finalization/release, immutable snapshots and private entitlements.

## Manual-Only Verifications

| Behavior | Why manual | Instructions |
|---|---|---|
| Mobile keyboard, safe-area dock and 200% zoom quality | Browser automation can assert geometry but not judge all visual collisions | Run the responsive matrix in both locales; complete cart through checkout using keyboard and touch emulation |
| Optional support channels | Real email/Zalo values are deployment configuration | Verify zero, email-only, Zalo-only and both-channel presentations without placeholder values |
| PayPal sandbox handoff | Requires configured external sandbox credentials | On a configured environment, verify provider handoff/cancel and return to the same authorized order URL |
| VietQR scan/download usability | Requires a banking/QR reader and real device behavior | Download/scan the authorized image and compare account, amount and reference with the manual fallback |

Phase 09 Vercel geo/external SEO checks remain deferred and are not Phase 10 acceptance criteria.

## Validation Sign-Off

- [x] Every plan has automated evidence and explicit trust-boundary checks.
- [x] No three consecutive implementation tasks may omit automated verification.
- [x] Every missing test is owned inside one of the seven plans.
- [x] Commands are non-watch and bounded.
- [x] No new database migration or test dependency is required.
- [x] `nyquist_compliant: true` is set.

**Approval:** approved 2026-08-04 for planning; `wave_0_complete` turns true only after execution creates and passes every listed seam.
