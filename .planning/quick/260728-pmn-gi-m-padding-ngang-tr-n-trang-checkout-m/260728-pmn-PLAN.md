---
quick_id: 260728-pmn
description: 'Reduce checkout mobile horizontal padding while preserving desktop layout and checkout behavior'
date: 2026-07-28
status: planned
mode: quick
autonomous: true
files_modified:
  - src/components/checkout/checkout-page.tsx
  - src/components/checkout/order-summary.tsx
  - src/components/loading/page-skeletons.tsx
  - tests/unit/ui/loading-boundaries.test.ts
must_haves:
  truths:
    - 'At 320px, 375px, and 390px, checkout uses approximately 12px outer gutters and 16px card-section gutters so contact and destination fields are wider without horizontal overflow.'
    - 'From the sm breakpoint through desktop, the current checkout container, card-section, order-summary, and two-column layout spacing remains unchanged.'
    - 'The empty-cart state, order summary, fixed mobile checkout dock, and CheckoutPageSkeleton remain aligned with the corresponding settled checkout layout.'
    - 'Checkout quote, payment intent, submission, discount, shipping, and order-handoff behavior is unchanged.'
  artifacts:
    - 'Mobile-first responsive checkout padding classes in src/components/checkout/checkout-page.tsx.'
    - 'Mobile-first order-summary padding with the existing mobile dock geometry preserved in src/components/checkout/order-summary.tsx.'
    - 'Matching checkout loading geometry in src/components/loading/page-skeletons.tsx.'
    - 'Focused source-layout regression coverage in tests/unit/ui/loading-boundaries.test.ts.'
  key_links:
    - 'CheckoutPage main gutter -> contact/destination section gutter -> full-width input geometry'
    - 'CheckoutPage settled layout -> CheckoutPageSkeleton responsive gutter contract'
    - 'OrderSummary mobile padding -> MobileCheckoutDock fixed CTA remains unobscured and behaviorally unchanged'
---

# Quick Task 260728-pmn: Reduce checkout mobile horizontal padding

## Read first

- `AGENTS.md`
- `.planning/STATE.md`
- `src/components/checkout/checkout-page.tsx`
- `src/components/checkout/order-summary.tsx`
- `src/components/loading/page-skeletons.tsx`
- `tests/unit/ui/loading-boundaries.test.ts`
- `tests/e2e/checkout.spec.ts`
- `tests/security/shipping-ui-boundaries.test.mjs`

## Scope boundaries

- Change only responsive presentation classes and focused layout-contract assertions. Do not change checkout state, quote refresh, shipping, discount, payment intent, submission, idempotency, cart completion, redirect, or order-handoff code.
- Keep the existing `.container` max-width behavior and all `sm`, `lg`, and desktop column breakpoints. Override only the checkout gutter below `sm`, then explicitly restore the current spacing at `sm`.
- Preserve the fixed mobile dock's `px-3`, safe-area bottom padding, grid sizing, `lg:hidden`, button state, label, total, and submit handler. Inspect it at every mobile viewport but do not rewrite it when it already matches the 12px outer gutter.
- Do not add dependencies or edit global `.container` styles; this adjustment is checkout-specific.
- `next-env.d.ts` is pre-existing dirty work. Do not edit, format, stage, or commit it; exclude it from every task command and commit.

## Task 1: Narrow mobile gutters across settled and loading checkout layouts

**Files**

- `src/components/checkout/checkout-page.tsx`
- `src/components/checkout/order-summary.tsx`
- `src/components/loading/page-skeletons.tsx`
- `tests/unit/ui/loading-boundaries.test.ts`

**Action**

- In both the empty-cart and populated `CheckoutPage` `<main>` branches, retain `container` and add `px-3 sm:px-6`. This makes the checkout-only outer gutter 12px below 640px while restoring the existing 24px container gutter from `sm` upward.
- Change the populated contact and destination sections from `px-5 sm:px-6` to `px-4 sm:px-6`: 16px on mobile, unchanged 24px at `sm` and above. Do not change vertical padding, section ordering, separators, form props, validation, or lifecycle callbacks.
- Change the empty-state card from `px-5` to `px-4 sm:px-5` so it follows the narrower mobile rhythm while retaining its existing 20px inset at `sm` and above. Leave its CTA padding and all content unchanged.
- In `OrderSummary`, change only `CardHeader` and `CardContent` horizontal padding from `px-5` to `px-4 sm:px-5`. Preserve the card shell, line-item grid, discount form, totals, desktop submit button, policy links, and every callback. Keep `MobileCheckoutDock` at its existing `px-3`; its fixed/safe-area geometry already matches the new outer gutter.
- Mirror the settled layout in `CheckoutPageSkeleton`: use `px-3 sm:px-6` on `LoadingRegion`, `px-4 sm:px-6` on the contact/destination placeholder sections, and `p-4 sm:p-5` on the summary placeholder. Retain the current desktop `400px` column, sticky behavior, bottom spacing, and mobile dock placeholder with `px-3`.
- Extend the existing checkout entry in `loading-boundaries.test.ts` rather than creating a second test style. Assert the shared `px-3 sm:px-6` outer contract in `CheckoutPage` and `CheckoutPageSkeleton`, the `px-4 sm:px-6` settled/loading form-section contract, the empty-state `px-4 sm:px-5` contract, the `px-4 sm:px-5` `OrderSummary` contract, and continued `px-3` plus `lg:hidden` dock geometry. Keep existing no-authority-import and responsive-column assertions.
- Inspect the final diff and reject any production change outside class strings. In particular, do not alter imports, hooks, state, event handlers, action calls, test IDs, localized copy, or commerce values.

