---
phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
plan: "15"
task: 1
status: blocked
gap_type: production-routing-regression
requirements: [MKT-01]
decision_refs: [D-02, D-23]
created: 2026-07-26
---

# Plan 09-15 Gap: Unsupported Accept-Language Does Not Use the Vietnamese Fallback

## Blocker

Plan 09-15 is tests-only. Task 1 cannot remove the remaining locale
`test.fail` marker without changing production locale-routing behavior.
Production changes are outside this plan's file boundary, so execution stopped
before weakening or promoting any marker.

## Reproduction

1. Reset the local database with `npm run db:reset`.
2. Run:

   ```text
   npm run test:e2e -- tests/e2e/localization.spec.ts
   ```

3. Exercise an unprefixed `/` request with:
   - no valid `NEXT_LOCALE` preference;
   - `Accept-Language: fr-FR,fr;q=0.9`.

The existing case is
`locale precedence > missing supported locale preference falls back to Vietnamese`
in `tests/e2e/localization.spec.ts`.

## Expected and Actual

| Contract | Result |
| --- | --- |
| Expected by D-02 and the unit-level `preferredLocale` contract | Redirect to `/vi` |
| Actual browser result | Redirect to `/en` |

The assertion currently passes only because it is marked as an expected failure.
Removing `test.fail` makes the Phase 09 browser gate red.

## Likely Boundary

- `src/i18n/routing.ts` defines `defaultLocale: 'vi'` and
  `preferredLocale()`, which correctly returns `vi` for absent or unsupported
  language input.
- `src/proxy.ts` delegates unprefixed requests directly to
  `createMiddleware(routing)`.
- The proxy does not apply `preferredLocale()` before the next-intl middleware,
  so the tested browser path does not use the project's lookup-style fallback
  contract.

The focused fix must reconcile the proxy/middleware negotiation path with
`preferredLocale()` while preserving:

- explicit localized URL precedence;
- valid `NEXT_LOCALE` precedence;
- weighted supported `Accept-Language` selection;
- the single Vietnamese fallback;
- existing Supabase session response composition;
- independent `ACTIVE_MARKET` suggestion semantics.

Do not change checkout, payment, order, inventory, quote, or snapshot authority.

## Required Regression Gates

The focused fix workflow must make all of these green:

```text
npm run test:unit -- tests/unit/i18n/routing.test.ts tests/unit/proxy.test.ts
npm run test:e2e -- tests/e2e/localization.spec.ts
npm run typecheck
npm run lint
npm run test:security
```

It must then resume Plan 09-15 Task 1 and run the complete assigned browser
matrix:

```text
npm run test:e2e -- tests/e2e/localization.spec.ts tests/e2e/catalog-market.spec.ts tests/e2e/catalog-discovery.spec.ts tests/e2e/storefront-state.spec.ts tests/e2e/storefront-market-convergence.spec.ts tests/e2e/cart.spec.ts
```

Before Task 1 can complete, the assigned Phase 09 matrix must contain zero
`test.fail`, `test.fixme`, or skip markers and must pass without weakening
locale, market, projection, cart, or checkout assertions.

## Evidence and Scope

- Initial six-file Task 1 run: 39 tests, 26 effective passes, 10 failures, and
  3 `fixme` skips.
- Clean-cache diagnostic of the previously failing cart/discovery/state files:
  14 tests, 4 passes, 10 failures, and 0 skips.
- The ten diagnostic failures are stale test fixture/selector assumptions and
  remain tests-only Plan 09-15 work. They were not edited because the locale
  production blocker must be fixed first.
- No production, checkout, payment, migration, or test files were modified.
- No Task 1 or Task 2 completion commit was created.

## Resume Point

Run a focused fix workflow for this locale-routing gap. After its regression
gates pass, resume Plan 09-15 at Task 1, promote all four remaining Phase 09
markers, update the stale tests-only fixtures/selectors, and continue to Task 2.
