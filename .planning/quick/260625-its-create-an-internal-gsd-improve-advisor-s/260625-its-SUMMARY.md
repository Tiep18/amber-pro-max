---
status: complete
quick_id: 260625-its
completed: 2026-06-25
---

# Summary: Create GSD Improve Advisor Skill

## Completed

- Created `.codex/skills/gsd-improve-advisor/` as a project-local Codex skill.
- Defined `shadcn/improve` as an advisory audit source that must route accepted work back through GSD.
- Added routing guidance for debug, quick tasks, phase work, security-sensitive findings, deferred items, and rejected findings.
- Preserved `.planning/` as the source of truth for decisions, plans, state, and commits.

## Verification

- Ran `quick_validate.py` against `.codex/skills/gsd-improve-advisor`: passed.
- Scanned the skill for template and unfinished-work markers: none found.
- Forward-testing with a subagent was not run because this Codex session only permits subagents when the user explicitly requests delegation.

## Files Changed

- `.codex/skills/gsd-improve-advisor/SKILL.md`
- `.codex/skills/gsd-improve-advisor/agents/openai.yaml`
- `.planning/quick/260625-its-create-an-internal-gsd-improve-advisor-s/260625-its-PLAN.md`
- `.planning/quick/260625-its-create-an-internal-gsd-improve-advisor-s/260625-its-SUMMARY.md`
- `.planning/STATE.md`
