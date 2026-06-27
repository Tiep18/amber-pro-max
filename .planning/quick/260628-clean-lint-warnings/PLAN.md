---
status: in-progress
created: 2026-06-28
slug: clean-lint-warnings
---

# Clean Lint Warnings

Remove existing ESLint unused-variable warnings without changing behavior.

## Scope

- Remove stale checkout imports.
- Remove unused cart line locale prop and call-site props.
- Remove unused cart e2e constant.
- Adjust VietQR test mock callback parameters to avoid unused warnings.

## Verification

- Run `npm run lint`.
- Run `npm run typecheck`.
