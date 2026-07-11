# Quick Task Plan

## Goal

Align Admin Exceptions and Admin Newsletter with the compact, responsive admin workspace established for Discounts and Shipping.

## Tasks

- [x] Replace separate metric cards on both pages with aligned summary strips.
- [x] Turn the exception queue into a searchable, status-filtered responsive list with consistently placed actions.
- [x] Rebuild newsletter filters with shared shadcn controls and remove horizontal scrolling from subscriber results.
- [x] Preserve server query/action behavior and update focused E2E coverage where needed.
- [x] Run formatting, lint, typecheck, unit tests, and production build.

## Guardrails

- Keep masked exception emails and minimized newsletter consent evidence behavior intact.
- Keep review actions visible without horizontal navigation.
- Do not modify unrelated existing work in `src/app/admin/layout.tsx`.
