---
quick_id: 260716-ojr
status: planned
created_at: '2026-07-16T18:00:00+07:00'
description: Redesign and harden the admin product variants workspace with target-stable editing, explicit market and inventory semantics, focused tests, and browser verification
must_haves:
  truths:
    - Admin edits one explicit variant at a time in a responsive master-detail workspace and can identify the selected SKU, stock, order, market state, and unsaved state at a glance.
    - Switching a saved variant or starting New inside the editor never silently discards an edited draft; refresh/tab close receives a native beforeunload warning, and destructive removal requires contextual confirmation.
    - Every asynchronous save/remove result is bound to the variant ID and operation token that started it, so a late response cannot overwrite or remove a newly selected draft.
    - Variant attributes are authored as non-empty key/value rows and are accepted only when every trimmed key and value is a non-empty string and keys are unique; serialization is deterministic.
    - Each market has exactly three authorable meanings: inherit the parent offer by omitting the row, use a custom enabled variant price, or explicitly make the variant unavailable with a disabled row.
    - Product-level and variant-level inventory remain mutually exclusive. Existing product stock continues to block explicit variant creation with wrong_inventory_owner until the admin resolves product-level inventory through the existing policy outside this task.
    - The aggregate save RPC remains admin-authorized and atomic, preserves commit 7326ff00's valid-published-state behavior, safely demotes an invalid final aggregate, and rejects malformed attributes at the database boundary.
    - Removing the final variant returns the UI to product-level inventory setup with no invented stock; removing a missing/stale variant does not report success.
    - Variant shipping overrides continue to inherit product assignment and then store default when absent; this task does not change shipping precedence, profile eligibility, or resolver behavior.
    - At 375px and desktop widths, fields and validation messages do not overlap, clip, or unpredictably re-align; controls have visible focus, selected/pressed semantics, and at least 44px targets.
    - Linked-remote browser evidence uses only an exact run-owned fixture, keeps secrets server-side, and proves exact fixture absence after cleanup.
  artifacts:
    - supabase/migrations/20260716*_harden_catalog_variant_aggregate.sql
    - supabase/tests/database/02_atomic_catalog_variant_save.test.sql
    - src/catalog/variant-attributes.ts
    - src/catalog/variant-schemas.ts
    - src/catalog/variant-actions.ts
    - src/catalog/variant-pricing.ts
    - src/components/admin/catalog/variant-editor.tsx
    - src/app/admin/catalog/[productId]/variants/page.tsx
    - tests/unit/catalog/variants.test.ts
    - tests/e2e/admin-variants.spec.ts
  key_links:
    - VariantEditor converts key/value rows to the canonical attribute record before save; variantAggregateDraftSchema and public.admin_save_catalog_variant independently enforce the same string-only, non-empty contract.
    - The market mode control maps inherit to no variant_market_offers row, custom to enabled=true with the market currency and entered minor units, and unavailable to enabled=false; resolveEffectiveVariantPrice remains the display authority.
    - VariantEditor captures target ID plus immutable draft snapshot for each operation and accepts completion only for the matching operation token; router refresh reconciles successful server-owned state without retargeting another draft.
    - VariantEditor uses ConfirmationDialog for dirty in-editor selection changes and removal, plus beforeunload only for refresh/tab close; arbitrary SPA link interception is outside this task.
    - Removal uses an affected-row result and final-variant UI reconciliation; it never creates product inventory or transfers the deleted quantity.
---

# Quick Task 260716-ojr: Redesign and harden the admin product variants workspace

## Goal

Turn `/admin/catalog/[productId]/variants` into a calm, responsive operational workspace while closing the state and domain gaps found in the approved audit. Keep existing authorization, atomic aggregate saves, publish invariants, market currencies, shipping inheritance, and inventory XOR ownership authoritative. Do not add generated combinations, exchange-rate conversion, automatic stock allocation, or a new component library.

## Visual direction

- Use the existing warm admin tokens, typography, Button/Input/Card conventions, and Radix-backed primitives. Lighten the current card-inside-card presentation into a compact summary, a clear variant navigator, and one active editor surface.
- Desktop: an asymmetric master-detail grid with a compact SKU/stock/status navigator at left and Basics, Inventory, Market availability/pricing, and Parcel profile sections at right. Keep the action row visible near the active draft without covering focused content.
- Mobile: a compact selected-variant control/list followed by the same flat sections and a wrapping/sticky-safe action bar. Do not hide required fields or validation inside accordions.
- Prefer module-level focused subcomponents and pure helpers over one monolithic render body. Avoid speculative memoization; use derived booleans, functional state updates, Maps for repeated lookups, and operation refs/tokens where they materially prevent rerenders or stale completions.

## Linked-remote evidence protocol

