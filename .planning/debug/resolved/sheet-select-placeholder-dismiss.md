---
status: resolved
trigger: 'Opening a Select and clicking its placeholder area closed the parent Sheet.'
created: 2026-07-14
updated: 2026-07-14
---

# Debug Session: Sheet Select Placeholder Dismissal

## Symptoms

- Expected: Clicking the placeholder/trigger while its dropdown is open closes only the Select.
- Actual: The Select and its parent Sheet both closed.
- Reproduction: Open the `Add US state adjustment` Sheet, open the empty `State or territory` Select, hold briefly on the placeholder area, then release.

## Evidence

- While the Select portal is open, Radix disables outside pointer events and the Sheet overlay receives the physical pointer interaction at the trigger coordinates.
- The Sheet remained open immediately after `pointerdown`, but closed after a delayed `pointerup`.
- The previous guard was reset with `setTimeout(..., 0)` from `pointerdown`, so it expired during a normal press before `pointerup` and the synthesized outside interaction.

## Resolution

- Root cause: The Select-layer interaction guard covered only the `pointerdown` task, not the full pointer gesture.
- Fix: Keep the guard active from overlay `pointerdown` through `pointerup`, then clear it after the completed gesture. Clear immediately on `pointercancel`.
- Regression: The shipping E2E now clicks the exact empty Select trigger coordinates with a 20 ms hold and asserts that the dropdown closes while the Sheet stays open.
- Additional E2E maintenance: Updated stale field labels and made the `Overrides` locator exact so the shipping flow remains executable.

## Verification

- Manual browser reproduction passed: dropdown closed, Sheet stayed open, and a later overlay click closed the Sheet normally.
- `npm run lint`
- `npm run typecheck`
- `npm run test:unit` -- 72 files, 470 tests passed.
- Targeted admin shipping E2E -- 1 test passed.

## Files Changed

- `src/components/ui/sheet.tsx`
- `tests/e2e/admin-shipping.spec.ts`
