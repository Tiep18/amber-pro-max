# Phase 1: Secure Bilingual Foundation - Context

**Gathered:** 2026-06-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a deployable Vietnamese/English application foundation with localized
routes, customer email authentication, protected account and admin shells, and
enforced anonymous/customer/admin data boundaries. Product catalog, market
pricing, checkout, payments, and fulfillment belong to later phases.

</domain>

<decisions>
## Implementation Decisions

### Language Routing
- **D-01:** For a first visit without a saved locale, detect the browser's preferred language. Use Vietnamese when Vietnamese is preferred; otherwise use English.
- **D-02:** Every customer-facing route has an explicit locale prefix: `/vi` or `/en`.
- **D-03:** Changing language keeps the visitor on the equivalent current page rather than returning to the home page.
- **D-04:** Public-facing slugs are translated per language, such as `/vi/dang-nhap` and `/en/sign-in`.

### Agent's Discretion
- Registration, email verification, password reset, authentication error presentation, and post-auth redirects may follow secure, conventional Supabase patterns.
- The admin entry point, first-admin provisioning flow, and unauthorized-user experience may be chosen during research and planning, provided admin authorization is server-managed and server-enforced.
- Initial design tokens, navigation shells, responsive behavior, and visual direction may be selected during UI specification and planning.
- Missing-translation behavior, locale persistence, and redirects from unprefixed or legacy URLs may use standard SEO-safe conventions consistent with D-01 through D-04.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Scope and Requirements
- `.planning/PROJECT.md` - Defines the bilingual storefront, customer/admin boundaries, guest-commerce constraints, and project-level decisions.
- `.planning/REQUIREMENTS.md` - Phase 1 requirements are MKT-01, ACC-01, ADM-02, SEC-01, and SEC-02.
- `.planning/ROADMAP.md` - Defines the Phase 1 goal, success criteria, boundary, and four planned work slices.

### Technology Guidance
- `.planning/research/STACK.md` - Defines the Next.js, next-intl, Supabase Auth, Supabase SSR, TypeScript, Tailwind, testing, and deployment baseline.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None yet. The repository contains planning artifacts but no application source code.

### Established Patterns
- The planned architecture is a Next.js/Supabase modular monolith.
- Localized App Router routes and server-enforced Supabase authorization are established stack constraints.

### Integration Points
- Phase 1 will create the initial application, locale routing, Supabase client boundaries, database migrations, RLS test harness, account shell, admin shell, CI, and deployment structure.

</code_context>

<specifics>
## Specific Ideas

- Locale prefixes and translated slugs should make the active language obvious in the URL.
- The language switcher should preserve navigation context by resolving the equivalent localized route.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Secure Bilingual Foundation*
*Context gathered: 2026-06-12*
