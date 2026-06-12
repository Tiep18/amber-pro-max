---
phase: 1
slug: secure-bilingual-foundation
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-12
approved: 2026-06-12
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
| 01-01-01 | 01 | 1 | SEC-02 | T-01-01-SC | Package legitimacy and scaffold config avoid suspicious dependency or browser-secret setup | manual checkpoint + static | `npm run lint && npm run typecheck && npm run build` | Planned in 01-01 | pending |
| 01-02-01 | 02 | 2 | MKT-01, SEC-02 | T-01-02-I18N | Explicit locale prefixes, safe browser-language negotiation, equivalent-page switching, and translated slugs | unit + E2E | `npm run test:unit -- tests/unit/i18n && npm run test:e2e -- tests/e2e/localization.spec.ts` | Planned in 01-02 | pending |
| 01-03-01 | 03 | 3 | MKT-01, SEC-02 | T-01-03-UI | UI tokens, shell components, and mobile layout satisfy UI-SPEC without exposing secrets | unit + build | `npm run lint && npm run typecheck && npm run build` | Planned in 01-03 | pending |
| 01-04-01 | 04 | 2 | ADM-02, SEC-01, SEC-02 | T-01-04-RLS | Anonymous, customer A, customer B, and admin receive only permitted rows and writes | pgTAP | `supabase db reset && supabase db lint --local --fail-on error && supabase test db` | Planned in 01-04 | pending |
| 01-05-01 | 05 | 3 | ACC-01, ADM-02, SEC-02 | T-01-05-AUTH | Auth clients/actions validate redirects, sessions, secrets, and password reset boundaries | unit + integration | `npm run test:unit -- tests/unit/auth && npm run typecheck` | Planned in 01-05 | pending |
| 01-06-01 | 06 | 4 | MKT-01, ACC-01, SEC-02 | T-01-06-PAGES | Localized auth pages complete register, sign in/out, reset, and recovery UX | E2E | `npm run test:e2e -- tests/e2e/auth.spec.ts` | Planned in 01-06 | pending |
| 01-07-01 | 07 | 5 | ACC-01, ADM-02, SEC-01, SEC-02 | T-01-07-ADMIN | Account/admin shells deny unauthorized users before protected content renders | E2E + pgTAP | `npm run test:e2e -- tests/e2e/admin-boundary.spec.ts && supabase test db` | Planned in 01-07 | pending |
| 01-08-01 | 08 | 6 | MKT-01, ACC-01, ADM-02, SEC-01, SEC-02 | T-01-08-GATE | Full localized identity, authorization, RLS, secret, CI, and deployment-readiness gate passes | full suite | `npm run ci && npm run test:e2e` | Planned in 01-08 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Coverage

- [x] `package.json` scripts for `lint`, `typecheck`, `test:unit`, `test:e2e`, `test:security`, and `ci` are assigned across Plans 01 and 08.
- [x] `vitest.config.ts` plus `tests/unit/i18n/` and `tests/unit/auth/` fixtures are assigned across Plans 02 and 05.
- [x] `playwright.config.ts` plus localized authentication and admin-boundary fixtures are assigned across Plans 02, 06, 07, and 08.
- [x] `supabase/config.toml`, initial migrations, seed identities, and pgTAP database tests are assigned to Plan 04.
- [x] Mailpit/local Auth email handling is assigned to auth and final verification tasks in Plans 05, 06, and 08.
- [x] GitHub Actions workflow using Node 22 and Docker-backed local Supabase is assigned to Plans 01 and 08.
- [x] Static secret-boundary checks for forbidden public secret names and client imports of server-only modules are assigned to Plan 08.

`wave_0_complete: true` means every validation dependency has an owning PLAN before execution starts. It does not mean the tests already exist in code.

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

- [x] All tasks have automated verification or explicit Wave 0 dependencies.
- [x] Sampling continuity: no three consecutive tasks lack automated verification.
- [x] Wave 0 covers every missing test/config reference through Plans 01-08.
- [x] No watch-mode flags appear in verification commands.
- [x] Task-level feedback latency target remains below 60 seconds after services warm.
- [x] Full suite command is assigned as the final Phase 1 gate in Plan 08.
- [x] `nyquist_compliant: true` is set after the planner assigned final plan/task ownership.

**Approval:** approved 2026-06-12
