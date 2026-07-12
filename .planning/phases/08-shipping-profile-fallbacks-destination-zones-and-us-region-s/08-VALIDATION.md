---
phase: 08
slug: shipping-profile-fallbacks-destination-zones-and-us-region-s
status: ready
nyquist_compliant: true
wave_0_complete: false
plan_count: 9
wave_count: 7
created: 2026-07-12
revised: 2026-07-12
---

# Phase 08 - Validation Strategy

> Per-task and per-wave validation contract for the nine-plan shipping phase.

## Test Infrastructure

| Property | Value |
|----------|-------|
| Frameworks | pgTAP through Supabase CLI, Vitest 4.1.8, Playwright 1.60.0, Node test |
| Config files | `package.json`, `vitest.config.ts`, `playwright.config.ts`, `supabase/config.toml` |
| Quick commands | `npm run db:test`; `npm run test:unit -- <files>`; `npm run typecheck`; targeted `npm run test:e2e -- <specs>` |
| Security commands | `npm run test:security`; `node --test tests/security/shipping-ui-boundaries.test.mjs` |
| Full phase command | `npm run db:test && npm run test:unit -- --run && npm run test:security && npm run lint && npm run typecheck && npm run build && npm run test:e2e` |
| Feedback target | Unit/type loops under 90 seconds where possible; database/browser/full gates run at task or wave exits |

## Sampling Rate

