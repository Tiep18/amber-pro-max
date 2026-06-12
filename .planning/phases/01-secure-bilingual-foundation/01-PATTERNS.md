# Phase 1: Secure Bilingual Foundation - Pattern Map

**Mapped:** 2026-06-12
**Files analyzed:** 29 planned new files/directories
**Analogs found:** 0 / 29

## Codebase Status

This is a greenfield scaffold phase. The repository currently contains planning artifacts only:

- Root files/directories: `.git/`, `.idea/`, `.planning/`, `AGENTS.md`
- No `package.json`
- No `src/`, `app/`, `supabase/`, `tests/`, `.github/`, or application source files
- No project-local `.codex/skills/` or `.agents/skills/`

Do not infer reusable application code patterns from nonexistent files. The planner should treat Phase 1 as the first implementation pass and copy conventions from the planning artifacts listed below.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `package.json` | config | batch | none | no-analog |
| `package-lock.json` | config | batch | none | no-analog |
| `tsconfig.json` | config | batch | none | no-analog |
| `next.config.ts` | config | request-response | none | no-analog |
| `postcss.config.mjs` | config | transform | none | no-analog |
| `eslint.config.mjs` | config | batch | none | no-analog |
| `prettier.config.mjs` | config | batch | none | no-analog |
| `.github/workflows/ci.yml` | config | batch | none | no-analog |
| `src/proxy.ts` | middleware | request-response | none | no-analog |
| `src/i18n/routing.ts` | config | request-response | none | no-analog |
| `src/i18n/navigation.ts` | utility | request-response | none | no-analog |
| `src/i18n/request.ts` | utility | request-response | none | no-analog |
| `src/messages/en.json` | config | transform | none | no-analog |
| `src/messages/vi.json` | config | transform | none | no-analog |
| `src/lib/env/client.ts` | config | transform | none | no-analog |
| `src/lib/env/server.ts` | config | transform | none | no-analog |
| `src/lib/supabase/client.ts` | utility | request-response | none | no-analog |
| `src/lib/supabase/server.ts` | utility | request-response | none | no-analog |
| `src/lib/supabase/proxy.ts` | middleware | request-response | none | no-analog |
| `src/auth/actions.ts` | service | request-response | none | no-analog |
| `src/auth/guards.ts` | utility | request-response | none | no-analog |
| `src/auth/redirect.ts` | utility | request-response | none | no-analog |
| `src/auth/schemas.ts` | utility | transform | none | no-analog |
| `src/app/[locale]/...` | component | request-response | none | no-analog |
| `src/app/admin/...` | component | request-response | none | no-analog |
| `supabase/config.toml` | config | batch | none | no-analog |
| `supabase/migrations/*_foundation.sql` | migration | CRUD | none | no-analog |
| `supabase/tests/database/*.test.sql` | test | CRUD | none | no-analog |
| `tests/e2e/*.spec.ts` and `tests/unit/**/*.test.ts` | test | request-response | none | no-analog |

## Pattern Assignments

### Application Scaffold

**Analog:** none - no application scaffold exists.

**Source conventions:**

- Use Next.js 16.2.x, React 19.2.x, TypeScript 5.9.x, Tailwind CSS 4.3.x, next-intl, Supabase SSR, Zod, Vitest, Playwright, ESLint, Prettier, and GitHub Actions from `AGENTS.md` and `01-RESEARCH.md`.
- Insert a human package-legitimacy checkpoint before the first install because `01-RESEARCH.md` flagged several official packages only for recency.
- Use a modular monolith. Do not add an ORM, separate backend service, or microservices in Phase 1.
- Create scripts required by `01-VALIDATION.md`: `lint`, `typecheck`, `test:unit`, `test:e2e`, `test:security`, and `ci`.

### Locale Routing and Proxy

**Analog:** none - no existing middleware/proxy code.

**Planning-derived pattern:**

- Put customer-facing pages under explicit `/vi` and `/en` locale prefixes.
- Use translated public slugs such as `/vi/dang-nhap` and `/en/sign-in`.
- Use browser language only for first unprefixed visits without a saved locale: Vietnamese when preferred, otherwise English.
- Preserve the equivalent current page when switching language.
- Compose one `src/proxy.ts` for next-intl routing and Supabase cookie refresh. Apply Supabase cookie updates to the same response so redirects, rewrites, and auth cookies are not dropped.
- Unsupported locale and unprefixed routes must redirect without creating duplicate public content.

