---
status: in-progress
created: 2026-06-27
slug: admin-pages-ux
---

# Admin Pages UX

Upgrade the admin experience using the approved Phase 1 slice from `admin-pages-ux.md`.

## Scope

- Replace the flat admin navigation with a grouped admin shell.
- Improve the admin dashboard around daily operational attention.
- Improve orders and catalog list pages for faster scanning.
- Keep existing routes, auth, and data model unchanged.
- Do not stage or modify the unrelated `src/proxy.ts` working-tree change.

## Verification

- Run lint/typecheck where practical.
- Manually review changed TSX for responsive layout and route safety.
