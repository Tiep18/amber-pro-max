---
quick_id: 260812-uwo
status: complete
completed_at: '2026-08-12T23:48:54+07:00'
source_commits:
  - 9b87a39
  - 953fbae
---

# Quick Task 260812-uwo Summary

## Outcome

Transactional emails containing download, guest-access, or newsletter-unsubscribe bearer links now reproduce the same link and rendered Resend payload whenever the same outbox row retries. The worker derives a domain-separated HMAC token from the immutable outbox ID and capability, anchors expiry to the outbox creation time, and keeps the existing Resend idempotency key.

All three token tables now carry an optional source-outbox foreign key protected by a partial unique index. New issuance stores only the existing token hash and source reference; retries validate and reuse the matching record. Missing or inconsistent signing state fails closed before sending, while emails without bearer links remain operational.

## Deployment and cost

Production requires one new encrypted Vercel variable, `TRANSACTIONAL_EMAIL_TOKEN_SECRET`, with at least 32 random characters. The solution continues to use the existing Supabase Postgres/Cron, Vercel worker route, and Resend setup, so it adds no paid service and remains compatible with the project's Supabase Free and Vercel Free priorities.

## Commits

- `9b87a39` — `fix(email): stabilize tokenized retries`
- `953fbae` — `test(email): cover bearer capability mapping`

See `260812-uwo-VERIFICATION.md` for complete verification evidence and the one remaining production environment action.
