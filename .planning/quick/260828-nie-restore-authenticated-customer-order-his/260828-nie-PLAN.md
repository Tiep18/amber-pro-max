---
quick_id: 260828-nie
status: planned
mode: quick
must_haves:
  truths:
    - 'An authenticated customer can query the owner-scoped order_payment_statuses projection without any private-schema access.'
    - 'Anonymous callers do not gain access to the private payment status helpers.'
    - 'The storefront continues to use the authenticated Supabase client and RLS rather than a service-role bypass.'
  artifacts:
    - 'supabase/migrations/20260828163000_restore_authenticated_payment_projection_access.sql'
    - 'supabase/tests/database/04_payment_rls_audit.test.sql'
    - 'supabase/tests/rehearsals/05_order_payment_status_view_upgrade.sql'
  key_links:
    - 'The security-invoker order_payment_statuses view inlines pure status mappings and remains owner-scoped by underlying RLS.'
---

# Restore Authenticated Customer Order History

**Goal:** Remove the customer order-history load failure caused by missing PostgreSQL privileges while preserving owner-scoped RLS.

**Approach:** Add a pgTAP regression contract first, then remove the view's dependency on private helpers by inlining the pure mappings and granting authenticated users only `SELECT` on the security-invoker projection. Validate locally, inspect and apply the migration remotely, and reload the authenticated page.

### Task 1: Add a failing authenticated projection regression test

**Files:**

- Modify: `supabase/tests/database/04_payment_rls_audit.test.sql`

**Action:** Assert the authenticated role has no private-schema/helper privileges, anonymous callers remain blocked, and a PostgREST-equivalent projection query executes successfully.

**Verify:** The focused pgTAP suite fails before the migration because `authenticated` cannot resolve or execute the private helper.

### Task 2: Restore least-privilege helper access

**Files:**

- Create: `supabase/migrations/20260828163000_restore_authenticated_payment_projection_access.sql`

**Action:** Inline the view's pure status mapping expressions while preserving either known historical column order, grant `authenticated` select on the owner-scoped view, and keep private schema/helper access unavailable to both `authenticated` and `anon`.

**Verify:** The focused pgTAP suite, historical-layout migration rehearsal, and full database suite pass after clean local resets.

### Task 3: Deploy and verify the customer path

**Files:**

- Create: `.planning/quick/260828-nie-restore-authenticated-customer-order-his/260828-nie-SUMMARY.md`
- Modify: `.planning/STATE.md`

**Action:** Dry-run remote migration deployment, push only after confirming there are no unrelated pending migrations, then reload `/vi/tai-khoan/don-hang` in the authenticated browser session.

**Verify:** The page renders order history or the normal empty state without `Chưa tải được lịch sử đơn hàng.`
