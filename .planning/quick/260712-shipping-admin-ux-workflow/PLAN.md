---
status: in_progress
created_at: "2026-07-12T00:00:00+07:00"
---

# Shipping Admin UX Workflow

Improve `/admin/shipping` without changing the database schema:

- Reframe the page around destination coverage and setup readiness.
- Keep UI copy in English.
- Make rule creation easier by replacing raw country-code thinking with common destination choices plus a custom option.
- Keep existing server actions and Supabase schema intact.
- Preserve catalog product/variant assignment behavior.

Verification:

- `npm.cmd run lint`
- `npm.cmd run typecheck`
