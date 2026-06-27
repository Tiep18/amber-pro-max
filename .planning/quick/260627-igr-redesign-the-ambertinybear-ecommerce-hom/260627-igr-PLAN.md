---
quick_id: 260627-igr
status: planned
description: Redesign the Ambertinybear ecommerce homepage using the approved commerce-balanced layout and generated temporary studio imagery
---

# Quick Plan

## Task 1: Lock homepage behavior with a failing browser contract

**Files:** `tests/e2e/homepage.spec.ts`

Add focused bilingual assertions for brand identity, separate handmade/pattern shopping paths, featured-section semantics, and mobile overflow. Run the focused spec and confirm it fails because the current homepage lacks the approved ecommerce surface.

## Task 2: Generate assets and implement the market-aware homepage

**Files:** `public/images/home/*`, `src/app/[locale]/page.tsx`, `src/components/home/*`, `src/messages/vi.json`, `src/messages/en.json`, `src/components/site-header.tsx`, `src/components/site-footer.tsx`, `src/app/globals.css`

Generate four cohesive temporary images, implement the accepted section order using server-rendered catalog data, update Ambertinybear branding and localized content, and preserve existing market/cart/newsletter behavior.

## Task 3: Verify behavior and visual quality

Run the focused E2E contract, unit tests, lint, typecheck, and production build. Start the development server and inspect desktop and mobile renders for hierarchy, image loading, overflow, console errors, and working catalog CTAs. Record the final evidence in the quick-task summary.
