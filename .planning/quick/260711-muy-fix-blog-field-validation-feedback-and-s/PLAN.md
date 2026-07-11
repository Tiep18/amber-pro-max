# Quick Task Plan

## Root Cause

`saveBlogPostDraftAction` returns structured Zod issues with field paths, but `BlogPostForm` discards `result.issues` and only shows a generic alert. Controls therefore never receive field errors, invalid ARIA state, or locale-tab focus.

## Tasks

- [x] Add tested mapping from server validation issues to concise field-level messages and the first invalid locale.
- [x] Connect mapped errors to blog inputs with highlighting, descriptions, clearing-on-edit, and automatic locale switching/focus.
- [x] Add a shadcn-style Radix Checkbox control and migrate blog tags/products from native checkboxes.
- [x] Review form render and state patterns against Vercel React best practices and avoid unnecessary derived state/effects.
- [x] Update focused E2E coverage and run formatting, lint, typecheck, unit tests, and build.

## Guardrails

- Keep server schema and action contracts authoritative.
- Preserve all draft, publish, schedule, and relation payload behavior.
- Do not stage the existing user change in `src/app/admin/layout.tsx`.