- After every implementation task: run the narrowest owned pgTAP, unit, security, or browser target plus typecheck when TypeScript changed.
- After every wave: run all tests named in that wave's exit gate; same-wave plans have no source-file overlap.
- Before Plan 08-09 UAT: verify the linked project is still the 08-01-approved non-production ref, apply pending migrations there, run the full phase command, and require zero shipping-critical skips.
- A failed private-resolver privilege test, migration recovery rehearsal, immutable-snapshot check, authorization test, stale-response test, or HIGH/CRITICAL security finding blocks downstream execution.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure/observable behavior | Test type | Automated command | Wave 0 artifact | Status |
|---------|------|------|-------------|------------|----------------------------|-----------|-------------------|-----------------|--------|
| 08-01-01 | 01 | 1 | SHIP-07,08,10,12 | T-08-01,02 | Schema compatibility, zero default, uniqueness, RLS, immutable shape, recovery contracts | pgTAP/rehearsal | `npm run db:reset && npm run db:test` | `08_shipping_schema.test.sql`, `08_shipping_allocation_schema.test.sql`, rehearsal | pending |
| 08-01-02 | 01 | 1 | SHIP-07,08,10,12 | T-08-01,02 | Additive migration preserves exact rows and denies direct table access | pgTAP/security | `npm run db:reset && npm run db:lint && npm run db:test && npm run test:security` | Uses Task 01 files | pending |
| 08-01-03 | 01 | 1 | SHIP-07,08,10,12 | T-08-01-PUSH | Approved non-production failure/rollback/reapply/forward-repair and canonical push | blocking human/remote | Local DB/security gate plus recorded remote commands from plan | Rehearsal file | pending |
| 08-02-01 | 02 | 2 | SHIP-08,09,10 | T-08-02-PRIV,03,04 | Six tiers, region modes, aggregation, direct private denial, public wrapper callable | pgTAP/Vitest | `npm run db:test && npm run test:unit -- tests/unit/checkout/shipping-resolution.test.ts tests/unit/checkout/shipping.test.ts` | `08_shipping_resolver_security.test.sql`, unit resolver test | pending |
| 08-02-02 | 02 | 2 | SHIP-08,09,10 | T-08-02-PRIV,03,04 | Resolver implementation and grants match contracts | pgTAP/Vitest/security | `npm run db:reset && npm run db:lint && npm run db:test && npm run test:unit -- tests/unit/checkout/shipping-resolution.test.ts tests/unit/checkout/shipping.test.ts && npm run typecheck && npm run test:security` | Uses Task 01 files | pending |
| 08-03-01 | 03 | 3 | SHIP-09,11,12,13 | T-08-05,06,07 | V2 quote, forged/stale rejection, US preview/final, immutable allocation contracts | pgTAP/Vitest/security | `npm run test:unit -- tests/unit/checkout/quote-diff.test.ts tests/unit/checkout/submit-checkout.test.ts && npm run db:test && npm run test:security` | `08_shipping_resolution.test.sql`, `08_shipping_snapshot.test.sql` | pending |
| 08-03-02 | 03 | 3 | SHIP-09,11,12,13 | T-08-05,06,07 | Authoritative re-resolution, transactional snapshots, generated types | DB/Vitest/security | Plan 08-03 full automated command | Uses Task 01 files | pending |
| 08-04-01 | 04 | 4 | SHIP-07,08,10 | T-08-08 | requireAdmin ordering, validation, ownership, error redaction | Vitest | `npm run test:unit -- tests/unit/checkout/admin-commerce-actions.test.ts` | Extend existing unit file | pending |
| 08-04-02 | 04 | 4 | SHIP-07,08,10 | T-08-08 | Profile/default/rule/region action authority and validation | Vitest/security | `npm run test:unit -- tests/unit/checkout/admin-commerce-actions.test.ts && npm run typecheck && npm run test:security` | Uses Task 01 file | pending |
| 08-04-03 | 04 | 4 | SHIP-07,09 | T-08-08 | Product/variant assignment actions preserve ownership | Vitest/static/security | `npm run test:unit -- tests/unit/checkout/admin-commerce-actions.test.ts && npm run lint && npm run typecheck && npm run test:security` | Uses Task 01 file | pending |
| 08-05-01 | 05 | 5 | SHIP-07,08,10 | T-08-08 | Profile/default/rule/region desktop/mobile browser contracts | Playwright | `npm run test:e2e -- tests/e2e/admin-shipping.spec.ts` | Extend existing admin spec | pending |
| 08-05-02 | 05 | 5 | SHIP-07 | T-08-08 | Profile/default UI, zero-default warning, focus/Sheet behavior | Playwright/static | `npm run test:e2e -- tests/e2e/admin-shipping.spec.ts --grep "parcel profile|default" && npm run lint && npm run typecheck` | Uses Task 01 spec | pending |
| 08-05-03 | 05 | 5 | SHIP-08,10 | T-08-08 | Rule/region CRUD, responsive parity, no overflow | Playwright/security | `npm run test:e2e -- tests/e2e/admin-shipping.spec.ts && npm run lint && npm run typecheck && npm run test:security` | Uses Task 01 spec | pending |
| 08-06-01 | 06 | 6 | SHIP-07,09 | T-08-08 | Assignment precedence and phase-wide responsive admin contract | Playwright | `npm run test:e2e -- tests/e2e/admin-shipping-assignments.spec.ts tests/e2e/admin-shipping.spec.ts` | New assignment spec | pending |
| 08-06-02 | 06 | 6 | SHIP-07,09 | T-08-08 | Product/variant controls use protected actions and show effective source | Playwright/static/security | Assignment grep plus lint/typecheck/security from plan | Uses Task 01 spec | pending |
| 08-06-03 | 06 | 6 | SHIP-07,08,09,10 | T-08-08 | Full admin desktop/mobile parity with ownership boundaries | Playwright/security | Both admin specs plus lint/typecheck/security | Uses Task 01 spec | pending |
| 08-07-01 | 07 | 4 | SHIP-11,13 | T-08-05 | Country-only preview, canonical 56-code US set, final validation | Vitest | `npm run test:unit -- tests/unit/checkout/shipping-address-ui.test.ts` | Extend existing address unit file | pending |
| 08-07-02 | 07 | 4 | SHIP-11,13 | T-08-05 | Address schemas/options and submit regression align | Vitest/static/security | Address + submit unit, lint, typecheck, security from plan | Uses Task 01 file | pending |
| 08-08-01 | 08 | 5 | SHIP-11,13 | T-08-05,09 | Lifecycle races/material state/saved-address/readiness contracts | Vitest | Lifecycle/saved-address/quote-diff unit command from plan | New lifecycle and saved-address tests | pending |
| 08-08-02 | 08 | 5 | SHIP-11 | T-08-09 | Pure only-latest state machine and material proposal behavior | Vitest/static | Lifecycle + quote-diff unit, lint, typecheck | Uses Task 01 files | pending |
| 08-08-03 | 08 | 5 | SHIP-11,13 | T-08-05,09 | Refresh action and saved address share sanitized lifecycle intent | Vitest/security | Lifecycle/saved/actions/quote-diff, lint, typecheck, security | Uses Task 01 files | pending |
| 08-09-01 | 09 | 7 | SHIP-07..13 | T-08-01..09 | Localized checkout/race/recovery/responsive/security browser contracts | Playwright/Node security | Checkout specs plus `shipping-ui-boundaries.test.mjs` | Extend checkout specs; new security file | pending |
| 08-09-02 | 09 | 7 | SHIP-11,13 | T-08-05,09 | Localized UI consumes sole lifecycle, confirms material changes, recovers unsupported | Unit/Playwright/security | Focused unit + checkout specs + lint/typecheck/security from plan | Uses Task 01 files | pending |
| 08-09-03 | 09 | 7 | SHIP-07..13 | T-08-01..09 | Full regression, approved non-production immutable evidence, responsive UAT | Full CI + human | Full phase command | `08-UAT.md` created/finalized | pending |

*Status values: pending, green, red, flaky. Shipping-critical cases may not be skipped.*

## Wave 0 Requirements by Plan

