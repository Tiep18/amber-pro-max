# Mobile Sheets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build refined, smoothly animated mobile navigation and mini-cart sheets with product thumbnails.

**Architecture:** Extend the shared Radix `Sheet` presentation without changing its state API. Add a compact presentation mode to `CartLine` so the mini cart can use thumbnail-led rows while the full cart retains its existing layout. Compose the redesigned menu and cart from existing locale, account, market, and cart providers.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Radix Dialog, Lucide icons, Playwright.

---

### Task 1: Smooth shared sheet primitive

**Files:**

- Modify: `src/components/ui/sheet.tsx`
- Modify: `src/app/globals.css`

- [ ] Add named overlay and side-panel keyframes using only opacity and transform.
- [ ] Apply asymmetric open/close durations, warm overlay color, paper surface, focus-visible close styling, and reduced-motion overrides.
- [ ] Run `npm run typecheck` and expect exit code 0.

### Task 2: Thumbnail-led mini-cart line

**Files:**

- Modify: `src/components/cart/cart-line.tsx`
- Modify: `src/components/cart/mini-cart.tsx`
- Test: `tests/e2e/cart.spec.ts`

- [ ] Add a `compact` presentation option to `CartLine` that renders `line.imageUrl` with `next/image` and a fulfillment fallback when absent.
- [ ] Keep title and variant truncation resilient, controls at least 40px, and status messages visible.
- [ ] Recompose the mini-cart header, scroll region, separators, sticky subtotal footer, checkout CTA, and secondary full-cart action.
- [ ] Extend cart e2e assertions to cover the dialog and thumbnail/fallback region without depending on remote image success.

### Task 3: Editorial mobile navigation

**Files:**

- Modify: `src/components/ui/sheet.tsx`
- Modify: `src/components/site-header.tsx`
- Modify: `src/components/header-nav.tsx`
- Modify: `src/components/account-menu.tsx`

- [ ] Add an optional sheet description/eyebrow slot only if needed for accessible composition.
- [ ] Restyle vertical navigation rows with a fine active marker and arrow cue.
- [ ] Recompose brand, navigation, market, and account areas into clear sheet zones.
- [ ] Ensure navigation closes naturally through Radix close composition or controlled state without changing desktop navigation.

### Task 4: Verification

**Files:**

- Test: `tests/e2e/cart.spec.ts`
- Test: `tests/e2e/homepage.spec.ts`

- [ ] Run `npm run typecheck` and expect exit code 0.
- [ ] Run `npm run lint` and expect exit code 0.
- [ ] Run `npx playwright test tests/e2e/cart.spec.ts tests/e2e/homepage.spec.ts` and expect all tests to pass.
- [ ] Capture and inspect 390x844 screenshots for both sheets, checking long content, thumbnail/fallback, footer visibility, no horizontal overflow, and smooth open/close states.
