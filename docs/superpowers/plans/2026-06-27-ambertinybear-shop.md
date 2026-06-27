# Ambertinybear Shop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved responsive catalog workspace with URL-backed launch filters, clearer product cards, and 12-item progressive disclosure.

**Architecture:** Keep catalog authority and query parsing on the server. Extract pure URL-state helpers for tests, share one filter-content component between desktop/sidebar presentations, and give a small client grid ownership only of visible-count state.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, next-intl, Supabase catalog RPCs, Tailwind CSS, existing shadcn-style primitives, Vitest, Playwright.

---

### Task 1: Catalog query-state contract

**Files:**
- Create: `src/catalog/list-state.ts`
- Create: `tests/unit/catalog/list-state.test.ts`

- [ ] **Step 1: Write failing parser tests**

```ts
import {describe, expect, it} from 'vitest';
import {catalogListState, hasCatalogFilters} from '@/catalog/list-state';

describe('catalog list state', () => {
  it('accepts allowlisted URL filters', () => {
    expect(catalogListState({search: ' bear ', type: 'pdf_pattern', category: 'animals', sort: 'price_asc'})).toEqual({
      search: 'bear', productType: 'pdf_pattern', categorySlug: 'animals', sort: 'price_asc'
    });
  });

  it('drops invalid values and detects active filters', () => {
    const state = catalogListState({type: 'invalid', sort: 'invalid'});
    expect(state).toEqual({search: undefined, productType: undefined, categorySlug: undefined, sort: 'newest'});
    expect(hasCatalogFilters(state)).toBe(false);
  });
});
```

- [ ] **Step 2: Verify RED**

Run `npm run test:unit -- tests/unit/catalog/list-state.test.ts`.
Expected: FAIL because `@/catalog/list-state` does not exist.

- [ ] **Step 3: Implement the pure parser**

Create `catalogListState(query)` with a `first()` helper, trimmed bounded search/category values, allowlisted product type/sort, and `hasCatalogFilters()` that ignores the default `newest` sort.

- [ ] **Step 4: Verify GREEN and commit**

Run `npm run test:unit -- tests/unit/catalog/list-state.test.ts`.
Expected: PASS.

Commit `test(catalog): define shop query state`.

### Task 2: Progressive result grid

**Files:**
- Create: `src/components/catalog/catalog-result-grid.tsx`
- Create: `tests/unit/catalog/load-more.test.ts`
- Modify: `src/messages/vi.json`
- Modify: `src/messages/en.json`

- [ ] **Step 1: Write failing pagination-helper tests**

Test exported pure helpers:

```ts
expect(visibleCatalogCount(5, 12)).toBe(5);
expect(visibleCatalogCount(30, 12)).toBe(12);
expect(nextCatalogCount(12, 30)).toBe(24);
expect(nextCatalogCount(24, 30)).toBe(30);
```

- [ ] **Step 2: Verify RED**

Run `npm run test:unit -- tests/unit/catalog/load-more.test.ts`.
Expected: FAIL because the helpers do not exist.

- [ ] **Step 3: Implement client result grid**

Add a client component accepting rendered `ReactNode[]`, `totalCount`, and localized labels. Initialize at 12, render only the visible slice, announce `visible/total`, and add 12 per click until complete. Reset count when a stable `resultKey` derived from URL filters changes.

- [ ] **Step 4: Verify GREEN and commit**

Run focused unit tests and typecheck.
Commit `feat(catalog): add progressive product grid`.

### Task 3: Responsive filters and catalog composition

**Files:**
- Modify: `src/app/[locale]/catalog/page.tsx`
- Replace: `src/components/catalog/catalog-controls.tsx`
- Create: `src/components/catalog/catalog-filter-content.tsx`
- Modify: `src/components/catalog/product-card.tsx`
- Modify: `src/components/ui/sheet.tsx`
- Modify: `src/messages/vi.json`
- Modify: `src/messages/en.json`
- Modify: `tests/e2e/catalog-discovery.spec.ts`

- [ ] **Step 1: Add failing E2E contracts**

Cover breadcrumb, dynamic count, product tabs with `type` URLs, category URL filtering, clear-all, mobile filter Sheet, compact two-column mobile grid, physical/digital fulfillment copy, and load-more visibility when seeded results exceed 12.

- [ ] **Step 2: Verify RED**

Run `npm run test:e2e -- tests/e2e/catalog-discovery.spec.ts`.
Expected: new assertions fail against the current single-row controls and three-column grid.

- [ ] **Step 3: Build the server composition**

Use `catalogListState()`. Load products and facets in parallel, then fetch wishlist IDs. Derive category facets, result count, localized tab/filter URLs, and a `resultKey`. Render breadcrumb/header, tabs, desktop sidebar, mobile Sheet trigger, search/sort toolbar, and `CatalogResultGrid`.

- [ ] **Step 4: Build shared filter content**

Render GET-compatible product type and category controls from real facets, preserve search/sort as hidden fields where needed, and show clear-all only when `hasCatalogFilters()` is true. Reuse the same field component inside desktop and mobile containers.

- [ ] **Step 5: Refine product cards**

Keep server-owned price and stock. Use distinct digital/physical supporting copy, stable image/fallback treatment, compact mobile typography, and an accessible full-card detail path without adding quick-add behavior.

- [ ] **Step 6: Verify GREEN and commit**

Run focused E2E, unit tests, typecheck, and lint.
Commit `feat(catalog): redesign shop discovery`.

### Task 4: Full verification and GSD closeout

**Files:**
- Create: `.planning/quick/260627-l7g-redesign-the-ambertinybear-shop-catalog-/260627-l7g-SUMMARY.md`
- Modify: `.planning/STATE.md`

- [ ] **Step 1: Run automated verification**

Run:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e -- tests/e2e/catalog-discovery.spec.ts tests/e2e/catalog-market.spec.ts
npm run build
```

Expected: zero failures; pre-existing lint warnings may remain documented.

- [ ] **Step 2: Run browser QA**

Inspect `/vi/cua-hang` and `/en/catalog` at 1440x900 and 390x844. Verify identity, no overlay, console health, loaded product media, filter interaction, URL change, load-more state, and no horizontal overflow.

- [ ] **Step 3: Record and commit completion**

Write the GSD summary, update the Quick Tasks Completed table, and commit planning artifacts separately from implementation commits.
