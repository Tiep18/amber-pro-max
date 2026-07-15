---
quick_id: 260715-nuj
status: planned
created_at: '2026-07-15T17:24:00+07:00'
description: Audit and refine every ProductForm child section for coherent density, alignment, responsive layout, and lower validation shift without changing editor behavior
must_haves:
  truths:
    - Content, pricing, organization, SEO, publish, and basics share one light editorial hierarchy without repeated heavy nested surfaces or disconnected status blocks.
    - Child layouts respond to their actual narrow main-column width beside the 300px desktop rail; pricing and organization never force fixed multi-column content into an undersized column, including at 375px and narrow desktop widths.
    - Field-level validation reserves a small natural error line so common errors do not move every following control, while longer messages wrap and expand normally without clipping or hiding.
    - Validation paths and messages, error element IDs, role=alert, aria-invalid, aria-describedby, locale routing, and validation focus behavior remain unchanged.
    - All form state, draft shape/mutation, event handlers, save/publish behavior, button semantics, section IDs/order, scrollspy refs/data attributes/ARIA, and responsive navigation behavior remain unchanged.
    - Interactive controls touched by this refinement retain or reach a minimum 44px target without making content disappear behind tabs, collapses, fixed heights, or overflow clipping.
  artifacts:
    - src/components/admin/catalog/product-form.tsx
  key_links:
    - A same-file FieldError presentation slot keeps the existing error ID and role only when an error exists, while a min-height wrapper stabilizes the normal one-line case and aria-describedby continues to point to the same conditional ID.
    - Content and SEO reuse the same small same-file field/subpanel presentation helpers while retaining their locale state, tab IDs/ARIA, field IDs, paths, and update handlers.
    - Pricing and organization replace viewport-driven fixed grids with intrinsic or later-breakpoint layouts that fit the actual editor column beside the rail without changing mapped data or handlers.
    - Basics and publish reuse the same visual language while retaining product status, readiness calculations, shipping workflow, links, save/publish controls, and scrollspy contracts.
---

# Quick Task 260715-nuj: Audit and refine every admin product-form section

## Goal

Finish the section-level refinement that commit `16e21258` began. Keep the lighter outer workspace, then remove remaining nested-panel clutter, repair child grids that assume more width than the rail layout provides, align controls and statuses consistently, and reduce field-error layout shift. This is a presentation-only refactor inside `product-form.tsx`.

## Prioritized findings

1. **Pricing and organization use viewport breakpoints inside a rail-constrained column.** At `lg`, the outer editor already reserves 300px for the desktop rail, but pricing switches to fixed `1fr + 160px + 220px + 150px` columns and taxonomy switches to three columns. On narrow desktop widths the child content can become cramped or overflow even though the viewport breakpoint has fired.
2. **Conditional field errors move all following content.** `FieldError` currently returns `null` until validation fails. Content and SEO each have three stacked fields, and each pricing row embeds the same conditional error inside a vertically centered four-column row; one error changes row height and recenters sibling controls. The publish `productId` alert is a separate large conditional block with the same abrupt insertion.
3. **Content and SEO still look like cards inside cards.** Both locale panels repeat a large muted fill, padding, heading, explanation, labels, and errors inside the already framed `EditorFormSection`. SEO adds a detached three-button toolbar, so hierarchy and spacing differ from content despite nearly identical localized-field structure.
4. **Organization repeats four dense selector boxes without a clear grouping rhythm.** Categories, techniques, and tags can each render chips, a search input, and up to eight result rows in narrow columns; collections and display-order rows then introduce additional bordered blocks. Natural result growth must remain, but surfaces, headings, alignment, and target sizes can be made consistent.
5. **Publish presents four equally weighted readiness fills plus optional validation, shipping, and workflow links in one flat stack.** The information is correct but lacks primary/secondary grouping, and long readiness copy wraps unevenly when two columns are forced into a narrow editor column.
6. **Several local controls are below the requested target size.** Locale tabs and pricing controls use `min-h-10`, search results have padding-only sizing, and SEO helper actions explicitly use `min-h-9`. These should be normalized to at least `min-h-11` while retaining their labels and handlers.

