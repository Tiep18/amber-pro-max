---
phase: 06-customer-retention-and-trust
plan: "07"
subsystem: newsletter-consent
tags: [newsletter, consent, anonymous, localization, pii-minimization, footer]
requires:
  - phase: 06-customer-retention-and-trust
    provides: Phase 06 shared migration and localized public layout
provides:
  - Anonymous localized newsletter subscription
  - Normalized email-keyed subscriber state with latest locale and market
  - Append-only hash-minimized consent evidence
affects: [newsletter, footer, supabase-types, phase-06]
tech-stack:
  added: []
  patterns:
    - Hash request evidence before crossing into the database
    - Generic subscribe/resubscribe public result state
key-files:
  created:
    - src/newsletter/consent.ts
    - src/newsletter/actions.ts
    - src/components/newsletter/subscribe-form.tsx
    - tests/unit/newsletter/consent.test.ts
    - tests/e2e/newsletter.spec.ts
  modified:
    - supabase/migrations/20260620102618_customer_retention_trust.sql
    - supabase/tests/database/06_customer_retention.test.sql
    - src/types/supabase.ts
    - src/components/site-footer.tsx
    - src/messages/en.json
    - src/messages/vi.json
key-decisions:
  - "Email is normalized and used as the newsletter subscriber primary identity; account creation is never required."
  - "Market is resolved server-side, while IP and user-agent evidence is hashed before the subscribe RPC receives it."
  - "Public callers receive the same subscribed result for first subscription and resubscription to avoid exposing prior state."
patterns-established:
  - "Public consent tables expose no direct anon/authenticated grants; a bounded security-definer RPC owns state and event writes."
  - "Newsletter consent events are append-only for application roles and contain hashes rather than raw request metadata."
requirements-completed: [NEWS-01]
duration: 109 min
completed: 2026-06-21
---

# Phase 06 Plan 07: Newsletter Subscribe and Consent Summary

**Localized anonymous newsletter subscription with durable normalized state and hash-only request evidence**

## Performance

- **Duration:** 109 min
- **Started:** 2026-06-21T21:01:00+07:00
- **Completed:** 2026-06-21T22:50:00+07:00
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Added RED database, unit, and browser contracts for anonymous bilingual subscribe, email normalization, resubscribe, consent history, grants, and metadata minimization.
- Added `newsletter_subscribers`, `newsletter_consent_events`, and `subscribe_newsletter` with no direct anon/authenticated table access.
- Added server-side email validation, request-evidence hashing, safe result mapping, and anonymous subscribe action without `requireUser`.
- Added compact English/Vietnamese footer forms with visible Email labels, noun-bearing CTAs, consent copy, pending state, and inline results.
- Verified the real Vietnamese mobile flow against local Supabase: 390px viewport had no horizontal overflow and displayed `Ban da dang ky.` after submit.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add subscribe and consent contracts** - `875cb4b` (test)
2. **Task 2: Implement explicit subscribe and consent history** - `7f387fe` (feat)

**Plan metadata:** this summary commit

## Decisions Made

- The server action accepts email and locale from the form, derives market from trusted request context, and fixes consent source to `footer`.
- Subscriber state stores latest locale/market, while every explicit submit appends a separate consent event.
- NEWS-02 remains partially complete: consent source/time and minimized evidence are implemented here; secure unsubscribe remains Plan 06-08.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Isolated newsletter pgTAP fixtures from browser smoke data**
- **Found during:** Final database verification
- **Issue:** A real browser subscribe left a local subscriber row, while one pgTAP assertion queried the entire table.
- **Fix:** Added targeted fixture cleanup and filtered state assertions by the deterministic test email.
- **Files modified:** `supabase/tests/database/06_customer_retention.test.sql`
- **Verification:** `npm run db:test`
- **Committed in:** `7f387fe`

**2. [Rule 3 - Blocking] Verified browser flow against migrated local Supabase**
- **Found during:** Browser smoke test
- **Issue:** `.env.local` points to the linked remote project, where the new local migration has not been deployed, so the new RPC returned a generic error.
- **Fix:** Started a verification-only dev server with local Supabase URL/publishable key and confirmed anonymous subscription end to end; no remote schema was changed.
- **Files modified:** None
- **Verification:** Playwright mobile submit returned localized success.

**3. [Rule 3 - Blocking] Regenerated corrupted Next dev route cache**
- **Found during:** Final typecheck
- **Issue:** Force-stopping a dev server while Next wrote `.next/dev/types` left generated route files truncated and duplicated.
- **Fix:** Removed only generated dev type cache and used production build types for the final build/typecheck gate.
- **Files modified:** None
- **Verification:** `npm run build`, `npm run typecheck`

---

**Total deviations:** 3 auto-fixed (blocking)
**Impact on plan:** No product scope changed; fixes made local verification deterministic without touching the remote project.

## Issues Encountered

- `supabase db reset` applied all migrations and seed, then local Storage restart returned the known `UNION types text and uuid cannot be matched` 500 response.
- The first pgTAP rerun had the correct 83 assertions but was declared as 82; the plan count was corrected.

## Verification

- `supabase db reset` - migrations/seed applied; local Storage restart failed with the known text/uuid union issue.
- `npm run db:lint` - passed with no schema errors.
- `npm run db:test` - passed, 18 files / 442 tests.
- `npm run db:types` - passed.
- `git diff --exit-code src/types/supabase.ts` - passed after generated types were committed.
- `npm run test:unit -- tests/unit/newsletter/consent.test.ts` - passed, 5 tests.
- `npm run test:e2e -- tests/e2e/newsletter.spec.ts --list` - passed, 2 listed contracts.
- `npm run typecheck` - passed using generated production route types.
- `npm run build` - passed.
- `npm run test:security` - passed, 22 tests.
- `npm run lint` - passed with 0 errors and 8 pre-existing warnings.
- Playwright desktop/mobile smoke - EN/VI labels and CTAs present; no overflow at 1440px or 390px; local anonymous submit succeeded.

## User Setup Required

The linked remote Supabase project must receive the Phase 06 migration before remote-configured local or deployed newsletter subscription can succeed. This plan intentionally did not mutate the remote project.

## Next Phase Readiness

Plan 06-08 can add hash-only unsubscribe tokens and confirmation email delivery on top of normalized subscriber state and append-only consent events.

---
*Phase: 06-customer-retention-and-trust*
*Completed: 2026-06-21*
