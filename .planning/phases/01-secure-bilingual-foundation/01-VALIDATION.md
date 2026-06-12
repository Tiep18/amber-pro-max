---
phase: 1
slug: secure-bilingual-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-12
---

# Phase 1 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x, pgTAP via Supabase CLI, Playwright 1.x |
| **Config file** | None - Wave 0 creates `vitest.config.ts`, `playwright.config.ts`, and `supabase/config.toml` |
| **Quick run command** | `npm run test:unit && supabase test db` |
| **Full suite command** | `npm run lint && npm run typecheck && npm run test:unit && supabase db reset && supabase db lint --local --fail-on error && supabase test db && npm run build && npm run test:e2e` |
| **Estimated runtime** | Quick: under 60 seconds after services warm; full: under 10 minutes in CI |

---

## Sampling Rate

- **After every task commit:** Run the narrowest relevant Vitest or pgTAP target.
- **After every plan wave:** Run lint, typecheck, all unit tests, database lint, pgTAP tests, and production build.
- **Before `$gsd-verify-work`:** The full suite and a Vercel preview smoke test must be green.
- **Max feedback latency:** 60 seconds for task-level checks after local services are warm.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | MKT-01 | T-01-01 | Explicit locale prefixes, safe browser-language negotiation, equivalent-page switching, and translated slugs | unit + E2E | `npm run test:unit -- tests/unit/i18n && npm run test:e2e -- tests/e2e/localization.spec.ts` | No - W0 | pending |
| 01-02-01 | 02 | 1 | SEC-01 | T-01-02, T-01-03 | Anonymous, customer A, customer B, and admin receive only permitted rows and writes | pgTAP | `supabase test db supabase/tests/database/01_foundation_rls.test.sql` | No - W0 | pending |
| 01-02-02 | 02 | 1 | ADM-02 | T-01-02 | Customers cannot write role data or perform admin-only database operations | pgTAP | `supabase test db supabase/tests/database/01_roles_rls.test.sql` | No - W0 | pending |
| 01-03-01 | 03 | 2 | ACC-01 | T-01-04, T-01-05 | Registration, confirmation, sign-in/out, reset, recovery, and invalid-token handling work without enumeration or open redirects | E2E | `npm run test:e2e -- tests/e2e/auth.spec.ts` | No - W0 | pending |
| 01-03-02 | 03 | 2 | ADM-02 | T-01-02 | Account/admin shells and mutations independently enforce server authorization | E2E + pgTAP | `npm run test:e2e -- tests/e2e/admin-boundary.spec.ts && supabase test db supabase/tests/database/01_roles_rls.test.sql` | No - W0 | pending |
| 01-04-01 | 04 | 3 | SEC-02 | T-01-06 | Secret/service-role credentials and privileged client modules never enter browser source or bundles | static + build | `npm run test:security && npm run build` | No - W0 | pending |
| 01-04-02 | 04 | 3 | MKT-01, ACC-01, ADM-02, SEC-01, SEC-02 | All | Full localized identity and authorization journey passes against local Supabase and preview deployment | full suite | `npm run ci && npm run test:e2e` | No - W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `package.json` scripts for `lint`, `typecheck`, `test:unit`, `test:e2e`, `test:security`, and `ci`.
- [ ] `vitest.config.ts` plus `tests/unit/i18n/` and `tests/unit/auth/` fixtures.
- [ ] `playwright.config.ts` plus localized authentication and admin-boundary fixtures.
- [ ] `supabase/config.toml`, initial migrations, seed identities, and pgTAP database tests.
- [ ] Mailpit helper for local confirmation and password-reset messages.
- [ ] GitHub Actions workflow using Node 22 and Docker-backed local Supabase.
- [ ] Static secret-boundary checks for forbidden public secret names and client imports of server-only modules.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Package legitimacy checkpoint | Foundation dependency setup | Automated recency heuristic flagged established packages despite valid ownership and registry history | Before install, confirm package owners, official repositories, selected versions, and generated lockfile for Next.js, React, next-intl, Supabase, Vitest, ESLint, and Prettier |
| Hosted Supabase and Vercel wiring | Phase goal | Hosted project IDs, Git integration, and environment values are operator-owned | Create/link preview projects, configure scoped variables, deploy, and verify the health and localized routes |
| Production Auth email | ACC-01 | Verified SMTP domain and sender credentials are external operator dependencies | Configure custom SMTP, confirm allowlisted callback URLs, then complete real registration and reset smoke tests |
| Foundation visual quality | MKT-01, ACC-01 | Responsive hierarchy, focus visibility, translation fit, and perceived polish need human review | Check Vietnamese and English public/auth/account/admin shells at mobile and desktop widths with keyboard navigation |

---

## Validation Sign-Off

- [ ] All tasks have automated verification or explicit Wave 0 dependencies.
- [ ] Sampling continuity: no three consecutive tasks lack automated verification.
- [ ] Wave 0 covers every missing test/config reference.
- [ ] No watch-mode flags appear in verification commands.
- [ ] Task-level feedback latency remains below 60 seconds after services warm.
- [ ] Full suite passes against a production build and local Supabase.
- [ ] `nyquist_compliant: true` is set after the planner assigns final task IDs and commands.

**Approval:** pending
