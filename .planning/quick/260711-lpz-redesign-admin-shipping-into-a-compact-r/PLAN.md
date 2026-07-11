# Quick Task Plan

## Goal

Bring Admin Shipping in line with the compact, responsive interaction model established on Admin Discounts without changing shipping calculation behavior.

## Tasks

- [x] Replace the fixed create card with a responsive right-side Sheet launched from the page header.
- [x] Convert the currency field to the shared shadcn Select and tighten the form into a two-column layout where fields are short.
- [x] Replace separate metric cards and the old queue with a compact summary strip and searchable/filterable full-width profile list.
- [x] Add focused responsive and creation-flow coverage, then run typecheck, lint, tests, and build.

## Guardrails

- Preserve existing server actions, money conversion, admin authorization, and deactivate behavior.
- Avoid horizontal scrolling on desktop and mobile.
- Keep all actions visible without requiring sideways navigation.
