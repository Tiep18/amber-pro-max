---
status: in-progress
created: 2026-07-10
---

# Pattern Library Polish

## Goal

Refine the account pattern library so purchased PDFs feel like a calm customer library while preserving private download security, entitlement behavior, authenticated visibility, localized routes, and the existing POST download endpoint.

## Scope

- Replace the dashboard-like card wrapper with a lighter account section.
- Rework pattern rows into compact library entries with clearer active/inactive states and download affordance.
- Keep `form method="post"` and `/api/downloads` payload unchanged.
- Make empty and error states consistent with the polished account surfaces.

## Verification

- Typecheck.
- Lint.
- Unauthenticated route guard smoke.

## Progress

- [x] Created quick task context.
- [x] Refine pattern library UI.
- [x] Run verification.