Before changing `variant-editor.tsx`, create the baseline. Load `.env.local` only in a server-side fixture/browser launcher and never print, serialize, screenshot, or forward secret values. Require the HTTPS Supabase project ref derived from `NEXT_PUBLIC_SUPABASE_URL` to match `supabase/.temp/project-ref`. Treat `SUPABASE_SECRET_KEY` as opaque: preflight with an `apikey`-only zero-row REST query and never place it in `Authorization: Bearer` or alias it as a JWT service-role credential.

Create one confirmed ephemeral admin user, exact `user_roles` row, and one draft `physical_finished` product with VI/EN translations, VN/INTL parent offers, primary media metadata, two variants with inventory, one inherited market, one custom market, and one explicitly disabled market. Journal only run ID, project ref, and user/product/child UUIDs in an untracked recovery file; never store credentials, tokens, cookies, or raw responses. Capture matching baseline and after states at 1440x1000 and 375x812 into a run-scoped OS temporary directory outside tracked project artifacts: page top, selected variant editor, validation errors, tri-state market controls, dirty-switch dialog, remove dialog, and mobile action area. Keep the fixture read-only between the matching baseline and after captures except for dedicated post-capture UAT.

Inspect every temporary screenshot at original resolution and record the visual findings in the quick task `SUMMARY.md`/verification record, not as tracked image artifacts. In a `finally` path, close the browser and only the recorded local server PID, delete the exact product (allow owned catalog children to cascade), exact role row, and exact Auth user. Prove exact product/variant/inventory/offer/assignment/role queries are empty and Auth Admin GET is absent/404 before deleting the journal. Then delete both temporary baseline/after directories and prove their paths are absent. Never use prefix-, email-domain-, bucket-, or time-range cleanup. If data or image cleanup cannot be proved, retain the ID-only journal and mark the task blocked rather than claiming completion.

## Task 1 - Harden the variant aggregate, attributes, market modes, and removal result

**Files**

- `supabase/migrations/20260716*_harden_catalog_variant_aggregate.sql`
- `supabase/tests/database/02_atomic_catalog_variant_save.test.sql`
- `src/catalog/variant-attributes.ts`
- `src/catalog/variant-schemas.ts`
- `src/catalog/variant-actions.ts`
- `src/catalog/variant-pricing.ts`
- `tests/unit/catalog/variants.test.ts`

**Action**

- First execute the remote preflight, create/journal the fixture, build/run the unchanged `7326ff00` source on an isolated recorded port, and capture the matching baseline images. On any early failure, enter exact cleanup immediately; do not leave an unowned fixture.
- Add a shared pure attribute module for the admin flow that validates/normalizes a plain record of trimmed, non-empty string keys and values, sorts keys deterministically, and converts between the persisted record and stable key/value editor rows. Keep legacy malformed rows fail-safe and unavailable to save until corrected; do not silently coerce arrays, numbers, booleans, nested objects, blank keys, or blank values to strings.
- Replace the unsafe `Record<string,string>` cast in `variant-schemas.ts` with field-addressable validation. Prefer a typed attribute record at the action boundary; if serialization is retained for compatibility, parse once and return explicit safe paths/codes for SKU, attributes, display order, stock, and market price. Reject duplicate market entries and enforce the fixed VN/VND and INTL/USD mapping.
- Model market state explicitly as `inherit | custom | unavailable`. Serialize inherit by omitting the row, custom as `enabled=true` with nonnegative minor-unit price, and unavailable as `enabled=false` with the correct currency and a database-compatible price value. Keep `resolveEffectiveVariantPrice` semantics unchanged: any present disabled row blocks parent fallback.
- Append a migration after `20260716100000_preserve_published_atomic_variant_save.sql`; never edit the committed migration. Replace `public.admin_save_catalog_variant(jsonb)` while retaining fixed `search_path`, security-definer/admin check, authenticated-only execution, row locks, ownership/re-parenting rejection, full rollback, and the final publish-issues restore/demote behavior from `7326ff00`.
- At the RPC boundary, reject missing/empty/non-object attributes and every non-string/blank key/value before writes. Preserve the existing wrong_inventory_owner rejection when product-level inventory exists and leave the ownership policy unchanged.
- Make `removeVariantAction` return `variant_not_found` when the exact product/variant pair affected no row. Preserve admin authorization, sanitized monitoring, cache invalidation, FK protection, aggregate error mapping, and all existing split actions outside this focused change.
- Add pgTAP cases for malformed attributes, existing wrong-inventory-owner blocking, rollback after late failure, existing-variant rejection, valid published preservation, and invalid final aggregate demotion. Add Vitest cases for key/value normalization and canonical ordering, all three market modes, safe field errors, action payloads, missing-row removal, and no sensitive values in monitoring.

**Verify**

