---
quick_id: 260716-xaq
status: planned
created_at: '2026-07-16T23:58:00+07:00'
description: Redesign the complete admin product variants workspace with stronger hierarchy, compact scannable rows, logical editing groups, responsive states, and unchanged commerce behavior
must_haves:
  truths:
    - The workspace has one clear page identity and one dominant editing surface; the product title, inventory mode, aggregate counts, current variant, and primary next action are understandable without repeated headings or disconnected summary blocks.
    - Saved variants are scannable as compact rows showing SKU, canonical attributes, display order, stock, and concise market availability, with selected, dirty, pending, and keyboard-focus states that do not rely on color alone.
    - The active draft is organized into logical Identity and attributes, Inventory and merchandising, Market availability and pricing, and Fulfillment groups, with the frequently edited controls appearing before secondary shipping configuration.
    - Save, reset, and remove actions remain discoverable while scrolling on desktop and mobile, never cover focused content, respect safe-area insets, and retain their current validation, pending, confirmation, and target-bound semantics.
    - Product-level inventory, first-variant creation, and no-variant states explain the mutually exclusive inventory choice with a polished empty state and an unambiguous primary action; no stock is copied, inferred, or transferred.
    - The complete workspace fits at 375px without document horizontal overflow, clipped validation, inaccessible horizontal-only navigation, or undersized targets, and uses the existing warm admin tokens rather than a new visual system.
    - Inherit, custom, and unavailable market modes, human-unit price parsing, fixed currencies, parent-offer fallback, product/variant inventory XOR, shipping precedence, atomic aggregate save, operation tokens, dirty/discard protection, and removal behavior are unchanged.
    - The pre-existing uncommitted changes in src/components/admin/catalog/product-form.tsx remain untouched.
  artifacts:
    - src/components/admin/catalog/variant-editor.tsx
    - src/components/admin/catalog/numeric-stepper.tsx
    - src/app/admin/catalog/[productId]/variants/page.tsx
    - tests/e2e/admin-variants.spec.ts
  key_links:
    - ProductVariantsPage supplies the same server-owned product, offer, inventory, variant, media, and shipping data to the redesigned VariantEditor; only page width and presentation framing change.
    - VariantEditor derives navigator summaries and section states from variantList, parentOffers, canonical attribute helpers, and existing price resolvers without adding persistence fields or new requests.
    - NumericStepper keeps its parsing and accessibility contract while accepting presentation-level density/class adjustments needed by the new inventory and merchandising group.
    - The redesigned action dock calls the existing saveVariant, reset selection, remove confirmation, and product inventory handlers without changing their operation token, immutable target snapshot, validation, or aggregate action boundaries.
---

# Quick Task 260716-xaq: Redesign the complete admin product variants workspace

## Goal

Turn the current functional but visually flat variants page into a polished admin workspace that is fast to scan and comfortable to edit all day. Improve information hierarchy, density, grouping, responsive behavior, empty states, and action placement only; preserve every commerce, validation, async safety, inventory, pricing, and shipping rule already implemented by quick tasks `260716-ojr` and `260716-w20`.

## Audit findings

- The page header already names the workflow, but `VariantEditor` repeats the product type and product title immediately below it. This creates two competing page identities while the important mode and current-variant state remain visually weaker.
- The three aggregate metrics are a detached strip with a narrow maximum width. They do not participate in the workspace header and leave unused space on desktop.
- The navigator is a horizontal card rail on small screens and a lightly differentiated stack on desktop. Rows show only SKU, order, and stock; canonical attributes and market state are absent, so similar variants are difficult to distinguish quickly.
- The editor is one long white surface where Basics, Attributes, Inventory, Pricing, and Parcel profile all receive equal visual weight. The high-frequency SKU/attributes/stock/order/price controls are separated by large vertical gaps, while secondary parcel configuration pushes Save/Reset/Remove to the very bottom.
- Each market renders three full-width mode buttons and a nested muted card, making two simple market decisions taller and heavier than necessary. Effective price and source are visually disconnected from the choice that produced them.
- Dirty state appears in multiple small badges but actions remain out of view during most edits. The result is status repetition without a persistent, clear completion path.
- The product-inventory branch explains the rule correctly but reads like a generic form rather than a deliberate empty/mode-selection state. The zero-variant/new-variant state also lacks an inviting first-step composition.
- The recently improved numeric behavior is sound and must remain intact. Only optional density/layout hooks in `NumericStepper` are appropriate; parsing, stepping, field labels, errors, 44px targets, and integer payload conversion are out of scope for redesign.

