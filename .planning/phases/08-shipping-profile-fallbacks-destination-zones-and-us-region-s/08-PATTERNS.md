# Phase 8: Shipping Profile Fallbacks, Destination Zones, and US Regions - Pattern Map

**Mapped:** 2026-07-12
**Files analyzed:** 21 likely new/modified files
**Analogs found:** 21 / 21

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `supabase/migrations/<timestamp>_shipping_profile_fallbacks_regions.sql` | migration/RPC | CRUD + request-response | `supabase/migrations/20260615030000_shipping_profiles.sql` | exact |
| `supabase/migrations/<timestamp>_checkout_shipping_allocation_snapshot.sql` | migration/RPC | transactional CRUD | `supabase/migrations/20260618093000_checkout_shipping_address_snapshot.sql` | exact |
| `supabase/tests/database/08_shipping_resolution.test.sql` | database test | CRUD + request-response | `supabase/tests/database/03_checkout_quote.test.sql` | exact |
| `supabase/tests/database/08_shipping_snapshot.test.sql` | database test | transactional CRUD | `supabase/tests/database/03_checkout_model.test.sql` | role-match |
| `src/types/supabase.ts` | generated types | transform | existing generated `src/types/supabase.ts` | exact |
| `src/checkout/shipping.ts` | domain service/types | transform | same file, `calculateShippingQuote` | exact |
| `src/checkout/shipping-resolution.ts` (likely new) | domain service/types | request-response + transform | `src/checkout/quote.ts`, shipping RPC mapping | role/data-flow match |
| `src/checkout/types.ts` | shared types/schema | transform | same file, `CartQuote` and `quoteCartInputSchema` | exact |
| `src/checkout/quote.ts` | server service | request-response + transform | same file, shipping RPC and quote hash | exact |
| `src/checkout/schemas.ts` | validation | transform | existing submit schemas in same file | exact |
| `src/checkout/submit-checkout.ts` | server service | request-response | same file, validated RPC wrapper | exact |
| `src/checkout/admin-shipping-actions.ts` | server actions | CRUD | same file | exact |
| `src/app/admin/shipping/page.tsx` | server page/controller | request-response | same file | exact |
| `src/components/admin/commerce/shipping-profile-form.tsx` | component/form | CRUD | same file | exact |
| `src/components/admin/commerce/shipping-profile-list.tsx` | component/table/list | transform | same file | exact |
| `src/components/admin/commerce/shipping-create-sheet.tsx` | component/provider | event-driven | same file | exact |
| product/variant assignment action + editor files | action/component | CRUD | `src/catalog/variant-actions.ts` and admin variant page | role-match |
| `src/checkout/shipping-address.ts` / `shipping-address-ui.ts` | model/validation utility | transform | same files | exact |
| `src/components/checkout/destination-form.tsx` | component/form | request-response | same file | exact |
| `src/components/checkout/checkout-page.tsx` and `quote-diff-dialog.tsx` | component/state | event-driven | same files | exact |
| Vitest/Playwright Phase 8 tests | tests | transform + request-response | existing shipping, quote-diff, admin-shipping, checkout tests | exact |

## Pattern Assignments

### Shipping schema, constrained resolver RPC, and RLS migration

**Target:** `supabase/migrations/<timestamp>_shipping_profile_fallbacks_regions.sql`
**Analog:** `supabase/migrations/20260615030000_shipping_profiles.sql`

Copy these concrete conventions:

- Tables use UUID PKs, checks, timestamps, and explicit FKs (`shipping_profiles` lines 1-18).
- Ownership tables and rule tables are protected by admin-only RLS policies using `private.is_admin()` (`shipping_profiles` lines 137-159).
- Checkout reads go through a narrow SQL RPC, not direct public table reads: `public.get_checkout_shipping_rules` (`shipping_profiles` lines 161-220).
- Harden callable functions with `security definer` and fixed `set search_path = public, pg_temp` (`shipping_profiles` lines 173-176), then revoke broadly and grant only required callers (`shipping_profiles` lines 222-223).

