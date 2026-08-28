---
status: complete
quick_id: 260828-nie
completed_at: 2026-08-28
implementation_commit: d791853e
---

# Quick 260828-nie Summary

**Authenticated customers can load their owner-scoped order history again without receiving access to private database helpers.**

## Delivered

- Reproduced the HTTP 200 page-level failure and correlated it to remote PostgreSQL error `42501` on `payment_customer_status`.
- Kept `order_payment_statuses` as a security-invoker view and inlined its two pure status mappings.
- Granted `authenticated` only SELECT on the projection; private schema and helper access remain unavailable.
- Preserved both the fresh and linked project's historical view column orders.
- Added role-level pgTAP coverage and a historical-layout migration rehearsal.
- Applied migration `20260828163000` to the linked Supabase project.
- Verified the signed-in Vietnamese order page renders the customer's order without the failure alert.

## Verification

- Focused payment RLS audit: 52 tests passed.
- Historical remote-layout rehearsal: passed.
- Clean full database suite: 44 files, 1,135 tests passed.
- Database schema lint: no errors.
- Remote dry run contained only the repair migration; deployment passed.
- Authenticated browser verification rendered order `ATB-8726B56826` and no `Chưa tải được lịch sử đơn hàng.` alert.

## Commit

- `d791853e` — restore secure customer order-history projection access.
