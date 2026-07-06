---
status: complete
completed: 2026-07-06
---

# Summary

Compacted the catalog product-card content area below the `sm` breakpoint while preserving the existing tablet and desktop design.

## Changes

- Reduced mobile content padding from 16px to 12px and tightened vertical gaps.
- Reduced mobile badge, stock, title, price, and arrow sizing without changing their desktop sizes.
- Clamped mobile descriptions to one line; descriptions remain two lines from `sm` upward.
- Added a responsive Playwright regression test covering mobile and desktop computed styles.

## Verification

- Responsive Playwright test passed at 390px and 1024px.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `git diff --check` passed.
- `npm run build` passed and generated 104 static pages; existing SSG product, category, and collection routes retain five-minute revalidation.