```sql
create or replace function public.get_checkout_shipping_rules(...)
returns table (...)
language sql
stable
security definer
set search_path = public, pg_temp
as $$ ... $$;

revoke all on function public.get_checkout_shipping_rules(...) from public, anon, authenticated;
grant execute on function public.get_checkout_shipping_rules(...) to anon, authenticated;
```

Extend rather than replace the established objects: preserve `shipping_rules` exact-country rows, `product_shipping_profiles`, and `variant_shipping_profiles`. Follow the existing check-constraint style rather than introducing enums unless generated-type/RPC compatibility clearly benefits. Use partial unique indexes for one active store default, one fallback per profile/currency, and one active region adjustment per rule/country/region. Keep inactive filtering inside the resolver.

### Immutable shipping allocation snapshot and authoritative submit

**Target:** `supabase/migrations/<timestamp>_checkout_shipping_allocation_snapshot.sql`
**Analog:** `supabase/migrations/20260618093000_checkout_shipping_address_snapshot.sql`

Use the existing additive snapshot pattern:

- Add JSONB snapshot/evidence with a shape check (`checkout_shipping_address_snapshot.sql` lines 1-18).
- Add a `before update` trigger that raises SQLSTATE `23000` when immutable evidence changes (`lines 20-40`).
- Replace `public.submit_checkout(jsonb)` in the migration and validate/re-resolve inside the same PL/pgSQL transaction (`lines 42-114`).
- Insert accepted quote, cart, address, and new shipping allocation evidence together (`lines 179-210`).

```sql
if old.shipping_address is distinct from new.shipping_address then
  raise exception 'checkout order shipping address is immutable' using errcode = '23000';
end if;
```

Apply the same trigger pattern to the allocation snapshot. Final submit must ignore browser-supplied profile/rule/amount evidence, invoke the authoritative resolver, compare it to the accepted quote boundary, and persist the resolver output atomically with totals and order lines.

### Database tests

**Targets:** `supabase/tests/database/08_shipping_resolution.test.sql`, `08_shipping_snapshot.test.sql`
**Analog:** `supabase/tests/database/03_checkout_quote.test.sql`

Follow pgTAP structure: `begin`, `select plan(N)`, schema assertions with `has_table`/`col_type_is`, policy/function assertions, `throws_ok` for invalid records, deterministic `results_eq` for precedence, then `select * from finish(); rollback;`. Existing examples: table/type checks lines 3-15, policy check lines 17-22, negative-fee `throws_ok` lines 24-38, constrained RPC assertion lines 40-45.

The Phase 8 matrix should explicitly seed all six precedence tiers, inactive rows, currencies, surcharge/replace adjustments, duplicate defaults/fallbacks/adjustments, no auto-default after migration, all-or-error resolution, and post-order configuration edits that leave snapshot evidence unchanged.

### Generated Supabase types

**Target:** `src/types/supabase.ts`
**Analog:** existing generated declarations consumed by `CheckoutCatalogClient` in `src/checkout/types.ts` lines 3-8.

Regenerate; do not hand-model database rows in this file. Confirm new tables, nullable fallback country shape, RPC arguments, and RPC return allocation fields are present. Application-owned semantic unions remain in checkout domain files.

### Pure shipping domain and resolver types

**Targets:** `src/checkout/shipping.ts`, likely new `src/checkout/shipping-resolution.ts`
**Analog:** `src/checkout/shipping.ts`

Keep the calculator pure and preserve its exact aggregation:

```ts
const units = selectChargeablePhysicalUnits(physicalLines).sort((a, b) => {
  const firstFee = b.firstItemFeeMinor - a.firstItemFeeMinor;
  return firstFee !== 0 ? firstFee : unitSortKey(a).localeCompare(unitSortKey(b));
});

amountMinor:
  firstUnit.firstItemFeeMinor +
  remainingUnits.reduce((total, unit) => total + unit.additionalItemFeeMinor, 0)
```

Source: `src/checkout/shipping.ts` lines 128-151. Extend `ShippingRuleQuote`/`ShippingQuoteLine` (`lines 3-18`) with evidence-rich resolved allocation types; retain discriminated `ShippingQuote` states (`lines 29-51`). Put database row-to-domain normalization and six-tier source codes in a focused resolver module if `shipping.ts` would otherwise mix I/O with arithmetic.

