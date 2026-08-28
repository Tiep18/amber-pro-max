---
status: resolved
trigger: "Customer account order page returns HTTP 200 but renders 'Chưa tải được lịch sử đơn hàng.'"
created: 2026-08-28T16:37:38+07:00
updated: 2026-08-28T17:17:26+07:00
---

# Debug Session: Account Order History Helper Permission

## Symptoms

- Expected behavior: A signed-in customer sees only their owner-scoped order history, or the localized empty state when no orders exist.
- Actual behavior: The authenticated account shell renders, but the page renders the localized order-history failure alert.
- Error messages: UI shows `Chưa tải được lịch sử đơn hàng.`; remote operational evidence records PostgreSQL `42501` and `permission denied for function payment_customer_status`.
- Timeline: Reported and reproduced on 2026-08-28; prior working history was not provided.
- Reproduction: Sign in, open `/vi/tai-khoan/don-hang`, and observe the alert while the document request itself returns HTTP 200.

## Final Focus

- hypothesis: Confirmed — the authenticated PostgREST role could not execute a private helper referenced by the security-invoker order view.
- test: Added role-level pgTAP contracts and a historical remote-layout rehearsal, then verified the remote page with a signed-in customer.
- result: The view no longer depends on private helpers, authenticated receives only projection SELECT, and underlying RLS remains authoritative.
- next_action: None; migration is applied to the linked Supabase project and the customer page is healthy.

## Evidence

- timestamp: 2026-08-28T16:36:04+07:00
  observation: Browser reproduction used a signed-in account; the account layout rendered and only the order-history content returned the failure alert.
- timestamp: 2026-08-28T16:36:04+07:00
  observation: Browser console contained no application exception, only an unrelated logo LCP warning.
- timestamp: 2026-08-28T16:36:45+07:00
  observation: The page calls `getCustomerOrderHistory`, which selects `public.order_payment_statuses` as the authenticated server client and converts any PostgREST error into the bounded alert result.
- timestamp: 2026-08-28T16:36:58+07:00
  observation: Latest remote `operational_errors` rows consistently record `dbCode=42501`, `authRole=authenticated`, and `dbMessage=permission denied for function payment_customer_status`.
- timestamp: 2026-08-28T16:37:12+07:00
  observation: `public.order_payment_statuses` is a `security_invoker` view and calls `private.payment_customer_status(text)`.
- timestamp: 2026-08-28T16:37:12+07:00
  observation: The base migration explicitly revokes helper EXECUTE from authenticated; the later compatibility migration grants private schema usage and helper EXECUTE only to service_role. No later authenticated grant exists.
- timestamp: 2026-08-28T16:37:24+07:00
  observation: Unit tests passed because the Supabase query is mocked; the real signed-in account purchase Playwright test remains skipped.
- timestamp: 2026-08-28T16:37:38+07:00
  observation: Service-role REST access to the same view succeeds and reports 28 rows, confirming the view and remote order data exist when helper privileges are available.
- timestamp: 2026-08-28T17:08:00+07:00
  observation: Historical-layout rehearsal passed after applying the repair to the linked project's preserved payment_intent column order.
- timestamp: 2026-08-28T17:12:00+07:00
  observation: Clean local database reset, all 1,135 pgTAP tests, and database lint passed.
- timestamp: 2026-08-28T17:15:00+07:00
  observation: Migration 20260828163000 deployed successfully to the linked Supabase project after a one-migration dry run.
- timestamp: 2026-08-28T17:16:00+07:00
  observation: Authenticated browser verification rendered one customer order and no order-history error alert.

## Eliminated

- hypothesis: The route is failing or redirecting because the customer is not authenticated.
  reason: The signed-in account shell rendered and `requireUser` completed; only the order query returned an error result.
- hypothesis: HTTP 200 means the order query succeeded and the UI mapper is broken.
  reason: The server component intentionally catches the query result and renders an error alert inside a successful page response.
- hypothesis: Remote order history is empty.
  reason: An empty query would return `status=success` and render the empty state; remote service-role access confirms the view contains rows.
- hypothesis: The view definition or order data is invalid for all roles.
  reason: Service-role access succeeds; failure is role-specific and names the missing helper permission.

## Resolution

- root_cause: `getCustomerOrderHistory` queries the `security_invoker` view `public.order_payment_statuses` as the signed-in `authenticated` role. That view calls `private.payment_customer_status(text)`, but migrations revoke authenticated access to the private schema/helper and later restore it only for `service_role`. PostgreSQL therefore rejects the customer query with `42501`; the server component safely converts that error to the localized alert while still returning HTTP 200.
- contributing_factor: The unit test mocks the query boundary, and the only real signed-in account-history E2E contract is skipped, so the role-level database permission regression is not exercised.
- fix: Rebuilt `public.order_payment_statuses` with the same `security_invoker` behavior and inline pure status mappings, preserving both known historical column orders. Granted `authenticated` only SELECT on the view, revoked direct private helper access from public/anon/authenticated, and retained underlying owner RLS. Added pgTAP and historical-layout regression coverage; no service-role bypass was added to the customer page.
- files_changed:
  - `.planning/debug/account-order-history-helper-permission.md`
  - `supabase/migrations/20260828163000_restore_authenticated_payment_projection_access.sql`
  - `supabase/tests/database/04_payment_rls_audit.test.sql`
  - `supabase/tests/rehearsals/05_order_payment_status_view_upgrade.sql`
- verification:
  - Focused payment RLS audit: 52 tests passed
  - Historical linked-layout rehearsal passed
  - Full database suite: 44 files and 1,135 tests passed
  - Database schema lint passed
  - Linked migration dry run and deployment passed
  - Authenticated `/vi/tai-khoan/don-hang` rendered order `ATB-8726B56826` without the failure alert
