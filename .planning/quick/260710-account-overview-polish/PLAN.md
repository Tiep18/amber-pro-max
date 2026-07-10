---
status: in-progress
created: 2026-07-10
---

# Account Overview Polish

## Goal

Refine the account entry experience so `/account` feels consistent with the polished storefront, catalog, product, and cart surfaces while preserving auth guards, localized routes, sign-out, and account navigation behavior.

## Scope

- Make the shared account shell lighter and less dashboard-like on desktop.
- Make the mobile account menu entry more compact and polished.
- Rework the account overview from generic cards into a clearer account home.
- Keep existing account links, authenticated rendering, and localized copy behavior intact.

## Verification

- Typecheck.
- Lint.
- Local desktop/mobile smoke if the authenticated page can be reached in the current browser context.

## Progress

- [x] Created quick task context.
- [x] Refine account shell navigation and profile surfaces.
- [x] Refine account overview layout.
- [x] Run verification.
