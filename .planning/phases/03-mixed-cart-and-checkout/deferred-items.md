# Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Out-of-scope test failure | `npm run db:test` fails in `supabase/tests/database/02_catalog_storage.test.sql` tests 17-18 because local Supabase Storage now rejects direct deletes from `storage.objects`; Plan 03-02 pgTAP file `03_checkout_quote.test.sql` passes. | Existing Phase 02 storage test needs follow-up outside Plan 03-02. | 03-02 Task 1 |
