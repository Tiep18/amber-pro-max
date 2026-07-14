---
quick_id: 260714-x6u
status: human_needed
verified_at: '2026-07-15T00:35:00+07:00'
verified_commits:
  - 157b48c
  - db5a785
  - 0828690
---

# Quick Task 260714-x6u Verification

## Result

The implementation satisfies every code- and database-verifiable must-have. No source-code gap was found. Status is `human_needed` only because the targeted browser flow has not completed against a clean, current local application server; the existing workspace dev process held the Next.js lock during execution.

## Must-have verification

### 1. Incomplete drafts persist without weakening structural validation — PASS

- `productDraftSchema` permits blank localized titles/slugs and `enabled: true` with a null price, while retaining UUID, length, non-empty slug format, integer/nonnegative money, JSON-object specifications, and collection-order validation.
- `productSavePayload` normalizes a blank slug to SQL `null`; it does not introduce placeholder values.
- Migration `20260714220000_allow_incomplete_catalog_drafts.sql` drops only the title nonblank and enabled-offer-price draft constraints and makes only `product_translations.slug` nullable. Market/currency pairing, nonnegative money, locale, type, JSON, foreign-key, uniqueness, and RLS constraints remain intact.
- `02_atomic_catalog_product_save.test.sql` proves two incomplete aggregates can save/reload with null slugs and an enabled null-price offer without collisions.
- The generated Supabase types contain only the expected nullable slug changes for Row/Insert/Update.

### 2. Publish authority retains all required blockers — PASS

- The replacement `catalog_publish_issues(uuid)` delegates to the original `private.catalog_publish_issues_v1`, preserving translation presence, slug, SEO title/description, social image, primary image, complete enabled market offer, private PDF, and inventory checks.
- It adds blank-title `missing_translation`, null/blank-slug `missing_slug`, enabled-null-price `invalid_market_offer`, and preserves `incompatible_product_data` from the preceding invariant migration.
- `publish_catalog_product` remains the database authority and only changes status after the issue set is empty. Public catalog queries continue to require `products.status = 'published'`, so nullable draft data is not projected publicly.
- pgTAP coverage proves incomplete aggregates return the stable blocker codes and cannot publish.

### 3. Published-state invariant is complete for the relaxed fields — PASS

- The translation update trigger now watches `title` as well as product/locale/slug/SEO/social-image eligibility fields. Existing translation delete coverage remains in place.
- The market-offer insert trigger demotes on a newly inserted enabled null-price offer.
- The market-offer update trigger runs when product, market, enabled state, or price nullability changes; the existing delete trigger remains in place.
- All affected triggers invoke `private.maintain_catalog_publish_invariant()`, which evaluates both old and new product ids where applicable.
- `02_catalog_model.test.sql` proves blanking a published translation title, inserting an enabled null-price offer, and changing an enabled offer price to null each immediately demote the product to draft.

### 4. Publish uses the exact current editor snapshot — PASS

- `ProductForm.publishProduct` captures `draft` and its serialized signature synchronously, then passes that captured object to `saveAndPublishProductAction`.
- `saveAndPublishProductAction` authorizes and validates before creating a Supabase client, invokes `admin_save_catalog_product`, short-circuits unless the result is `saved`, and only then calls `publish_catalog_product` using the returned product id.
- The same submitted signature is stored for both blocked and published outcomes. A blocked publish therefore reports mapped database blockers while correctly marking the successfully saved snapshot as persisted.
- Unit tests verify RPC order, changed title/price payload identity, save-failure short-circuit, invalid-input short-circuit before client creation, blocker mapping, and sanitized operational failures.

### 5. Browser regression selectors are plausible — STATIC PASS / RUNTIME CHECK NEEDED

- The spec uses the current Radix Select trigger/option roles, the two rendered locale tablists, Toggle button state, taxonomy option buttons, collection display-order label, and catalog table row semantics.
- `npx playwright test tests/e2e/admin-product.spec.ts --list` discovers both tests successfully.
- The regression scenario saves an incomplete draft, reloads and checks partial values, changes a distinctive title and price without Save draft, publishes into expected media/PDF blockers, reloads, and verifies the same snapshot and draft status in the editor and catalog list.

## Verification commands

- `npm run test:unit -- tests/unit/catalog/publish-checks.test.ts` — PASS, 20/20 tests.
- `npm run typecheck` — PASS.
- `npx playwright test tests/e2e/admin-product.spec.ts --list` — PASS, 2 tests discovered.
- Fresh-reset evidence recorded by the executor: `db:reset`, `db:lint`, 32 database files / 794 assertions, catalog unit suite 77/77, lint, typecheck, and production build all passed.
- A verifier rerun of `npm run db:test` without first resetting the shared local database confirmed the two task-specific pgTAP files pass, but the overall command failed in unrelated suites because persistent local fixtures were already present (`guest-race-pattern` listing pollution and a duplicate checkout-concurrency fixture id). This is dirty shared database state, not a failure of this task's assertions.

## Required manual browser check

Run from a reset local Supabase instance and a dev server built from current HEAD:

1. Stop or reuse only the workspace's current Next.js process so `.next/dev/lock` is not owned by an older build.
2. Run `npx playwright test tests/e2e/admin-product.spec.ts`.
3. Confirm both Chromium tests pass, especially the incomplete-draft reload and publish-with-unsaved-snapshot scenario.

No source change is required unless that runtime browser check exposes a selector or hydration issue.
