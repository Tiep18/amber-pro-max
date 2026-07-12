# Phase 08: Shipping Profile Fallbacks, Destination Zones, and US Regions - Research

## User Constraints

- Shipping only, within the existing Next.js/React/Supabase ecommerce application. [VERIFIED: closed input]
- Preserve exact-country data and the existing highest-first-fee-once plus additional-item-fee aggregation. [VERIFIED: closed input]
- Introduce exactly one active store default, profile/currency fallback rules, variant/product/default precedence, generic normalized region adjustments, immediate destination re-quoting, confirmation of material changes, and immutable allocation evidence. [VERIFIED: closed input]
- No existing profile becomes the default automatically. [VERIFIED: closed input]
- Requirements in scope: SHIP-07 through SHIP-13. [VERIFIED: closed input]

## Summary

The safest implementation is an additive migration: retain `shipping_profiles`, existing exact-country `shipping_rules`, attachment tables, and the pure aggregation algorithm; add explicit default-profile state, fallback rules, and normalized region adjustments around them. [ASSUMED: design recommendation; executor verification required] The resolver should produce a canonical, evidence-rich allocation for every physical line before aggregation, using one fixed precedence chain and excluding inactive profiles and rules. [ASSUMED: design recommendation; executor verification required]

Roll out database primitives and resolver tests before admin and checkout UI. Existing exact-country behavior should remain a regression baseline, while new records opt into fallback/default/region behavior explicitly. [ASSUMED: design recommendation; executor verification required]

**Primary recommendation:** implement a single database-backed deterministic resolver contract shared by quoting and final order creation, then persist its evidence unchanged into the order snapshot. [ASSUMED: design recommendation; executor verification required]

## Compatibility Strategy

1. Keep current `shipping_rules.country_code` rows semantically exact; do not rewrite them. [VERIFIED: closed input]
2. Add fallback capability without overloading a fake country code. Prefer an explicit nullable destination selector plus a rule-kind constraint, or a dedicated fallback table if altering `shipping_rules.country_code` nullability is too disruptive. [ASSUMED: executor must verify current DB syntax, generated types, and dependent constraints]
3. Add store-default selection as new state with no migration that nominates an existing profile. Until an admin selects one, unattached/unmatched items remain unsupported. [VERIFIED: closed input; ASSUMED: rollout behavior]
4. Preserve product and variant profile attachments and interpret them through the new resolver; no attachment backfill is required. [VERIFIED: closed input]
5. Preserve the existing pure calculator and change only its input from exact rules to resolved per-line allocations carrying rule and region evidence. [VERIFIED: closed input; ASSUMED: integration recommendation]
6. Deploy schema and read-compatible code before exposing new admin writes. Generated Supabase types should be refreshed after migrations. [ASSUMED: executor verification required]

## Proposed Additive Schema

### Store default

Recommended table: `shipping_store_defaults(id, shipping_profile_id, active, created_at, updated_at)`, where the active row points to an active `shipping_profiles` record. Use a singleton row or a partial unique index enforcing at most one active row. Application/RPC logic must additionally require exactly one active default for configurations that claim shipping readiness. [ASSUMED: PostgreSQL/Supabase syntax and transaction semantics require executor verification]

Do not place an unconstrained `is_default` boolean on every profile unless a partial unique index and atomic replacement transaction are used; otherwise concurrent writes can produce zero or multiple defaults. [ASSUMED: executor verification required]

### Rules

Preferred additive shape for `shipping_rules`: [ASSUMED: executor verification required]

| Column | Purpose | Constraint |
|---|---|---|
| `match_kind` | `exact_country` or `fallback` | non-null enum/check |
| `country_code` | normalized ISO-like two-letter country for exact rules | required for exact; null for fallback |
| `active` | independently disable a rule | non-null default true |
| existing `currency` | market currency | normalized and non-null |
| existing first/additional amounts | current aggregation inputs | retain integer/non-negative constraints |

