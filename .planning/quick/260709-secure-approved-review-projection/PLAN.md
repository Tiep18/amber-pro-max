---
status: complete
date: 2026-07-09
---

# Secure Approved Review Projection

## Objective

Remove the Supabase security warning on `approved_product_reviews` by replacing the public security-definer view with a sanitized RLS-backed projection that does not read `auth.users` during public storefront queries.

## Plan

1. Create a Supabase migration with the CLI.
2. Replace `public.approved_product_reviews` view with a table of the same API-facing name.
3. Enable RLS on the projection and grant public read only for sanitized approved review rows.
4. Add private trigger sync so product review moderation, reply changes, direct service-role seed writes, and review edits keep the projection current.
5. Update pgTAP coverage to prove the projection is an RLS table, excludes sensitive reviewer fields, and stores only masked identity.
6. Regenerate Supabase types and run DB/app verification.
