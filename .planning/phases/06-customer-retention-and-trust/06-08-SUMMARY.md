---
phase: 06-customer-retention-and-trust
plan: "08"
subsystem: newsletter-unsubscribe
tags: [newsletter, consent, unsubscribe, email, token, localization, pii-minimization]
requires:
  - phase: 06-customer-retention-and-trust
    provides: Anonymous newsletter subscriber state and transactional email outbox
provides:
  - Localized subscribe confirmation email with one-click unsubscribe link
  - Hash-only expiring newsletter unsubscribe token flow
  - Unauthenticated English and Vietnamese unsubscribe result pages
affects: [newsletter, transactional-email, supabase-types, phase-06]
tech-stack:
  added: []
  patterns:
    - Generate bearer unsubscribe tokens only at send time
    - Persist only SHA-256 token hashes with expiry and consumed metadata
    - Return generic expired/already-consumed results for public unsubscribe links
key-files:
  created:
    - src/components/newsletter/unsubscribe-result.tsx
    - src/app/[locale]/newsletter/unsubscribe/page.tsx
    - src/app/[locale]/ban-tin/huy-dang-ky/page.tsx
  modified:
    - supabase/migrations/20260620102618_customer_retention_trust.sql
    - supabase/tests/database/06_customer_retention.test.sql
    - src/types/supabase.ts
    - src/newsletter/consent.ts
    - src/newsletter/actions.ts
    - src/components/newsletter/subscribe-form.tsx
    - src/emails/transactional.ts
    - src/fulfillment/email-outbox.ts
    - src/fulfillment/email-outbox.server.ts
    - src/fulfillment/schemas.ts
    - src/messages/en.json
    - src/messages/vi.json
    - tests/unit/newsletter/consent.test.ts
    - tests/e2e/newsletter.spec.ts
key-decisions:
  - "Newsletter unsubscribe links are bearer tokens accepted without sign-in, but the database stores only SHA-256 hashes."
  - "Raw unsubscribe tokens are generated at outbox send time and are passed only to the email renderer for URL construction."
  - "Expired, consumed, missing-subscriber, and already-unsubscribed states collapse to a generic unavailable result."
patterns-established:
  - "Public unsubscribe state changes are owned by a narrow security-definer RPC, not direct table grants."
  - "Newsletter confirmation email delivery is queued from subscribe success through the existing transactional outbox."
requirements-completed: [NEWS-02]
duration: 75 min
completed: 2026-06-21
---

# Phase 06 Plan 08: Newsletter Confirmation and Unsubscribe Summary

**Secure one-click newsletter unsubscribe with localized confirmation email links**

## Performance

- **Duration:** 75 min
- **Started:** 2026-06-21T22:53:00+07:00
- **Completed:** 2026-06-21T23:59:00+07:00
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments

- Added RED database, unit, and Playwright-list contracts for NEWS-02, D-14, and D-16.
- Added `newsletter_unsubscribe_tokens` with no anon/authenticated direct grants, 64-char hex hash constraint, expiry, and consumed metadata.
- Added `unsubscribe_newsletter(p_token_hash text)` to consume valid links, update subscriber state, and append unsubscribe consent evidence.
- Extended newsletter subscribe success to enqueue a `newsletter_subscribed` transactional outbox event.
- Added send-time raw token generation and hash insertion, so durable outbox payloads never contain raw token material.
- Added English `/en/newsletter/unsubscribe` and Vietnamese `/vi/ban-tin/huy-dang-ky` unauthenticated result pages.
- Added localized confirmation email copy and locale-matched unsubscribe link rendering.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add unsubscribe token and email contracts** - `82e14cd` (test)
2. **Task 2: Implement confirmation email and one-click unsubscribe** - `6fc43f1` (feat)

**Plan metadata:** this summary commit

## Decisions Made

- The raw unsubscribe token is a 32-byte random value encoded as 64 lowercase hex characters.
- The application hashes the raw token with SHA-256 before calling the database RPC; the database never needs the raw token.
- Subscribe confirmation email links use localized route shapes:
  - English: `/en/newsletter/unsubscribe?token=...`
  - Vietnamese: `/vi/ban-tin/huy-dang-ky?token=...`