Required uniqueness: [ASSUMED: exact PostgreSQL expressions require executor verification]

- Unique exact rule per `(shipping_profile_id, country_code, currency)` where `match_kind = 'exact_country'`.
- Unique fallback per `(shipping_profile_id, currency)` where `match_kind = 'fallback'`.
- Lookup index covering active resolution by profile, currency, match kind, and country.
- Foreign key to `shipping_profiles` with deletion behavior chosen to protect historical/admin references.

### Region adjustments

Recommended generic table: `shipping_region_adjustments(id, shipping_rule_id, country_code, region_code, mode, first_item_amount, additional_item_amount, active, created_at, updated_at)`. [ASSUMED: executor verification required]

- `region_code` stores normalized country subdivision codes; the first UI implementation accepts US two-letter state/territory codes. [VERIFIED: closed input; ASSUMED: storage recommendation]
- `mode` is constrained to `surcharge` or `replace`. [VERIFIED: closed input]
- A unique active adjustment should exist per `(shipping_rule_id, country_code, region_code)`. [ASSUMED: executor verification required]
- `surcharge` adds adjustment amounts to the selected base rule; `replace` substitutes the adjustment's first/additional amounts before aggregation. [ASSUMED: precise arithmetic contract; confirm against product intent]
- Amounts should use the same integer units and currency inherited from the parent rule; reject negative values unless the business explicitly approves discounts. [ASSUMED: executor/product verification required]

### Snapshot evidence

Add immutable order-line or order-shipping-allocation snapshot fields sufficient to reconstruct the quote: source tier, profile ID/name snapshot, rule ID, match kind, destination country, currency, base first/additional amounts, region adjustment ID/code/mode/amounts, final first/additional amounts, quantity, and allocated shipping total. [ASSUMED: executor verification required]

## Deterministic Resolver Contract

Input: normalized destination country, currency, optional normalized region, and physical cart lines with product ID, optional variant ID, and quantity. Digital-only lines bypass shipping allocation. [VERIFIED: mixed commerce context from project instructions; ASSUMED: resolver shape]

For each physical line, evaluate candidates in this exact order: [VERIFIED: closed input]

1. Variant profile exact-country rule.
2. Variant profile fallback rule.
3. Product profile exact-country rule.
4. Product profile fallback rule.
5. Active store-default profile exact-country rule.
6. Active store-default profile fallback rule.
7. Unsupported.

Eligibility rules: the profile and selected rule must be active; currency must match; exact country must equal the normalized destination; fallback has no country; inactive records never match. [VERIFIED: closed input; ASSUMED: independent rule-active field]

Once selected, apply at most one active matching region adjustment. `replace` substitutes the rule fees; `surcharge` adds to them. Return a typed allocation with a stable reason/source code and all IDs and monetary inputs. Never silently skip an unsupported physical line or silently switch currencies. [ASSUMED: resolver/error contract; executor verification required]

After all lines resolve, pass final first/additional fees to the existing pure aggregation: charge the highest applicable first-item fee once, then charge additional-item fees according to the existing behavior. [VERIFIED: closed input] Tie-breaking for equal highest first fees must be made deterministic, such as stable cart-line order followed by ID, so snapshot allocation is reproducible. [ASSUMED: executor verification required]

## RPC, Domain, and Type Changes

- Replace or version `get_checkout_shipping_rules` so it returns resolved allocations rather than only exact-country attached rules. Keep the old signature temporarily only if other callers exist. [VERIFIED: current RPC limitation from closed input; ASSUMED: migration recommendation]
- Perform resolver selection in one database transaction/snapshot where possible, returning either all physical lines resolved or a structured unsupported/configuration error. [ASSUMED: executor verification required]
- Define shared TypeScript types for `ShippingMatchSource`, `ShippingRuleMatchKind`, `ShippingRegionMode`, `ResolvedShippingAllocation`, and failure codes. [ASSUMED: implementation recommendation]
- Keep monetary values as integer amounts with explicit currency and validate RPC payloads at the server boundary. [VERIFIED: project instructions for money; ASSUMED: validation placement]
- Ensure final order creation re-runs the authoritative resolver server-side; a browser quote is advisory and must not be trusted as final pricing evidence. [ASSUMED: security recommendation]

