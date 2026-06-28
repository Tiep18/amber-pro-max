---
status: resolved
trigger: "Wishlist hien thi sai; thich/bo thich khong hoat dong; xoa item da thich nhung UI khong cap nhat."
created: 2026-06-29
updated: 2026-06-29
---

## Symptoms

- Expected: signed-in customers can add and remove wishlist items, with UI updating immediately and persisted state remaining correct after reload.
- Actual: heart state is incorrect, add/remove actions appear ineffective, and deleting an item from the wishlist page leaves the card visible.
- Errors: no explicit browser error supplied.
- Timeline: observed after the storefront SEO/ISR personalization changes.
- Reproduction: toggle hearts on product/catalog surfaces, or remove an item from the account wishlist page.

## Current Focus

- hypothesis: Existing tests assert action status but not the resulting UI or persisted state; account items are immutable props and heart state may be overwritten by asynchronous remote state.
- test: Add browser regressions for add/remove/reload and immediate wishlist-card removal.
- expecting: At least one regression fails against the current implementation.
- next_action: Run focused authenticated browser tests against the configured Supabase project.

## Evidence

- timestamp: 2026-06-29
  observation: Existing account removal test only checks the success status text and never checks that the removed article disappears.
- timestamp: 2026-06-29
  observation: Existing heart toggle test covers only save, not remove or persistence after reload.
- timestamp: 2026-06-29
  observation: Trace showed /api/wishlist received a valid auth cookie but returned {"productIds":[]}, so ISR hearts were overwritten as unsaved.
- timestamp: 2026-06-29
  observation: Focused E2E wishlist suite passed 11/11 after the fix, including remove, restore, reload persistence, and localized guest redirect.

## Eliminated

## Resolution

- root_cause: Public ISR pages removed request-time wishlist personalization, and the replacement /api/wishlist lookup used a separate Supabase query path that could return an empty selection despite a valid signed-in cookie. The account wishlist page also rendered immutable props after remove, so a successful delete did not remove the card locally.
- fix: Read personalized wishlist state through the same authenticated RPC path as the account page, scope it by locale/market, ignore stale remote values while a heart mutation is in flight, and maintain a local visible-items list on the account wishlist page after removal.
- verification: typecheck passed; lint passed; Playwright wishlist regression suite passed 11/11 with --timeout=90000.
- files_changed: src/app/api/wishlist/route.ts, src/components/wishlist-context.tsx, src/components/catalog/wishlist-heart.tsx, src/components/account/wishlist-page.tsx, src/app/[locale]/layout.tsx, tests/e2e/account-retention.spec.ts.
