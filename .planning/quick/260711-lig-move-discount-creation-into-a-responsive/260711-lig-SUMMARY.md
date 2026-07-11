---
quick_id: 260711-lig
status: complete
completed: 2026-07-11
commit: 9813993
---

# Discount creation sheet summary

- Removed the persistent create panel so the promotion queue remains full-width.
- Added a `New discount` action to the compact admin page header.
- Added a controlled right-side Sheet sized to 520px on desktop and 96vw on mobile.
- Preserved the existing responsive form layout: paired short fields at `sm` and above, one column below.
- Reset the form, refreshed the queue, closed the Sheet, and changed trigger feedback after successful creation.
- Updated empty-state instructions and Playwright dialog open/close assertions.
- Left server actions, validation authority, and checkout discount calculation unchanged.

Verification passed: TypeScript, focused ESLint, 66 unit test files with 410 tests, and Next.js production build.
