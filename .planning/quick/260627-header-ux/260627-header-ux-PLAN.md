---
status: in_progress
created: 2026-06-27
---

# Quick Task: Header UX Upgrade

## Scope

- Improve the public site header using the approved text-only design.
- Combine locale and market controls into one compact commerce context switcher.
- Render authenticated account state with avatar dropdown instead of always showing sign in.
- Show an Admin link in the account dropdown for admin users.
- Polish cart badge, spacing, sticky header behavior, and mobile drawer contents.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Playwright/browser smoke checks for guest and responsive header states.
