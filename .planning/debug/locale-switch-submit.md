---
status: resolved
trigger: 'Clicking the combined market/locale dropdown option does not change locale.'
created: 2026-06-27
updated: 2026-06-27
---

# Debug Session: Locale Switch Submit

## Symptoms

- Expected behavior: Clicking the VN/VI or INTL/EN option changes market cookie and redirects to the equivalent localized URL.
- Actual behavior: User reports clicking the locale option does not change locale.
- Error messages: None reported.
- Reproduction: Open header commerce context dropdown and click the inactive option.

## Current Focus

- hypothesis: `DropdownMenuItem asChild` wrapping a submit button inside a form is preventing the Server Action form submit.
- test: Reproduce with browser automation, then move the submit button out of Radix `DropdownMenuItem` if needed.
- expecting: Locale path changes from `/vi` to `/en` or vice versa after click.
- next_action: Run Playwright reproduction.

## Evidence

- timestamp: 2026-06-27
  note: `CommerceContextSwitcher` renders a `<form action={setActiveMarketAction}>` containing `<DropdownMenuItem asChild><button type="submit">`.
- timestamp: 2026-06-27
  note: Playwright reproduced browser warning `Form submission canceled because the form is not connected` after clicking the dropdown option.
- timestamp: 2026-06-27
  note: After switching to a `useTransition` Server Action call, Playwright verified `/vi` redirects to `/en` with no console warning.

## Resolution

- root_cause: The Radix dropdown closed and unmounted the form before the browser could complete the native submit.
- fix: Replaced form-wrapped dropdown items with `button type="button"` items that call `setActiveMarketAction` inside `startTransition` using a constructed `FormData`.
- verification: `npm run typecheck`, `npm run lint`, `npm run build`, and Playwright `/vi` to `/en` switch passed.
- files_changed: `src/components/commerce-context-switcher.tsx`
