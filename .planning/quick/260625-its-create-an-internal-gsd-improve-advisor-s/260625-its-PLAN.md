---
status: in_progress
quick_id: 260625-its
slug: create-an-internal-gsd-improve-advisor-s
created: 2026-06-25
---

# Quick Task: Create GSD Improve Advisor Skill

## Goal

Create a project-local Codex skill that lets future sessions use `shadcn/improve` as an advisory audit source while keeping GSD as the source of truth for planning, execution, state, and commits.

## Tasks

1. Scaffold `.codex/skills/gsd-improve-advisor/` with a valid `SKILL.md` and UI metadata.
2. Define a concise workflow that:
   - scopes the audit,
   - reads `improve` output from `plans/` or `advisor-plans/`,
   - classifies findings,
   - routes accepted work into `/gsd-quick`, `/gsd-debug`, `/gsd-discuss-phase`, or `/gsd-plan-phase`,
   - prevents direct execution of `improve` plans outside GSD.
3. Validate the skill structure with `quick_validate.py`.

## Verification

- Run the skill validator.
- Inspect the skill for unfinished template markers and contradictions.
- Confirm no unrelated files were changed intentionally.
