---
status: resolved
trigger: improve branch review found npm run build failing after guest reopen form was converted to a Client Component
created: "2026-06-25T17:31:53.1303547+07:00"
updated: "2026-06-25T17:34:49.0000000+07:00"
---

# Debug Session: build-fails-guest-reopen

## Symptoms

- Expected behavior: `npm run build` completes for the current branch/worktree.
- Actual behavior: `npm run build` fails during Turbopack build.
- Error messages: Next.js reports inline `"use server"` actions from `src/fulfillment/order-claim.ts` are imported into the Client Component graph through `src/components/fulfillment/guest-reopen-form.tsx`, which also pulls in `server-only` and `next/headers` modules.
- Timeline: Started after the current working-tree refactor changed `GuestReopenForm` to `'use client'`.
- Reproduction: Run `npm run build`.

## Current Focus

- hypothesis: `GuestReopenForm` imports inline server actions from a mixed server module instead of a top-level `"use server"` action module.
- test: Move or wrap the affected actions in a dedicated top-level `"use server"` module and rerun `npm run build`.
- expecting: Turbopack no longer imports `src/fulfillment/order-claim.ts` into the Client Component graph through `guest-reopen-form.tsx`.
- next_action: create a scoped server-action module for guest order reopen/claim email and update the client form import.

## Evidence

- timestamp: 2026-06-25T17:31:53+07:00
  observation: `npm run build` failed with inline `"use server"` and `server-only` import errors through `src/components/fulfillment/guest-reopen-form.tsx`.

## Eliminated

- hypothesis: TypeScript type errors are the cause.
  reason: `npm run typecheck` passed before this debug session.

## Resolution

- root_cause: `GuestReopenForm` became a Client Component and imported inline `"use server"` actions from `src/fulfillment/order-claim.ts`, a mixed module that also references server-only dependencies.
- fix: Added `src/fulfillment/guest-order-actions.ts` as a top-level `"use server"` action module and changed the client form to import from it. Also completed the route-localization cleanup found during the same review by removing stale EN-only guards from internal account/guest/order pages and restoring auth locale guards on duplicate physical auth routes.
- verification: `npm run typecheck`, `npm run lint`, targeted unit/security tests, and `npm run build` passed.
- files_changed: `src/fulfillment/guest-order-actions.ts`, `src/components/fulfillment/guest-reopen-form.tsx`, localized account/guest/order/auth route files, `src/i18n/routing.ts`, `tests/unit/i18n/routing.test.ts`, `tests/security/fulfillment-boundaries.test.mjs`, `src/components/ui/toggle-group.tsx`.
