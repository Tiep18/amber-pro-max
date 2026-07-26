# Phase 09 Plan 15 Gap: Full-CI Playwright Order/State Failures

## Status

Plan 09-15 is stopped in Task 2. The focused Phase 09 commerce and checkout regressions pass, but the required full `npm run ci` gate is red in the repository-wide Playwright stage. Task 3 deployment verification must not begin until this gap is resolved and full CI is green.

## Reproduction

Run from a reset local Supabase stack with the local database password scoped to the process:

```powershell
$env:SUPABASE_DB_PASSWORD = 'postgres'
npm run ci
```

All gates before Playwright passed:

- ESLint: passed.
- TypeScript: passed.
- Vitest: 82 files, 705 tests passed.
- Database reset and lint: passed.
- pgTAP: 35 files, 849 assertions passed; only the documented disposable Phase 08 rehearsal was skipped.
- Generated Supabase types: exact zero drift.
- Next.js production build: passed.
- Security suite: 49/49 passed.

The final Playwright aggregate was:

| Result | Count |
| --- | ---: |
| Passed | 81 |
| Failed | 20 |
| Flaky | 1 |
| Skipped | 37 |
| Did not run | 33 |
| Duration | 22.9 minutes |

## Failed Browser Cases

The 20 terminal failures were in:

1. `tests/e2e/account-retention.spec.ts` — create/edit address
2. `tests/e2e/admin-boundary.spec.ts` — signed-in customer account/sign-out
3. `tests/e2e/admin-discounts.spec.ts` — reusable discount creation
4. `tests/e2e/admin-media.spec.ts` — media/PDF upload and publish
5. `tests/e2e/admin-operations.spec.ts` — sanitize and resolve operational error
6. `tests/e2e/admin-product.spec.ts` — draft/publish editor snapshot
7. `tests/e2e/admin-shipping-assignments.spec.ts` — parcel-profile inheritance
8. `tests/e2e/admin-taxonomy.spec.ts` — bilingual taxonomy create/reopen
9. `tests/e2e/admin-variants.spec.ts` — variant inventory/price lifecycle
10. `tests/e2e/blog-admin.spec.ts` — bilingual draft and publish blockers
11. `tests/e2e/blog.spec.ts` — localized published-post listing
12. `tests/e2e/catalog-discovery.spec.ts` — URL-composed search/type/sort
13. `tests/e2e/catalog-discovery.spec.ts` — complete-result load-more state
14. `tests/e2e/catalog-discovery.spec.ts` — first-image LCP loading
15. `tests/e2e/launch-critical.spec.ts` — localized storefront/checkout mobile smoke
16. `tests/e2e/market-exception.spec.ts` — exception request page
17. `tests/e2e/newsletter.spec.ts` — English guest subscribe
18. `tests/e2e/policies.spec.ts` — bilingual policy publish
19. `tests/e2e/reviews.spec.ts` — verified review submission
20. `tests/e2e/storefront-state.spec.ts` — batched wishlist state

`tests/e2e/admin-shipping.spec.ts` failed once and passed on retry, producing the single flaky result.

## Evidence the Assigned Phase 09 Slice Passes

- The isolated six-file Phase 09 storefront matrix passed 39/39 with zero retries, failures, fixmes, or skips.
- In the full run, localized product/SEO detail passed 5/5.
- In the full run, catalog market isolation passed 7/7.
- In the full run, checkout destination/payment authority passed 4/4:
  - destination material-change confirmation;
  - international browsing overridden by a Vietnam physical destination with VND/VietQR;
  - server-quoted discount apply/remove;
  - international digital checkout rejecting a browser-selected VietQR override.
- In the full run, storefront market convergence passed 10/10, including rapid/stale requests, rollback, reload/navigation, focus/visibility, cross-tab invalidation, requote masking, destination authority, and the final digital/physical/mixed payment gate.
- Focused checkout unit tests passed 25/25.
- Focused checkout security boundary tests passed 6/6; the full security suite passed 49/49.
- Protected checkout, payment, inventory, snapshot, and schema authority sources were not modified.

## Failure Shape and Debugging Hypothesis

This is a debugging lead, not a proven root cause.

The failures cluster around repository-wide sequencing and mutable fixtures:

- Multiple strict-locator failures found duplicate headings, labels, toast messages, emails, or operational facts.
- Several assertions observed unexpected result counts or missing UI after earlier suites had created or changed database records.
- Auth/admin cases missed expected redirects or protected pages.
- Multiple mutation-heavy tests timed out while clicking or waiting for a server-action result.
- The Playwright web server repeatedly logged `unhandledRejection: Error: An unexpected response was received from the server.`
- The same Phase 09 files pass when isolated, while `storefront-state.spec.ts` fails only in the repository-wide sequence.

The next debug session should determine whether test cleanup is incomplete, database fixtures collide across suites/retries, Next.js server-action responses become unstable after long mutation-heavy runs, or a combination of these conditions exists. It should reproduce from a clean reset, identify the earliest causal failure, and avoid weakening assertions or converting failures into skips.

## Scope Boundary

Plan 09-15 is tests-only. Do not change `src/checkout/quote.ts`, `src/checkout/submit-checkout.ts`, `src/payments/**`, or checkout/payment/inventory/snapshot migrations to make this gate pass. Any required production-authority change needs a separate reviewed gap plan.

