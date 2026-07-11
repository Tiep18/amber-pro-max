# Quick Task Plan

## Goal

Redesign the two Admin Blog workspaces and their New/Edit states to match the compact, responsive admin system without changing blog publishing behavior.

## Tasks

- [x] Rebuild the Blog posts overview with an aligned summary strip, search/status filters, localization readiness, and responsive rows without horizontal scrolling.
- [x] Reorganize the shared New/Edit form around locale tabs, a focused content area, a responsive settings rail, shadcn controls, searchable tags/products, and persistent publishing actions.
- [x] Tighten New/Edit headers and navigation while preserving route and action contracts.
- [x] Apply small Blog taxonomy context and spacing refinements without reworking the shared TaxonomyManager behavior.
- [x] Update focused tests and run formatting, lint, typecheck, unit tests, and production build.

## Guardrails

- Preserve draft, publish, schedule, unpublish, blockers, authorization, and payload semantics.
- Keep every primary action reachable on desktop and mobile.
- Do not stage or modify the existing user change in `src/app/admin/layout.tsx`.
