# Stack Research

**Domain:** Bilingual ecommerce for digital patterns and handmade physical goods
**Researched:** 2026-06-12
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.2.x | Storefront, admin UI, server routes, SEO pages | App Router provides server rendering, metadata, route handlers, caching, and localization-friendly routing in one deployable application. |
| React | 19.2.x | User interface | Supported by Next.js 16 and suitable for both server and interactive client components. |
| TypeScript | 5.9.x | Application language | Reduces errors in money, order-state, product-variant, and payment payload handling. |
| Supabase Postgres | Managed current release | Relational commerce data | Products, variants, markets, orders, payments, entitlements, discounts, and shipping rules are strongly relational and benefit from constraints and transactions. |
| Supabase Auth | Managed current release | Customer and admin identity | Supports account checkout while guest orders remain application-owned records; integrates with SSR cookies. |
| Supabase Storage | Managed current release | Product images and private PDFs | Private buckets and short-lived signed URLs fit protected pattern delivery. |
| Vercel | Current platform | Hosting and deployment | Native Next.js deployment, preview environments, CDN, and request country headers for initial market detection. |

Use Node.js 22 LTS for development and deployment. Next.js 16 requires Node.js 20.9 or newer; the active LTS line is the conservative production choice.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/supabase-js` | 2.x, pin latest compatible | Database, Auth, and Storage client | Browser-safe access under RLS and server-side service operations. |
| `@supabase/ssr` | Current compatible release | Cookie-based Supabase SSR | Create separate browser and server clients for Next.js App Router. |
| `next-intl` | Current Next.js 16-compatible release | Vietnamese/English routing and messages | Localized routes, formatting, and translated UI strings. |
| Tailwind CSS | 4.3.x | Styling system | Responsive storefront and admin UI with a small custom design-token layer. |
| shadcn/ui | Latest CLI-generated source | Accessible UI primitives | Forms, dialogs, tables, navigation, and admin controls that remain owned by the project. |
| Zod | Current stable | Runtime validation | Validate checkout input, webhook payload boundaries, admin forms, and environment configuration. |
| Resend | Current stable | Transactional email | Payment instructions, order confirmations, expiring download links, shipping updates, and newsletter operations. |
| PayPal JavaScript SDK + Orders API | v2 REST APIs | International payment | Create and capture orders server-side and reconcile through verified webhooks. |
| Vitest | Current stable | Unit and integration tests | Money rules, market resolution, shipping, discounts, and state machines. |
| Playwright | Current stable | Browser tests | Guest/account checkout, PayPal sandbox, VietQR confirmation, download, and admin workflows. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Supabase CLI | Local database, migrations, generated types | Discover current commands with `supabase --help`; create migrations through the CLI. |
| ESLint | Static checks | Use the Next.js-supported configuration and treat unsafe server/client imports as errors. |
| Prettier | Formatting | Keep SQL and TypeScript formatting deterministic. |
| GitHub Actions | CI | Run type checks, lint, tests, migration checks, and production build. |
| PayPal Sandbox | Payment verification | Exercise capture, cancellation, duplicate webhook, delayed webhook, and refund scenarios. |

## Installation

Exact patch versions must be pinned by the lockfile when implementation begins.

```bash
npx create-next-app@latest . --typescript --eslint --app --src-dir
npm install @supabase/supabase-js @supabase/ssr next-intl zod resend
npm install tailwindcss @tailwindcss/postcss postcss
npm install -D vitest @playwright/test prettier
npx shadcn@latest init
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js modular monolith | Separate React SPA and backend API | Use when independent teams deploy frontend and backend separately or non-web clients dominate. |
| Supabase | Shopify or another hosted commerce platform | Use when standard commerce behavior matters more than custom mixed fulfillment and market rules. |
| Supabase | Fully custom Node API plus managed Postgres | Use when infrastructure ownership, background processing, or provider independence justifies more operational work. |
| Resend | Postmark, Amazon SES | Use Postmark for mature transactional tooling or SES when high volume makes cost the primary concern. |
| Direct SQL/Supabase client | Prisma or Drizzle | Add an ORM only if complex server-only query composition becomes a real problem; RLS and SQL migrations remain authoritative. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| A client-only SPA | Weakens first-load SEO and complicates secure server-side checkout/payment logic. | Next.js App Router with server-rendered public pages. |
| Public PDF storage URLs | Links can be shared indefinitely and bypass purchase authorization. | Private storage plus entitlement checks and short-lived signed URLs. |
| Floating-point money | Creates rounding errors across VND, USD, discounts, and shipping. | Integer minor units with an explicit currency code. |
| Automatic exchange-rate conversion as the pricing model | The business requires independently controlled market prices, not converted prices. | Explicit market price rows per product/variant. |
| Admin authorization in user-editable metadata | Supabase user metadata can be modified by the user and is unsafe for authorization. | Server-managed `app_metadata` plus database policies. |
| Microservices for v1 | Adds deployment, observability, and consistency costs before traffic requires them. | A modular monolith with clear domain boundaries and an outbox/job mechanism. |

## Stack Patterns by Variant

**For public catalog and blog pages:**
- Use server components, static generation or controlled revalidation, localized metadata, canonical URLs, `hreflang`, and Product structured data.
- Keep market-specific price/availability in cache keys or request-time data so one market is not served another market's price.

**For checkout, admin, and account pages:**
- Use dynamic server rendering and server-side authorization.
- Recalculate all totals from database records; never trust browser-submitted prices.

**For digital delivery:**
- Store PDFs in a private bucket.
- Create an entitlement after confirmed payment, then issue a new short-lived signed URL only after validating the entitlement.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js 16.2.x | React 19.x, Node.js >= 20.9 | Pin the latest patched release because framework security fixes can be patch-level. |
| `@supabase/ssr` | `@supabase/supabase-js` 2.x | Follow current SSR cookie-client guidance; legacy Auth Helpers should not be introduced. |
| Tailwind CSS 4.3.x | Next.js App Router | Uses `@tailwindcss/postcss` and `@import "tailwindcss"`. |
| `next-intl` current | Next.js 16 App Router | Verify proxy/middleware naming and routing examples at implementation time. |

## Sources

- https://nextjs.org/docs/app - Next.js 16 App Router, metadata, routing, server components, and route handlers.
- https://registry.npmjs.org/next/latest - Next.js 16.2.9 and Node.js engine requirement checked on 2026-06-12.
- https://registry.npmjs.org/react/latest - React 19.2.7 checked on 2026-06-12.
- https://supabase.com/changelog.md - current Supabase change index reviewed for relevant breaking changes.
- https://supabase.com/docs/guides/auth/server-side/creating-a-client - current SSR cookie-client guidance and new publishable/secret key model.
- https://supabase.com/docs/guides/database/postgres/row-level-security - RLS requirements and authorization cautions.
- https://supabase.com/docs/reference/javascript/storage-from-createsignedurl - expiring signed Storage URLs.
- https://tailwindcss.com/docs/installation/framework-guides/nextjs - Tailwind CSS 4.3 setup for Next.js.
- https://next-intl.dev/docs/getting-started/app-router - App Router internationalization.
- https://resend.com/docs/send-with-nextjs - transactional email integration.
- https://developer.paypal.com/docs/api/orders/v2/ - PayPal Orders API.
- https://developer.paypal.com/api/rest/webhooks/rest/ - webhook delivery and signature verification.
- https://vercel.com/docs/headers/request-headers#x-vercel-ip-country - deployment-provided country signal.

---
*Stack research for: bilingual mixed digital/physical ecommerce*
*Researched: 2026-06-12*
