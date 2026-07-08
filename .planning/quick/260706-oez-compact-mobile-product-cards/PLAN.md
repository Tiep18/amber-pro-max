---
status: in_progress
created: 2026-07-06
---

# Compact Mobile Product Cards

## Goal

Reduce the text-area height of two-column catalog product cards on mobile while preserving the existing tablet/desktop presentation, product links, commerce data, and SEO/static rendering.

## Scope

- Reduce mobile-only card content padding and vertical gaps.
- Use slightly smaller mobile typography for badge, stock, title, description, and price.
- Clamp card descriptions to one line on mobile and retain two lines from `sm` upward.
- Verify the responsive behavior in Playwright and run typecheck/lint.
