# Quick Task Plan

## Goal

Replace the project's two native datetime-local controls with one reusable shadcn-style DateTimePicker while preserving the existing local datetime string contract.

## Scope

- Admin Blog publish date/time.
- Admin Orders VietQR received date/time.

## Tasks

- [x] Add the standard shadcn Calendar/Popover dependencies and owned UI primitives.
- [x] Build an accessible DateTimePicker composition with calendar, hour, and minute controls.
- [x] Migrate both controlled and form-submitted datetime fields without changing payload semantics.
- [x] Add focused unit/E2E coverage and verify value behavior.
- [x] Run formatting, lint, typecheck, unit tests, and production build.

## Guardrails

- Preserve `YYYY-MM-DDTHH:mm` local datetime values expected by current actions.
- Keep hidden form submission compatibility for VietQR.
- Do not stage the existing user change in `src/app/admin/layout.tsx`.