**Executor verification required:** confirm Supabase RPC return-type migration behavior, SQL enum-versus-check conventions, RLS interaction with security-definer functions, `search_path` hardening, grants, generated type refresh, and transaction isolation. [ASSUMED]

## Admin Behavior

Admin must support profile parcel-characteristic fields, create/edit/activate/deactivate, exact-country rules, one fallback per currency, region adjustments, product assignment, variant assignment, and atomic store-default replacement. [VERIFIED: locked model and current admin gap; ASSUMED: UI grouping]

Validation must prevent duplicate exact rules, duplicate fallbacks, malformed country/region codes, invalid amounts, inactive default selection, and deleting referenced configuration without an explicit safe policy. Show resolution previews for representative destination/currency/region combinations and warn when no active default exists. [ASSUMED: implementation recommendation]

Default selection must be explicit; migration and initial admin load must not auto-select an existing profile. [VERIFIED: closed input]

## Checkout Behavior

- Country selection triggers an immediate quote without waiting for the full address. [VERIFIED: closed input]
- For US destinations, render a controlled state/territory selector; selection triggers a re-quote. [VERIFIED: closed input]
- If a later destination change materially changes shipping price, support, or selected allocation, require explicit customer confirmation before proceeding. [VERIFIED: closed input; ASSUMED: material-change dimensions]
- Final US submission requires a normalized two-letter state/territory and postal code. [VERIFIED: closed input]
- Use quote request sequencing or cancellation so stale responses cannot overwrite a newer country/state quote. [ASSUMED: implementation recommendation]
- Surface unsupported shipping at line/cart level with a clear recovery path; do not degrade to zero shipping. [ASSUMED: failure recommendation]

## Snapshots, Security, and Failures

The order snapshot must be immutable and include profile, rule, region, and final allocation evidence. [VERIFIED: closed input] Snapshot writes should occur in the same authoritative order-creation transaction as totals so configuration changes after checkout cannot rewrite historical evidence. [ASSUMED: executor verification required]

Admin mutations require server-side admin authorization and database policy enforcement. Public/checkout access should receive only fields needed to quote, while internal notes and unrelated admin data remain hidden. Client-supplied profile IDs, rule IDs, amounts, source tiers, and adjustment modes must be ignored during final pricing. [ASSUMED: security design; executor must verify RLS, grants, function ownership, and security-definer hardening]

Use explicit failure codes for: no active default, unsupported destination, currency mismatch, inactive configuration, invalid country, missing/invalid US region, missing US postal code, stale quote/material change, duplicate configuration, and resolver invariant violation. Fail closed for checkout totals and order creation. [ASSUMED: implementation recommendation]

## Test Matrix

| Area | Required cases |
|---|---|
| Migration/compatibility | existing exact rows preserved; no default auto-created; existing exact-country tests remain green |
| Constraints | duplicate profile/country/currency rejected; second fallback per profile/currency rejected; multiple active defaults rejected; malformed exact/fallback shapes rejected |
| Precedence | all six ordered matches; each higher tier beats lower tiers; inactive profile/rule skipped; unsupported when none match |
| Currency | exact/fallback isolated by currency; no cross-currency selection |
| Regions | US normalized match; no region match; surcharge arithmetic; replace arithmetic; inactive adjustment ignored; duplicate active adjustment rejected |
| Aggregation | highest first fee once; existing additional-item behavior preserved; deterministic equal-fee tie; multiple quantities/profiles |
| RPC/security | all-or-error response; unauthorized admin mutation denied; public fields minimized; forged client amounts/IDs ignored; security-definer/search-path checks |
| Admin | multi-rule CRUD; fallback CRUD; assignment CRUD; atomic default replacement; inactive/default validation; resolution preview |
| Checkout | country immediately quotes; US region re-quotes; stale response ignored; material change confirmation; unsupported state; final normalized region/postal validation |
| Snapshot | exact/fallback/source tier captured; region mode/input/final fees captured; allocation total captured; later config edits do not alter order history |

