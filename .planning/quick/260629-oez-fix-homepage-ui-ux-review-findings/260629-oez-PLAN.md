---
status: in_progress
quick_id: 260629-oez
slug: fix-homepage-ui-ux-review-findings
date: 2026-06-29
---

# Quick Task: Fix Homepage UI UX Review Findings

## Goal

Address the approved homepage UI/UX review findings without redesigning the page.

## Tasks

1. Improve homepage and navigation accessibility.
   - Add a skip link and main content target.
   - Add header active state with `aria-current`.
   - Improve mobile hero text readability.

2. Stabilize storefront cards and localized shell labels.
   - Localize sheet close labels for menu/cart.
   - Add product-card placeholder and clamp long titles.
   - Add policy title fallback in the footer.
   - Disable spellcheck for newsletter email.

3. Add conservative View Transitions support.
   - Enable Next.js view transitions.
   - Add global recipes with reduced-motion handling.
   - Add transition types/shared names only where navigation communicates going deeper.

## Verification

- `npm run lint`
- `npm run typecheck`
- Playwright smoke check for `/vi` desktop and mobile