**Verify**

- Automated: `npm run test:unit -- tests/unit/ui/loading-boundaries.test.ts`
- Automated: `node --test tests/security/shipping-ui-boundaries.test.mjs`
- Automated: `npm run typecheck`
- Browser: render populated physical/mixed checkout and the empty-cart state at 320x800, 375x812, and 390x844. Confirm 12px page gutters, 16px form/summary insets, wider full-width fields, no horizontal scroll, no clipped labels/totals, and an unobscured fixed submit dock.
- Browser: render checkout loading and settled states at the same three mobile widths; confirm the outer edges, card insets, summary, and dock do not jump horizontally during navigation.
- Browser: at 1440x900, confirm the existing container gutter, 24px contact/destination insets, 20px order-summary inset, `400px` summary column, sticky summary, and desktop submit presentation are visually unchanged.

**Done**

- Checkout fields gain 16px of total usable width on sub-640px screens, all requested mobile widths remain overflow-free, empty/loading/summary/dock layouts stay aligned, desktop spacing is unchanged, and focused unit, security, and type checks pass without any checkout behavior change.

<threat_model>

## Trust boundaries

| Boundary | Description |
|---|---|
| Shopper viewport -> checkout controls | Responsive presentation must not clip, cover, or visually detach authoritative checkout fields, totals, and submit controls. |
| Checkout components -> server-owned commerce actions | This quick task must leave all quote, payment, shipping, discount, and order authority wiring unchanged. |

## STRIDE threat register

| Threat ID | Category | Component | Disposition | Mitigation plan |
|---|---|---|---|---|
| T-260728-pmn-01 | Tampering | `CheckoutPage` and `OrderSummary` | mitigate | Restrict production edits to responsive class strings; run the shipping UI boundary test and inspect the diff for changes to imports, state, handlers, action calls, or commerce values. |
| T-260728-pmn-02 | Denial of service | Mobile checkout form and fixed submit dock | mitigate | Verify 320px, 375px, and 390px widths for overflow, clipping, dock obstruction, and reachable fields/CTA, including empty and populated states. |
| T-260728-pmn-03 | Spoofing | Loading skeleton versus settled checkout | mitigate | Lock shared outer, section, summary, breakpoint, and dock class contracts so loading geometry does not imply a different checkout surface. |
| T-260728-pmn-SC | Tampering | Package supply chain | accept | No package installation or dependency change is in scope. |

</threat_model>

## Source coverage

| Source | Item | Covered by | Status |
|---|---|---|---|
| GOAL | Reduce checkout mobile horizontal padding so fields are wider while desktop and checkout flow remain unchanged | Task 1 | COVERED |
| REQ | No roadmap requirement IDs are assigned to this quick presentation task | — | N/A |
| RESEARCH | Current-source evidence: `.container` contributes 16px below `sm`, form sections add 20px, and checkout loading uses the same prior geometry | Task 1 | COVERED |
| CONTEXT | Use approximately 12px outer and 16px card-section mobile gutters; preserve current `sm`/desktop behavior | Task 1 | COVERED |
| CONTEXT | Check empty state, order summary, mobile dock, and `CheckoutPageSkeleton` | Task 1 | COVERED |
| CONTEXT | Change presentation only; preserve checkout/payment/quote logic and do not touch pre-existing dirty `next-env.d.ts` | Scope boundaries, Task 1 | COVERED |

## Success criteria

- `npm run test:unit -- tests/unit/ui/loading-boundaries.test.ts`, `node --test tests/security/shipping-ui-boundaries.test.mjs`, and `npm run typecheck` pass.
- Populated, empty, loading, summary, and fixed-dock checkout surfaces align without horizontal overflow at 320px, 375px, and 390px.
- At 1440px, the current page gutter, section/summary padding, two-column split, sticky summary, and desktop checkout presentation are unchanged.
- The production diff contains responsive class changes only, with no checkout logic, global container, dependency, or `next-env.d.ts` change.
