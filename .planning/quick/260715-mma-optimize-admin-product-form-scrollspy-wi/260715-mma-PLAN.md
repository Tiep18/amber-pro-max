---
quick_id: 260715-mma
status: planned
created_at: '2026-07-15T16:25:00+07:00'
description: Optimize the admin product-form scrollspy with Ant Design-style section resolution, interruptible scrolling, responsive offsets, reduced motion, and focused regressions without changing catalog business logic
must_haves:
  truths:
    - Manual scrolling deterministically activates the last ordered product-form section that has crossed the measured anchor line, and reaching the document bottom activates Readiness.
    - Clicking a section gives immediate active feedback, scrolls to the same responsive anchor used by scrollspy, and a second navigation or user scroll/key gesture can cancel the animation without leaving stale active state.
    - Desktop and mobile offsets account for the visible sticky admin header and mobile section navigator by taking the maximum occupied sticky edge, never summing overlapping blockers or reusing activation tolerance as visual spacing.
    - Validation navigation selects the correct Vietnamese or English tab, waits for the actual field to exist after commit, scrolls it with an explicit alignment policy, and focuses it only after the same uncancelled navigation completes.
    - Reduced-motion users receive immediate navigation and global smooth scrolling no longer overrides that preference.
    - Product draft state, save/publish actions and payloads, catalog validation, pricing/market rules, taxonomy/collection behavior, persistence, and authorization remain unchanged.
  artifacts:
    - src/components/admin/catalog/product-form-scrollspy.ts
    - src/components/admin/catalog/use-product-form-scrollspy.ts
    - src/components/admin/catalog/product-form.tsx
    - src/app/admin/layout.tsx
    - src/app/globals.css
    - tests/unit/admin/product-form-scrollspy.test.ts
    - tests/e2e/admin-product.spec.ts
  key_links:
    - use-product-form-scrollspy.ts consumes the ordered editor section IDs and pure resolver/target helpers from product-form-scrollspy.ts.
    - The admin sticky header marker and ProductForm mobile navigator ref produce `targetOffset = max(stickyTop + renderedHeight) + visualGap`; click destinations and scroll margin use exactly targetOffset, while active resolution alone adds activationBounds.
    - ProductForm routes section clicks and post-commit validation-field navigation through the same tokenized cancelable controller while retaining the existing locale selection, heading fallback, and error mapping.
    - Unit tests lock targetOffset/activationBounds separation and target math; the authenticated admin-product Playwright flow uses observable controller state and explicit section boundaries to lock real sticky-layout, interruption, reduced-motion, and existing save/publish behavior.
---

# Quick Task 260715-mma: Optimize admin product form scrollspy

## Goal

Replace the current `IntersectionObserver` entry heuristic and elapsed-time navigation lock with a small, deterministic anchor controller modeled on Ant Design Anchor: ordered target resolution on a request-animation-frame scroll loop, explicit animation completion/cancellation, and one responsive offset source. Keep the editor layout and all catalog business behavior intact.

## Task 1 - Build and characterize the deterministic scrollspy core

**Files**

- `src/components/admin/catalog/product-form-scrollspy.ts`
- `tests/unit/admin/product-form-scrollspy.test.ts`

**Action**

- Add a browser-independent, typed utility for ordered anchor resolution. Accept `targetOffset` and `activationBounds` as separate values and select the last ordered section satisfying `sectionTop <= targetOffset + activationBounds`; fall back to the first section before any crossing and force the final section at document bottom.
- Add pure target-position math that subtracts `targetOffset` only and clamps the destination to the document's valid scroll range. `activationBounds` is tolerance for active resolution only and must never be included in click destinations, CSS scroll margin, or sticky-blocker measurement. Keep easing/duration helpers pure if they are shared by the controller; do not introduce Ant Design or another dependency.
- Cover the exact boundary cases in Node-based Vitest: before the first section, exactly on and just across `targetOffset + activationBounds`, multiple sections above the activation line, upward traversal, changed responsive offsets, document-bottom final-section selection, and target clamping. Include an assertion that click target math subtracts targetOffset exactly once and is unchanged when activationBounds changes.
- Keep this module generic to ordered section geometry. It must not import product schemas, actions, draft types, market/pricing logic, taxonomy helpers, or React state.

