# Quick Task Plan

## Goal

Redesign Admin Launch and Admin Operations as compact, responsive system workspaces consistent with the rest of Admin.

## Tasks

- [x] Convert both pages to aligned summary strips and compact one-line headers.
- [x] Reorganize Launch into a scannable readiness queue plus a clearly grouped shadcn settings form.
- [x] Replace native Launch controls with shared Input, Textarea, Checkbox, and Button components.
- [x] Rebuild Operations with local search, shadcn status/area filters, compact responsive error rows, and always-visible resolve actions.
- [x] Preserve fail-closed readiness, sanitized facts, server filtering, and resolve action behavior.
- [x] Update focused coverage and run formatting, lint, typecheck, unit tests, and build.

## React Guardrails

- Derive filtered errors and summary counts with memoized values rather than synchronization effects.
- Keep server query filters in the URL and local text search in client state.
- Do not introduce client-side data fetching or duplicate server state.
- Do not stage the existing user change in `src/app/admin/layout.tsx`.
