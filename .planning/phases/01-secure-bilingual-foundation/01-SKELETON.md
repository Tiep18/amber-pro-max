# Walking Skeleton - Amigurumi Pattern & Handmade Store

**Phase:** 1
**Generated:** 2026-06-12

## Capability Proven End-to-End

A visitor reaches an explicit Vietnamese or English route, authenticates through Supabase, reads their own account profile through RLS, and is denied admin access unless the database-owned role boundary allows it.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16 App Router with React 19 and TypeScript | Server rendering, route handlers, metadata, localized routing, and deployment fit in one modular monolith. |
| Localization | `next-intl` with always-prefixed `/vi` and `/en` routes, translated public slugs, and a composed `src/proxy.ts` | Implements D-01, D-02, D-03, and D-04 without duplicate unprefixed customer pages. |
| Data layer | Supabase Postgres migrations, generated TypeScript types, RLS on exposed tables, and pgTAP tests | Establishes SEC-01 from the first schema and keeps later commerce tables under the same policy discipline. |
| Auth | Supabase Auth with SSR cookie clients, PKCE email flows, `auth.getClaims()` server checks, and database-owned admin roles | Provides ACC-01 while keeping ADM-02 and SEC-02 enforced on the server and in the database. |
| Deployment target | Vercel Git deployment with environment-scoped Supabase variables and local Supabase parity | Matches the researched stack while allowing local full-stack verification before hosted credentials exist. |
| UI system | Tailwind CSS 4 semantic tokens, official shadcn/ui source components, Be Vietnam Pro, and Lucide React | Follows the approved warm handmade studio direction and avoids third-party shadcn registries. |
| Directory layout | `src/app`, `src/i18n`, `src/auth`, `src/lib/supabase`, `src/lib/env`, `src/messages`, `supabase`, and `tests` | Keeps routing, auth, provider clients, migrations, and verification boundaries discoverable for later phases. |

## Stack Touched in Phase 1

- [ ] Project scaffold: Next.js, TypeScript, Tailwind, shadcn/ui, lint, format, Vitest, Playwright, and CI.
- [ ] Routing: explicit `/vi` and `/en` routes, browser-language first-visit redirect, translated auth slugs, and route-preserving language switch.
- [ ] Database: `profiles` and `user_roles` tables, `private.is_admin()` helper, local fixtures, RLS policies, and one real profile read/write through authenticated context.
- [ ] UI: public, auth, account, and admin shells with accessible localized controls and no out-of-scope commerce navigation.
- [ ] Deployment: local full-stack run command, CI gate, Vercel-ready environment contract, and hosted setup checkpoint.

## Out of Scope (Deferred to Later Slices)

- Product catalog, taxonomy, pricing, variants, inventory management, and digital PDF upload.
- Cart, checkout, shipping, discounts, market exception requests, and order snapshots.
- PayPal, VietQR, payment records, payment webhooks, and paid-state transitions.
- Digital entitlements, private PDF download links, transactional email outbox, and physical fulfillment.
- Reviews, newsletter, blog publishing, SEO content operations, policies, and launch legal decisions.
- Native apps, Etsy synchronization, carrier labels, customs automation, custom commissions, and automatic Vietnam bank reconciliation.

## Subsequent Slice Plan

| Phase | Capability Added Without Replacing This Skeleton |
|---|---|
| Phase 2 | Market-aware catalog publishing and localized product discovery build on the locale, admin, RLS, and Supabase type foundations. |
| Phase 3 | Mixed cart and checkout add server-owned pricing and reservations using the same protected route, schema, and test patterns. |
| Phase 4 | PayPal and VietQR order lifecycles add server payment boundaries and audit trails behind established admin authorization. |
| Phase 5 | Digital and physical fulfillment add private storage, entitlements, outbox email, and tracking on top of confirmed payment states. |
| Phase 6 | Retention features add account data, reviews, and newsletter consent while preserving customer-only RLS boundaries. |
| Phase 7 | Blog, SEO, policy, observability, and launch verification complete the public content and operational layers. |