### Quote service, hash, and shared types

**Targets:** `src/checkout/quote.ts`, `src/checkout/types.ts`
**Analogs:** same files

The RPC boundary pattern is `quote.ts` lines 235-274: normalize country, call typed `client.rpc`, fail on RPC error, and map rows into owned camelCase domain objects. Replace the product/variant rule maps with resolved allocations keyed by cart line/product+variant identity. Pass optional normalized region and explicit currency to the versioned RPC.

Quote hashing is centralized in `quoteHash` (`quote.ts` lines 284 onward). Include normalized region and canonical allocation evidence so changes in source tier, rule, region mode, support, or final amounts produce a new hash. Continue using `diffCartQuotes` (`lines 584+`) for material-change derivation.

Extend `quoteCartInputSchema` and `QuoteCartInput` in `types.ts` lines 10-30 with an optional region for preview. Extend the discriminated shipping union (`types.ts` lines 64-99) with allocation evidence/failure codes; do not return a zero placeholder for unsupported physical lines.

### Submit schema and RPC wrapper

**Targets:** `src/checkout/schemas.ts`, `src/checkout/submit-checkout.ts`
**Analog:** `submitCheckout` in `src/checkout/submit-checkout.ts` lines 67-88.

```ts
const parsed = submitCheckoutInputSchema.safeParse(input);
if (!parsed.success) {
  return {status: 'invalid', code: 'invalid_checkout_submit'};
}
```

Preserve discriminated sanitized results (`submit-checkout.ts` lines 5-64), validate normalized US region/postal code only for final physical submit, and forward only address/cart/accepted-hash intent. The database remains responsible for final resolution and snapshot evidence.

### Admin shipping actions

**Target:** `src/checkout/admin-shipping-actions.ts`
**Analog:** same file

Copy the action boundary exactly: `'use server'`, `requireAdmin`, Zod `safeParse`, integer minor-unit conversion, Supabase server client, sanitized result union, monitored failure recording, and `revalidatePath('/admin/shipping')` (`lines 1-58`, 61-105, 108-150).

Add focused actions for profile edit/activation, atomic default replacement, exact/fallback rule CRUD, region adjustment CRUD, and assignment. Prefer an RPC for multi-row/atomic default replacement. Never expose raw database error text; `tests/unit/checkout/admin-commerce-actions.test.ts` lines 111-169 is the concrete redaction contract.

### Admin page, Sheet forms, and profile/rule tables

**Targets:** `src/app/admin/shipping/page.tsx`, files under `src/components/admin/commerce/`
**Analogs:** current shipping page and components

- Server page: call `requireAdmin()` before creating/querying the client; project only required nested shipping fields (`src/app/admin/shipping/page.tsx` lines 16-27).
- Sheet: controlled `open` state, custom trigger, responsive width, and close-on-created callback (`shipping-create-sheet.tsx` lines 9-46).
- Form: `useTransition`, result union state, `FormData`, server action, `router.refresh`, accessible labels, and pending button (`shipping-profile-form.tsx` lines 20-33, 47-92).
- List/table: owned projection types, `formatMoney`, `useMemo` filters, status pills, empty state, and responsive overflow treatment (`shipping-profile-list.tsx` lines 17-46, 115-176).

Refactor the profile form so profile parcel fields are separate from destination-rule forms. Model “Other countries” as fallback in UI copy while keeping internal match-kind terminology out of customer surfaces. Region adjustment editing should be nested under an eligible US rule.

### Product and variant profile assignment

**Targets:** existing catalog action/editor files
**Analog:** `src/catalog/variant-actions.ts`

Follow its server-action convention: `requireAdmin` before mutation (for example lines 136, 177, 204), Zod-owned input schemas, typed results, server Supabase mutation, operational failure sanitization, and path/tag revalidation. Preserve current variant-over-product ownership enforced by database triggers in `20260615030000_shipping_profiles.sql` lines 47-119. UI values should represent either an active profile UUID or “use store default”; do not create a second boolean ownership model.

### Checkout address, immediate re-quote, and material confirmation