## Visual direction

- Use the existing warm admin surfaces, border tokens, typography, Button/Input primitives, and `lucide-react`. Favor one paper-like editor surface, subtle dividers, restrained tinted status chips, and whitespace that separates workflows instead of nested cards.
- Desktop (`lg+`): a full-width workspace header followed by a stable `260-288px` navigator and a flexible editor. Keep the navigator sticky beneath the admin header and the draft action dock sticky near the bottom of the viewport without overlaying content.
- Tablet/mobile: use a compact workspace header and an in-flow, vertically scannable variant picker. Avoid making horizontal scrolling the only way to find a variant. The editor stays single-column and the action dock uses safe-area padding.
- Lead with operational information: SKU and attributes identify the item; stock/order/media are merchandising operations; market price/availability is the next decision; parcel profile is secondary fulfillment configuration.
- Prefer CSS and existing primitives. Add no component library, animation system, database field, migration, Supabase mutation, or runtime dependency.

## Scope guardrails

- Do not edit `src/components/admin/catalog/product-form.tsx`; it contains pre-existing uncommitted user changes and this workflow does not require it.
- Do not change `src/catalog/variant-actions.ts`, `src/catalog/variant-schemas.ts`, `src/catalog/variant-numeric.ts`, Supabase migrations, RLS, RPCs, or page queries. A type-only import adjustment is acceptable only if required by extracted presentation props.
- Preserve current accessible names used by focused browser coverage where the underlying operation is unchanged: `Variant SKU`, attribute labels, `Variant display order`, `Quantity on hand`, market group/radio names, `Save variant`, `Reset`, `Remove`, and product-inventory actions.
- Preserve the exact mode serialization: inherit omits an override, custom submits an enabled fixed-currency integer minor-unit price, and unavailable submits the existing disabled row. Keep variant -> product -> store-default shipping precedence.
- Preserve a single aggregate variant save, immutable operation target, monotonic operation token, stale-completion rejection, functional state updates, dirty canonicalization, beforeunload registration, switch confirmation, remove confirmation, and final-variant reconciliation.

## Task 1 - Recompose the page shell, workspace header, navigator, and empty states

**Files**

- `src/app/admin/catalog/[productId]/variants/page.tsx`
- `src/components/admin/catalog/variant-editor.tsx`

**Action**

- Widen only this admin page shell to a practical workspace width (approximately `1180-1280px`) while retaining the existing Back to product link and `AdminPageHeader`. Treat the page header as the single page identity; remove the duplicated product title/type block from inside `VariantEditor`.
- Add a compact workspace header inside `VariantEditor` that joins, rather than stacks, the current inventory mode, saved variant count, total stock, market issues, dirty/pending state, and the main `New variant` action. Use short text, icons/status dots where useful, tabular figures, and responsive wrapping; do not repeat the page title.
- Replace the current detached three-column metric strip and horizontal-card navigator with a coherent master column. Each saved-variant row must expose:
  - SKU as the primary label;
  - a canonical, truncated attribute summary from the existing normalized attributes;
  - stock and display order as compact metadata;
  - a concise derived availability indicator for Vietnam and International based on the existing effective price resolver;
  - selected (`aria-pressed` or equivalent), keyboard focus, dirty target, and operation-pending states with text/icon/border cues in addition to color.
