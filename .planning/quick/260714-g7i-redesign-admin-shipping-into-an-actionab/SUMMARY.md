---
quick_id: 260714-g7i
status: complete
completed: 2026-07-14
---

# Admin shipping workspace redesign summary

Admin shipping is now an action-oriented package-rate workspace instead of four disconnected read-only summaries. Each package row exposes its effective Vietnam, United States, and fallback rates, assignment count, readiness state, and direct add/edit actions. Custom-country rates and US state adjustments stay attached to their parent package behind progressive disclosure.

## Delivered

- Added create/edit flows for package types, destination rates, and US state adjustments.
- Added safe package reactivation and prevented deactivation of the active store default.
- Added confirmation dialogs for default changes, deactivation, and dirty-form dismissal.
- Replaced global readiness checks with profile-first checks for the default and assigned packages.
- Added visible field recovery, focus styles, explicit currency context, pending states, and 44px controls.
- Parallelized independent shipping page reads and removed duplicated metric-card UI.
- Updated unit and Playwright contracts to match the package-rate workflow.

## Scope preserved

- No shipping resolver, checkout arithmetic, database migration, customer localization, or carrier integration changed.
- The user's existing `.gitignore` modification was not included in this task.

