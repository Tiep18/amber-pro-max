---
quick_id: 260711-l7s
status: complete
completed: 2026-07-11
commit: 3ed5557
---

# Shadcn selects and responsive discounts list summary

- Replaced native status, market, and currency selects with the project shadcn/Radix Select primitives.
- Preserved controlled values, accessible labels, and form submission names.
- Removed the discount table minimum width and horizontal overflow container.
- Consolidated desktop display into four fixed columns: Code, Promotion, Usage, and Action.
- Delayed side-by-side create-panel layout until the 2xl breakpoint so laptop-width queues remain readable.
- Added a dedicated mobile promotion-row layout with visible status, offer, eligibility, usage, and action.
- Added E2E assertions for desktop queue overflow and mobile page overflow/content visibility.

Verification passed: TypeScript, focused ESLint, 66 unit test files with 410 tests, and Next.js production build. Focused Playwright execution remains pending because the existing dev server holds the configured test server lock.