**Verify**

- `npm.cmd run test:unit -- tests/unit/admin/product-form-scrollspy.test.ts`
- `npx.cmd eslint src/components/admin/catalog/product-form-scrollspy.ts tests/unit/admin/product-form-scrollspy.test.ts`
- `npm.cmd run typecheck`

**Done**

- Active-section and destination calculations are deterministic, side-effect free, and regression-tested independently of browser timing and catalog behavior.

## Task 2 - Add the cancelable anchor controller and minimally wire ProductForm

**Files**

- `src/components/admin/catalog/use-product-form-scrollspy.ts`
- `src/components/admin/catalog/product-form.tsx`
- `src/app/admin/layout.tsx`
- `src/app/globals.css`

**Action**

- Implement `useProductFormScrollspy` around the pure helpers. Cache target elements, throttle scroll/resize work to at most one `requestAnimationFrame`, read all six ordered section positions in one pass, and only update React state when the resolved ID changes. Clean up every frame, observer, media-query listener, and input listener on unmount.
- Replace `IntersectionObserver`, `manualNavigationUntil`, and the 700/900 ms locks with an interruptible RAF animation carrying a monotonically increasing navigation token. A navigation starts by invalidating any prior token and activating its destination immediately; only the still-current token may report successful completion and run one final resolver pass. Wheel, touch/pointer intent, relevant scroll keys, or a subsequent navigation invalidates the token, cancels its frame, suppresses its stale completion callback, and resynchronizes on the next frame. Respect `prefers-reduced-motion` by jumping immediately without entering the animation state.
- Measure explicit presentation-only markers/refs for the sticky admin header and mobile section navigator using `ResizeObserver` plus a resize fallback. For every visible blocker, derive its occupied sticky edge as `computed sticky top + rendered height`; calculate `targetOffset = max(all occupied edges) + visualGap`, never sum blockers that overlap. Publish targetOffset as a ProductForm CSS custom property and use exactly that value for explicit scroll targets and each section's `scroll-margin-top`. Pass targetOffset plus a separate small `activationBounds` only to active resolution; remove the duplicated `112px`/`rootMargin` assumptions and do not double-count visualGap/tolerance.
- Publish presentation-only `data-scrollspy-state="idle|animating"`, measured targetOffset, and configured activationBounds values on the ProductForm root. Keep them free of product data and use them only to make boundary, cancellation, and reduced-motion behavior deterministic and observable in focused browser tests.
- Keep `EditorSection`, section order/IDs, section buttons, active styling, Sheet open/close behavior, and desktop/mobile layout semantics stable. The only `admin/layout.tsx` change should be a non-behavioral marker/ref target on the existing sticky header.
- Route `navigateToSection` through the controller. For `navigateToField`, create a tokenized pending field request and switch the existing content/SEO locale first. Consume the request in a layout effect after that render commits, then query `document.getElementById(fieldDomId(path))`: if the actual field exists, scroll it with an explicit `center` policy (clamped by the controller); otherwise preserve the existing section-heading fallback and scroll the heading with `start` alignment. Focus the resolved field/heading with `preventScroll` only from the matching controller success callback. Cancellation or replacement must invalidate the request and suppress stale focus/completion. Remove the focus timeout without changing error-path mapping, error copy, or which validation issue is selected.
- In the reduced-motion media query, set `html { scroll-behavior: auto; }` so CSS cannot turn the controller's immediate path back into smooth scrolling. Preserve existing Sheet and View Transition reductions.
- Do not change component props carrying catalog data, draft initialization/mutation, collection ordering, readiness calculations, shipping assignment, submit handlers, transition state, server-action calls, result handling, publish blockers, links, or button enablement.

