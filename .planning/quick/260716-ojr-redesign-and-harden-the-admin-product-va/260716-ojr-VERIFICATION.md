---
quick_id: 260716-ojr
status: human_needed
verified_at: '2026-07-16T18:43:00+07:00'
verified_commits:
  - f6a932ec
  - 5b7c12db
  - c8f22e3c
  - 7eeab256
  - c3157be9
  - e8e1f08f
---

# Verification: redesign and harden the admin product variants workspace

## Result

`human_needed`

No remaining source-code gap was found against the task must-haves. The four gaps from the first verification are resolved. Completion still needs a human-authorized linked migration push and a successful authenticated Playwright run in an environment whose public Supabase build variables match the fixture project.

## Prior gap re-verification

| Prior gap | Status | Evidence |
|---|---|---|
| Database attribute contract differed from the app contract | Resolved | Append-only migration `20260716210000_reject_noncanonical_variant_attributes.sql` moves the verified `20260716190000` implementation behind a private, non-executable helper and validates the public boundary first. It rejects non-object/empty records, non-string or blank values, leading/trailing whitespace on keys and values, and trimmed-key collisions before entering the aggregate. The public wrapper retains `security definer`, fixed `search_path`, `private.is_admin()`, authenticated-only execution, and delegates the unchanged atomic/publish behavior. pgTAP adds leading/trailing key, leading/trailing value, trim-collision, accepted canonical record, and exact persistence cases. |
| Variant labels were not canonical across consumers | Resolved | `variantAttributesLabel` normalizes/sorts through the shared attribute helper and is now used by `VariantSelector`, `AddToCart`, and checkout quote mapping. Unit coverage proves both input key orders produce `brown / small` and malformed/empty input falls back to SKU. No raw variant-attribute `Object.values` remains outside the canonical helper. |
| Shipping completion could update the newly selected variant | Resolved | `ShippingAssignmentSheet.saveAssignment` captures `owner`, selected profile, and preview before the transition. The server call and `onSaved` receive that immutable `ownerAtStart`; `VariantEditor` updates draft only when the active ID matches and always updates the variant list by the captured ID. Unit coverage proves a late completion changes only its operation-start variant. |
| Focused source coverage omitted editor state guards | Resolved in source | The E2E spec now covers dirty New-selection cancel/discard, dirty and clean `beforeunload`, inline SKU/attribute errors, disabled invalid save, keyboard selection with `aria-pressed`, contextual removal, final-variant reconciliation to product inventory with zero local input, and 375px no-horizontal-overflow. Existing assertions retain two-variant reorder, aggregate success, custom/unavailable rows, parent fallback display, inventory, and exact offer rows. The standard browser runner was attempted but did not complete an authenticated journey, so execution remains human-needed rather than passed. |

## Must-have assessment

| Must-have | Status | Evidence |
|---|---|---|
| Responsive master-detail workspace and visible selected/dirty/stock/order/market state | Satisfied in source and prior bounded browser evidence | Compact summary, responsive navigator/editor grid, selected styling, `aria-pressed`, stock/order labels, effective market source, and saved/unsaved badge remain present. Prior 1440x1000 and 375x812 evidence recorded no final overflow or clipping. |
| Dirty selection protection, refresh/tab warning, and destructive confirmation | Satisfied | Confirmation dialogs and conditional `beforeunload` are present; focused E2E source now asserts cancel/discard and dirty/clean listener behavior. |
| Async aggregate and shipping results stay target-bound | Satisfied | Aggregate save/remove use immutable target snapshots plus monotonic tokens. Shipping now captures the assignment owner and values at operation start; late-target unit coverage is present. |
| Canonical non-empty string attributes at app and database boundaries | Satisfied | Shared app normalizer and public RPC now enforce compatible canonical records; pgTAP covers malformed, whitespace, collision, accepted, and persisted records. |
| Exact inherit/custom/unavailable market semantics | Satisfied | Inherit omits the row, custom uses enabled/correct currency/price, unavailable stores a disabled row and blocks parent fallback. |
| Product/variant inventory XOR and no stock invention | Satisfied | No ownership policy or stock allocation was added. Existing product stock still blocks variant inventory; final removal changes only UI setup state and creates no product inventory row. |
| Published aggregate behavior from `7326ff00` preserved | Satisfied locally | The new public validator delegates to the unchanged hardened aggregate helper. Local pgTAP retains valid-published preservation and invalid-final demotion cases. |
| Stale removal reports not found | Satisfied | Exact delete returns selected IDs and maps an empty result to `variant_not_found`; focused unit coverage remains. |
| Shipping inheritance precedence unchanged | Satisfied | No resolver, profile eligibility, or variant -> product -> store-default precedence change was introduced. |
| Responsive/accessibility source evidence | Satisfied | `min-w-0`, responsive grids, horizontal navigator containment, visible focus, radio/pressed semantics, inline error rhythm, 44px controls, keyboard E2E source, and 375px width assertion are present. |
| Exact remote cleanup | Satisfied by recorded evidence | All Playwright retry fixtures, exact role/Auth/product children, run-owned server PIDs, temporary environment files, screenshots, and journals were reported cleaned with exact absence proofs. No broad cleanup was used. |

## Verification gates

- Orchestrator rerun: local database reset passed.
- Orchestrator rerun: full pgTAP passed, 839 tests.
- Independent rerun: `npm.cmd run test:unit -- tests/unit/catalog/variants.test.ts` passed, 37/37.
- Independent rerun: focused ESLint for the changed E2E, attribute, shipping, editor, storefront, cart, and quote files passed.
- Orchestrator rerun: typecheck passed.
- Independent rerun: `git diff --check` passed.
- `supabase migration list --linked` independently confirms three local-only dependent migrations: `20260716100000`, `20260716190000`, and `20260716210000`.
- Playwright was attempted in run-owned local/remote environments but did not retain the admin session because the built public Supabase environment did not match the fixture project. It did **not** pass and is not claimed as executed coverage.

## Human actions required

1. Run `tests/e2e/admin-variants.spec.ts` with build/runtime public Supabase variables pointing to the same supported fixture project, then retain the successful runner result. Do not weaken the JWT/opaque-secret credential contract.
2. Explicitly authorize pushing the ordered linked migration set `20260716100000`, `20260716190000`, and `20260716210000`, or reconcile the remote history first. The safe pending-set guard correctly prevented an unapproved multi-migration push.

Until those two external/environment actions complete, the code is locally verified but the overall quick task remains `human_needed`.
