---
status: resolved
trigger: 'Header account and locale dropdowns do not close on outside click; cart/sheet overlays allow background clicks; verify use of shadcn components.'
created: 2026-06-27
updated: 2026-06-27
---

# Debug Session: Header Overlays

## Symptoms

- Expected behavior: Account and commerce context dropdowns close when clicking outside; cart and mobile/filter sheets trap interaction and block clicks behind the overlay.
- Actual behavior: Dropdowns remain open; background controls can still be clicked while a sheet is open; mini-cart sheet has display issues.
- Error messages: None reported.
- Timeline: Started after header UI upgrade.
- Reproduction: Open account/context dropdown or cart/mobile sheet, then click outside or on underlying page controls.

## Current Focus

- hypothesis: Custom `<details>` dropdowns and hand-written sheet/cart overlays do not provide Radix modal behavior, focus management, or click-outside handling.
- test: Replace dropdowns and sheet/cart panels with shadcn/Radix primitives and run type/lint/build plus browser smoke checks.
- expecting: Outside click closes dropdowns; modal sheets block background clicks; cart sheet renders consistently.
- next_action: Apply shadcn dropdown-menu and Radix-backed sheet implementation.

## Evidence

- timestamp: 2026-06-27
  note: `src/components/account-menu.tsx` and `src/components/commerce-context-switcher.tsx` use native `<details>`.
- timestamp: 2026-06-27
  note: `src/components/ui/sheet.tsx` is a custom component, not the shadcn/Radix Sheet primitive.
- timestamp: 2026-06-27
  note: `src/components/cart/mini-cart.tsx` manually renders its own fixed overlay and aside.
- timestamp: 2026-06-27
  note: Playwright smoke verified context dropdown outside-click close, cart Escape close, overlay pointer blocking, mobile full-height sheet, and mobile outside-click close.

## Eliminated

- hypothesis: Missing z-index alone causes all issues.
  reason: Native `<details>` cannot close on outside click by default, and manual overlays lack focus trap/inert behavior regardless of z-index.

## Resolution

- root_cause: Header dropdowns and sheets were implemented with custom markup (`<details>`, manual fixed overlays) instead of shadcn/Radix primitives, so outside click, focus trap, Escape handling, and background pointer blocking were incomplete.
- fix: Added shadcn `DropdownMenu`, moved account and commerce context controls to it, rebuilt the local `Sheet` wrapper on Radix Dialog, and moved mini-cart to that modal sheet.
- verification: `npm run typecheck`, `npm run lint`, `npm run build`, and a Playwright smoke script passed.
- files_changed: `src/components/ui/dropdown-menu.tsx`, `src/components/ui/sheet.tsx`, `src/components/account-menu.tsx`, `src/components/commerce-context-switcher.tsx`, `src/components/cart/mini-cart.tsx`, `src/components/site-header.tsx`