- `npm.cmd run db:reset`
- `npm.cmd run db:lint`
- `npm.cmd run db:test`
- `npm.cmd run db:types`
- Regenerate `src/types/supabase.ts` a second time and require no further diff; retain the file only if the generated output actually changes.
- `npm.cmd run test:unit -- tests/unit/catalog/variants.test.ts`
- `npx.cmd eslint src/catalog/variant-attributes.ts src/catalog/variant-schemas.ts src/catalog/variant-actions.ts src/catalog/variant-pricing.ts tests/unit/catalog/variants.test.ts`
- `npm.cmd run typecheck`

**Done**

- Attributes and tri-state offers have one validated/canonical admin and database contract; stale removal is honest; wrong_inventory_owner continues to block conflicting product stock; and all publication, authorization, and inventory ownership invariants are preserved.

## Task 2 - Build a target-stable responsive master-detail editor

**Files**

- `src/components/admin/catalog/variant-editor.tsx`
- `src/app/admin/catalog/[productId]/variants/page.tsx`
- `src/catalog/variant-attributes.ts`
- `tests/unit/catalog/variants.test.ts`

**Action**

- Recompose `VariantEditor` into module-level presentation sections and pure model helpers while keeping one client boundary. Add a compact summary for variant count, total stock, and availability issues; a semantic variant navigator with selected styling, `aria-pressed`/current state, SKU, stock, and order; and one active editor divided into Basics, Attributes, Inventory, Market availability/pricing, and Parcel profile.
- Replace raw JSON editing with repeatable key/value rows. Support add/remove row, clear labels, stable row IDs, inline errors that reserve a natural one-line rhythm without clipping longer messages, and deterministic serialization. At least one complete pair is required. Keep image, display order, stock, and shipping inputs unchanged in meaning.
- Store a canonical saved baseline per selected/new draft and derive `isDirty`; do not mirror derived booleans in effects. Intercept only switching a saved SKU and choosing New variant inside the editor with a `ConfirmationDialog` when dirty. Cancel keeps the exact draft and focus; confirm discards and selects the captured destination. Register `beforeunload` only while dirty so refresh/tab close receives the browser-native warning, and remove the listener when clean/unmounted. Do not claim interception of Back to product, arbitrary SPA links, or Next.js route changes without a shared routing blocker in scope. Disable Save when unchanged/invalid or explain why; provide a clear reset/cancel action.
- Introduce a typed `Operation` and monotonically increasing token/ref like the proven MediaManager pattern. Capture immutable `{targetId, draft}` at save/remove start. Ignore late mismatched completion, update `variantList` with functional setters by target ID, and never read mutable current selection inside the completion. Keep browsing locked only where needed to prevent ambiguity, identify the pending target in button/live-region text, catch unexpected action rejection, and refresh authoritative server data only after success.
- Require contextual confirmation before removing a saved variant. After removing the final variant, switch to product inventory setup with a publishing warning and quantity zero/null; do not copy deleted stock. When product-level inventory already exists, keep explicit-variant creation unavailable, show its current stock, and explain that the admin must resolve product-level inventory through the existing policy before variants can be created. Product inventory save and wrong_inventory_owner remain server-authoritative.
- Render each market as one three-way mode control: Inherit parent, Custom price, Unavailable. Show the effective result and source beside it; reveal the price input only for Custom, use tabular figures/minor-unit guidance, and preserve the explicit disabled row for Unavailable. Errors stay local to the affected market and do not re-center its siblings.
- Keep `ShippingAssignmentSheet` for saved variants only and preserve variant -> product -> store-default inheritance copy and callbacks. A shipping save updates only the captured variant ID in local state.
- Make desktop master-detail and mobile selector/action layouts responsive with no fixed child grid wider than its container, no nested heavy card stack, no hidden required state, 44px targets, visible focus, live feedback, and no horizontal overflow. Use existing tokens and components; add no dependency, speculative animation system, or variant virtualization.

**Verify**

- `npm.cmd run test:unit -- tests/unit/catalog/variants.test.ts`
- `npx.cmd eslint src/components/admin/catalog/variant-editor.tsx src/app/admin/catalog/[productId]/variants/page.tsx`
- `npm.cmd run typecheck`
- Component-level/manual checks: dirty saved-SKU switch cancel/discard, dirty New selection cancel/discard, beforeunload listener present only while dirty, late save/remove target stability, field-level attribute/market errors, product-stock blocking/explanation, final-variant removal reconciliation, unchanged shipping inheritance display, keyboard-only navigation, and 375px `scrollWidth <= clientWidth`.

**Done**

- The editor is visibly lighter and easier to scan on desktop/mobile; selected and dirty state are unmistakable at the supported boundaries; validation is aligned; mutations are target-stable; removal is explicit; and shipping, market, inventory, and publication semantics remain authoritative.

## Task 3 - Update focused contracts and verify local plus linked-remote behavior

**Files**

