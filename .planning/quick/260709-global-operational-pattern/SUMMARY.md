---
status: complete
completed: 2026-07-09
slug: global-operational-pattern
---

# Summary: Global Operational Pattern

## Completed

- Added `runMonitoredAction` and `runMonitoredQuery` as shared wrappers for recoverable server-side operational failures.
- Kept expected user-controlled outcomes out of operational error recording.
- Migrated wishlist add/remove helpers to `runMonitoredAction`.
- Migrated homepage featured product fallback to `runMonitoredQuery`.
- Promoted `storefront` to a first-class operational error area and preserved safe `locale` facts.
- Added a database migration so `operational_errors.area` accepts `storefront` and dotted namespaced `error_code` values.
- Added admin query coverage so storefront operational errors remain filterable and visible as storefront issues.
- Added Storefront to the admin operational error area filter.
- Documented the project rule in `.planning/CONVENTIONS.md`.

## Verification

- `npm run test:unit -- tests/unit/operations/monitoring.test.ts tests/unit/operations/redaction.test.ts tests/unit/operations/admin-queries.test.ts tests/unit/storefront/home-featured-products.test.ts tests/unit/account/wishlist.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run db:lint`
- `npm run db:test` attempted; failed because the local database schema is stale/incomplete and is missing existing project objects including `operational_errors`, `blog_posts`, `launch_settings`, and `policy_pages`. Do not infer a failure in this migration from that run without first resetting/applying the full local migration history.