- The footer form now exposes `id="newsletter"` so unsubscribe pages can link subscribers back to the subscribe form.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed latent fulfillment payload trigger short-circuit**
- **Found during:** Database test rerun after adding `newsletter_subscribed` outbox inserts.
- **Issue:** `private.reject_unsafe_fulfillment_payload()` could evaluate fields that do not exist for `transactional_email_outbox`, causing newsletter outbox inserts to error on `NEW.metadata`.
- **Fix:** Scoped trigger checks by `TG_TABLE_NAME` so each table only evaluates fields it owns.
- **Files modified:** `supabase/migrations/20260620102618_customer_retention_trust.sql`
- **Verification:** `npm run db:test`
- **Committed in:** `6fc43f1`

**2. [Rule 3 - Blocking] Adjusted expired token fixture to satisfy DB invariant**
- **Found during:** pgTAP verification.
- **Issue:** The expired token fixture set `expires_at` in the past while leaving default `created_at=now()`, violating the table invariant that expiry is after creation.
- **Fix:** Set fixture `created_at` earlier than `expires_at`.
- **Files modified:** `supabase/tests/database/06_customer_retention.test.sql`
- **Verification:** `npm run db:test`
- **Committed in:** `6fc43f1`

**3. [Rule 3 - Blocking] Verified unsubscribe UI against migrated local Supabase**
- **Found during:** Browser smoke planning.
- **Issue:** `.env.local` points to the remote Supabase project, which does not yet have this local migration.
- **Fix:** Started a verification-only dev server with local Supabase URL/publishable key and smoke-tested the Vietnamese valid-token route plus English invalid-token route.
- **Files modified:** None
- **Verification:** Playwright smoke passed and local DB showed the smoke subscriber as `unsubscribed`.

---

**Total deviations:** 3 auto-fixed (blocking)
**Impact on plan:** No product scope changed; fixes made token consumption, outbox inserts, and local verification deterministic.

## Issues Encountered

- `supabase db reset` applied all migrations and seed, then local Storage restart returned the known `UNION types text and uuid cannot be matched` 500 response.
- After reset, `supabase_rest_Test_GSD` was restarted so PostgREST could see the new unsubscribe RPC before database tests.

## Validation Evidence

- `supabase db reset` - migrations/seed applied; local Storage restart failed with the known text/uuid union issue.
- `docker restart supabase_rest_Test_GSD` - completed after reset.
- `npm run db:lint` - passed with no schema errors.
- `npm run db:test` - passed, 18 files / 460 tests.
- `npm run db:types` - passed.
- `git diff --exit-code src/types/supabase.ts` - passed after generated types were committed.
- `npm run test:unit -- tests/unit/newsletter/consent.test.ts tests/unit/fulfillment/email-outbox.test.ts` - passed, 20 tests.
- `npm run test:e2e -- tests/e2e/newsletter.spec.ts --list` - passed, 5 listed contracts.
- `npm run build` - passed.
- `npm run typecheck` - passed.
- `npm run test:security` - passed, 22 tests.
- `git diff --check` - passed.
- Playwright browser smoke - valid Vietnamese unsubscribe link returned a localized result without rendering the raw token; English invalid-token route returned a safe result; local DB status became `unsubscribed`.

## User Setup Required

The linked remote Supabase project must receive the Phase 06 migration before remote-configured local or deployed newsletter unsubscribe can succeed. Live confirmation email delivery still requires the existing Resend environment variables:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

## Next Phase Readiness

Plan 06-09 can build on trusted wishlist/review/newsletter relationships with NEWS-02 complete and no raw unsubscribe token material persisted.

---
*Phase: 06-customer-retention-and-trust*
*Completed: 2026-06-21*

## Self-Check: PASSED

All required files exist, referenced task commits are in git history, plan verification commands passed, and NEWS-02 is marked complete.
