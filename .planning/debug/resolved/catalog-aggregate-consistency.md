---
status: resolved
trigger: "Implement the accepted P1 audit items: product/variant aggregate saves must not partially persist, and admin editor loaders must not turn query failures into destructive empty snapshots."
created: 2026-07-14
updated: 2026-07-14
---

# Debug Session: Catalog Aggregate Consistency

## Symptoms

- Expected behavior: Saving a product or variant is atomic from the admin's perspective, and opening an editor either loads a complete trustworthy snapshot or shows an explicit recoverable error.
- Actual behavior: Product base data, translations, taxonomy, collections, offers, variants, overrides, and inventory are written through multiple independent requests. Later failures leave a partial aggregate. Several editor loaders ignore individual Supabase query errors and normalize missing results to empty arrays, which can then be saved back destructively.
- Error messages: Some child-write failures return a generic save error after earlier writes already committed; loader failures can be silent and present as legitimate empty state.
- Timeline: Present in the current Phase 02 admin catalog actions and editor page loaders, confirmed by the 2026-07-14 audit.
- Reproduction: Force a later translation/relation/offer write to fail after the product base update, or force one editor relation query to fail while the page itself continues rendering; observe partial persistence or an empty editable section.

## Current Focus

- hypothesis: Confirmed and fixed. Product and variant aggregates now each have one database transaction boundary, while every admin catalog editor loader fails closed before editable state renders.
- test: Force late child-write failures in both aggregate RPCs, verify the complete prior snapshots remain unchanged, and verify the editor invokes only the aggregate variant action.
- expecting: Product and variant rollback regressions pass, missing variant overrides inherit the parent, explicit disabled overrides remain disabled, and no loader error becomes an empty editable section.
- next_action: Resolution verified; no remaining action in this debug scope.
- reasoning_checkpoint: Both RPCs are security-definer functions with fixed search paths, explicit admin checks, restricted grants, stable error mapping, and one-call Server Action/UI contracts. Variant ownership is protected by an early locked check plus a conflict-update owner predicate that closes the concurrent-create race.
- tdd_checkpoint: TDD mode is disabled globally, but rollback and loader-error regressions are required alongside the fix.

## Evidence

- timestamp: 2026-07-14
  checked: `src/catalog/actions.ts` and `src/catalog/variant-actions.ts`
  found: Related rows are mutated through sequential Supabase calls; there is no transaction spanning the aggregate, and variant override removal errors can be separated from the base variant save result.
  implication: A reported failure does not imply that no state changed, so retries and admin recovery are unsafe.

- timestamp: 2026-07-14
  checked: Admin catalog edit and variant page loader code
  found: Multiple query results are consumed via `data ?? []` or equivalent without checking every `error` field.
  implication: Operational/database failures are indistinguishable from valid empty state and may be overwritten by the next save.

- timestamp: 2026-07-14
  checked: `public.admin_save_catalog_product(jsonb)`, `saveProductDraftAction`, and `02_atomic_catalog_product_save.test.sql`
  found: Product base, bilingual translations, market offers, taxonomy, and collection membership now execute in one PostgreSQL transaction; a deliberately late foreign-key failure rolls back the base update, translations, offers, and prior relation deletes.
  implication: A failed product save no longer leaves a partial aggregate, and a retry starts from the unchanged prior snapshot.

- timestamp: 2026-07-14
  checked: Product form/options, catalog list, media editor, variant editor, and shipping-assignment loaders
  found: Every consumed Supabase result now passes through `assertCatalogAdminQueryResults`; failures are sanitized into operational monitoring and route to the catalog error boundary with Retry/Return actions.
  implication: Query failure can no longer masquerade as legitimate empty editable state.

- timestamp: 2026-07-14
  checked: Focused TypeScript/ESLint/unit gates and clean local database reset plus full pgTAP suite
  found: TypeScript and focused ESLint pass; focused catalog unit tests pass 42/42; `supabase db reset && supabase test db` passes 32 files and 778 assertions (one disposable rehearsal intentionally skipped).
  implication: The completed product/loader slice is verified against all migrations, RLS/function grants, P0 invariant changes, and the broader database contract.

- timestamp: 2026-07-14
  checked: `public.admin_save_catalog_variant(jsonb)`, `saveVariantAggregateAction`, and `VariantEditor.saveVariant`
  found: Variant base data, the complete desired override set, and variant inventory now commit through one RPC. The editor calls one aggregate action instead of base, per-market override, and inventory actions.
  implication: A Save variant result now represents the whole aggregate rather than whichever sequential child write happened last.

- timestamp: 2026-07-14
  checked: Variant rollback, price inheritance, disabled override, and owner-boundary regressions
  found: A late negative-inventory failure rolls back base and override mutations; absent overrides delete the explicit row and inherit the parent; disabled rows stay explicit; existing IDs cannot be re-parented. The upsert conflict predicate also rejects a concurrent different-owner insert race.
  implication: Variant retries are safe and cannot mutate another product's variant aggregate.

## Eliminated

- hypothesis: Cache revalidation is the root cause.
  reason: Revalidation can make stale reads visible but cannot explain committed partial writes or query errors normalized to empty arrays.

## Resolution

- root_cause: Product and variant aggregate ownership existed only in sequential application orchestration, and editor loaders treated failed Supabase results as valid empty collections.
- fix: Added admin-checked transactional product and variant RPCs, routed each aggregate save through one Server Action, replaced the VariantEditor child-action loop, and introduced a monitored fail-closed query boundary plus recoverable catalog error UI.
- verification: TypeScript and focused ESLint pass; focused catalog unit tests pass 42/42; clean local database reset plus all pgTAP tests pass 32 files and 778 assertions; `git diff --check` passes.
- files_changed: `src/catalog/actions.ts`, `src/catalog/variant-actions.ts`, `src/catalog/variant-schemas.ts`, `src/catalog/admin-query-results.ts`, catalog admin loaders/error UI, `src/components/admin/catalog/variant-editor.tsx`, generated Supabase types, migrations `20260714200000` and `20260714210000`, and focused unit/pgTAP regressions.
