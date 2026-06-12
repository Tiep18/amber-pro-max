# Phase 1: Secure Bilingual Foundation - Research

**Researched:** 2026-06-12
**Domain:** Next.js 16 localized routing, Supabase SSR Auth, PostgreSQL RLS, server authorization, CI/deployment
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Language Routing
- **D-01:** For a first visit without a saved locale, detect the browser's preferred language. Use Vietnamese when Vietnamese is preferred; otherwise use English.
- **D-02:** Every customer-facing route has an explicit locale prefix: `/vi` or `/en`.
- **D-03:** Changing language keeps the visitor on the equivalent current page rather than returning to the home page.
- **D-04:** Public-facing slugs are translated per language, such as `/vi/dang-nhap` and `/en/sign-in`.

### the agent's Discretion
- Registration, email verification, password reset, authentication error presentation, and post-auth redirects may follow secure, conventional Supabase patterns.
- The admin entry point, first-admin provisioning flow, and unauthorized-user experience may be chosen during research and planning, provided admin authorization is server-managed and server-enforced.
- Initial design tokens, navigation shells, responsive behavior, and visual direction may be selected during UI specification and planning.
- Missing-translation behavior, locale persistence, and redirects from unprefixed or legacy URLs may use standard SEO-safe conventions consistent with D-01 through D-04.

### Deferred Ideas (OUT OF SCOPE)
None - discussion stayed within phase scope.
</user_constraints>

## Summary