### Supabase Auth and Server Boundaries

**Analog:** none - no existing auth helpers.

**Planning-derived pattern:**

- Use Supabase cookie-based SSR clients with separate browser, server, and proxy helpers.
- Server protection must verify identity with `auth.getClaims()` rather than trusting cookie-only session reads.
- Keep privileged keys outside `NEXT_PUBLIC_*` and out of browser-importable modules.
- Registration, confirmation, sign-in, sign-out, password reset request, recovery session, and password update must use localized callback URLs and safe redirects.
- Password reset request must return a generic success state whether or not the email exists.
- Reject external, protocol-relative, malformed, unsupported-locale, and non-relative `next` destinations.

### Admin Authorization and RLS

**Analog:** none - no schema or policy code.

**Planning-derived pattern:**

- Store admin authority in database-owned role records, not user-editable metadata.
- Add a protected `public.user_roles` table and private security-definer helper such as `private.is_admin()` with a fixed `search_path`.
- Repeat `requireAdmin()` checks at every sensitive Server Action or Route Handler.
- RLS remains the final boundary. Every exposed Phase 1 table must enable RLS from the first migration.
- Normal user/admin request paths should use session-bound clients, not service-role clients.
- Provisioning or elevated credentials must be narrow operator workflows, not shared app patterns.

### UI Shells and Components

**Analog:** none - no components exist.

**Planning-derived pattern:**

- Follow `01-UI-SPEC.md` as the source of truth for visual and interaction choices.
- Use shadcn/ui official components only after scaffold initialization; do not use third-party registries or blocks.
- Use semantic Tailwind CSS variables, Be Vietnam Pro, Lucide React, visible labels, inline validation, and WCAG 2.2 AA focus/error states.
- Public/auth/account/admin shells must be related but visually distinct.
- Do not render future-feature navigation for catalog, cart, blog, wishlist, orders, downloads, payments, or fulfillment in Phase 1.
- Resolve account/admin authorization server-side before rendering protected shells; no client-side flash of protected content.

### Tests and CI

**Analog:** none - no test harness exists.

**Planning-derived pattern:**

- Create Vitest unit tests for pure i18n routing, redirect sanitization, schemas, and guard helpers.
- Create pgTAP tests under `supabase/tests/database/` for anon/customer A/customer B/admin RLS matrices.
- Create Playwright tests for locale navigation, auth flows, password reset, protected account shell, and admin boundary behavior.
- CI must run install from lockfile, lint, typecheck, unit tests, local Supabase reset/lint/pgTAP, production build, and Playwright.
- Add static secret-boundary checks that fail on public secret names and client imports of server-only modules.

## Shared Patterns

### Source Of Truth Priority

Apply the following source order when implementation details conflict:

1. `01-CONTEXT.md` locked decisions for locale routing and phase boundary.
2. `01-RESEARCH.md` stack, architecture, security, and validation guidance.
3. `01-UI-SPEC.md` visual, interaction, accessibility, copy, and responsive rules.
4. `01-VALIDATION.md` required test infrastructure and command expectations.
5. `AGENTS.md`, `.planning/ROADMAP.md`, and `.planning/REQUIREMENTS.md` for project-wide constraints.

### Phase Boundary

Apply to all plans:

- In scope: scaffold, localized routes, auth, protected account/admin shells, first schema, RLS, secret handling, CI, deployment readiness, and verification.
- Out of scope: catalog, products, prices, cart, checkout, payments, orders, PDF fulfillment, shipping, reviews, newsletter, blog, and policy content.
- Do not introduce account-required language that conflicts with future guest checkout.

### Security Defaults

Apply to all server, database, and UI work:

- Server-managed admin authorization only.
- RLS enabled on exposed tables from the first migration.
- Secret/service-role keys are server-only and never `NEXT_PUBLIC_*`.
- UI visibility is never authorization.
- Generic auth error and reset messaging avoids email enumeration.
- Protected routes are dynamic and must not be cached as shared public responses.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| All Phase 1 application, database, test, and CI files | mixed | mixed | Repository has planning artifacts only and no reusable application source code. |

## Metadata

**Analog search scope:** workspace root, `.planning/`, project-local `.codex/skills/`, project-local `.agents/skills/`  
**Files scanned:** planning artifacts plus filesystem root listing  
**Pattern extraction date:** 2026-06-12  
**Conclusion:** Greenfield scaffold phase. Planner should use planning-derived conventions rather than code analogs.
