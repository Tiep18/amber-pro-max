---
status: complete
quick_id: 260629-oez
slug: fix-homepage-ui-ux-review-findings
date: 2026-06-29
---

# Summary

Fixed the approved homepage UI/UX review findings.

## Changes

- Added a localized skip link and main content target.
- Added active header nav state with `aria-current`.
- Improved mobile hero readability with a responsive light overlay.
- Localized sheet close labels for menu and cart.
- Stabilized product cards with title clamping, consistent content rows, and image placeholders.
- Added footer policy fallback labels when fixture placeholder policy titles are published.
- Disabled spellcheck on the newsletter email field.
- Enabled Next.js View Transitions and added reduced-motion-safe navigation CSS.
- Added `transitionTypes` to deeper storefront navigation links.

## Verification

- `npm run lint` passed.
- `npm run typecheck` passed.
- Playwright smoke check passed for `/vi` desktop and mobile:
  - no horizontal overflow
  - localized skip link present
  - active home nav marked with `aria-current="page"`
  - footer policy placeholder replaced with localized fallback
  - main content target present