**Targets:** `src/checkout/shipping-address.ts`, `shipping-address-ui.ts`, `src/components/checkout/destination-form.tsx`, `checkout-page.tsx`, `quote-diff-dialog.tsx`
**Analogs:** same files

`DestinationForm` already owns address state updates and proposal state (`lines 69-105`), calls `refreshCheckoutQuoteAction` inside a transition (`lines 108-145`), and delegates material acceptance to `QuoteDiffDialog`. Change country selection to quote immediately using country-only validation; for US, render an owned controlled state/territory list and quote again on region selection. Add request sequencing/abort identity so only the latest country/region response can set proposal or accepted quote.

Keep final readiness in `checkout-page.tsx` (`lines 123-146`) and submission payload construction (`lines 168-175`), but add US-specific normalized region and postal checks there and in the server schema. Reuse `QuoteDiffDialog`'s explicit `onConfirm`/`onCancel` contract (`lines 50-85`) and existing `shipping_changed` rendering (`lines 31-46`).

### Vitest tests

**Targets:** extend `tests/unit/checkout/shipping.test.ts`, `quote-diff.test.ts`, `admin-commerce-actions.test.ts`; likely add `shipping-resolution.test.ts` and address tests
**Analogs:** those same tests

Use small typed fixture builders and `satisfies` as in `shipping.test.ts` lines 4-18. Preserve regression assertions for highest-first once (`lines 44-68`), deterministic equal-fee insertion order (`lines 70-87`), unsupported destination without placeholder amount (`lines 89-108`), and digital-only bypass (`lines 110-125`). Add table-driven precedence and region arithmetic tests around the new resolver. Mock `requireAdmin`, Supabase chains, and revalidation with `vi.hoisted` as in `admin-commerce-actions.test.ts`; assert sanitized error facts.

### Playwright tests

**Targets:** extend `tests/e2e/admin-shipping.spec.ts`, `tests/e2e/checkout.spec.ts`, and checkout market-change coverage
**Analogs:** same files

Follow existing fixture seeding/cleanup via REST helpers, semantic locators (`getByRole`, `getByLabel`), and visible user outcome assertions. `checkout.spec.ts` lines 103-147 demonstrates server-backed setup, cart localStorage used only as intent, navigation, accessible interactions, and price assertions. `admin-shipping.spec.ts` is the closest admin Sheet CRUD flow. Add country-only quote, US state re-quote, fallback country, unsupported destination, saved-address reuse, confirmation dialog, stale-response protection, and mobile viewport no-overflow cases.

## Shared Patterns

### Authorization and exposure

Admin page/actions call `requireAdmin` before privileged data access; database tables retain `private.is_admin()` RLS. Checkout gets only the constrained RPC projection. Security-definer functions use fixed `search_path`, explicit revoke, and least-privilege grants.

### Validation and money

Normalize country/region codes at every trust boundary. Use Zod in server actions/services and database checks for invariants. Store all VND/USD values as non-negative integer minor units with explicit currency; never accept browser amounts.

### Errors and observability

Return discriminated status/code objects. Fail closed on unresolved physical lines and invariant failures. Record operational failures through the existing monitored-action wrapper but expose neither SQL errors nor fee/internal-note payloads.

### Transaction and immutability

Atomic configuration changes belong in RPCs when they touch multiple rows. Final order submit re-resolves shipping and writes totals plus complete allocation evidence in one transaction. Immutable evidence uses database triggers, not UI convention.

### UI state

Admin mutations use controlled Sheets, `useTransition`, server actions, and `router.refresh`. Checkout uses controlled address state, latest-request-wins quote updates, and the existing proposal/confirm/cancel material-change boundary.

## No Analog Found

None. The store-default and region-adjustment concepts are new, but every implementation role has a strong local structural analog. Their business rules should come from `08-SPEC.md`/`08-RESEARCH.md`, while their code shape should follow the assignments above.

## Metadata

**Analog search scope:** only Phase 8 artifacts and directly relevant shipping, checkout, order snapshot, catalog assignment, admin UI, Vitest, pgTAP, and Playwright files.
**Primary analogs:** 20 local files.
**Pattern extraction date:** 2026-07-12.

## PATTERN MAPPING COMPLETE
