---
quick_id: 260718-006
status: human_needed
verified_at: '2026-07-18T00:40:00+07:00'
verified_commits:
  - 2e7abae
  - a126d8a
  - a539d80
---

# Verification: admin toast notification migration

## Result

`human_needed`

The implementation satisfies the source-level must-haves and passes lint, typecheck, production build, and all 589 unit tests. Final authenticated browser confirmation remains blocked by the unavailable local Docker/Supabase environment.

## Must-have assessment

| Must-have                                                                       | Status                  | Evidence                                                                                                                                                           |
| ------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| One global branded toaster                                                      | Satisfied               | `src/components/ui/sonner.tsx` uses existing design tokens and `src/app/layout.tsx` mounts it once after page content.                                             |
| Exactly classified sanitized action feedback                                    | Satisfied in source     | Callers map typed statuses to stable copy; no raw exception, provider payload, token, or customer value is passed to Sonner.                                       |
| Durable and actionable information remains inline                               | Satisfied               | Field errors, blocker lists, readiness, exception grant tokens, VietQR evidence, client file validation, and storage cleanup warnings retain inline rendering.     |
| No redirect/query toast replay                                                  | Satisfied in source     | Product/blog first save uses clean `router.replace`; taxonomy consumes feedback params and replaces the URL. Focused E2E source asserts reload does not replay.    |
| Narrow typed Server Action client islands                                       | Satisfied               | Operations resolve and fulfillment entitlement, physical, retry, and resend controls use typed `useActionState`; presentation containers remain Server Components. |
| Pending, stale, invalid, duplicate, and authorization behavior remains accurate | Satisfied               | Pending buttons stay disabled and result unions map stale/invalid/not-found/forbidden/duplicate separately from success.                                           |
| Existing domain semantics remain unchanged                                      | Satisfied               | Server mutations, expected versions, confirmation inputs, revalidation, and payment/fulfillment transitions are preserved.                                         |
| Automated regression gates                                                      | Partial due environment | Static/build/unit gates pass. Authenticated Playwright could not reach fixtures because Supabase local was offline.                                                |

## Verification gates

- `npm run lint`: passed, no warnings.
- `npm run typecheck`: passed.
- `npx next build`: passed, including route generation for 106 static pages.
- `npm run test:unit`: passed, 76 files / 589 tests.
- Focused Vitest: passed, 13 files / 92 tests.
- `git diff --check`: passed.
- Unsafe migrated action cast search returned no matches.
- `npm run test:security`: 38 passed, 1 unrelated pre-existing false positive in `retention-boundaries.test.mjs` caused by the newsletter status filter text `Unsubscribed`.
- Focused Playwright was attempted; every selected spec failed during fixture setup with `ECONNREFUSED 127.0.0.1:55431`, before toast assertions ran.
- `npm run db:reset` was attempted and reported that Docker Desktop was unavailable.

## Required environment rerun

With Docker Desktop running:

1. Run `npm run db:reset`.
2. Run `npx playwright test tests/e2e/admin-media.spec.ts tests/e2e/admin-taxonomy.spec.ts tests/e2e/policies.spec.ts tests/e2e/reviews.spec.ts tests/e2e/admin-operations.spec.ts --project=chromium`.
3. Optionally narrow the existing newsletter security regex so a read-only `Unsubscribed` filter option is not mistaken for an override button, then rerun `npm run test:security` as a separate maintenance fix.

Until the environment-backed Playwright journey passes, the quick task remains `human_needed` rather than fully verified.
