---
status: in-progress
created: 2026-07-10
---

# Cart UI/UX Polish

## Goal

Upgrade the localized cart page so it feels consistent with the redesigned homepage, catalog, and mini cart while preserving cart quote, blocked-line, undo-remove, checkout routing, and market-aware behavior.

## Scope

- Full cart line presentation: add product thumbnail/fallback, reduce visual bulk, improve mobile layout.
- Cart page hierarchy: remove duplicate blocked warnings, make summary more refined, keep sticky desktop summary.
- Empty/removed states: keep existing behavior and make visual treatment lighter.
- Tests: add focused Playwright coverage for thumbnail presence and non-duplicated blocked messaging.

## Verification

- Focused cart Playwright tests.
- Typecheck.
- Lint.

## Progress

- [x] Created quick task context.
- [x] Polished full cart line with thumbnail-led layout.
- [x] Removed duplicate blocked alert from the cart body.
- [x] Refined cart summary and empty state actions.
- [x] Added focused Playwright regression assertions.
- [x] Run verification.
