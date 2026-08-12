---
quick_id: 260812-uwo
status: passed
verified_at: '2026-08-12T23:48:54+07:00'
source_commits:
  - 9b87a39
  - 953fbae
---

# Quick Task 260812-uwo Verification

## Verdict

PASS. The implemented behavior satisfies the approved stable transactional-email retry-token design without adding paid infrastructure.

## Must-have evidence

| Requirement | Evidence | Result |
| --- | --- | --- |
| Stable Resend payload across retries | Unit test processes the same outbox ID twice at different worker times and asserts identical sender payload, URL, token, expiry, and `transactional-email:<outbox-id>` key. | PASS |
| Domain-separated bearer capabilities | Unit coverage asserts deterministic HMAC output and distinct values for download, guest reopen, guest claim, and newsletter unsubscribe; event mapping coverage verifies every guest/newsletter path and lifetime. | PASS |
| Hash-only, source-linked persistence | Repository tests assert only the hash, expiry, purpose, and source outbox ID are inserted; mismatched persisted capabilities are rejected. Migration adds nullable FKs and partial unique indexes to all three token tables. | PASS |
| Fail closed without disabling non-bearer mail | Missing/weak signing material prevents token persistence and sender invocation with bounded `email_token_preparation_failed`; physical-shipped mail still sends without the token secret. | PASS |
| Free-tier compatible deployment | Uses existing Supabase Postgres, Supabase Cron worker route, Vercel server environment variables, and Resend. No queue, Redis, Vercel Cron, or paid service was added. | PASS |

## Automated verification

- Focused email suite: 34 tests passed.
- Full unit suite: 115 files and 1,023 tests passed.
- Supabase reset and schema lint: passed.
- Database suite: 41 files, 951 assertions passed; 2 explicitly gated rehearsals skipped.
- Supabase generated types: reproducible with zero diff after commit.
- ESLint, TypeScript, and Vietnamese-diacritics checks: passed.
- Next.js production build: passed; 129 static pages generated.
- Security suite: 77 tests passed.
- Supabase database advisors: no error-level findings; five pre-existing performance warnings concern multiple permissive SELECT policies outside this change.
- `git diff --check`: passed.

## Notes

- One unrelated catalog projection test timed out once under the first full parallel run. It passed in isolation in 1.79 seconds, then the full 1,023-test suite passed on rerun. No catalog file changed.
- Supabase CLI 2.106 could not authenticate through its internal `--local` type-generation connection after reset. The project script now uses the explicit local database URL from `supabase/config.toml`; repeated generation succeeded and produced no type diff.

## Production setup remaining

Set `TRANSACTIONAL_EMAIL_TOKEN_SECRET` as an encrypted Vercel server environment variable with at least 32 random characters. Keep it stable while tokenized outbox rows are pending; coordinate any future rotation after the queue drains.
