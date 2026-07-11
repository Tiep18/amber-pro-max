# Quick Task Plan

## Goal

Turn Admin Policies into a focused bilingual legal-content workspace consistent with the redesigned admin system while preserving policy action and publication contracts.

## Review Findings

- Four full policy editors render side by side, creating excessive scroll and weak task focus.
- Vietnamese and English fieldsets are stacked instead of using the established locale-tab pattern.
- Native inputs/textareas bypass shared shadcn styling.
- Structured server validation issues are discarded, leaving only a generic alert.
- Publish actions are separated from the content context after long scrolling.

## Tasks

- [x] Add an aligned summary strip and a focused policy workspace with responsive policy navigation.
- [x] Redesign PolicyForm with locale tabs, content/SEO hierarchy, shadcn controls, and compact persistent actions.
- [x] Map server validation issues to fields, switch to the first invalid locale, and provide accessible inline feedback.
- [x] Preserve unsaved state when switching among the four policy editors.
- [x] Update E2E/unit coverage and run formatting, lint, typecheck, unit tests, and build.

## Guardrails

- Preserve policy kinds, payloads, draft/publish/unpublish behavior, and blocker semantics.
- Keep all four form instances mounted but hide inactive panels semantically to retain unsaved edits.
- Do not stage the existing user change in `src/app/admin/layout.tsx`.