## Task 1 - Stabilize validation rhythm and unify localized field panels

**Files**

- `src/components/admin/catalog/product-form.tsx`

**Action**

- Refine the existing module-level `FieldError` into a presentation slot with a small `min-height`, not a fixed height. When a message exists, render the same `<p>` ID, exact text, `role="alert"`, and destructive styling; when absent, render no live-region/error element inside the reserved wrapper. Allow wrapping and natural growth, with no line clamp, hidden overflow, absolute overlay, or fixed-height clipping.
- If useful, add one small module-level `SectionSubpanel` or field-shell helper in this file to standardize a light divider/surface, heading rhythm, and content gap. Keep helpers presentation-only: no form state, path derivation, validation decisions, data transformation, or event handling may move into them.
- Apply the shared presentation rhythm to both localized content and SEO panels. Reduce the large nested muted-card effect, align their locale controls and panel inset consistently, and keep all existing locale variables, IIFEs or equivalent render scope, tab roles/IDs/`aria-controls`/`aria-labelledby`, field IDs, labels, values, and update handlers.
- Preserve every `aria-invalid` and conditional `aria-describedby` expression exactly in behavior: it must remain false/undefined without an error and point to the same `${fieldDomId(path)}-error` ID with an error.
- Make locale tabs and SEO helper actions at least 44px high, keep visible focus, and let controls wrap naturally at 375px. Do not rename actions, change tab selection, generate/copy/summarize handlers, or introduce a tab/collapse architecture beyond the existing locale tabs.

**Verify**

- `npx.cmd eslint src/components/admin/catalog/product-form.tsx`
- `npm.cmd run typecheck`
- Inspect `git diff 16e21258 -- src/components/admin/catalog/product-form.tsx` and confirm all content/SEO changes are helpers, markup grouping, and presentation classes; validation strings, paths, IDs, ARIA expressions, and handlers are unchanged.

**Done**

- Content and SEO have matching editorial field structure; common one-line errors occupy an already reserved natural slot, longer errors remain fully visible, and all localized validation/focus/ARIA contracts are intact.

## Task 2 - Repair pricing and organization alignment at real column widths

**Files**

- `src/components/admin/catalog/product-form.tsx`

**Action**

- Replace the pricing row's brittle `lg:grid-cols-[1fr_160px_220px_150px]` arrangement with a stacked/intrinsic layout that responds to the available editor-column width rather than the global viewport alone. Keep each mapped market, label/currency, toggle, price input, readiness text, values, paths, `updateOffer` calls, number conversion, and rendering order.
- Align pricing content from the top so a wrapped validation message never vertically recenters unrelated market/toggle/status content. Reuse the stable error slot, lighten repeated borders/fills, and normalize the toggle and price control to at least 44px without changing pressed state, `aria-label`, enabled styling meaning, or input semantics.
- Refine `OptionMultiSelect` and `OptionChip` presentation in place: establish a consistent light subpanel/header/result-row rhythm; keep selected chips, empty copy, query filtering, eight-result limit, and add/remove handlers exactly unchanged. Do not hide results behind disclosure, cap their content height, or introduce internal scrolling to mask natural growth.
- Replace taxonomy's unconditional `lg:grid-cols-3` with an intrinsic `auto-fit/minmax` or safely staged layout so categories, techniques, and tags become one, two, or three columns according to actual available width. Give collections and display-order controls a clear secondary grouping while preserving collection IDs, order memory, labels, values, and handlers.
- Ensure selector result buttons, chip remove controls, price/toggle controls, and display-order inputs touched here provide at least 44px targets. Do not overlap enlarged hit areas or reduce keyboard focus visibility.

**Verify**

