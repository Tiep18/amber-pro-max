---
status: complete
date: 2026-07-09
---

# Monitoring Diagnostic Facts

## Objective

Make operational errors more actionable by preserving safe Supabase/PostgREST diagnostics and account auth context without exposing secrets, tokens, email addresses, raw payloads, or stack traces.

## Plan

1. Extend operational redaction allowlist for safe diagnostic keys.
2. Add a shared helper that extracts safe Supabase/PostgREST error facts from DB-shaped errors only.
3. Merge diagnostic context into monitored action/query wrappers.
4. Update public reviews and customer account fulfillment query failures to record safe DB diagnostics.
5. Pass account request auth facts from account pages so failures can distinguish missing claims from grant/RLS issues.
6. Add unit coverage for redaction, monitoring, reviews, and account query diagnostics.