**Verify**

- `npx.cmd eslint src/components/admin/catalog/product-form-scrollspy.ts src/components/admin/catalog/use-product-form-scrollspy.ts src/components/admin/catalog/product-form.tsx src/app/admin/layout.tsx`
- `npm.cmd run test:unit -- tests/unit/admin/product-form-scrollspy.test.ts`
- `npm.cmd run typecheck`
- `npm.cmd run build`

**Done**

- ProductForm has one responsive, reduced-motion-aware scroll controller with deterministic active highlighting and completion/cancellation semantics, while its data and save/publish behavior are byte-for-byte unchanged outside navigation wiring.

## Task 3 - Lock real editor behavior with focused browser regression coverage

**Files**

- `tests/e2e/admin-product.spec.ts`

**Action**

- Add a focused authenticated editor scrollspy test using the existing admin fixture helpers. Assert a section-control click marks the requested section active and positions its heading below the measured sticky controls on desktop and a 375px mobile viewport.
- Assert manual downward and upward scrolling resolves the expected ordered section and document bottom resolves Readiness by positioning the viewport from actual section geometry, awaiting one browser `requestAnimationFrame`, then checking the single `aria-current` control. For rapid navigation, click two distant sections without an arbitrary timeout and assert the observable controller destination/final `aria-current` belongs to the second request.
- Test interruption deterministically: start a long navigation, wait for the ProductForm presentation-only state to report `animating`, dispatch the supported cancellation gesture, explicitly position the viewport at a calculated section boundary using the exposed targetOffset and activationBounds values, await one `requestAnimationFrame`, then assert `data-scrollspy-state="idle"` and the expected single `aria-current`. Do not use fixed sleeps or infer cancellation from elapsed duration.
- Exercise a reduced-motion browser context by invoking a section control and reading scroll position plus `data-scrollspy-state` in the same `page.evaluate` event turn: the destination must be applied immediately and state must never become `animating`. Do not assert a millisecond threshold. Trigger an existing bilingual validation error and confirm, through focus/ARIA rather than delay, that navigation opens the correct locale tab, resolves the actual field after commit, exposes the mapped error, and focuses it; retain an assertion for the section-heading fallback path where the field cannot be found.
- Retain the existing incomplete-draft, publish-snapshot, taxonomy/collection, and non-admin authorization assertions; do not rewrite fixtures or selectors unrelated to scrollspy. Prefer geometry/ARIA assertions with small tolerances over screenshots or exact pixel constants.
- Run the focused unit and browser tests first, then the normal static gates. If local Supabase or browser infrastructure is unavailable, record that exact gate as unverified rather than weakening or skipping the test in source.

**Verify**

- `npm.cmd run test:unit -- tests/unit/admin/product-form-scrollspy.test.ts`
- `npx.cmd playwright test tests/e2e/admin-product.spec.ts`
- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run build`

**Done**

- Automated contracts prove click, manual, interrupted, bottom-of-page, responsive-offset, reduced-motion, and validation-focus behavior, while the pre-existing product draft/publish and authorization coverage remains green.

## Boundaries

- No database migrations, Supabase type generation, schemas, server actions, save/publish payloads, catalog validation rules, publish requirements, market/currency/pricing logic, taxonomy/collection logic, storage, persistence, cache invalidation, shipping assignment logic, or authorization changes.
- Do not install Ant Design or another scrolling dependency; reproduce only the small anchor-controller behavior needed by this form.
- Do not convert the editor into tabs/collapsibles, reorder or rename sections, redesign the admin shell, or add unrelated URL/hash/history behavior in this quick task.
- Preserve unrelated dirty changes, including `.gitignore` and `next-env.d.ts`, and do not reformat unrelated files.

## Recommended execution order

Task 1 -> Task 2 -> Task 3. Lock the pure geometry contract first, then wire the controller, then validate the real sticky layout and unchanged catalog workflow.
