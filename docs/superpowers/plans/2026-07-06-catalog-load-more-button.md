# Catalog Load More Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the catalog load-more control as a light, brand-specific Ambertinybear action without changing pagination behavior.

**Architecture:** Keep `CatalogResultGrid` and its existing state transition intact. Compose the shared `Button` with local utility classes and a Lucide `Plus` icon so the visual treatment remains scoped to the catalog.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Lucide React, Playwright.

---

### Task 1: Brand the catalog load-more control

**Files:**
- Modify: `src/components/catalog/catalog-result-grid.tsx`
- Test: `tests/e2e/catalog-discovery.spec.ts`

- [x] **Step 1: Write the failing Playwright test**

Assert that the load-more button exposes the existing label, contains a decorative plus icon, and its wrapper no longer has a top border.

- [x] **Step 2: Run the focused test and verify it fails**

Run: `npx playwright test tests/e2e/catalog-discovery.spec.ts -g "branded load-more"`

Expected: FAIL because the current button has no plus icon and the wrapper has a top border.

- [x] **Step 3: Implement the approved treatment**

Import `Plus` from `lucide-react`, remove the wrapper divider, and apply a compact brand-colored outline, restrained hover background, visible focus treatment, and 44px minimum hit target to the existing button.

- [x] **Step 4: Verify behavior and quality gates**

Run the focused Playwright test, `npm run typecheck`, `npm run lint`, and `npm run build`.