- Keep rows at least 44px high, prevent long SKU/attributes from widening the grid, and retain deterministic display-order/SKU sorting. On desktop, use a sticky bounded navigator with its own safe vertical overflow for larger lists. On mobile, use an in-flow compact list or native disclosure/select pattern that exposes every saved variant without requiring a horizontal-only carousel; do not hide stock/order/selection state.
- Make `New variant` a clear toolbar action and an intentional empty-state action rather than a dashed pseudo-row. When a dirty draft blocks it, continue routing through the existing captured discard confirmation.
- Redesign the product-level inventory branch and the zero-saved-variant branch as calm choice/empty states: explain why product stock and explicit variant stock are mutually exclusive, show current product stock when present, make the allowed primary path visually dominant, and retain the existing warning plus disabled-state policy. Never offer automatic stock conversion or claim a product inventory row exists before it is saved.
- Keep all derived summaries local and cheap. Use existing variant list data and helper functions; do not introduce client fetching, duplicated server state, effect-driven derived state, speculative memoization, or a global store.

**Verify**

- `npx eslint src/app/admin/catalog/[productId]/variants/page.tsx src/components/admin/catalog/variant-editor.tsx`
- `npm run typecheck`
- Inspect the diff to confirm the page query/props and every selection, dirty, operation-token, product-inventory, and final-removal branch are behaviorally unchanged.

**Done when**

- The workflow has one clear heading hierarchy, aggregate state reads as part of the workspace, every saved variant can be distinguished quickly from the navigator, and product/no-variant states provide a confident next step on desktop and mobile.

## Task 2 - Rebuild the active draft into logical groups with a persistent action path

**Files**

- `src/components/admin/catalog/variant-editor.tsx`
- `src/components/admin/catalog/numeric-stepper.tsx`

**Action**

- Replace the five equally weighted vertical sections with four clearly ranked groups inside one editor surface:
  1. **Identity and attributes** — active/new eyebrow, draft SKU/title, dirty badge, SKU, repeatable attribute rows, and variant image. Render attributes as compact aligned rows with clear column labels on wider screens, row-local labels on mobile, an icon-only remove action with tooltip/accessible label, and an understated Add attribute action. Preserve stable row IDs, natural error height, canonical validation, and at least one row.
  2. **Inventory and merchandising** — quantity on hand as the dominant control, followed by display order and media/preview context in a responsive two/three-column composition. Keep `+5/+10`, direct typing, arrow keys, zero bound, error semantics, and human-sized targets. Add presentation hooks to `NumericStepper` only if required for compact placement; do not change parsing, normalization, stepping, or accessible naming.
  3. **Market availability and pricing** — place Vietnam and International in a responsive two-column comparison at wide widths. Turn each tri-state choice into a restrained segmented control with a compact result header containing market, effective formatted price/unavailable status, and source. Reveal the existing human-unit price input only for Custom and keep its field error local. Ensure long source/error text wraps without changing sibling alignment or market semantics.
  4. **Fulfillment** — retain `ShippingAssignmentSheet` and its exact saved-variant gating/callback behavior in a visually secondary section after pricing. For new drafts, use a polished locked state explaining that the variant must be saved once; do not fabricate an assignment.
- Add a draft action dock associated with the active article. On desktop it may be sticky within the editor viewport; on mobile it should remain reachable with `position: sticky` and safe-area spacing, without covering the last field, dialogs, or browser UI. Show concise live text for Saved, Unsaved changes, validation needed, and the exact pending target. Keep Reset secondary, Remove destructive and separated, and Save primary; preserve current disabled logic and confirmation flows.
- Reduce nested surface noise: one principal editor/card, subtle group dividers, muted backgrounds only for selected summaries or choice states, consistent `16/20/24px` spacing rhythm, tabular numeric alignment, and no gratuitous gradients, shadows, or animations. Use transitions only for focus/hover/state changes already supported by reduced-motion-safe CSS.
- Break large presentation blocks into module-level focused components within `variant-editor.tsx`, or one adjacent presentation-only module if the editor becomes harder to maintain. Keep the single client state owner and pass data/actions down; do not distribute authoritative draft or operation state across independent hooks/components.
- Retain the global feedback alert but place it close to the workspace header/action path so success or failure is noticed without displacing the selected field. Use the existing live regions and never expose raw server/database messages.

**Verify**

