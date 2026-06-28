---
status: completed
created: 2026-06-28
slug: localhost-e2e-route-loop
---

# Localhost E2E Route Loop

## Scope

- Revert the Vietnamese route alias workaround.
- Compare main/root and worktree behavior for `/vi/cua-hang`.
- Identify why localized Vietnamese pathnames loop in the worktree.
- Apply the minimal environment/config fix instead of duplicating route files.

## Verification

- `curl` main/root `/vi/cua-hang`.
- `curl` worktree `/vi/cua-hang` under `127.0.0.1` and `localhost` dev server modes.
- Update Playwright to use localhost consistently.