- [ ] **08-01:** create `supabase/tests/database/08_shipping_schema.test.sql`, `supabase/tests/database/08_shipping_allocation_schema.test.sql`, and `supabase/tests/rehearsals/08_shipping_forward_repair.sql` before migration implementation.
- [ ] **08-02:** create `supabase/tests/database/08_shipping_resolver_security.test.sql` and `tests/unit/checkout/shipping-resolution.test.ts`; include both privilege metadata and actual role invocation tests.
- [ ] **08-03:** extend its exclusively owned `08_shipping_resolution.test.sql`, `08_shipping_snapshot.test.sql`, submit, quote-diff, and checkout-boundary tests before changing the authoritative quote/submit boundary.
- [ ] **08-04:** extend `tests/unit/checkout/admin-commerce-actions.test.ts` before adding server actions.
- [ ] **08-05:** extend `tests/e2e/admin-shipping.spec.ts` with profile/default/rule/region desktop/mobile cases before UI implementation.
- [ ] **08-06:** create `tests/e2e/admin-shipping-assignments.spec.ts` before assignment controls; run the 08-05 spec read-only for phase-wide responsive verification.
- [ ] **08-07:** extend `tests/unit/checkout/shipping-address-ui.test.ts` before address schema/option changes.
- [ ] **08-08:** create `tests/unit/checkout/quote-lifecycle.test.ts` and `tests/unit/checkout/saved-addresses.test.ts` before lifecycle/action integration.
- [ ] **08-09:** extend the two checkout Playwright specs and create `tests/security/shipping-ui-boundaries.test.mjs` before localized component wiring; create/finalize `08-UAT.md` only at the final gate.
- [ ] Confirm the installed Supabase CLI's exact inspection/dry-run/push syntax and record the approved non-production ref in 08-01-SUMMARY; every migration plan verifies that same ref before push.

## Manual-Only Verifications

| Behavior | Requirement | Why manual | Required evidence |
|----------|-------------|------------|-------------------|
| Non-production migration failure/rollback/reapply/forward-repair and canonical push | SHIP-07,08,10,12 | Remote identity and mutating schema deployment cannot be proven locally | Approved project ref, checksums, migration status, smoke results in 08-01-SUMMARY; blocks all later waves |
| Checkout/admin responsive/readability/focus UAT | SHIP-07..13 | Visual clarity, sticky actions, focus restoration, and readable recovery need human confirmation | Every desktop/mobile row recorded Pass in 08-UAT.md |
| Historical allocation evidence after admin edits | SHIP-12 | Requires inspecting a real accepted non-production order then mutating current config | Before/after immutable profile/rule/region/base/final/allocation evidence and sum-to-order-shipping recorded in 08-UAT.md |

## Wave Exit Gates

- **Wave 1 — Plan 08-01:** schema/recovery pgTAP, db lint, security, unchanged exact-row checksums, forced-failure rollback, clean reapply, forward repair, and approved non-production push all pass. Remote gate is BLOCKING.
- **Wave 2 — Plan 08-02:** all six precedence branches, region modes, inactive/currency/failure cases, unchanged aggregation, pgTAP role metadata, anon/authenticated direct private-call denial, service-role direct call, and anon/authenticated public-wrapper calls pass.
- **Wave 3 — Plan 08-03:** quote/submit integration, generated types, forged/stale rejection, US preview/final split, immutable allocation sum/history, DB/Vitest/security, and approved non-production migration smoke pass.
- **Wave 4 — Plans 08-04 and 08-07:** admin action authorization/validation/ownership/redaction and address preview/final/56-code tests pass independently; lint/typecheck/security are green for both with no source overlap.
- **Wave 5 — Plans 08-05 and 08-08:** profile/default/rule/region admin browser suite plus quote-lifecycle/saved-address/action unit/security suites pass independently; desktop/mobile admin core UI and only-latest state semantics are green.
- **Wave 6 — Plan 08-06:** product/variant assignment precedence and both admin browser specs pass at desktop/mobile with no overflow, hidden essential data, inaccessible controls, focus failures, or unauthorized writes.
- **Wave 7 — Plan 08-09:** localized checkout specs, shipping UI security, full pgTAP/Vitest/security/lint/type/build/Playwright, approved non-production immutable-evidence inspection, and every UAT row pass with zero shipping-critical skips.

## Phase Exit Gates

- [ ] All nine plan summaries exist and every plan-specific automated command is green.
- [ ] All SHIP-07..SHIP-13 requirements and D-01..D-09 decisions have passing evidence.
- [ ] T-08-01..T-08-09 mitigations pass; PUBLIC/anon/authenticated cannot call the private resolver directly.
- [ ] Exact-country behavior and highest-first-once/additional-item totals remain unchanged.
- [ ] No profile/fallback is auto-created, and no migrated profile is auto-defaulted.
- [ ] Unsupported shipping is never zero/free/selectable and preserves customer input.
- [ ] Submitted allocation evidence remains immutable after current configuration edits and sums exactly to order shipping.
- [ ] Full phase command is green with no shipping-critical skip and no HIGH/CRITICAL security finding.
- [ ] 08-UAT.md records every desktop/mobile/admin/checkout/snapshot row Pass.

## Validation Sign-Off

- [x] Every implementation task has a concrete automated command.
- [x] Every plan has an explicit Wave 0 test artifact or extension target.
- [x] All nine plans and seven waves are represented in the task and exit-gate maps.
- [x] Security-sensitive tasks map to T-08-01..T-08-09 and blocking dispositions.
- [x] Same-wave plans have disjoint source ownership.
- [x] Commands are non-watch and phase-critical tests may not be skipped.
- [x] `nyquist_compliant: true` is set.

**Approval:** ready for plan-checker validation