All matrix entries are implementation recommendations derived from the locked behavior and require executor validation against the existing test framework and schema. [ASSUMED]

## Recommended Five-Plan Dependency Waves

### Wave 1 — Schema and invariants

Plan 08-01: additive migrations for default selection, exact/fallback rule shape, region adjustments, indexes/constraints, snapshot columns, generated types, and migration regression tests. This plan must include explicit PostgreSQL, RLS, grants, and rollback verification. [ASSUMED: planning recommendation]

### Wave 2 — Resolver and calculation contract

Plan 08-02: deterministic database/domain resolver, structured failures, region arithmetic, unchanged aggregation adapter, and exhaustive unit/DB precedence tests. Depends on 08-01. [ASSUMED: planning recommendation]

### Wave 3 — Authoritative checkout/order API

Plan 08-03: versioned RPC/server boundary, quote sequencing contract, final server-side re-resolution, material-change token/evidence, and immutable transactional snapshot. Depends on 08-02. [ASSUMED: planning recommendation]

### Wave 4 — Admin configuration

Plan 08-04: complete profile/rule/fallback/region/default/assignment management with validation and previews. Depends on 08-01 and uses 08-02 for previews. [ASSUMED: planning recommendation]

### Wave 5 — Checkout UX and end-to-end verification

Plan 08-05: immediate country quote, controlled US state/territory re-quote, material-change confirmation, final address validation, unsupported UX, and end-to-end regression/security tests. Depends on 08-03; admin-seeded E2E scenarios depend on 08-04. [ASSUMED: planning recommendation]

## Validation Architecture

Validation should follow a red-green cadence: add the narrow failing test with each behavior, implement until that test passes, then run the broader wave gate. Commands below are recommended contracts; the executor must align script names and Supabase CLI flags with the repository's installed versions before execution. [ASSUMED: executor verification required]

### Fast Per-Task Feedback

| Change type | Fast command | Cadence | Initially fails, then passes |
|---|---|---|---|
| SQL schema, constraints, RLS, resolver RPC | `npx supabase test db` | After every migration or SQL test edit; target the phase pgTAP file if the installed CLI/test harness supports filtering | New pgTAP assertions first fail for absent default/fallback/region objects, uniqueness constraints, precedence, inactive exclusion, snapshots, grants, and RLS; they pass after the corresponding migration/RPC policy is implemented. |
| Resolver, aggregation adapter, domain types | `npm run test -- --run` | After every TypeScript domain change; prefer a single Vitest file while red-green, then the full Vitest run before commit | New Vitest cases first fail for the six-step precedence chain, region surcharge/replace behavior, structured failures, deterministic ties, and snapshot evidence; existing exact-country aggregation tests must continue passing throughout. |
| Static correctness | `npm run lint` and `npm run typecheck` | After each task reaches local green and before every task handoff | Type errors initially expose stale RPC/generated types and incomplete unions; lint/typecheck pass after generated types, exhaustive branches, and imports are corrected. |
| Checkout/admin browser behavior | `npx playwright test <phase-spec>` | Run the narrow phase spec after each completed UI flow; avoid using the full browser suite as the inner loop | New Playwright cases first fail for immediate country quote, US region re-quote, stale-response protection, material-change confirmation, final US validation, unsupported shipping, and admin multi-rule/default/assignment flows; they pass after each flow is wired to the authoritative resolver. |

If the repository lacks one of these scripts or phase test files, Wave 0 of the affected plan must create the smallest compatible config/spec before implementation. Do not silently replace an unavailable validation layer with manual inspection. [ASSUMED: planning recommendation]

