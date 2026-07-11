---
quick_id: 260711-kl8
status: complete
completed: 2026-07-11
commit: dd4a609
---

# Admin discounts workspace redesign summary

- Consolidated promotion metrics into one aligned summary strip.
- Added an in-memory promotion queue with code/note search plus status and market filters.
- Reworked the table into clear Code, Offer, Eligibility, Usage, and Action columns.
- Added truthful all-market fixed-currency labeling and explicit minimum-spend cues.
- Redesigned creation as a sticky progressive panel with segmented discount type, conditional percentage/fixed fields, market-aware currency defaults, live preview, inline validation, and pending state.
- Prevented ambiguous minimum subtotal entry for percentage discounts spanning both VND and USD markets.
- Reduced the visual weight of disable controls while preserving confirmation and redemption history.
- Added a load-error state and filter-aware empty states.
- Updated Playwright coverage for the redesigned table and added discount fixture cleanup.

Verification passed: TypeScript, focused ESLint, 66 unit test files with 410 tests, and Next.js production build. Focused Playwright execution was blocked because an existing Next.js dev server held the repository lock required by the configured test server.
