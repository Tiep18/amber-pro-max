# Deferred Items

- `npm run test:security` has two pre-existing failures outside Plan 08-01 ownership:
  - `tests/security/catalog-boundaries.test.mjs` rejects the existing public product gallery projection's `object_path` field.
  - `tests/security/retention-boundaries.test.mjs` falsely matches the existing newsletter filter form action as a subscribe/unsubscribe control.
- Plan 08-01 changes only shipping migration and database-contract files, so these unrelated UI/security-harness issues were not modified.
