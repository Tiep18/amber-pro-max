---
quick_id: 260715-nkp
status: planned
created_at: '2026-07-15T17:05:00+07:00'
description: Refine the admin ProductForm into a compact, light editorial workspace without changing catalog behavior or the completed scrollspy contract
must_haves:
  truths:
    - Product sections read as flatter, lighter editorial panels with controlled vertical rhythm and a restrained active treatment that does not overpower field content.
    - The mobile section navigator, desktop rail, and mobile/desktop action areas form one clean responsive workspace at desktop sizes and at a 375px viewport without horizontal overflow.
    - Every section ID, anchor-offset class, sticky measurement ref, scrollspy data attribute, aria-current state, navigation handler, validation-focus path, and section order remains unchanged.
    - Save and publish handlers, button types/disabled rules, payloads, draft mutation, validation, pricing, taxonomy, shipping, persistence, and authorization behavior remain unchanged.
    - Product section navigation targets retain accessible labels, visible keyboard focus, and a minimum 44px hit target.
  artifacts:
    - src/components/admin/catalog/product-form.tsx
  key_links:
    - EditorFormSection keeps its existing section/heading semantics and CSS anchor offset while only its presentation classes and spacing are refined.
    - SectionNavigation keeps editorSections, aria-current, onNavigate, readiness, and error-count wiring while replacing the heavy filled active row with a quieter editorial indicator.
    - The form root, mobileNavigatorRef wrapper, desktop sticky aside, and mobile fixed action bar retain their existing scrollspy and submit/publish wiring while their surfaces and spacing become lighter and more compact.
---

# Quick Task 260715-nkp: Refine the admin product form into a light editorial workspace

## Goal

Polish only the presentation of `ProductForm` into a compact, calm admin workspace. Reduce heavy card/shadow/fill treatment, clarify hierarchy through typography, rules, spacing, and subtle state cues, and keep the responsive navigation/action surfaces coherent. This is a class-level UI refinement, not an editor architecture or business-flow change.

## Task 1 - Flatten section panels and quiet the section navigation

**Files**

- `src/components/admin/catalog/product-form.tsx`

**Action**

- Refine `EditorFormSection` presentation only: keep the `<section>` ID, `aria-labelledby`, heading ID/tabIndex, `scroll-mt-[var(--product-form-anchor-offset)]`, readiness/error rendering, and child structure exactly intact. Make the card visually flatter with a light paper/surface background, low-contrast border, no lifted shadow, a quieter divider, and slightly tighter but still comfortable header/content padding and gaps.
- Replace the current large filled active-card and filled-number treatments with a restrained editorial cue, such as a persistent slim edge/rule plus a subtle border or surface shift. Keep the active state plainly perceivable without relying on shadow alone, and do not change `isActive` calculation.
- Refine `SectionNavigation` classes only: retain the ordered `editorSections.map`, buttons, `type="button"`, `aria-current`, `onNavigate`, readiness/error indicators, labels, and focus ring. Use a lighter active row with a narrow accent marker and stronger text instead of a full accent fill; keep inactive hover readable, preserve error/success distinction, and retain `min-h-11` so every navigation target remains at least 44px high.
- Tighten local section stacking and internal spacing consistently, but do not hide, collapse, reorder, or convert any fields or sections into tabs/accordions.

**Verify**

- `npx.cmd eslint src/components/admin/catalog/product-form.tsx`
- `npm.cmd run typecheck`
- `npm.cmd run test:unit -- tests/unit/admin/product-form-scrollspy.test.ts`

**Done**

- All six sections have a flatter, lighter hierarchy and restrained active state; navigation remains keyboard-visible, semantically unchanged, and at least 44px tall; the diff contains presentation-class changes only in the section/navigation render paths.

## Task 2 - Refine the responsive workspace rail and action surfaces

**Files**

- `src/components/admin/catalog/product-form.tsx`

**Action**

- Refine the form-level spacing and two-column proportions to feel more compact and editorial while preserving the current single-column mobile flow and sticky desktop rail. Keep the `<form>` submit handler, `data-scrollspy-*` attributes, CSS custom property, and all result alerts unchanged.
- Restyle the `mobileNavigatorRef` wrapper and its inner surface with a lighter border, smaller shadow or no shadow, controlled padding, and clear current-section hierarchy. Keep the ref on the same visible sticky wrapper, `sticky top-20`, Sheet state/trigger label, active section copy, readiness summary, and `navigateToSection` wiring unchanged.
- Restyle the desktop sticky aside as a flatter rail: reduce visual weight in its header, separators, navigation area, and action cluster while retaining the aside breakpoint/sticky geometry, scrollability, title/status/readiness/blocker content, links, and both button handlers and disabled conditions.
- Restyle the mobile fixed action bar as a thin, legible utility surface with safe-area padding and a subtle top separation. Keep both buttons, labels, icons, types, handlers, disabled conditions, fixed positioning, and two-column layout; ensure the 375px viewport has no horizontal overflow and both actions remain at least 44px tall.
- Do not alter props, state, business calculations, event-handler bodies, section IDs/order, refs, scrollspy observability attributes, accessible labels, or any imports unless an import becomes unused solely because of presentation markup simplification. Do not touch any other source file or the user-owned `.gitignore` and `next-env.d.ts` changes.

**Verify**

- `npx.cmd eslint src/components/admin/catalog/product-form.tsx`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `npx.cmd playwright test tests/e2e/admin-product.spec.ts`

If the existing local Supabase/browser prerequisites are unavailable, record the Playwright gate as unverified rather than weakening or skipping the test. Static checks and the production build must still pass.

**Done**

- Desktop and 375px layouts present a cleaner sticky navigator/rail/action system without overflow or reduced target sizes; existing Scrollspy, validation navigation, save/publish, draft, and authorization contracts remain intact and the source diff is confined to `product-form.tsx` presentation.

## Boundaries

- No new dependency, global CSS/design-token change, shared component rewrite, admin layout change, test rewrite, schema/action/API/database change, or catalog-domain modification.
- No tabs, collapsibles, accordions, hash/history behavior, renamed/reordered sections, or changed responsive architecture.
- Preserve `editorSections`, every `EditorSection` ID, `mobileNavigatorRef`, `data-scrollspy-state`, `data-scrollspy-target-offset`, `data-scrollspy-activation-bounds`, `--product-form-anchor-offset`, `aria-current`, `navigateToSection`, `navigateToField`, `saveDraft`, `publishProduct`, button semantics, accessible labels, and `min-h-11` navigation targets.
- Preserve unrelated dirty `.gitignore` and `next-env.d.ts` changes; do not stage, reformat, or modify them.

## Recommended execution order

Task 1 -> Task 2. Establish the lighter section/navigation language first, then apply the same restraint to the responsive rail and action surfaces.
