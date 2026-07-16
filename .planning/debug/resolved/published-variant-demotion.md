---
status: resolved
trigger: "Adding a valid new variant through the aggregate admin save flow can silently demote an already-published product to draft."
created: 2026-07-16
updated: 2026-07-16
---

# Published variant demotion

## Symptoms

- expected: Saving a complete new variant aggregate (variant, inventory, optional market overrides, shipping assignment) keeps an already-published product published when the final catalog state remains publishable.
- actual: The product can be demoted to draft while the aggregate save is still inserting the new variant before its inventory row exists.
- errors: No user-visible database error; the save reports success while product status changes.
- timeline: Present in the current aggregate variant RPC and publish-invariant trigger interaction; discovered during the variants audit on 2026-07-16.
- reproduction: Start with a publishable published physical product, call admin_save_catalog_variant for a valid new variant with stock, then inspect products.status after the RPC completes.

## Current Focus

- hypothesis: Confirmed and fixed. The variant-insert trigger observed the transient missing-inventory state; the aggregate RPC now evaluates the authoritative final state before deciding whether to restore or demote a product that entered the transaction as published.
- test: Add a complete new variant to a publishable published product and assert it remains published; save an aggregate against an invalid published catalog state and assert it is safely demoted with its publish issue intact.
- expecting: The valid final aggregate remains published, while the invalid final aggregate remains draft.
- next_action: Resolution verified; no remaining action in this debug scope.
- reasoning_checkpoint: The product row remains locked for the aggregate transaction. Only products that were published at lock acquisition are reconciled, and restoration occurs exclusively when the final `catalog_publish_issues` result is empty.
- tdd_checkpoint: TDD mode is disabled, but focused pgTAP regression coverage was added and executed against a clean local migration reset.

## Evidence

- timestamp: 2026-07-16
  checked: `product_variants_preserve_publish_invariant_insert` and `admin_save_catalog_variant(jsonb)`
  found: The AFTER INSERT trigger invokes `catalog_publish_issues` before the aggregate RPC inserts the variant inventory row, demoting an otherwise valid published product to draft. The original RPC never reconciles status after inventory is present.
  implication: The persisted draft status is caused by transaction ordering, not by an invalid completed aggregate.

- timestamp: 2026-07-16
  checked: Product and inventory ownership locks plus catalog invariant triggers
  found: The RPC locks the product row before any aggregate write. Related writes that could invalidate publication must synchronize through the same product update path, while the final publish-issue query evaluates the completed aggregate in the current transaction.
  implication: Final-state reconciliation can preserve correctness without weakening the global automatic-demotion invariant.

- timestamp: 2026-07-16
  checked: Clean local migration reset and `02_atomic_catalog_variant_save.test.sql`
  found: All migrations apply successfully and all 24 focused pgTAP assertions pass, including proof that the invalid fixture enters the RPC published, valid published preservation, invalid final-state demotion, rollback, ownership, grants, inheritance, and explicit-disabled override behavior.
  implication: The fix closes the regression and preserves the existing aggregate security and commerce contracts.

## Eliminated

- hypothesis: Remove or disable the publish-invariant trigger during aggregate saves.
  reason: That would weaken protection for other write paths and create a broader privileged bypass. Final-state reconciliation inside the already-admin-checked atomic RPC is narrower and testable.

- hypothesis: Always restore the product to published after inventory is inserted.
  reason: A completed aggregate can still have unrelated publish issues. Restoration is allowed only when `catalog_publish_issues` is empty; otherwise an originally published product is explicitly demoted.

## Resolution

- root_cause: `admin_save_catalog_variant` inserted the variant before its inventory record. The existing AFTER INSERT invariant trigger correctly detected that transient invalid state and demoted the product, but the aggregate RPC never reconciled status after the complete valid state existed.
- fix: Added an append-only replacement of `admin_save_catalog_variant` that captures whether the locked product began published, writes the full aggregate, then restores published only when the final publish-issue set is empty and explicitly demotes when it is not.
- verification: Clean local `supabase db reset --local --no-seed` completed with the new migration; focused pgTAP passed 24/24; `git diff --check` passed.
- files_changed: `supabase/migrations/20260716100000_preserve_published_atomic_variant_save.sql`, `supabase/tests/database/02_atomic_catalog_variant_save.test.sql`, `.planning/debug/resolved/published-variant-demotion.md`.
