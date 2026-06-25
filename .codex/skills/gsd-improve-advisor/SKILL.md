---
name: gsd-improve-advisor
description: Use when applying shadcn/improve, improve audit plans, advisor-plans, or AI-generated codebase audit findings inside this GSD project without bypassing .planning workflows.
---

# GSD Improve Advisor

## Overview

Use `shadcn/improve` as an advisor only. GSD remains the source of truth for decisions, planning, execution, verification, state, and commits.

This skill is for triaging audit output into the right GSD path. It does not execute `improve` plans directly.

## Workflow

1. **Scope the audit.** Name the phase, plan, domain, or path being reviewed. Prefer the current GSD focus from `.planning/STATE.md` when the user does not specify.
2. **Run or read improve output.** If `plans/README.md` exists, reconcile it first. If `plans/` belongs to another tool or conflicts with the project, use `advisor-plans/` for improve output.
3. **Treat findings as candidates.** Do not assume every improve plan is worth doing. Check each candidate against `AGENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, current phase artifacts, and project constraints.
4. **Route accepted work through GSD.**
5. **Keep rejected or deferred work visible.** Summarize why each declined finding was rejected, duplicated, stale, out of scope, or deferred.

## Routing

| Finding type | Route |
|---|---|
| Bug, regression, flaky behavior, broken flow | `/gsd-debug` |
| Security, RLS, payment, webhook, entitlement, private storage risk | Use the relevant security/payment/domain skill, then `/gsd-debug` or Codex Security if the user asked for a scan |
| Small docs, tests, cleanup, config, or focused code improvement | `/gsd-quick` |
| Current phase implementation choice or launch verification gap | `/gsd-discuss-phase`, `/gsd-plan-phase`, or `/gsd-execute-phase` for that phase |
| New capability outside the roadmap or current phase | Deferred idea or backlog note, not immediate execution |
| Duplicate, stale, already implemented, or contradicted by locked decisions | Reject with reason |

## Guardrails

- Never execute a generated `improve` plan directly when it changes repo files. Convert it into a GSD quick task, debug task, or phase plan first.
- Never create a second source of truth for roadmap, phase status, or decisions. `.planning/` owns those.
- Do not let `plans/` or `advisor-plans/` artifacts overwrite GSD artifacts.
- Keep findings scoped to the requested audit. Broad refactors need explicit user approval and their own GSD workflow.
- Verify against existing tests and phase artifacts before calling a finding actionable.
- Preserve unrelated dirty worktree changes.

## Improve Output Checklist

For each candidate finding, capture:

- Source artifact path and commit/revision it was written against.
- Affected files or surfaces.
- Why it matters for this store: market correctness, bilingual UX, payment safety, fulfillment access, SEO, admin operations, or launch readiness.
- GSD route and proposed next command.
- Status: accepted, rejected, duplicate, stale, deferred, or needs user decision.

## Response Shape

When reporting results to the user, lead with the recommended GSD action:

```text
Recommendation: Run /gsd-debug for the PayPal webhook replay finding.

Accepted:
- [Finding title] -> /gsd-debug because ...

Deferred:
- [Finding title] -> future phase because ...

Rejected:
- [Finding title] -> already covered by ...
```

If the user asks to proceed with an accepted item, start the appropriate GSD command before editing files.