- `npx eslint src/components/admin/catalog/variant-editor.tsx src/components/admin/catalog/numeric-stepper.tsx`
- `npm run typecheck`
- `npx vitest run tests/unit/catalog/variants.test.ts`
- Keyboard/manual inspection: tab order follows visual order; attribute add/remove, all three market modes, numeric arrows/buttons, Reset, Save, Remove, navigator selection, dirty switch, and dialogs remain fully operable.
- State inspection: formatting-only numeric blur remains clean; invalid numeric/price/attribute/SKU state remains dirty and blocks Save; shipping completion updates only its captured variant; late aggregate completions cannot retarget the selected draft.

**Done when**

- Frequent variant work reads top-to-bottom as identity -> inventory/merchandising -> sales markets -> fulfillment, pricing can be compared without excessive vertical travel, and Save/Reset/Remove remain clear throughout editing while all existing semantics stay intact.

## Task 3 - Lock visual hierarchy, responsive behavior, and unchanged domain contracts

**Files**

- `tests/e2e/admin-variants.spec.ts`
- `tests/unit/catalog/variants.test.ts` only if a new pure presentation/summary helper requires focused coverage

**Action**

- Update the focused Playwright journey only where the final accessible structure intentionally changes. Prefer the existing role/label contracts for fields and operations rather than class or DOM-shape selectors.
- Retain all current authoritative assertions: product-level inventory, first explicit variant, attributes, reorder, stock, VND/USD human-unit price entry and exact integer persistence, inherited/custom/unavailable market behavior, dirty cancel/discard, keyboard selection, reset, contextual remove, final-variant product-inventory reconciliation, and database rows.
- Add focused UI assertions for the new layout:
  - one page/workspace title hierarchy with no duplicated product title block;
  - navigator rows expose SKU, attribute summary, stock/order, selected state, and market availability;
  - `New variant` and the sticky action dock remain reachable in both saved and empty states;
  - editor group headings appear in logical order and Save is not hidden behind the fulfillment content;
  - dirty and pending state names the active/operation target;
  - no clipped/overlapping controls, action-overlay obstruction, or horizontal document overflow at `375x812`, a mid-width viewport, and `1280x900`.
- Use Playwright DOM geometry for overflow/action-obstruction and take temporary screenshots for original-resolution review if helpful, but do not commit generated images. Inspect the product inventory empty state, populated navigator, pricing comparison, validation state, dirty action dock, and mobile flow.
- Run against one matched Supabase environment. If local is used, reset first and ensure the built public Supabase variables, Auth fixture, REST assertions, and runtime all target that local project. Do not mutate the linked remote project for this presentation-only task.
- Review the final diff specifically for unchanged aggregate action count, integer numeric conversion, override serialization, inventory ownership, shipping precedence/captured owner callback, operation token checks, beforeunload lifecycle, selection confirmation, and remove reconciliation. Confirm `src/components/admin/catalog/product-form.tsx` is absent from the task diff.

**Verify**

- `npm run db:reset`
- `npx vitest run tests/unit/catalog/variants.test.ts`
- `npx eslint src/app/admin/catalog/[productId]/variants/page.tsx src/components/admin/catalog/variant-editor.tsx src/components/admin/catalog/numeric-stepper.tsx tests/e2e/admin-variants.spec.ts tests/unit/catalog/variants.test.ts`
- `npm run typecheck`
- `npm run build`
- `npx playwright test tests/e2e/admin-variants.spec.ts --project=chromium`
- `git diff --check`
- `git diff --name-only <task-base> -- src/components/admin/catalog/product-form.tsx` returns no task-authored diff; preserve its pre-existing working-tree modification exactly.

**Done when**

- The complete variants workspace is materially easier to scan and edit at desktop, tablet, and 375px; empty, selected, dirty, invalid, pending, success, and destructive states are polished and unambiguous; focused browser/database assertions still prove the same commerce behavior; and all lint, unit, type, build, E2E, responsive, and diff gates pass without touching the user's `product-form.tsx` changes.

## Recommended execution order

Task 1 -> Task 2 -> Task 3. Establish the workspace hierarchy and navigator first, fit the active draft and action dock into that structure second, then adjust role-based contracts and verify the unchanged domain behavior at all target widths.