Phase 1 should establish one Next.js 16 App Router application with all human-facing pages under `app/[locale]`, a central next-intl routing map, and one composed `src/proxy.ts`. The proxy must negotiate `/vi` or `/en`, redirect unprefixed first visits using cookie then `Accept-Language`, preserve localized rewrites, and refresh Supabase SSR cookies. Next.js 16 renamed `middleware.ts` to `proxy.ts`; next-intl v4 documents `localePrefix: 'always'`, translated `pathnames`, locale detection, and current-page locale replacement. [CITED: https://next-intl.dev/docs/routing/configuration] [CITED: https://next-intl.dev/docs/routing/navigation] [CITED: https://next-intl.dev/docs/routing/middleware]

Authentication should use Supabase's cookie-based SSR clients and PKCE email/password flow. Server protection must call `auth.getClaims()`, not trust `getSession()` from cookies. Registration requires email confirmation, reset requests must return a generic success state, and the reset destination must establish a valid recovery session before allowing `updateUser`. Production Auth email must use custom SMTP; the built-in sender is restricted and not intended for production. [CITED: https://supabase.com/docs/guides/auth/server-side/creating-a-client] [CITED: https://supabase.com/docs/guides/auth/passwords] [CITED: https://supabase.com/docs/guides/auth/auth-smtp]

Authorization should be database-authoritative. Use a protected `public.user_roles` table, an unexposed `private.is_admin()` security-definer helper, repeated `requireAdmin()` checks in every sensitive Server Action/Route Handler, and RLS policies that independently enforce the same boundary. Do not use `user_metadata` for roles, do not use a privileged key for normal user/admin requests, and do not rely on hiding the admin UI. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] [CITED: https://supabase.com/docs/guides/getting-started/api-keys]

**Primary recommendation:** Plan the phase as four vertical slices matching the roadmap: deployable localized shell, schema/RLS harness, complete SSR Auth flows, then adversarial boundary and UX verification. [VERIFIED: codebase grep]

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MKT-01 | Customer can browse storefront content in Vietnamese or English using localized URLs. | `localePrefix: 'always'`, translated `pathnames`, browser negotiation, locale cookie, and equivalent-page switching. [CITED: https://next-intl.dev/docs/routing/configuration] |
| ACC-01 | Customer can register, sign in, sign out, and reset a password. | Supabase SSR browser/server clients, PKCE email confirmation, `signInWithPassword`, `signOut`, `resetPasswordForEmail`, recovery session, and `updateUser`. [CITED: https://supabase.com/docs/guides/auth/passwords] |
| ADM-02 | Admin operations that affect payment, stock, access rights, or customer data require server-side authorization. | `requireAdmin()` at every mutation boundary plus RLS checks backed by server-managed role rows. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |
| SEC-01 | Every exposed customer or commerce table has RLS policies matching anonymous, customer, and admin access. | First migration enables RLS, explicit role-targeted policies, grants, indexes, and pgTAP role-matrix tests. [CITED: https://supabase.com/docs/guides/local-development/testing/overview] |
| SEC-02 | Privileged database and storage credentials are never exposed to the browser. | Browser uses only publishable key; secret keys stay outside `NEXT_PUBLIC_*` and are unnecessary for normal Phase 1 request paths. [CITED: https://supabase.com/docs/guides/getting-started/api-keys] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- Build a bilingual Vietnamese/English storefront with explicit market and language separation. [VERIFIED: codebase grep]
- Guest checkout remains a later commerce requirement; Phase 1 account work must not make future checkout account-only. [VERIFIED: codebase grep]
- Admin authorization must be server-managed; user-editable metadata is forbidden for authorization. [VERIFIED: codebase grep]
- Every exposed table must have RLS from the first schema, and privileged credentials must remain server-only. [VERIFIED: codebase grep]
- Use a Next.js/Supabase modular monolith; do not introduce microservices or an ORM in this phase. [VERIFIED: codebase grep]
- Use Next.js App Router, Supabase SSR, next-intl, Tailwind CSS 4, TypeScript, Vitest, Playwright, Supabase CLI, ESLint, Prettier, GitHub Actions, and Vercel. [VERIFIED: codebase grep]
- Keep public PDFs and commerce implementation out of Phase 1; catalog, pricing, checkout, payments, and fulfillment are later phases. [VERIFIED: codebase grep]
- GSD artifacts must stay synchronized with the active workflow. This research request explicitly authorizes creation of the required artifact. [VERIFIED: codebase grep]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Locale negotiation and unprefixed redirect | Frontend Server (SSR Proxy) | Browser / Client | Request headers/cookies select the initial locale; the browser only initiates later switches. [CITED: https://next-intl.dev/docs/routing/middleware] |
| Translated URLs and equivalent-page switching | Frontend Server (App Router) | Browser / Client | Shared internal routes map to localized external paths; the switcher replaces the same internal pathname with another locale. [CITED: https://next-intl.dev/docs/routing/configuration] |
| Email/password authentication | Supabase Auth | Frontend Server | Supabase owns identity/session issuance; Next.js owns forms, callbacks, cookies, redirects, and protected shells. [CITED: https://supabase.com/docs/guides/auth/server-side/creating-a-client] |
| Account/admin shell protection | Frontend Server | Database / Storage | Server rendering verifies claims and role before rendering; RLS remains the final data boundary. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |
| Admin authorization | Database / Storage | Frontend Server | Server-managed role rows and RLS are authoritative; every sensitive server operation repeats authorization. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |
| Secret handling | Frontend Server / Deployment | Database / Storage | Only publishable values enter browser bundles; elevated credentials stay in protected deployment settings or one-time operator workflows. [CITED: https://nextjs.org/docs/app/guides/environment-variables] |
| RLS verification | Database / Storage | CI | pgTAP executes role-specific policy tests against local Supabase in CI. [CITED: https://supabase.com/docs/guides/local-development/cli/testing-and-linting] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` [WARNING: legitimacy gate marked SUS because the latest patch was recently published; human-verify before install.] | 16.2.9 | App Router, Server Components, Server Actions, Route Handlers, `proxy.ts`, build | Locked project framework; registry and official docs checked on 2026-06-12. [CITED: https://nextjs.org/docs/app] [CITED: https://registry.npmjs.org/next/latest] |
| `react`, `react-dom` [WARNING: legitimacy gate marked SUS because the latest patch was recently published; human-verify before install.] | 19.2.7 | UI runtime | Required by the locked Next.js 16 stack; registry checked on 2026-06-12. [CITED: https://registry.npmjs.org/react/latest] |
| `typescript` | 5.9.3 | Strict application types | Keep the project-locked 5.9 line rather than adopting TypeScript 6 in the foundation phase. [VERIFIED: npm registry] |
| `next-intl` [WARNING: legitimacy gate marked SUS because the latest release was recent; human-verify before install.] | 4.13.0 | Locale routing, translated pathnames, messages, navigation | Official v4 docs cover App Router, `proxy.ts`, always-prefixed locales, pathnames, and locale switching. [CITED: https://next-intl.dev/docs/routing/configuration] |
| `@supabase/supabase-js` [WARNING: legitimacy gate marked SUS because the latest release was recent; human-verify before install.] | 2.108.1 | Auth and RLS-bound data client | Official Supabase SSR and Auth documentation uses this client. [CITED: https://supabase.com/docs/guides/auth/server-side/creating-a-client] |
| `@supabase/ssr` [WARNING: legitimacy gate marked SUS because the latest release was recent; human-verify before install.] | 0.12.0 | Cookie-aware browser/server clients | Official Supabase SSR helper for Next.js App Router. [CITED: https://supabase.com/docs/guides/auth/server-side/creating-a-client] |
| `zod` | 4.4.3 | Runtime validation for auth forms, redirect targets, and environment shape | Zod 4 is stable and supports TypeScript 5.5 or later. [VERIFIED: npm registry] [CITED: https://zod.dev/] |

### Supporting

| Library / Tool | Version | Purpose | When to Use |
|----------------|---------|---------|-------------|
| `tailwindcss`, `@tailwindcss/postcss` | 4.3.0 | Foundation tokens and responsive shells | Use for the localized public/account/admin shells; keep tokens small and semantic. [VERIFIED: npm registry] [CITED: https://tailwindcss.com/docs/installation/framework-guides/nextjs] |
| `postcss` [WARNING: legitimacy gate marked SUS because the latest release was recent; human-verify before install.] | 8.5.15 | Tailwind build integration | Required by the official Tailwind Next.js installation path. [CITED: https://tailwindcss.com/docs/installation/framework-guides/nextjs] |
| `vitest` [WARNING: legitimacy gate marked SUS because the latest release was recent; human-verify before install.] | 4.1.8 | Fast unit tests | Test locale maps, redirect sanitization, form schemas, and authorization helpers; do not use it as the main test for async Server Components. [CITED: https://nextjs.org/docs/app/guides/testing/vitest] |
| `@playwright/test` | 1.60.0 | Browser and production-build tests | Test locale navigation and full Auth journeys across cookies, redirects, and protected shells. [VERIFIED: npm registry] [CITED: https://nextjs.org/docs/app/guides/testing/playwright] |
| Supabase CLI | 2.58.5 installed | Local Postgres/Auth/Mailpit, migrations, generated types, pgTAP | Use `supabase start`, `db reset`, `db lint`, `test db`, and type generation. [VERIFIED: environment probe] |
| pgTAP | Supabase-local extension | Database/RLS assertions | Test schema, functions, grants, and role matrix inside transactions. [CITED: https://supabase.com/docs/guides/local-development/testing/overview] |
| `eslint`, `eslint-config-next`, `prettier` [WARNING: legitimacy gate marked SUS because latest releases were recent; human-verify before install.] | 10.4.1 / 16.2.9 / 3.8.4 | Static boundaries and formatting | CI must reject client imports of server-only modules and keep TS/SQL formatting deterministic. [VERIFIED: codebase grep] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Authoritative `user_roles` table plus RLS helper | Role in `app_metadata` / custom JWT claim | Claims are server-managed, but Supabase documents that JWT claims remain stale until refresh. Use the table as the Phase 1 authority; claims can be added later only as a cache. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |
| One composed `proxy.ts` | Separate i18n and Auth middleware | Next.js exposes one proxy convention. Compose both concerns while preserving next-intl rewrites and Supabase `Set-Cookie` changes. This is an inference from both official integration guides. [CITED: https://next-intl.dev/docs/routing/middleware] [CITED: https://supabase.com/docs/guides/auth/server-side/creating-a-client] |
| Session client plus RLS for admin operations | Secret-key client for every admin request | Secret keys bypass RLS and increase blast radius. Reserve elevated clients for narrow system jobs or provisioning, not normal admin UI mutations. [CITED: https://supabase.com/docs/guides/getting-started/api-keys] |

**Installation:**

```bash
npm install next@16.2.9 react@19.2.7 react-dom@19.2.7 next-intl@4.13.0 @supabase/supabase-js@2.108.1 @supabase/ssr@0.12.0 zod@4.4.3 tailwindcss@4.3.0 @tailwindcss/postcss@4.3.0 postcss@8.5.15
npm install -D typescript@5.9.3 vitest@4.1.8 @playwright/test@1.60.0 eslint@10.4.1 eslint-config-next@16.2.9 prettier@3.8.4
```

Exact package versions and absence of `postinstall` scripts were checked against npm on 2026-06-12. The legitimacy seam flagged several established packages only because their latest releases were newer than its age threshold; the planner must insert one human verification checkpoint before the initial install and confirm package owner/repository/lockfile. [VERIFIED: npm registry]

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `next` | npm | ~15 yrs | 39.2M/wk | github.com/vercel/next.js | SUS: latest too new | Flagged; human verify |
| `react` | npm | ~15 yrs | 134.4M/wk | github.com/facebook/react | SUS: latest too new | Flagged; human verify |
| `react-dom` | npm | ~12 yrs | 126.5M/wk | github.com/facebook/react | SUS: latest too new | Flagged; human verify |
| `typescript` | npm | ~14 yrs | 205.8M/wk | github.com/microsoft/TypeScript | OK | Approved |
| `next-intl` | npm | ~6 yrs | 3.7M/wk | github.com/amannn/next-intl | SUS: latest too new | Flagged; human verify |
| `@supabase/supabase-js` | npm | ~6 yrs | 19.6M/wk | github.com/supabase/supabase-js | SUS: latest too new | Flagged; human verify |
| `@supabase/ssr` | npm | ~3 yrs | 4.6M/wk | github.com/supabase/ssr | SUS: latest too new | Flagged; human verify |
| `zod` | npm | ~6 yrs | 185.4M/wk | github.com/colinhacks/zod | OK | Approved |
| `tailwindcss` | npm | ~9 yrs | 110.7M/wk | github.com/tailwindlabs/tailwindcss | OK | Approved |
| `@tailwindcss/postcss` | npm | ~2 yrs | 22.2M/wk | github.com/tailwindlabs/tailwindcss | OK | Approved |
| `postcss` | npm | ~13 yrs | 225.5M/wk | github.com/postcss/postcss | SUS: latest too new | Flagged; human verify |
| `vitest` | npm | ~5 yrs | 64.6M/wk | github.com/vitest-dev/vitest | SUS: latest too new | Flagged; human verify |
| `@playwright/test` | npm | ~6 yrs | 38.6M/wk | github.com/microsoft/playwright | OK | Approved |
| `eslint` | npm | ~13 yrs | 132.5M/wk | github.com/eslint/eslint | SUS: latest too new | Flagged; human verify |
| `eslint-config-next` | npm | ~11 yrs | 22.0M/wk | github.com/vercel/next.js | SUS: latest too new | Flagged; human verify |
| `prettier` | npm | ~9 yrs | 108.9M/wk | github.com/prettier/prettier | SUS: latest too new | Flagged; human verify |

All registry age, download, repository, release-recency, and postinstall signals were returned by the GSD legitimacy seam or `npm view` on 2026-06-12. [VERIFIED: npm registry]

**Packages removed due to [SLOP] verdict:** none. [VERIFIED: npm registry]

**Packages flagged as suspicious [SUS]:** `next`, `react`, `react-dom`, `next-intl`, `@supabase/supabase-js`, `@supabase/ssr`, `postcss`, `vitest`, `eslint`, `eslint-config-next`, `prettier`. The planner must insert a single `checkpoint:human-verify` before the grouped initial install because every flag is the same "latest release too new" heuristic, while ownership, official documentation, repository, age, and download signals match the intended packages. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
Browser request
    |
    v
src/proxy.ts
    |-- next-intl: prefix/pathname negotiation
    |       |-- explicit /vi or /en -> continue
    |       `-- unprefixed -> cookie -> Accept-Language -> /vi or /en redirect
    |
    `-- Supabase SSR: validate/refresh auth token and copy cookies
            |
            v
app/[locale]
    |-- public/auth pages
    |-- (account) layout -> getClaims() -> signed-in?
    `-- admin layout -> getClaims() -> user_roles says admin?
            |
            v
Server Action / Route Handler
    |-- validate input and safe redirect target
    |-- requireUser() / requireAdmin()
    `-- session-bound Supabase client
            |
            v
Supabase Postgres/Auth
    |-- auth.users
    |-- public.profiles (RLS)
    |-- public.user_roles (RLS; no client writes)
    `-- private.is_admin() (security definer, fixed search_path)
            |
            v
Allowed rows only / denied operation
```

The composed-proxy ordering is an implementation inference: run next-intl to obtain the redirect/rewrite response, then apply Supabase cookie updates to that same response so neither integration drops the other's headers. [CITED: https://next-intl.dev/docs/routing/middleware] [CITED: https://supabase.com/docs/guides/auth/server-side/creating-a-client]

### Recommended Project Structure

```text
src/
├── app/
│   ├── [locale]/
│   │   ├── (public)/
│   │   ├── (auth)/
│   │   ├── account/
│   │   └── admin/
│   └── api/health/
├── auth/
│   ├── actions.ts
│   ├── guards.ts
│   ├── redirect.ts
│   └── schemas.ts
├── i18n/
│   ├── navigation.ts
│   ├── request.ts
│   └── routing.ts
├── lib/
│   ├── env/
│   └── supabase/
│       ├── client.ts
│       ├── server.ts
│       └── proxy.ts
├── messages/
│   ├── en.json
│   └── vi.json
└── proxy.ts

supabase/
├── config.toml
├── migrations/
├── seed.sql
└── tests/database/

tests/
├── unit/
└── e2e/
```

This structure separates HTTP/routing, authentication rules, provider clients, translations, database authority, and tests while remaining one modular monolith. [VERIFIED: codebase grep]

### Pattern 1: Centralized Localized Route Map

**What:** Define internal route identities once and map external Vietnamese/English pathnames in `defineRouting`. [CITED: https://next-intl.dev/docs/routing/configuration]

**When to use:** Every customer-facing static route from Phase 1 onward. Dynamic CMS slugs can extend the same pattern in later phases. [CITED: https://next-intl.dev/docs/routing/configuration]

```typescript
// Adapted from next-intl official routing documentation.
export const routing = defineRouting({
  locales: ['vi', 'en'],
  defaultLocale: 'en',
  localePrefix: 'always',
  localeDetection: true,
  pathnames: {
    '/': '/',
    '/sign-in': {vi: '/dang-nhap', en: '/sign-in'},
    '/sign-up': {vi: '/dang-ky', en: '/sign-up'},
    '/forgot-password': {vi: '/quen-mat-khau', en: '/forgot-password'},
    '/account': {vi: '/tai-khoan', en: '/account'},
    '/admin': {vi: '/quan-tri', en: '/admin'}
  }
});
```

Use English as `defaultLocale` only as the fallback for non-Vietnamese browsers, matching D-01. next-intl's detection order is URL prefix, locale cookie, `Accept-Language`, then default. [CITED: https://next-intl.dev/docs/routing/middleware]

### Pattern 2: Equivalent-Page Locale Switching

**What:** Switch locale by replacing the current internal pathname and forwarding current dynamic params. [CITED: https://next-intl.dev/docs/routing/navigation]

**When to use:** Header/footer language controls and all future dynamic localized pages. [CITED: https://next-intl.dev/docs/routing/navigation]

```typescript
'use client';

const pathname = usePathname();
const params = useParams();

router.replace(
  {pathname, params} as Parameters<typeof router.replace>[0],
  {locale: nextLocale}
);
```

Do not manually replace `/vi/` with `/en/`; translated pathnames and later localized dynamic slugs make string replacement incorrect. [CITED: https://next-intl.dev/docs/routing/configuration]

### Pattern 3: SSR Auth Boundary

**What:** Create distinct browser/server Supabase clients, refresh cookies in the composed proxy, and call `getClaims()` before protected server rendering or mutation. [CITED: https://supabase.com/docs/guides/auth/server-side/creating-a-client]

**When to use:** Account/admin layouts, Server Actions, Route Handlers, and auth callbacks. [CITED: https://supabase.com/docs/guides/auth/server-side/creating-a-client]

```typescript
export async function requireUser(locale: string) {
  const supabase = await createServerClient();
  const {data, error} = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect({href: '/sign-in', locale});
  }

  return {supabase, userId: data.claims.sub};
}
```

### Pattern 4: Database-Authoritative Admin Role

**What:** Store roles in `public.user_roles`, allow a signed-in user to read only their own role, deny all browser writes, and evaluate admin RLS through `private.is_admin()`. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]

**When to use:** Admin shell rendering and every admin data operation. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]

```sql
create schema if not exists private;

create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('customer', 'admin'))
);

alter table public.user_roles enable row level security;

create policy "users read own role"
on public.user_roles for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;
```

The first admin should sign up and confirm email normally, then an operator should insert the admin role through Supabase SQL Editor or an authenticated CLI runbook. Do not ship a public "become first admin" endpoint and do not store a secret key in the application solely for provisioning. This recommendation is an inference from least-privilege and secret-key guidance. [CITED: https://supabase.com/docs/guides/getting-started/api-keys]

### Initial Schema Contract

| Object | Minimum Phase 1 Contract | Access Boundary |
|--------|--------------------------|-----------------|
| `public.profiles` | `id uuid primary key references auth.users(id) on delete cascade`; store only minimal display/locale data needed by the account shell. Create via an `auth.users` trigger only if the trigger is kept small and tested because trigger failure can block signup. [CITED: https://supabase.com/docs/guides/auth/managing-user-data] | Enable RLS. Customers select/update only their own row; admins may select rows needed for administration; anonymous users receive no access. |
| `public.user_roles` | One row per user with a constrained role value; no role value comes from `user_metadata`. [VERIFIED: Supabase RLS and RBAC docs] | Enable RLS. Authenticated users may read only their own role; ordinary clients receive no insert/update/delete policy. Operator-controlled SQL is the Phase 1 bootstrap path. |
| `private.is_admin()` | `security definer`, fixed `search_path`, and explicit schema/function grants to `authenticated`. | Lives outside the exposed API schema and is called only from policies/server authorization helpers. |
| `on_auth_user_created` trigger | Insert the corresponding minimal profile row after signup. [CITED: https://supabase.com/docs/guides/auth/managing-user-data] | Test both success and intentional failure paths locally; do not place email, payment, or other network work in this transaction. |

Keep product, order, payment, entitlement, and fulfillment tables out of this phase. Their later migrations must follow the same default-deny RLS rule before any API exposure. [ASSUMED]

### Pattern 5: Defense in Depth for Sensitive Operations

**What:** Every sensitive Server Action/Route Handler validates input, verifies the authenticated user, checks the current authoritative role, and then executes through the user's session client; RLS independently permits or denies the statement. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]

**When to use:** Every present and future operation affecting access rights, customer data, payments, stock, or fulfillment. [VERIFIED: codebase grep]

The admin layout is navigation protection, not authorization. A crafted request can bypass UI navigation, so mutation handlers and RLS must repeat the checks. [CITED: https://owasp.org/www-project-application-security-verification-standard/]

### Anti-Patterns to Avoid

- **Two independent proxy files:** one concern will overwrite or bypass the other. Compose i18n and Auth cookie handling in one `src/proxy.ts`. [CITED: https://next-intl.dev/docs/routing/middleware]
- **`getSession()` as server authorization:** Supabase states cookie session data can be spoofed and recommends `getClaims()` for page/data protection. [CITED: https://supabase.com/docs/guides/auth/server-side/creating-a-client]
- **Admin role in `user_metadata`:** authenticated users can edit it. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]
- **Secret client for all admin traffic:** it bypasses RLS and removes defense in depth. [CITED: https://supabase.com/docs/guides/getting-started/api-keys]
- **RLS added after feature tables:** exposed-schema tables can be reachable through the Data API; RLS must be enabled in the creating migration. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]
- **Permanent wildcard Auth redirects in production:** use exact production callback paths; reserve wildcards for controlled local/preview deployments. [CITED: https://supabase.com/docs/guides/auth/redirect-urls]
- **Caching authenticated responses:** Supabase warns that caching a response carrying refreshed session cookies can sign another user into the wrong session. [CITED: https://supabase.com/docs/guides/auth/server-side/creating-a-client]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Locale negotiation | Custom `Accept-Language` parser and URL string rewrites | next-intl routing/proxy | Handles prefix, cookie, language matching, path rewrites, and alternates together. [CITED: https://next-intl.dev/docs/routing/middleware] |
| Password storage and session issuance | Custom password table, hashing, JWTs, refresh tokens | Supabase Auth | Auth provider owns credential storage, email verification, recovery, and session tokens. [CITED: https://supabase.com/docs/guides/auth/passwords] |
| Cookie-based SSR session refresh | Custom refresh-token cookies | `@supabase/ssr` | Official helper coordinates browser/server clients and proxy cookie updates. [CITED: https://supabase.com/docs/guides/auth/server-side/creating-a-client] |
| Per-row authorization | Application-only filters | PostgreSQL RLS | Policies remain effective even if a handler forgets a filter. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |
| Database test framework | Ad hoc SQL scripts that inspect rows manually | pgTAP through `supabase test db` | Supabase officially supports schema, function, integrity, and RLS tests. [CITED: https://supabase.com/docs/guides/local-development/testing/overview] |
| Production Auth mail delivery | Supabase default sender or custom mail server | Supabase Custom SMTP configured with Resend SMTP | Default sending is restricted and not for production; Resend documents direct Supabase SMTP setup. [CITED: https://supabase.com/docs/guides/auth/auth-smtp] [CITED: https://resend.com/docs/send-with-supabase-smtp] |

**Key insight:** Phase 1 is primarily security boundary composition. Use provider-supported mechanisms for locale routing, identity, cookies, RLS, SMTP, and testing; custom code should only connect those mechanisms and encode project-specific policy. [CITED: https://owasp.org/www-project-application-security-verification-standard/]

## Common Pitfalls

### Pitfall 1: Proxy Composition Drops Rewrites or Cookies

**What goes wrong:** locale redirects work but sessions expire, or sessions refresh but translated routes 404. [ASSUMED]

**Why it happens:** next-intl and Supabase examples each return their own `NextResponse`; naïve composition returns only one. [CITED: https://next-intl.dev/docs/routing/middleware] [CITED: https://supabase.com/docs/guides/auth/server-side/creating-a-client]

**How to avoid:** create the i18n response first and pass that response through a Supabase cookie-update helper that preserves status, rewrite/location headers, and existing cookies. Add tests for both redirect and authenticated refresh paths. [ASSUMED]

**Warning signs:** two `proxy.ts` files, lost `x-middleware-rewrite`, or `Set-Cookie` absent after a locale redirect. [ASSUMED]

### Pitfall 2: Local Auth Works but Production Email Does Not

**What goes wrong:** signup/reset succeeds locally but real users receive no email. [CITED: https://supabase.com/docs/guides/auth/auth-smtp]

**Why it happens:** local Mailpit captures mail, while Supabase's default hosted sender is restricted, rate-limited, and not production-grade. [CITED: https://supabase.com/docs/guides/auth/auth-smtp]

**How to avoid:** configure a verified Resend sending domain and Supabase Custom SMTP before production acceptance; keep Auth email separate from later marketing email. [CITED: https://resend.com/docs/send-with-supabase-smtp] [CITED: https://supabase.com/docs/guides/auth/auth-smtp]

**Warning signs:** production plan has no SMTP/domain/DKIM task, or testing only inspects Mailpit. [CITED: https://supabase.com/docs/guides/auth/auth-smtp]

### Pitfall 3: Recovery and Confirmation Redirect to the Wrong Locale or Host

**What goes wrong:** email links land on localhost, the wrong preview, an untranslated path, or an unapproved redirect. [CITED: https://supabase.com/docs/guides/auth/redirect-urls]

**Why it happens:** Site URL, redirect allowlist, email template `RedirectTo`, and localized callback builder are configured independently. [CITED: https://supabase.com/docs/guides/auth/redirect-urls]

**How to avoid:** centralize `getSiteUrl()`, validate locale and relative `next` paths, configure exact production callback URLs, controlled Vercel preview wildcard, and both localized destinations. [CITED: https://supabase.com/docs/guides/auth/redirect-urls]

**Warning signs:** raw query-string redirect is passed to `redirect()`, production still uses `localhost:3000`, or email templates use only `SiteURL`. [CITED: https://supabase.com/docs/guides/auth/redirect-urls]

### Pitfall 4: Admin Shell Is Protected but Mutations Are Not

**What goes wrong:** a customer cannot browse `/admin` but can call an admin action directly. [CITED: https://owasp.org/www-project-application-security-verification-standard/]

**Why it happens:** authorization is placed only in a layout or navigation component. [ASSUMED]

**How to avoid:** call `requireAdmin()` inside every mutation and back it with admin-specific RLS policy. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]

**Warning signs:** admin action accepts user ID/role from form data, or tests only verify page redirects. [ASSUMED]

### Pitfall 5: RLS Tests Use Only Privileged Credentials

**What goes wrong:** tests pass while anon/customer boundaries are absent because the test client bypasses RLS. [CITED: https://supabase.com/docs/guides/getting-started/api-keys]

**Why it happens:** seed/setup credentials are reused for assertions. [ASSUMED]

**How to avoid:** explicitly test anon, customer A, customer B, and admin JWT contexts; assert both allowed and denied operations. [CITED: https://supabase.com/docs/guides/local-development/testing/overview]

**Warning signs:** no negative assertions, no cross-user fixture, or all SQL runs as `postgres`. [ASSUMED]

### Pitfall 6: Public Env Prefix Leaks Elevated Credentials

**What goes wrong:** a secret or legacy service-role key is embedded in browser JavaScript. [CITED: https://nextjs.org/docs/app/guides/environment-variables]

**Why it happens:** any `NEXT_PUBLIC_*` value is inlined into browser code at build time. [CITED: https://nextjs.org/docs/app/guides/environment-variables]

**How to avoid:** expose only URL and publishable key; keep any future `SUPABASE_SECRET_KEY` unprefixed, import it only from `server-only` modules, and add source/build checks in CI. [CITED: https://supabase.com/docs/guides/getting-started/api-keys]

**Warning signs:** `NEXT_PUBLIC_SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`, or privileged client imports under Client Components. [CITED: https://supabase.com/docs/guides/getting-started/api-keys]

## Code Examples

### Safe Locale-Preserving Redirect Target

```typescript
import {z} from 'zod';

const relativePath = z
  .string()
  .max(500)
  .refine((value) => value.startsWith('/') && !value.startsWith('//'));

export function safeNext(value: FormDataEntryValue | null) {
  const parsed = relativePath.safeParse(value);
  return parsed.success ? parsed.data : '/account';
}
```

Validate redirect targets at the trusted server boundary to prevent external redirect injection. [CITED: https://owasp.org/www-project-application-security-verification-standard/] [CITED: https://zod.dev/]

### Generic Password Reset Response

```typescript
export async function requestPasswordReset(formData: FormData) {
  const {email, locale} = resetSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/${locale}/auth/recover`
  });

  return {ok: true};
}
```

The UI should show the same success message whether the address exists or not; the exact anti-enumeration response is a project security decision built on the provider flow. [ASSUMED]

### Admin Mutation Guard

```typescript
export async function requireAdmin(locale: string) {
  const {supabase, userId} = await requireUser(locale);
  const {data} = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (data?.role !== 'admin') {
    redirect({href: '/account', locale});
  }

  return {supabase, userId};
}
```

The following database statement must still be protected by RLS using `private.is_admin()`; the server guard improves UX and blocks work early but is not the only control. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]

### RLS Policy Pattern

```sql
create policy "owner or admin reads profiles"
on public.profiles
for select
to authenticated
using (
  (select auth.uid()) = id
  or (select private.is_admin())
);
```

Index every non-primary ownership column used by policies, and wrap stable helper calls in `select` so PostgreSQL can initialize them once per statement. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` | `proxy.ts` | Next.js 16 | Name the file and exported function `proxy`; compose next-intl and Supabase there. [CITED: https://next-intl.dev/docs/routing/middleware] |
| Legacy Supabase Auth Helpers | `@supabase/ssr` browser/server clients | Current Supabase SSR guidance | Do not introduce deprecated Auth Helpers. [CITED: https://supabase.com/docs/guides/auth/server-side/creating-a-client] |
| Server authorization via `getSession()` | `getClaims()` | Current Supabase SSR guidance | Validate JWT signature before protecting pages/data. [CITED: https://supabase.com/docs/guides/auth/server-side/creating-a-client] |
| Legacy anon/service-role keys | Publishable/secret keys | Legacy keys scheduled for deprecation by end of 2026 | New Phase 1 code should use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; do not introduce legacy names. [CITED: https://supabase.com/docs/guides/getting-started/api-keys] |
| ASVS 4.0.3 | ASVS 5.0.0 | Released 2025-05-30 | Reference current category names/version in security acceptance criteria. [CITED: https://owasp.org/www-project-application-security-verification-standard/] |

**Deprecated/outdated:**

- `middleware.ts` examples are pre-Next.js 16; translate them to `proxy.ts`. [CITED: https://next-intl.dev/docs/routing/middleware]
- Supabase Auth Helpers should not be introduced; use `@supabase/ssr`. [CITED: https://supabase.com/docs/guides/auth/server-side/creating-a-client]
- Legacy `anon` and `service_role` key names should not be the new project's default. [CITED: https://supabase.com/docs/guides/getting-started/api-keys]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The composed proxy should apply Supabase cookie mutations to the response produced by next-intl. | Architecture / Pitfall 1 | Header/cookie loss could break locale or Auth; integration tests must prove composition. |
| A2 | Password reset UI should always return a generic success response. | Code Examples | Provider behavior or product policy may require adjusted messaging, but enumeration resistance must remain. |
| A3 | Layout-only authorization is a likely implementation mistake. | Pitfall 4 | Low; direct mutation tests will validate the real boundary. |
| A4 | RLS tests are at risk of accidentally using privileged setup credentials. | Pitfall 5 | Low; pgTAP fixtures must explicitly set request JWT/role. |
| A5 | The future `package.json` will expose the full-suite script names shown in Validation Architecture. | Validation Architecture | Planner must create equivalent scripts if it chooses different names. |
| A6 | Warm targeted Vitest and pgTAP checks can be kept below 30 seconds on the target machine. | Validation Architecture | Sampling frequency may need adjustment if local startup dominates. |
| A7 | Each wave can run the stated combined lint, typecheck, unit, database, and E2E commands. | Validation Architecture | CI command grouping may change after the scaffold exists. |
| A8 | A source/import scan plus runtime tests is an appropriate Phase 1 boundary check for privileged secrets. | Validation Architecture | Additional bundler-specific inspection may be required. |
| A9 | Redirect loops, dropped cookies, or locale loss are useful early warning signs of Proxy composition defects. | Common Pitfalls | A defect could present differently in a specific deployment. |
| A10 | Empty admin shells and tests that pass only with privileged credentials are useful warning signs of authorization-policy defects. | Common Pitfalls | Exact symptoms depend on the final data-access helpers. |
| A11 | A seven-day research validity window is appropriate because the selected framework and auth packages are fast-moving. | Metadata | Earlier re-verification may be needed after a security release. |
| A12 | Commerce-domain tables remain outside Phase 1 while inheriting the same default-deny RLS rule in later phases. | Initial Schema Contract | The planner must adjust only if the phase boundary is formally changed. |

## Open Questions (RESOLVED)

1. **Production hostname and sending domain**
   - What we know: Supabase Site URL, exact redirect allowlist, Resend domain, and localized Auth links depend on final domains. [CITED: https://supabase.com/docs/guides/auth/redirect-urls]
   - What's unclear: Final brand hostname and verified Auth sending subdomain are not recorded. [VERIFIED: codebase grep]
   - RESOLVED: Phase 1 implementation will parameterize `NEXT_PUBLIC_SITE_URL`, support localhost and Vercel preview allowlists during local/preview execution, and block production acceptance on the Plan 01-08 operator checkpoint for exact production hostname, Supabase redirect allowlist, and verified SMTP sending domain. No production hostname is hardcoded into Phase 1 plans. [CITED: https://supabase.com/docs/guides/auth/redirect-urls]

2. **Production Supabase and Vercel projects**
   - What we know: Local CLI and Docker are available, but no local Supabase project is initialized/running and Vercel CLI is absent. [VERIFIED: environment probe]
   - What's unclear: Hosted project IDs, Git provider connection, and environment values. [VERIFIED: environment probe]
   - RESOLVED: Phase 1 plans use local Supabase, local Docker, and lockfile-based CI as the executable path. Hosted Supabase and Vercel setup is captured as Plan 01-08 `user_setup` plus a blocking human verification checkpoint, so implementation remains reproducible without hosted project IDs while deployability is not accepted until operator-owned values are configured. [CITED: https://vercel.com/docs/git]

3. **CAPTCHA timing**
   - What we know: Supabase recommends CAPTCHA as the strongest mitigation for signup/email abuse. [CITED: https://supabase.com/docs/guides/auth/auth-smtp]
   - What's unclear: No CAPTCHA provider is selected and it is not a Phase 1 requirement. [VERIFIED: codebase grep]
   - RESOLVED: Phase 1 will not add a CAPTCHA provider because no provider is selected and CAPTCHA is not in MKT-01, ACC-01, ADM-02, SEC-01, or SEC-02. Plans require generic reset responses, provider rate-limit awareness, production SMTP confirmation, and README documentation of the CAPTCHA integration point so public-launch hardening can add a selected provider without altering Phase 1 auth contracts. [CITED: https://supabase.com/docs/guides/auth/auth-smtp]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Next.js build/test | Yes, meets framework minimum | 20.19.4 | Use Node 22 LTS in `.nvmrc`/CI per project stack; local Node 20 can bootstrap. [VERIFIED: environment probe] |
| npm | Package install/scripts | Yes | 10.8.1 | None required. [VERIFIED: environment probe] |
| Supabase CLI | Local Auth/DB/Mailpit/pgTAP | Yes | 2.58.5 | Hosted project only is possible but would weaken reproducible RLS tests. [VERIFIED: environment probe] |
| Docker Desktop daemon | Local Supabase | Yes | 28.5.1 | Hosted test project if Docker becomes unavailable. [VERIFIED: environment probe] |
| Local Supabase project | Database/Auth tests | No | Not initialized/running | Wave 0: `supabase init` then `supabase start`. [VERIFIED: environment probe] |
| Vercel CLI | Manual local Vercel workflows | No | — | Use Vercel Git integration; CLI is optional. [CITED: https://vercel.com/docs/git] |
| Playwright browsers | E2E | No project install yet | — | Wave 0 local install; CI runs Playwright browser install. [CITED: https://nextjs.org/docs/app/guides/testing/playwright] |
| Resend verified domain/SMTP | Production Auth email | Unknown | — | Local Mailpit for development only; production remains blocked until SMTP is configured. [CITED: https://supabase.com/docs/guides/auth/auth-smtp] |

**Missing dependencies with no fallback:**

- A verified production SMTP sender is required before production acceptance of registration and password reset. [CITED: https://supabase.com/docs/guides/auth/auth-smtp]
- Hosted Supabase/Vercel project configuration is required for the deployable production outcome, though local implementation can proceed first. [CITED: https://vercel.com/docs/git]

**Missing dependencies with fallback:**

- Vercel CLI is missing; Git integration provides preview and production deployments. [CITED: https://vercel.com/docs/git]
- Playwright is not installed globally; install it as a project dev dependency. [CITED: https://nextjs.org/docs/app/guides/testing/playwright]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Unit framework | Vitest 4.1.8 for pure routing, schema, redirect, and guard helpers. [CITED: https://nextjs.org/docs/app/guides/testing/vitest] |
| Database framework | pgTAP via `supabase test db`. [CITED: https://supabase.com/docs/guides/local-development/cli/testing-and-linting] |
| E2E framework | Playwright 1.60.0 against a production Next.js build and local Supabase. [CITED: https://nextjs.org/docs/app/guides/testing/playwright] |
| Config files | None exist; create `vitest.config.ts`, `playwright.config.ts`, `supabase/config.toml`, and CI workflow in Wave 0. [VERIFIED: codebase grep] |
| Quick run command | `npm run test:unit && supabase test db` after local Supabase is running. [CITED: https://supabase.com/docs/guides/local-development/cli/testing-and-linting] |
| Full suite command | `npm run lint && npm run typecheck && npm run test:unit && supabase db reset && supabase db lint --local --fail-on error && supabase test db && npm run build && npm run test:e2e`. [ASSUMED] |

Vitest should not be the primary test for async Server Components; Next.js recommends E2E coverage for those components. [CITED: https://nextjs.org/docs/app/guides/testing/vitest]

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MKT-01 | `/` chooses `/vi` for Vietnamese preference and `/en` otherwise; explicit prefixes win; switcher preserves equivalent route and translated slug | Unit + E2E | `npm run test:unit -- tests/unit/i18n && npm run test:e2e -- tests/e2e/localization.spec.ts` | No, Wave 0 [VERIFIED: codebase grep] |
| ACC-01 | Register, verify email, sign in/out, request reset, recover session, update password, and reject expired/invalid links | E2E + integration | `npm run test:e2e -- tests/e2e/auth.spec.ts` | No, Wave 0 [VERIFIED: codebase grep] |
| ADM-02 | Customer cannot render admin shell or call admin mutation; admin can; mutation repeats server authorization | E2E + database | `supabase test db supabase/tests/database/01_roles_rls.test.sql && npm run test:e2e -- tests/e2e/admin-boundary.spec.ts` | No, Wave 0 [VERIFIED: codebase grep] |
| SEC-01 | Anon/customer A/customer B/admin receive only permitted rows and writes on every exposed Phase 1 table | pgTAP | `supabase test db supabase/tests/database/01_foundation_rls.test.sql` | No, Wave 0 [VERIFIED: codebase grep] |
| SEC-02 | Browser bundle/source contains no secret/service-role value or privileged-client import | Static + build inspection + E2E | `npm run test:security && npm run build` | No, Wave 0 [VERIFIED: codebase grep] |

### Required Test Scenarios

| Boundary | Positive | Negative |
|----------|----------|----------|
| Locale | Vietnamese `Accept-Language` reaches `/vi`; English/other reaches `/en`; explicit prefix and saved cookie win | Unsupported locale and unprefixed legacy route cannot produce duplicate public content. [CITED: https://next-intl.dev/docs/routing/middleware] |
| Account | Confirmed user enters localized account shell | Anonymous, expired token, invalid confirmation, and open-redirect `next` value are rejected safely. [CITED: https://supabase.com/docs/guides/auth/server-side/creating-a-client] |
| Password reset | Valid recovery link changes password and permits new sign-in | Unknown email response does not enumerate; invalid/expired link cannot update password. [CITED: https://supabase.com/docs/guides/auth/passwords] |
| Customer RLS | Customer A reads/updates own profile | Anon sees nothing; A cannot read/write B; customer cannot write `user_roles`. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |
| Admin RLS | Provisioned admin can perform allowed admin operation | Customer-crafted direct request fails at `requireAdmin()` and RLS. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |
| Secrets | Publishable key appears where expected | Secret/service-role values and privileged client modules never appear in client source or `.next/static`. [CITED: https://nextjs.org/docs/app/guides/environment-variables] |

### Sampling Rate

- **Per task commit:** targeted Vitest file or targeted pgTAP file under 30 seconds after services are warm. [ASSUMED]
- **Per wave merge:** lint, typecheck, all unit tests, `supabase db lint`, all pgTAP tests, and production build. [ASSUMED]
- **Phase gate:** full suite plus Playwright Auth/localization/admin scenarios green against local Supabase; one Vercel preview smoke test; production SMTP/operator checklist complete. [CITED: https://vercel.com/docs/git]

### Wave 0 Gaps

- [ ] `package.json` scripts: `lint`, `typecheck`, `test:unit`, `test:e2e`, `test:security`, `ci`. [VERIFIED: codebase grep]
- [ ] `vitest.config.ts` and `tests/unit/i18n/*.test.ts`, `tests/unit/auth/*.test.ts`. [VERIFIED: codebase grep]
- [ ] `playwright.config.ts` and localized Auth/admin E2E fixtures. [VERIFIED: codebase grep]
- [ ] `supabase/config.toml`, first migration, seed fixtures, and `supabase/tests/database/*.test.sql`. [VERIFIED: codebase grep]
- [ ] Mailpit helper that reads confirmation/reset messages without external email delivery. [CITED: https://supabase.com/docs/guides/local-development/cli/testing-and-linting]
- [ ] GitHub Actions workflow using Node 22, Docker-backed Supabase, pgTAP, build, and Playwright. [VERIFIED: codebase grep]
- [ ] Secret-boundary check for forbidden `NEXT_PUBLIC_*SECRET*`, `SERVICE_ROLE`, and client imports of server-only modules. [ASSUMED]

### CI and Deployment Gate

1. Pull request CI runs install from lockfile, lint, typecheck, unit tests, Supabase local start/reset/lint/pgTAP, production build, and Playwright. [CITED: https://nextjs.org/docs/app/guides/testing/playwright]
2. Vercel Git integration creates a preview deployment for each non-production branch and production deployment from `main`. [CITED: https://vercel.com/docs/git]
3. Preview and production environment variables are scoped separately; only the Supabase URL and publishable key use `NEXT_PUBLIC_`. [CITED: https://vercel.com/docs/environment-variables]
4. Supabase Auth allowlist includes localhost, controlled Vercel preview pattern, and exact production localized callback paths. [CITED: https://supabase.com/docs/guides/auth/redirect-urls]
5. Production acceptance requires custom SMTP and a real end-to-end confirmation/reset smoke test. [CITED: https://supabase.com/docs/guides/auth/auth-smtp]

## Security Domain

Security enforcement is enabled at ASVS Level 1 in `.planning/config.json`. [VERIFIED: codebase grep]

### Applicable ASVS Categories

| ASVS 5.0 Category | Applies | Standard Control |
|-------------------|---------|------------------|
| V2 Validation and Business Logic | Yes | Zod validation at Server Actions/Route Handlers; allowlisted locale and same-origin relative redirects. [CITED: https://owasp.org/www-project-application-security-verification-standard/] |
| V3 Web Frontend Security | Yes | Secure cookie behavior from Supabase SSR, appropriate security headers, no secret values in client bundles. [CITED: https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv] |
| V6 Authentication | Yes | Supabase Auth email verification, password reset, rate-limit documentation, generic recovery response, no custom password storage. [CITED: https://supabase.com/docs/guides/auth/passwords] |
| V7 Session Management | Yes | Cookie refresh in proxy, claims verification on server, logout, expired-session denial, no authenticated response caching. [CITED: https://supabase.com/docs/guides/auth/server-side/creating-a-client] |
| V8 Authorization | Yes | `requireAdmin()` plus database-authoritative role and RLS role matrix. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |
| V11 Cryptography | Limited | Use Supabase/provider cryptography; do not implement password hashing or token signing. [CITED: https://supabase.com/docs/guides/auth/passwords] |
| V12 Secure Communication | Yes | HTTPS production/preview URLs and exact Auth redirect configuration. [CITED: https://supabase.com/docs/guides/auth/redirect-urls] |
| V13 Configuration | Yes | Environment scoping, secret management, least privilege, production debug/config review. [CITED: https://vercel.com/docs/environment-variables] |
| V14 Data Protection | Yes | RLS, minimum exposed profile fields, no unnecessary sensitive logging, no cross-user access. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged/stale session cookie trusted by server | Spoofing | `getClaims()` before protected rendering and mutations; refresh through official SSR proxy. [CITED: https://supabase.com/docs/guides/auth/server-side/creating-a-client] |
| Customer calls admin mutation directly | Elevation of Privilege | Repeated `requireAdmin()` plus RLS `private.is_admin()`. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |
| Customer changes role through metadata or table write | Elevation of Privilege | Never use `user_metadata`; no client write policies on `user_roles`; operator-only provisioning. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |
| Secret key bundled into client | Information Disclosure / Elevation | Only publishable key in `NEXT_PUBLIC_*`; server-only imports and bundle checks. [CITED: https://nextjs.org/docs/app/guides/environment-variables] |
| Cross-user profile access | Information Disclosure | Owner/admin RLS and anon/customer-A/customer-B/admin pgTAP matrix. [CITED: https://supabase.com/docs/guides/local-development/testing/overview] |
| Open redirect after sign-in/reset | Spoofing | Allow only normalized same-origin relative paths and known locales. [CITED: https://owasp.org/www-project-application-security-verification-standard/] |
| Email enumeration and reset abuse | Information Disclosure / Denial of Service | Generic response, provider rate limits, production SMTP monitoring, future CAPTCHA integration point. [CITED: https://supabase.com/docs/guides/auth/auth-smtp] |
| Cached personalized response with `Set-Cookie` | Information Disclosure / Spoofing | Dynamic protected routes and no shared caching of authenticated responses. [CITED: https://supabase.com/docs/guides/auth/server-side/creating-a-client] |

## Sources

### Primary (HIGH authority, classified MEDIUM by research seam)

- https://next-intl.dev/docs/routing/configuration - locale prefixes, pathnames, detection, cookie, alternates.
- https://next-intl.dev/docs/routing/navigation - typed navigation and equivalent-page locale switching.
- https://next-intl.dev/docs/routing/middleware - Next.js 16 `proxy.ts`, matcher, detection order, composition.
- https://supabase.com/docs/guides/auth/server-side/creating-a-client - SSR clients, proxy refresh, `getClaims()`, cache warning.
- https://supabase.com/docs/guides/auth/passwords - email verification, PKCE, sign-in, reset/update password, Mailpit.
- https://supabase.com/docs/guides/auth/managing-user-data - public profile references, signup trigger pattern, and trigger failure warning.
- https://supabase.com/docs/guides/auth/redirect-urls - production/preview allowlists and email template redirects.
- https://supabase.com/docs/guides/auth/auth-smtp - production SMTP requirement and abuse considerations.
- https://supabase.com/docs/guides/database/postgres/row-level-security - exposed-schema RLS, policies, metadata, views, indexes, bypass keys.
- https://supabase.com/docs/guides/getting-started/api-keys - publishable versus secret key boundaries.
- https://supabase.com/docs/guides/local-development/testing/overview - pgTAP and RLS testing.
- https://supabase.com/docs/guides/local-development/cli/testing-and-linting - `supabase test db`, CI, Mailpit.
- https://nextjs.org/docs/app/guides/environment-variables - browser bundling boundary.
- https://nextjs.org/docs/app/guides/testing/vitest - unit testing boundary for Server Components.
- https://nextjs.org/docs/app/guides/testing/playwright - production-build E2E and CI.
- https://vercel.com/docs/git - preview/production Git deployments.
- https://vercel.com/docs/environment-variables - environment-specific variable scopes.
- https://owasp.org/www-project-application-security-verification-standard/ - ASVS 5.0.0.
- https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv - current control categories.
- https://resend.com/docs/send-with-supabase-smtp - Supabase Auth SMTP setup.

### Secondary (MEDIUM confidence)

- npm registry and GSD package-legitimacy seam checked package versions, age, downloads, repositories, and postinstall signals on 2026-06-12. [VERIFIED: npm registry]
- Project planning documents define the locked stack, phase boundary, requirements, and four planned slices. [VERIFIED: codebase grep]

### Tertiary (LOW confidence)

- The assumptions in the Assumptions Log require implementation tests or user/operator confirmation. [ASSUMED]

## Metadata

**Confidence breakdown:**

- Standard stack: MEDIUM - official package docs and registry versions were checked, but the automated legitimacy gate marked several latest releases SUS solely for recency. [VERIFIED: npm registry]
- Architecture: HIGH - directly derived from locked decisions and official next-intl, Supabase, Next.js, and PostgreSQL RLS guidance. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]
- Pitfalls: MEDIUM - core security pitfalls are documented; composed proxy behavior remains an integration inference requiring tests. [ASSUMED]
- Validation: HIGH - official Next.js test guidance and Supabase pgTAP/CLI support map directly to the five requirements. [CITED: https://supabase.com/docs/guides/local-development/testing/overview]

**Research date:** 2026-06-12
**Valid until:** 2026-06-19, because Next.js, Supabase SSR, and package patch releases are fast-moving. [ASSUMED]