### Manual Supabase Remote Push Verification — BLOCKING

Schema push verification is **BLOCKING** for any wave that introduces or depends on migrations. The executor must stop before downstream integration if the target Supabase project cannot accept the migration cleanly. [ASSUMED: release gate]

1. Link/select the intended non-production Supabase project and manually confirm its identity. [ASSUMED: security procedure]
2. Review pending SQL and run `npx supabase db push --dry-run` if supported by the installed CLI; otherwise use the installed CLI's non-mutating migration inspection command. [ASSUMED: exact CLI syntax requires executor verification]
3. With explicit environment confirmation, run `npx supabase db push` against the approved non-production target. [ASSUMED: exact CLI syntax and authorization require executor verification]
4. Re-run `npx supabase test db`, inspect migration status, exercise the resolver RPC with exact, fallback, region, inactive, unsupported, and no-default fixtures, and confirm generated types match the remote schema. [ASSUMED: verification procedure]
5. Record evidence of successful push and checks in the plan summary. A failed push, policy/grant mismatch, destructive diff, wrong target, or unavailable remote access blocks the wave; do not proceed using local-only confidence. [ASSUMED: release gate]

Production push remains outside ordinary test cadence and requires the project's deployment approval path. [ASSUMED: executor verification required]

### Wave Exit Gates

| Wave | Required exit gate |
|---|---|
| Wave 1 — Schema and invariants | New pgTAP tests pass; existing exact-country DB tests pass; lint/typecheck pass after type generation; manual non-production Supabase remote push verification passes. **Schema push is BLOCKING.** |
| Wave 2 — Resolver and calculation | Targeted and full Vitest suites pass; resolver pgTAP cases pass for all precedence, inactive, fallback, region, unsupported, and deterministic allocation branches; existing aggregation fixtures remain unchanged and green. |
| Wave 3 — Checkout/order API | RPC/security pgTAP tests, Vitest integration tests, lint, and typecheck pass; remote resolver smoke checks and immutable snapshot verification pass. Any new migration requires the blocking remote push gate again. |
| Wave 4 — Admin configuration | Admin-focused Vitest/component coverage and narrow Playwright flows pass; DB constraint/RLS tests prove invalid and unauthorized writes fail; default replacement is atomic. Any new migration requires the blocking remote push gate again. |
| Wave 5 — Checkout UX/E2E | Narrow phase Playwright specs pass, then the full Playwright suite passes; full pgTAP, Vitest, lint, typecheck, and production build commands are green; manual UAT confirms quote/re-quote/confirmation/error behavior. |

Per-task commits should require the narrow affected test plus lint/typecheck; per-wave completion requires all tests listed for that wave; phase completion requires all SQL pgTAP, Vitest, lint, typecheck, Playwright, build, and blocking remote schema verification gates to be green with no skipped shipping-critical cases. [ASSUMED: planning recommendation]

## Executor Verification Flags

- Verify exact PostgreSQL partial-index, check-constraint, foreign-key, and atomic-default SQL against the installed Supabase/Postgres version. [ASSUMED]
- Verify RLS policies, RPC grants, function owner, `SECURITY DEFINER` necessity, fixed `search_path`, and least-privilege exposure before deployment. [ASSUMED]
- Verify whether current `shipping_rules.country_code` is nullable and whether changing it affects generated types or existing RPC callers; use a separate fallback table if the compatibility cost is material. [ASSUMED]
- Verify authoritative subdivision code list and accepted US territories before locking validation data. [ASSUMED]
- Verify the exact existing additional-item allocation semantics and reproduce them byte-for-byte in regression fixtures. [VERIFIED: behavior must be preserved; ASSUMED: verification method]

## Assumptions Log

All schema names and implementation mechanisms newly proposed in this report are recommendations, not observed repository facts. The executor must validate them against the live schema, migrations, RLS policies, generated types, and test infrastructure. [ASSUMED]

## RESEARCH COMPLETE
