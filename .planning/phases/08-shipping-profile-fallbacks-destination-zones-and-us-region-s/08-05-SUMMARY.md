---
phase: 08-shipping-profile-fallbacks-destination-zones-and-us-region-s
plan: "05"
subsystem: admin-shipping-ui
tags: [shipping, admin, ui, nextjs, playwright]
requires:
  - phase: 08-04
    provides: authorized shipping profile, default, rule, region, and assignment actions
provides:
  - Protected admin shipping projection for parcel profiles, defaults, destination rules, assignments, and US adjustments
  - Responsive one-column shipping management sections with controlled Sheets
  - Focused browser coverage for profile creation, default selection, rule creation, and US adjustment creation
affects: [admin-shipping, catalog-assignment-ui, checkout-shipping]
key-files:
  created:
    - src/components/admin/commerce/shipping-management.tsx
  modified:
    - src/app/admin/shipping/page.tsx
    - src/components/admin/commerce/shipping-create-sheet.tsx
    - src/components/admin/commerce/shipping-profile-form.tsx
    - src/components/admin/commerce/shipping-rule-sheet.tsx
    - src/components/admin/commerce/shipping-region-adjustment-sheet.tsx
    - src/components/admin/commerce/deactivate-shipping-profile-button.tsx
    - src/checkout/admin-shipping-actions.ts
    - src/proxy.ts
    - tests/e2e/admin-shipping.spec.ts
decisions:
  - Profile creation remains parcel-only; destination rules and US adjustments are created in separate Sheets.
  - Admin shipping reads Phase 08 tables through a narrow server projection until generated Supabase types are refreshed.
  - Locale-prefixed auth routes bypass next-intl proxy handling so existing physical auth pages render for admin e2e flows.
verification:
  - npm.cmd run test:unit -- tests/unit/checkout/admin-commerce-actions.test.ts
  - npm.cmd run typecheck
  - npm.cmd run lint
  - npm.cmd run test:e2e -- tests/e2e/admin-shipping.spec.ts
  - npm.cmd run test:security (fails on pre-existing catalog/newsletter baseline checks)
commits:
  - bc71ec5 refactor(08-05): separate profile creation from shipping rules
  - 6508915 feat(08-05): add destination rule sheet
  - 6265cc5 feat(08-05): add US shipping adjustment sheet
  - 1e5961a feat(08-05): label fallback shipping rules clearly
  - a6b9266 feat(08-05): add structured shipping management sections
  - 33b469b feat(08-05): polish shipping adjustment and assignment sections
  - cfd676f fix(08-05): stabilize shipping admin browser flow
requirements-completed: [SHIP-07, SHIP-08, SHIP-10]
completed: 2026-07-12
---

# Phase 08 Plan 05 Summary

Admin Shipping now has a protected, sectioned management UI for parcel profiles, explicit defaults, destination rules, US region adjustments, and assignment visibility.

## Accomplishments

- Split profile creation from shipping fee rules so admins create parcel profiles first, then add exact-country or Other countries destination rules.
- Added a server-authorized admin projection that includes active default state, assignment counts, destination rules, and US adjustments without privileged client access before `requireAdmin`.
- Reworked Admin Shipping into clean one-column sections: Parcel profiles, Destination rules, US region adjustments, and Assignments.
- Added default-profile selection UI, persistent Default badges, zero-default readiness warning, and blocked deactivation copy for the current default.
- Added controlled destination-rule and US-adjustment Sheets that refresh through App Router instead of full-page reloads.
- Expanded US region selection to the full normalized state/territory list accepted by the server schema.
- Updated browser coverage to exercise create profile, set default, add US rule, add California surcharge, and no horizontal overflow.
- Fixed a Next 16 server-action runtime issue by keeping Zod schema objects internal to the `"use server"` file.
- Fixed locale-prefixed auth route handling so `/en/sign-in` and `/vi/dang-nhap` render for admin browser flows.

## Verification

- Passed: `npm.cmd run test:unit -- tests/unit/checkout/admin-commerce-actions.test.ts`
- Passed: `npm.cmd run typecheck`
- Passed: `npm.cmd run lint`
- Passed with remote Supabase env: `npm.cmd run test:e2e -- tests/e2e/admin-shipping.spec.ts`
- Ran: `npm.cmd run test:security`
  - Remaining failures are pre-existing/unrelated baselines:
    - `public catalog has no pre-payment digital fulfillment path`
    - `admin newsletter surface is read-only and exposes no consent override controls`

## Deviations from Plan

- The plan expected full destructive confirmation primitives, but the existing UI stack does not currently include an AlertDialog primitive. The current default deactivation path is blocked inline, and non-default deactivation keeps the existing native confirmation pattern.
- The assignment section is intentionally a boundary/readiness surface only. Product and variant assignment controls remain owned by Plan 08-06.
- Browser verification initially exposed two unrelated blockers: stale Next dev lock and broken localized auth route handling. The stale generated lock was removed locally; the auth route bypass was fixed in source.

## Next Phase Readiness

Plan 08-06 can now attach product and variant assignment controls to the visible Assignments boundary and reuse the profile/default projection patterns established here.