- `npx.cmd eslint src/components/admin/catalog/product-form.tsx`
- `npm.cmd run typecheck`
- `npm.cmd run test:unit -- tests/unit/admin/product-form-scrollspy.test.ts`
- Inspect the source at 375px-equivalent single-column rules and at the rail-constrained `lg` state: no child grid may require fixed widths wider than its parent, and dynamic selector/error content must remain naturally visible.

**Done**

- Pricing remains aligned before and after errors, organization adapts without cramped three-column selectors or horizontal overflow, all natural selector results remain visible, and every data/handler/validation contract is unchanged.

## Task 3 - Complete basics/publish hierarchy and verify the whole editor contract

**Files**

- `src/components/admin/catalog/product-form.tsx`

**Action**

- Bring the basics status block into the same light subpanel language and avoid forcing its fixed 220px companion column at a breakpoint where the editor's main column is narrow. Keep product type options/value/update handler and saved/new/current-status copy unchanged.
- Recompose publish presentation into clear readiness, fulfillment, and next-workflow groups using only same-file markup/classes. Use an intrinsic readiness grid so long labels wrap consistently according to available width. Keep all readiness booleans and copy, `ShippingAssignmentSheet` props/condition, unsaved physical-product notice, and media/variant links and hrefs unchanged.
- Route the existing `productId` message through the same stable error-slot presentation where feasible, retaining the exact ID, message, `role="alert"`, first-issue navigation, heading fallback, and focus behavior. Do not suppress the error or reserve a fixed clipped box.
- Review the complete diff and preserve without modification: `editorSections`, section IDs/order/headings, `scroll-mt-[var(--product-form-anchor-offset)]`, `mobileNavigatorRef`, form `data-scrollspy-*` attributes/style, `aria-current`, `navigateToSection`, `navigateToField`, locale routing, `showValidationIssues`, all state/calculations, `saveDraft`, `publishProduct`, server-action calls, result handling, button types/disabled conditions, payloads, and accessible labels.
- Do not alter the desktop rail/mobile navigator/mobile action-bar architecture established by `16e21258`; this task refines child sections only.

**Verify**

- `npx.cmd eslint src/components/admin/catalog/product-form.tsx`
- `npm.cmd run typecheck`
- `npm.cmd run test:unit -- tests/unit/admin/product-form-scrollspy.test.ts`
- `npm.cmd run build`
- `npx.cmd playwright test tests/e2e/admin-product.spec.ts`
- `git diff --check`
- Inspect the complete source diff from `16e21258` through the task commits and confirm it contains only the allowed same-file presentation/helper changes.

If local Supabase, the authenticated fixture, or browser infrastructure is unavailable, record the focused Playwright gate as unverified instead of editing/skipping tests. Static checks, unit tests, and build must still pass.

**Done**

- Every ProductForm child section follows one coherent hierarchy at 375px and desktop widths; validation does not cause avoidable field-stack or row realignment; no form, scrollspy, accessibility, save/publish, domain, or responsive-workspace behavior changed.

## Boundaries

- Source scope is only `src/components/admin/catalog/product-form.tsx`; small module-level presentation helpers are allowed only in that file.
- No new package, global CSS/token, shared UI component, admin layout, hook, schema, action, API, database, fixture, or test change.
- No collapse, accordion, new tabs, hidden error/result content, line clamp, fixed-height error region, overflow clipping, or scroll container used to conceal content.
- Preserve exact validation paths/messages, error IDs, `role="alert"`, `aria-invalid`, conditional `aria-describedby`, field labels, event handlers, data shape, save/publish behavior, section IDs/order, scrollspy refs/data attributes/ARIA, navigation/focus behavior, and minimum 44px targets.
- Preserve the user-owned `.gitignore` and `next-env.d.ts` modifications without staging, formatting, or editing them.

## Recommended execution order

Task 1 -> Task 2 -> Task 3. Establish shared error/panel rhythm first, repair the two highest-risk constrained grids next, then finish the simpler sections and run full contract verification.