- `tests/e2e/admin-variants.spec.ts`
- `tests/unit/catalog/variants.test.ts`
- `supabase/tests/database/02_atomic_catalog_variant_save.test.sql`

**Action**

- Update the focused Playwright journey to the current aggregate success contract: expect `Variant saved` once rather than stale split-action messages. Create at least two variants before asserting reorder, cover custom and explicit-unavailable markets plus inherited fallback, verify inline validation, dirty saved-SKU/New confirmation boundaries, remove confirmation, beforeunload registration behavior, final-variant product-inventory state, and authoritative database rows after each relevant step. Add a separate product-inventory fixture/assertion proving explicit variant creation stays blocked and current stock guidance is visible.
- Keep the spec's admin fixture safe for its supported environment. Do not map an opaque `sb_secret_*` key into a bearer service-role variable. If adapting the fixture to `apikey`-only Auth Admin/REST can be isolated and verified without weakening existing CI JWT support, support both credential shapes explicitly; otherwise leave CI fixture transport unchanged and use the bounded manual linked-remote protocol for this task.
- Re-run all local database, focused unit, lint, type, and production-build gates. Review `git diff` specifically for preserved admin checks, currency mapping, publish restore/demote branch, wrong_inventory_owner and inventory XOR constraints, unchanged shipping precedence, revalidation, and sanitized monitoring. These local gates must pass before any linked migration operation.
- Only after local gates pass, run `supabase migration list --linked`, then a linked dry-run. Require the linked project ref to match the preflight and the dry-run to contain only the new expected migration before `supabase db push --linked`. Stop on any unexpected pending migration or target mismatch.
- Build/start the final source on the same isolated recorded port and capture all matching after images against the retained fixture before mutating it. Inspect every temporary baseline/after image at original resolution; require no clipped labels/errors/actions, no overlap, no horizontal overflow, coherent selected/pending/dirty state, and materially lower card/surface clutter at both viewports. Summarize the comparison in `SUMMARY.md`/verification, then delete both temporary image directories and prove their paths are absent.
- Execute remote UAT only against the journaled fixture: edit/save each market mode, trigger and cancel dirty switch, confirm a save, reorder the two variants, verify exact inventory/offer/attribute rows and product status, open/cancel removal confirmation, and verify shipping inheritance display. Avoid destructive final removal if it would reduce comparison evidence until screenshots are complete. Always execute exact cleanup/proof in `finally`.

**Verify**

- `npm.cmd run db:reset`
- `npm.cmd run db:lint`
- `npm.cmd run db:test`
- `npm.cmd run test:unit -- tests/unit/catalog/variants.test.ts`
- Focused ESLint for every changed TypeScript/TSX/test file
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `npx.cmd playwright test tests/e2e/admin-variants.spec.ts` when its documented fixture credential contract is available; otherwise record the incompatibility and rely on the authenticated bounded remote journey without weakening credentials.
- Linked migration list/dry-run/push with exact project-ref and pending-set assertions
- Original-resolution review of every temporary baseline/after desktop and mobile image plus DOM geometry, keyboard, console, failed-network, and `scrollWidth <= clientWidth` checks; findings recorded in `SUMMARY.md`/verification, then both image directories deleted with absence proved
- Exact remote fixture/storage/Auth absence proof and removal of the secret-free recovery journal
- `git diff --check`

**Done**

- Focused contracts match the aggregate UI and cover the repaired state transitions; local database/unit/lint/type/build gates pass; the expected migration alone is applied to the authorized linked project; browser evidence proves the redesigned flow at desktop/mobile; and every run-owned remote row, object, role, and user is absent after cleanup.

## Boundaries

- Build on commit `7326ff00`; append migrations only and preserve its published-product regression coverage.
- No generated variant combinations, bulk editor, pagination/virtualization, exchange-rate conversion, automatic stock copy/split, shipping resolver change, product schema redesign, or new UI/runtime dependency.
- Never trust browser-submitted prices, currencies, ownership, admin role, product status, or shipping resolution. Server action and database constraints remain authoritative.
- Existing product-level stock continues to block variant creation through wrong_inventory_owner; the UI only exposes the current value and existing-policy guidance. After final variant removal, product inventory remains absent until separately saved.
- Keep `.env.local` unchanged and untracked. Never echo secrets, expose them to the browser, store them in artifacts, send opaque secret keys as bearer JWTs, kill an unrecorded process, or broad-delete remote data.
- Preserve unrelated working-tree changes. Screenshots live only in a run-scoped OS temporary directory, are summarized then deleted, and recovery journals remain untracked until exact cleanup is proved.

## Recommended execution order

Task 1 -> Task 2 -> Task 3. Capture the old UI before the first source edit, establish authoritative data contracts next, build the editor against those contracts, then push only the verified migration and run the final browser/cleanup gate.
