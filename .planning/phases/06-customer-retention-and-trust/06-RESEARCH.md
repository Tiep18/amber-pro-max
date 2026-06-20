# Phase 6: Customer Retention and Trust - Research

**Researched:** 2026-06-20
**Domain:** Account-owned retention data, verified-purchase reviews, newsletter consent, Supabase RLS, localized Next.js App Router UI
**Confidence:** HIGH for local architecture and constraints; MEDIUM for current external docs because Context7 was unavailable and official docs were fetched via web fallback.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Saved Addresses in Checkout
- **D-01:** A signed-in customer can choose a saved shipping address and copy it into the checkout form. The order still stores its own immutable shipping-address snapshot at checkout time.
- **D-02:** Each customer has one default shipping address for v1.
- **D-03:** Selecting a saved address immediately triggers quote revalidation. If the address country changes market, currency, price, shipping, or eligibility, the Phase 3 material-change preview must be shown and confirmed before checkout continues.
- **D-04:** Customers may edit or delete saved addresses freely, including the default address. Prior orders are not affected because their shipping snapshots remain immutable.

### Wishlist Behavior
- **D-05:** Wishlist entries are product-level only. The wishlist must reload current catalog facts such as market availability, price, stock, and variant state when rendered instead of storing commercial snapshots.
- **D-06:** Customers may save products that are not available in the active market. The wishlist must clearly show the unavailable state and must not offer direct checkout until the product is eligible.
- **D-07:** Wishlist management appears in the account area, and customers can add or remove products through heart controls on product cards and product detail pages.
- **D-08:** Guests who use a wishlist heart are prompted to sign in and then return to the relevant product or wishlist context. Phase 6 does not create a guest wishlist or cart-like guest wishlist merge.

### Verified Reviews and Moderation
- **D-09:** A customer may have one public review per product. Later purchases do not create duplicate public reviews; the customer may update the existing review instead.
- **D-10:** Customer edits to a submitted review send the updated content back to pending moderation before it can become public again.
- **D-11:** Public reviews show a shortened or masked customer display plus a verified-purchase badge. Full customer email addresses must never be public.
- **D-12:** Each review may have one public admin reply. Admin can create, edit, or remove that reply. Phase 6 does not create threaded review conversations.

### Newsletter Consent and Unsubscribe
- **D-13:** Email is the primary identifier for newsletter subscription state. Store the latest locale and market preference plus consent history so visitors and signed-in customers can subscribe without requiring an account.
- **D-14:** Unsubscribe uses a one-click token from the email, then shows a localized confirmation page with the result and an option to subscribe again. Unsubscribe must not require sign-in.
- **D-15:** Admin can view, search, and filter subscriber status and consent history, but cannot override customer consent by manually subscribing or unsubscribing customers in v1.
- **D-16:** Newsletter consent evidence stores email, locale, market, consent source, timestamp, hashed or redacted IP/user-agent metadata, and unsubscribe token metadata. Avoid raw PII-heavy logs beyond what is needed for consent evidence.

### the agent's Discretion
- Exact database table names, enum names, action names, and route paths may be chosen during planning, provided the locked ownership, authorization, consent, and moderation behavior above is preserved.
- Exact bilingual copy, empty states, button labels, and compact admin list layouts may follow the existing account, catalog, admin, and email UI patterns.
- Exact review rating scale, review sorting, wishlist unavailable CTA wording, saved-address labels, and subscriber filter set may be chosen during UI specification/planning as long as they do not add new capabilities outside Phase 6.

### Deferred Ideas (OUT OF SCOPE)
None - discussion stayed within phase scope.
</user_constraints>

## Summary

Phase 6 should be planned as three additive domain slices plus a verification slice: customer saved addresses/wishlist, verified-purchase reviews, and newsletter consent/unsubscribe/admin inspection. The current codebase already has the foundations this phase must reuse: localized account routes, `requireUser`/`requireAdmin`, Supabase SSR/admin clients, immutable checkout shipping-address snapshots, quote material-change revalidation, transactional email outbox, hashed token patterns, masked email helpers, pgTAP database tests, and file-pattern security tests. [VERIFIED: codebase grep]

**Primary recommendation:** use the existing Next.js/Supabase modular monolith; add Phase 6 tables, RLS, server actions/route handlers, account/admin pages, and tests without adding new npm packages. [VERIFIED: package.json]

The biggest planning risks are not UI complexity; they are authorization and state semantics. Review eligibility must come from paid order lines, not browser flags. Wishlist rendering must hydrate current catalog facts, not stored price snapshots. Saved addresses must never mutate historical order snapshots. Newsletter unsubscribe must be unauthenticated but token-scoped, and admin subscriber screens must be read-only for consent state in v1. [VERIFIED: 06-CONTEXT.md]

## Project Constraints (from AGENTS.md)

- The storefront is bilingual Vietnamese/English with localized customer-facing taxonomy, products, blog/content, and SEO metadata. [VERIFIED: AGENTS.md]
- Vietnam and international markets have different availability, pricing, payment, currency, and shipping behavior. [VERIFIED: AGENTS.md]
- VND is used for Vietnam pricing and USD for international pricing. [VERIFIED: AGENTS.md]
- VietQR manual bank transfer and PayPal are the v1 payment methods. [VERIFIED: AGENTS.md]
- Digital fulfillment must never happen before full paid confirmation. [VERIFIED: AGENTS.md]
- Purchased PDFs use expiring, access-controlled links. [VERIFIED: AGENTS.md]
- Guest checkout remains required; Phase 6 account features must not make purchases require account creation. [VERIFIED: AGENTS.md]
- Mixed digital/physical carts remain supported. [VERIFIED: AGENTS.md]
- Physical inventory is explicitly admin-managed. [VERIFIED: AGENTS.md]
- Physical shipping/carrier handling is manual, with stored fees, status, and tracking. [VERIFIED: AGENTS.md]
- Public product/category/collection/blog pages must remain indexable with localized metadata. [VERIFIED: AGENTS.md]
- GSD workflow says do not make direct repo edits outside GSD; this research is the GSD phase-planning artifact requested by the orchestrator. [VERIFIED: AGENTS.md]
- Optional files `docs/ai/project-brief.md`, `docs/ai/domain-invariants.md`, and `docs/ai/task-playbooks.md` are missing, so downstream planning should use AGENTS.md and `.planning/*` as local authority. [VERIFIED: codebase grep]
- No project-local skills exist under `.codex/skills` or `.agents/skills`. [VERIFIED: codebase grep]

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ACC-03 | Customer can save, edit, and delete shipping addresses. | Use account-owned `customer_shipping_addresses` with one default, RLS owner policies, checkout copy-into-form, and existing shipping address validation/revalidation. [VERIFIED: REQUIREMENTS.md] [VERIFIED: codebase grep] |
| ACC-04 | Customer can add and remove products from a wishlist. | Use product-level `wishlist_items`, account-only server actions, current catalog hydration, and heart controls on cards/detail pages with sign-in return for guests. [VERIFIED: 06-CONTEXT.md] |
| REV-01 | Customer can review a product only when a paid order line proves purchase eligibility. | Gate submit/update through SQL/query eligibility over `checkout_orders`, `payments`/`order_payment_statuses`, and immutable `checkout_order_lines`; enforce one review per user/product. [VERIFIED: codebase grep] |
| REV-02 | Admin can approve, hide, and respond to product reviews. | Add review moderation states, one admin reply per review, protected admin queue/detail actions behind `requireAdmin`, and public display of approved reviews only. [VERIFIED: 06-CONTEXT.md] [VERIFIED: codebase grep] |
| NEWS-01 | Visitor can explicitly subscribe to the newsletter in Vietnamese or English. | Add localized public subscribe form using email as identifier; do not require auth; default unchecked/explicit opt-in. [VERIFIED: REQUIREMENTS.md] [CITED: https://resend.com/docs/knowledge-base/is-a-checkbox-required-for-email-consent] |
| NEWS-02 | System records consent source and timestamp and provides a secure unsubscribe link. | Add subscriber state, append-only consent events, hashed token metadata, redacted IP/user-agent metadata, and unauthenticated unsubscribe route. [VERIFIED: 06-CONTEXT.md] |
| NEWS-03 | Admin can view subscribers and their subscription status. | Add read-only admin subscriber screen with search/filter and consent history; v1 admin must not manually subscribe/unsubscribe. [VERIFIED: 06-CONTEXT.md] |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Saved address CRUD | API / Backend + Database | Browser / Client | Server actions and RLS own authorization; browser only renders forms and copies selected address into checkout state. [VERIFIED: codebase grep] |
| Saved address checkout selection | Browser / Client | API / Backend | Current checkout address state is a client component, but server quote refresh must own revalidation before accepted quote changes. [VERIFIED: codebase grep] |
| Wishlist heart controls | API / Backend + Database | Browser / Client | Mutations require signed-in user ownership; client controls are thin form/action or island UI. [VERIFIED: codebase grep] |
| Wishlist rendering | Frontend Server (SSR) | API / Backend | Account wishlist page should server-render current catalog facts for active locale/market. [VERIFIED: codebase grep] |
| Review eligibility | Database / Storage | API / Backend | Eligibility depends on paid order-line evidence and must be enforced in SQL/server code, not UI state. [VERIFIED: codebase grep] |
| Review moderation/replies | API / Backend + Database | Frontend Server (SSR) | Admin actions require `requireAdmin`; approved review display is public SSR read path. [VERIFIED: codebase grep] |
| Newsletter subscribe | API / Backend + Database | Browser / Client | Visitor form posts explicit consent; database records durable latest state and consent history. [VERIFIED: 06-CONTEXT.md] |
| Unsubscribe | API / Backend + Database | Frontend Server (SSR) | Token route must work without sign-in and update state atomically before rendering localized confirmation. [VERIFIED: 06-CONTEXT.md] |
| Subscriber admin inspection | Frontend Server (SSR) + API / Backend | Database | Admin screen is protected and read-only for consent state in v1. [VERIFIED: 06-CONTEXT.md] |

## Standard Stack

### Core

| Library / Platform | Project Version | Purpose | Why Standard |
|--------------------|-----------------|---------|--------------|
| Next.js App Router | `16.2.9` installed; registry latest `16.2.9`, modified 2026-06-20 | Localized account/admin/public routes, Server Actions, Route Handlers | Existing app and official docs support server-side auth/data boundaries. [VERIFIED: package.json] [VERIFIED: npm registry] [CITED: https://nextjs.org/docs/app/guides/data-security] |
| React | `19.2.7` installed; registry latest `19.2.7`, modified 2026-06-19 | UI components and client islands | Required by the current Next.js app. [VERIFIED: package.json] [VERIFIED: npm registry] |
| TypeScript | `5.9.3` installed | Type-safe domain/action inputs | Existing repo scripts enforce `tsc --noEmit`. [VERIFIED: package.json] |
| Supabase Postgres/Auth/RLS | Local CLI `2.106.0`; local Supabase running | Customer-owned data, reviews, newsletter consent, RLS, pgTAP tests | Existing schema, RLS, auth, and tests are Supabase-first. [VERIFIED: supabase status] |
| Resend | `6.14.0` installed; registry latest `6.14.0`, modified 2026-06-17 | Email delivery for unsubscribe links and future newsletter mail | Existing transactional outbox uses Resend; marketing subscribe/unsubscribe should reuse server-only email config patterns. [VERIFIED: package.json] [VERIFIED: npm registry] |

### Supporting

| Library | Project Version | Purpose | When to Use |
|---------|-----------------|---------|-------------|
| `@supabase/supabase-js` | `2.108.1` installed; registry latest `2.108.2`, modified 2026-06-19 | Supabase server/admin/browser clients | Reuse existing `createSupabaseServerClient` and `createSupabaseAdminClient`; no Phase 6 install needed. [VERIFIED: package.json] [VERIFIED: npm registry] |
| `@supabase/ssr` | `0.12.0` installed; registry latest `0.12.0`, modified 2026-06-09 | Cookie-based SSR auth | Existing server client uses this package. [VERIFIED: codebase grep] [VERIFIED: npm registry] |
| `next-intl` | `4.13.0` installed; registry latest `4.13.0`, modified 2026-06-05 | `/vi` and `/en` localized routes/messages | Extend current `src/i18n/routing.ts` for new account/newsletter/unsubscribe paths. [VERIFIED: codebase grep] [CITED: https://next-intl.dev/docs/routing/setup] |
| Zod | `4.4.3` installed; registry latest `4.4.3`, modified 2026-05-04 | Runtime validation | Use for server action forms: address, review, subscribe, unsubscribe token inputs. [VERIFIED: package.json] [VERIFIED: npm registry] |
| Vitest | `4.1.8` installed; registry latest `4.1.9`, modified 2026-06-15 | Unit tests | Add focused tests for masking, eligibility mapping, consent token hashing, and action result mapping. [VERIFIED: package.json] [VERIFIED: npm registry] |
| Playwright | `1.60.0` installed; registry latest `1.61.0`, modified 2026-06-20 | E2E tests | Add skipped/real phase contracts for account UX, public reviews, newsletter, and admin screens. [VERIFIED: package.json] [VERIFIED: npm registry] |
| `lucide-react` | `1.17.0` installed; registry latest `1.21.0`, modified 2026-06-18 | Icons | Use existing icon package for heart/badge/admin icons; no custom SVG needed. [VERIFIED: package.json] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Existing Supabase tables/RLS + server actions | Separate backend API service | Adds deployment and auth complexity contrary to the locked modular monolith. [VERIFIED: STACK.md] |
| Existing Resend/outbox patterns | Direct inline email sends | Loses retry/audit/idempotency behavior already established for transactional email. [VERIFIED: codebase grep] |
| Node `crypto` / Web Crypto hashing | New token package | No new package is needed; repo already hashes exception, guest, and download tokens with SHA-256. [VERIFIED: codebase grep] |
| Existing catalog queries for wishlist hydration | Stored wishlist price/title snapshots | Violates D-05 because wishlist must reload current catalog facts. [VERIFIED: 06-CONTEXT.md] |

**Installation:**

```bash
# No Phase 6 package install recommended.
```

**Version verification:** Project versions were checked with `package.json`, `npm view`, `node --version`, `npm --version`, `npx next --version`, `npx vitest --version`, `npx playwright --version`, and `supabase --version`. [VERIFIED: npm registry] [VERIFIED: codebase grep]

## Package Legitimacy Audit

Phase 6 should install no new external packages. [VERIFIED: package.json]

The package-legitimacy seam was run on the existing stack. It flagged many already-locked packages as `SUS` for "too-new" despite high downloads and source repositories; because these packages are already in `package-lock.json`, this is not a Phase 6 install blocker, but any dependency refresh should be a separate explicit checkpoint. [VERIFIED: npm registry]

| Package | Registry | Age / Currency Signal | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----------------------|-----------|-------------|---------|-------------|
| No new package | npm | — | — | — | OK | Approved: use existing dependencies only. [VERIFIED: package.json] |

**Packages removed due to [SLOP] verdict:** none. [VERIFIED: package-legitimacy]
**Packages flagged as suspicious [SUS]:** no new Phase 6 packages. Existing locked packages flagged as too-new by the seam: `next`, `react`, `@supabase/supabase-js`, `@supabase/ssr`, `next-intl`, `resend`, `vitest`, `@playwright/test`, `lucide-react`, `tailwindcss`. [VERIFIED: package-legitimacy]

## Architecture Patterns

### System Architecture Diagram

```text
--------------------+       +-------------------------+
| Public Storefront |       | Signed-in Account Area  |
| Product pages     |       | Addresses, wishlist     |
| Reviews, subscribe|       | Review entry points     |
+---------+----------+       +------------+------------+
          |                               |
          v                               v
+------------------------------------------------------+
| Next.js Server Actions / Route Handlers              |
| - requireUser for account mutations                  |
| - requireAdmin for moderation/subscriber inspection   |
| - unauthenticated token handler for unsubscribe       |
+-----------------------+------------------------------+
                        |
                        v
+------------------------------------------------------+
| Supabase Postgres + RLS                              |
| customer_shipping_addresses                          |
| wishlist_items -> current catalog facts              |
| product_reviews -> paid order-line eligibility       |
| review_admin_replies                                 |
| newsletter_subscribers + consent_events + tokens     |
+-----------------------+------------------------------+
                        |
          +-------------+--------------+
          v                            v
  Public approved review read   Resend / future newsletter
  path only                     email with unsubscribe token
```

### Recommended Project Structure

```text
src/
├── account/
│   ├── addresses.ts          # server-safe address queries/actions/helpers
│   └── wishlist.ts           # wishlist mutation + current catalog hydration helpers
├── reviews/
│   ├── eligibility.ts        # paid order-line eligibility checks
│   ├── actions.ts            # customer/admin review actions
│   └── queries.ts            # public approved + admin moderation queries
├── newsletter/
│   ├── consent.ts            # subscribe/unsubscribe state machine and token helpers
│   ├── actions.ts            # subscribe form action
│   └── admin-queries.ts      # read-only admin subscriber inspection
├── app/
│   ├── [locale]/account/addresses/
│   ├── [locale]/account/wishlist/
│   ├── [locale]/newsletter/unsubscribe/
│   └── admin/{reviews,newsletter}/
└── components/
    ├── account/
    ├── catalog/wishlist-heart.tsx
    ├── reviews/
    └── newsletter/
```

This proposed structure follows existing domain-adjacent folders such as `src/fulfillment`, `src/checkout`, `src/payments`, and existing `app/[locale]/account` and `app/admin` route surfaces. [VERIFIED: codebase grep]

### Pattern 1: Customer-Owned Tables with RLS

**What:** Address and wishlist tables should grant authenticated customer access only to rows where `user_id = auth.uid()`, while admin read/management uses `private.is_admin()` only where Phase 6 explicitly needs it. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] [VERIFIED: codebase grep]

**When to use:** `customer_shipping_addresses`, `wishlist_items`, customer-owned review rows before/after submission. [VERIFIED: 06-CONTEXT.md]

**Example:**

```sql
-- Source: existing checkout/fulfillment RLS pattern + Supabase RLS docs.
alter table public.customer_shipping_addresses enable row level security;

create policy "customer addresses are owner readable"
on public.customer_shipping_addresses
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "customer addresses are owner writable"
on public.customer_shipping_addresses
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
```

### Pattern 2: Partial Unique Default Address

**What:** Enforce one default address per customer with a partial unique index. [ASSUMED]

**When to use:** D-02 requires one default shipping address for v1. [VERIFIED: 06-CONTEXT.md]

**Example:**

```sql
-- Source: standard Postgres partial unique index pattern. [ASSUMED]
create unique index customer_shipping_addresses_one_default_idx
on public.customer_shipping_addresses(user_id)
where is_default;
```

Planner should add an implementation task that unsets other defaults in the same server-side transaction or RPC when a default address is saved. [ASSUMED]

### Pattern 3: Wishlist as Product References Only

**What:** Store only `user_id`, `product_id`, and timestamps; render current localized/market facts via catalog query helpers. [VERIFIED: 06-CONTEXT.md]

**When to use:** Account wishlist pages and product-card/detail heart state. [VERIFIED: 06-CONTEXT.md]

**Example:**

```typescript
// Source: existing account query shape in src/fulfillment/account-queries.ts. [VERIFIED: codebase grep]
export type WishlistItem = {
  productId: string;
  savedAt: string;
  title: string;
  available: boolean;
  priceMinor: number | null;
  currencyCode: 'VND' | 'USD' | null;
};
```

### Pattern 4: Review Eligibility from Paid Order Lines

**What:** Eligibility should be derived from immutable `checkout_order_lines` joined to an order/payment source where payment is paid/eligible and owner matches the reviewer. [VERIFIED: codebase grep]

**When to use:** Review create/update actions and tests for one public review per product. [VERIFIED: 06-CONTEXT.md]

**Example:**

```sql
-- Source: existing order line and order payment status projections. [VERIFIED: codebase grep]
select exists (
  select 1
  from public.checkout_order_lines line
  join public.order_payment_statuses ops on ops.order_id = line.order_id
  where ops.owner_user_id = auth.uid()
    and ops.fulfillment_gate_status = 'eligible'
    and line.product_id = p_product_id
);
```

Planner should decide whether to implement this as an RPC, a `security_invoker` view, or a server query helper. The security invariant is fixed: browser-provided eligibility must not be trusted. [VERIFIED: 06-CONTEXT.md] [CITED: https://nextjs.org/docs/app/guides/data-security]

### Pattern 5: Newsletter Consent State + Append-Only Events

**What:** Keep latest state in `newsletter_subscribers` and store every subscribe/unsubscribe/resubscribe event in `newsletter_consent_events`. [VERIFIED: 06-CONTEXT.md]

**When to use:** NEWS-01 through NEWS-03. [VERIFIED: REQUIREMENTS.md]

**Example:**

```sql
-- Source: Phase 6 context + existing append-only fulfillment audit trigger pattern. [VERIFIED: codebase grep]
create table public.newsletter_subscribers (
  email text primary key,
  status text not null check (status in ('subscribed', 'unsubscribed')),
  latest_locale text not null check (latest_locale in ('vi', 'en')),
  latest_market text check (latest_market in ('vn', 'intl')),
  updated_at timestamptz not null default now()
);

create table public.newsletter_consent_events (
  id uuid primary key default gen_random_uuid(),
  email text not null references public.newsletter_subscribers(email),
  event_type text not null check (event_type in ('subscribed', 'unsubscribed')),
  source text not null,
  ip_hash text,
  user_agent_redacted text,
  created_at timestamptz not null default now()
);
```

### Anti-Patterns to Avoid

- **Using `TO authenticated` without owner predicates:** This authorizes every signed-in user, not row ownership. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]
- **Using user-editable metadata for admin/customer authorization:** Existing project rules use server-managed roles and `private.is_admin()`. [VERIFIED: AGENTS.md] [VERIFIED: codebase grep]
- **Storing wishlist price snapshots:** Violates D-05 and risks market/currency leaks. [VERIFIED: 06-CONTEXT.md]
- **Publishing reviews immediately after edit:** Violates D-10; edited content must return to pending moderation. [VERIFIED: 06-CONTEXT.md]
- **Public full email display in reviews:** Violates D-11 and existing masking patterns. [VERIFIED: 06-CONTEXT.md] [VERIFIED: codebase grep]
- **Admin override of newsletter consent:** Violates D-15 for v1. [VERIFIED: 06-CONTEXT.md]
- **Raw IP/user-agent retention for newsletter consent:** D-16 requires hashed or redacted metadata. [VERIFIED: 06-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth/session ownership | Browser-side owner checks | `requireUser`, Supabase RLS, server actions | Existing app already centralizes auth guard behavior. [VERIFIED: codebase grep] |
| Admin authorization | Client-visible admin flags | `requireAdmin` + `private.is_admin()` policies | Project forbids user-editable metadata for admin authorization. [VERIFIED: AGENTS.md] |
| Form validation | Ad hoc string checks | Zod schemas and existing address schema | Existing checkout/auth/payment code uses Zod. [VERIFIED: codebase grep] |
| Token hashing | New token library or raw tokens in DB | Node `crypto` SHA-256 / generated high-entropy token helpers | Existing exception, guest, and download tokens use hash-only storage. [VERIFIED: codebase grep] |
| Email delivery retries | Inline Resend sends from page/action | Existing outbox/worker pattern where delivery matters | Existing transactional email durability and retry logic are established. [VERIFIED: codebase grep] |
| Market-aware wishlist pricing | Saved price/title JSON | Current catalog projections/query helpers | D-05 requires current catalog facts at render time. [VERIFIED: 06-CONTEXT.md] |

**Key insight:** Phase 6 features look like UI features, but their hard parts are durable state, authorization, and consent evidence; use the database and existing server boundaries as the authority. [VERIFIED: 06-CONTEXT.md] [VERIFIED: codebase grep]

## Common Pitfalls

### Pitfall 1: Saved Address Mutates Historical Evidence
**What goes wrong:** Editing a saved address changes old order destinations or admin fulfillment evidence. [VERIFIED: 06-CONTEXT.md]
**Why it happens:** Saved address is treated as an order address foreign key instead of a checkout convenience value. [ASSUMED]
**How to avoid:** Copy saved address into checkout form, then persist immutable `checkout_orders.shipping_address` snapshot only at checkout submit. [VERIFIED: codebase grep]
**Warning signs:** Orders reference `customer_shipping_addresses.id` as their shipping destination. [ASSUMED]

### Pitfall 2: Wishlist Leaks Wrong Market Price
**What goes wrong:** A customer sees a stale or wrong-market price from a saved wishlist row. [VERIFIED: 06-CONTEXT.md]
**Why it happens:** Wishlist stores commercial snapshots. [VERIFIED: 06-CONTEXT.md]
**How to avoid:** Store product references only and hydrate current locale/market facts on render. [VERIFIED: 06-CONTEXT.md]
**Warning signs:** `wishlist_items` contains `price_minor`, `currency_code`, `title`, or `stock` snapshot columns. [ASSUMED]

### Pitfall 3: Review Eligibility Is Checked in the Browser
**What goes wrong:** A customer submits a review for a product they never purchased. [VERIFIED: REQUIREMENTS.md]
**Why it happens:** Product page UI hides a form but the action does not re-check order-line evidence. [CITED: https://nextjs.org/docs/app/guides/data-security]
**How to avoid:** Server action or RPC must check paid order line eligibility and one-review uniqueness in the same write path. [VERIFIED: codebase grep]
**Warning signs:** Review action accepts `verifiedPurchase: true` from the client. [ASSUMED]

### Pitfall 4: Moderation Edits Stay Public
**What goes wrong:** A previously approved review remains public after the customer changes content. [VERIFIED: 06-CONTEXT.md]
**Why it happens:** Review status and content versioning are not updated together. [ASSUMED]
**How to avoid:** Customer update sets status back to `pending`, clears or supersedes approval metadata, and public queries select approved rows only. [VERIFIED: 06-CONTEXT.md]
**Warning signs:** Public product query reads all review rows and filters in React. [ASSUMED]

### Pitfall 5: Newsletter Unsubscribe Requires Sign-In
**What goes wrong:** A visitor cannot unsubscribe from a newsletter email without an account. [VERIFIED: 06-CONTEXT.md]
**Why it happens:** Unsubscribe is implemented as an account setting only. [ASSUMED]
**How to avoid:** Tokenized unsubscribe route works anonymously, consumes/records the token event, and renders localized result. [VERIFIED: 06-CONTEXT.md]
**Warning signs:** `/newsletter/unsubscribe` calls `requireUser`. [ASSUMED]

### Pitfall 6: Consent Evidence Becomes PII Logging
**What goes wrong:** Raw IPs, full user-agent strings, or token material are retained unnecessarily. [VERIFIED: 06-CONTEXT.md]
**Why it happens:** Consent audit is conflated with debug logging. [ASSUMED]
**How to avoid:** Store email, locale, market, source, timestamp, token metadata, and hashed/redacted request metadata only. [VERIFIED: 06-CONTEXT.md]
**Warning signs:** Consent tables contain `raw_ip`, `raw_user_agent`, `raw_token`, or request header dumps. [ASSUMED]

## Code Examples

### Server Action Must Authorize Internally

```typescript
// Source: existing requireUser/requireAdmin pattern + Next.js data-security docs.
export async function saveAddressAction(formData: FormData) {
  'use server';
  const user = await requireUser({locale: 'en', next: '/account/addresses'});
  const parsed = shippingAddressSchema.safeParse({
    recipientName: formData.get('recipientName'),
    phoneNumber: formData.get('phoneNumber'),
    countryCode: formData.get('countryCode')
  });
  if (!parsed.success) return {status: 'invalid' as const};
  // Write with user.id as server-owned owner value; never accept user_id from the form.
}
```

### Public Reviews Query Only Approved Rows

```sql
-- Source: Phase 6 moderation decision. [VERIFIED: 06-CONTEXT.md]
create or replace view public.product_review_summaries
with (security_invoker = true)
as
select product_id, rating, body, public_display_name, approved_at
from public.product_reviews
where status = 'approved';
```

### Newsletter Unsubscribe Token Storage

```typescript
// Source: existing guest/download token helper pattern. [VERIFIED: codebase grep]
import {createHash, randomBytes} from 'node:crypto';

export function createNewsletterToken() {
  return randomBytes(32).toString('hex');
}

export function hashNewsletterToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Supabase Auth Helpers for SSR | `@supabase/ssr` server/browser clients | Project already uses `@supabase/ssr` | Do not introduce legacy helpers. [VERIFIED: codebase grep] |
| RLS-bypassing views by default | `WITH (security_invoker = true)` for exposed views | Supabase/Postgres docs support this for RLS-respecting views | Use for public/customer projections that should respect caller policies. [CITED: https://supabase.com/docs/guides/database/tables#view-security] |
| Inline email send | Transactional outbox + worker + retry state | Phase 5 implementation | Newsletter operational email should reuse or deliberately extend this pattern. [VERIFIED: codebase grep] |
| Customer identity exposed in reviews | Masked display + verified badge | Phase 6 decision | Public email addresses never render. [VERIFIED: 06-CONTEXT.md] |

**Deprecated/outdated:**
- Supabase Auth Helpers: do not add; project uses `@supabase/ssr`. [VERIFIED: codebase grep]
- `auth.role()`-style policy checks: avoid; prefer `TO authenticated` plus owner predicates. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]
- Admin controls based on user-editable metadata: forbidden by project stack constraints. [VERIFIED: AGENTS.md]

## Open Questions

1. **Review rating scale**
   - What we know: the user left rating scale to agent discretion. [VERIFIED: 06-CONTEXT.md]
   - What's unclear: whether ratings are 1-5 stars, text-only, or optional text with rating. [VERIFIED: 06-CONTEXT.md]
   - Recommendation: planner should use a conventional 1-5 integer rating with optional moderated body unless UI spec decides otherwise. [ASSUMED]

2. **Newsletter confirmation email**
   - What we know: subscribe and unsubscribe consent state are required; explicit subscribe in either language is required. [VERIFIED: REQUIREMENTS.md]
   - What's unclear: whether v1 sends a welcome/confirmation email immediately after subscribe. [ASSUMED]
   - Recommendation: store consent and show localized success; send a welcome email only if it can reuse the outbox without delaying core consent requirements. [ASSUMED]

3. **Admin subscriber data masking**
   - What we know: admin can inspect subscriber status and consent history but cannot override consent. [VERIFIED: 06-CONTEXT.md]
   - What's unclear: whether admin needs full email display or masked display in list view. [ASSUMED]
   - Recommendation: list view can show email for operational search, but source/user-agent/IP metadata should stay redacted/hashed. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Next.js, Vitest, scripts | yes | `v20.19.4` | Project STACK recommends Node 22 LTS, but installed Node satisfies Next.js 16 minimum stated in STACK. [VERIFIED: shell] [VERIFIED: STACK.md] |
| npm | package scripts | yes | `10.8.1` | — [VERIFIED: shell] |
| Next.js CLI | dev/build | yes | `16.2.9` | — [VERIFIED: shell] |
| Vitest | unit tests | yes | `4.1.8` | — [VERIFIED: shell] |
| Playwright | E2E tests | yes | `1.60.0` | — [VERIFIED: shell] |
| Supabase CLI | migrations/db tests/types | yes | `2.106.0`; `2.107.0` available | Use installed CLI; update separately if planner needs latest CLI behavior. [VERIFIED: shell] |
| Local Supabase services | db reset, pgTAP, RLS tests | yes | API `127.0.0.1:55431`, DB `127.0.0.1:55432` | — [VERIFIED: supabase status] |
| Resend runtime config | live email sends | unknown for production; `.env.example` defines variables | — | Unit tests can mock sender; live newsletter sends require `RESEND_API_KEY` and `RESEND_FROM_EMAIL`. [VERIFIED: .env.example] |

**Missing dependencies with no fallback:**
- None for planning and local automated tests. [VERIFIED: shell]

**Missing dependencies with fallback:**
- Context7 docs lookup is unavailable (`ctx7` not installed and MCP tool not exposed); official docs/web fallback was used. [VERIFIED: shell]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `4.1.8`, Playwright `1.60.0`, Supabase pgTAP via `supabase test db`, Node `node --test` security harness. [VERIFIED: package.json] |
| Config file | `vitest.config.ts`, `playwright.config.ts`, `supabase/config.toml`, `package.json` scripts. [VERIFIED: codebase grep] |
| Quick run command | `npm run test:unit` [VERIFIED: package.json] |
| Full suite command | `npm run lint && npm run typecheck && npm run test:unit && npm run db:reset && npm run db:lint && npm run db:test && npm run db:types && git diff --exit-code src/types/supabase.ts && npm run build && npm run test:security && npm run test:e2e` [VERIFIED: package.json] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| ACC-03 | Address CRUD, ownership, one default, checkout copy + quote revalidation | unit + db + e2e | `npm run test:unit -- tests/unit/account/addresses.test.ts`; `npm run db:test`; `npm run test:e2e -- tests/e2e/account-retention.spec.ts` | no, Wave 0 gap [VERIFIED: codebase grep] |
| ACC-04 | Wishlist add/remove, account-only, unavailable-market display | unit + db + e2e | `npm run test:unit -- tests/unit/account/wishlist.test.ts`; `npm run db:test`; `npm run test:e2e -- tests/e2e/account-retention.spec.ts` | no, Wave 0 gap [VERIFIED: codebase grep] |
| REV-01 | Paid order-line eligibility and one review per product | db + unit | `npm run db:test`; `npm run test:unit -- tests/unit/reviews/eligibility.test.ts` | no, Wave 0 gap [VERIFIED: codebase grep] |
| REV-02 | Admin approve/hide/reply, public approved-only display, masked identity | db + unit + e2e + security | `npm run db:test`; `npm run test:security`; `npm run test:e2e -- tests/e2e/reviews.spec.ts` | no, Wave 0 gap [VERIFIED: codebase grep] |
| NEWS-01 | Localized explicit subscribe without account | unit + e2e | `npm run test:unit -- tests/unit/newsletter/consent.test.ts`; `npm run test:e2e -- tests/e2e/newsletter.spec.ts` | no, Wave 0 gap [VERIFIED: codebase grep] |
| NEWS-02 | Consent history, tokenized unsubscribe, redacted evidence | db + unit + security + e2e | `npm run db:test`; `npm run test:security`; `npm run test:e2e -- tests/e2e/newsletter.spec.ts` | no, Wave 0 gap [VERIFIED: codebase grep] |
| NEWS-03 | Admin read/search/filter status without override mutation | unit + e2e + security | `npm run test:unit -- tests/unit/newsletter/admin.test.ts`; `npm run test:e2e -- tests/e2e/admin-newsletter.spec.ts`; `npm run test:security` | no, Wave 0 gap [VERIFIED: codebase grep] |

### Sampling Rate

- **Per task commit:** `npm run test:unit` plus the touched domain's targeted db/security test if schema/security changed. [VERIFIED: package.json]
- **Per wave merge:** `npm run db:reset && npm run db:test && npm run test:security` for schema/security waves; add relevant Playwright spec for UI waves. [VERIFIED: package.json]
- **Phase gate:** full `npm run ci` or the expanded full suite command before `$gsd-verify-work`. [VERIFIED: package.json]

### Wave 0 Gaps

- [ ] `supabase/tests/database/06_customer_retention.test.sql` — covers address/wishlist model, RLS, review eligibility, moderation, newsletter consent, unsubscribe token constraints. [VERIFIED: codebase grep]
- [ ] `tests/unit/account/addresses.test.ts` — covers address validation mapping, default behavior result mapping, checkout copy shape. [VERIFIED: codebase grep]
- [ ] `tests/unit/account/wishlist.test.ts` — covers product-level save/remove and unavailable-market mapping. [VERIFIED: codebase grep]
- [ ] `tests/unit/reviews/eligibility.test.ts` — covers paid-order-line eligibility and edit-to-pending behavior. [VERIFIED: codebase grep]
- [ ] `tests/unit/newsletter/consent.test.ts` — covers subscribe/unsubscribe state machine, token hashing, redaction, and no admin override. [VERIFIED: codebase grep]
- [ ] `tests/security/retention-boundaries.test.mjs` — rejects full public emails, raw IP/user-agent, raw tokens, token hashes, service-role use in public/customer UI, and admin override actions. [VERIFIED: codebase grep]
- [ ] `tests/e2e/account-retention.spec.ts`, `tests/e2e/reviews.spec.ts`, `tests/e2e/newsletter.spec.ts`, `tests/e2e/admin-newsletter.spec.ts` — browser contracts for Phase 6 user/admin flows. [VERIFIED: codebase grep]

## Security Domain

Security enforcement is enabled in `.planning/config.json`; ASVS Level 1 is configured. [VERIFIED: codebase grep]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | `requireUser` for account address/wishlist/review customer mutations; unsubscribe remains token-authenticated and unauthenticated by design. [VERIFIED: codebase grep] |
| V3 Session Management | yes | Existing Supabase SSR cookies and server-side `getClaims`/`getUser`; do not expose service/secret keys to browser. [VERIFIED: codebase grep] |
| V4 Access Control | yes | Supabase RLS owner predicates, `requireAdmin`, `private.is_admin()`, approved-only public reviews, read-only admin subscriber consent. [VERIFIED: codebase grep] |
| V5 Input Validation | yes | Zod schemas for action inputs; SQL constraints/checks for enums/status/token hashes. [VERIFIED: codebase grep] |
| V6 Cryptography | yes | High-entropy tokens and SHA-256 hashes for unsubscribe links; never store raw token material. [VERIFIED: codebase grep] |
| V7 Error Handling and Logging | yes | Generic unsubscribe/review/action errors; no raw PII or token data in logs/payloads. [VERIFIED: PITFALLS.md] |
| V8 Data Protection | yes | Mask public review identity, redact/hash consent metadata, protect customer-owned rows with RLS. [VERIFIED: 06-CONTEXT.md] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR/BOLA on addresses, wishlist, reviews | Elevation of Privilege | RLS owner predicates plus server-owned `user.id`; tests as customer A, customer B, admin, anon. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |
| Fake verified review | Spoofing | SQL/server eligibility derived from paid order lines; unique `(user_id, product_id)` review index. [VERIFIED: 06-CONTEXT.md] |
| Moderation bypass | Information Disclosure | Public query/view selects only approved reviews and masked identity. [VERIFIED: 06-CONTEXT.md] |
| Newsletter unsubscribe token replay/guessing | Tampering | High-entropy token, hash-only DB storage, expiry or consumed metadata, generic result page. [VERIFIED: codebase grep] |
| Admin consent override | Tampering | No admin subscribe/unsubscribe actions in v1; security test should reject such action exports/UI controls. [VERIFIED: 06-CONTEXT.md] |
| PII-heavy consent logs | Information Disclosure | Hash/redact IP/user-agent; never persist raw request dumps or raw tokens. [VERIFIED: 06-CONTEXT.md] |

## Sources

### Primary (HIGH confidence)

- `.planning/phases/06-customer-retention-and-trust/06-CONTEXT.md` - locked Phase 6 decisions, discretion, and deferred scope. [VERIFIED: codebase grep]
- `.planning/REQUIREMENTS.md` - Phase 6 requirement IDs and descriptions. [VERIFIED: codebase grep]
- `.planning/ROADMAP.md` - Phase 6 goal, plans, success criteria, dependency on Phase 5. [VERIFIED: codebase grep]
- `.planning/research/STACK.md`, `.planning/research/ARCHITECTURE.md`, `.planning/research/PITFALLS.md`, `.planning/research/FEATURES.md` - stack/architecture/pitfall/feature constraints. [VERIFIED: codebase grep]
- `src/auth/guards.ts`, `src/lib/supabase/*.ts`, `src/checkout/*`, `src/fulfillment/*`, `src/payments/*`, `supabase/migrations/*`, `tests/*` - current implementation surfaces and reusable patterns. [VERIFIED: codebase grep]

### Secondary (MEDIUM confidence)

- https://supabase.com/docs/guides/database/postgres/row-level-security - RLS guidance and policy model. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]
- https://supabase.com/docs/guides/database/tables#view-security - view security and `security_invoker`. [CITED: https://supabase.com/docs/guides/database/tables#view-security]
- https://supabase.com/docs/guides/database/functions - function security invoker/definer guidance. [CITED: https://supabase.com/docs/guides/database/functions]
- https://nextjs.org/docs/app/guides/data-security - Server Actions/data security guidance. [CITED: https://nextjs.org/docs/app/guides/data-security]
- https://next-intl.dev/docs/routing/setup - localized routing setup. [CITED: https://next-intl.dev/docs/routing/setup]
- https://resend.com/docs/knowledge-base/is-a-checkbox-required-for-email-consent - explicit opt-in guidance. [CITED: https://resend.com/docs/knowledge-base/is-a-checkbox-required-for-email-consent]
- https://resend.com/docs/dashboard/emails/receive-email/unsubscribe-from-emails - unsubscribe headers guidance. [CITED: https://resend.com/docs/dashboard/emails/receive-email/unsubscribe-from-emails]
- https://owasp.org/www-project-application-security-verification-standard/ - ASVS project. [CITED: https://owasp.org/www-project-application-security-verification-standard/]

### Tertiary (LOW confidence)

- Context7 research provider was selected by the seam but unavailable locally; official web fallback was used and cached with provider `webfetch`/`websearch`. [VERIFIED: research-plan seam]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Use a conventional 1-5 integer review rating unless UI spec decides otherwise. | Open Questions | Planner may choose a rating model the owner dislikes. |
| A2 | Partial unique index is the right implementation for one default address. | Architecture Patterns | Could need trigger/RPC if bulk default changes are complex. |
| A3 | Admin subscriber list may show full email for operational search while masking metadata. | Open Questions | Privacy preference may require masked list display. |
| A4 | Subscribe success need not send a welcome email in v1. | Open Questions | Owner may expect immediate email confirmation. |
| A5 | Warning-sign examples such as forbidden column names are heuristic checks. | Common Pitfalls | Security test regexes may need tuning to avoid false positives. |

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - project dependencies, scripts, and versions were read locally and npm registry versions were checked. [VERIFIED: package.json] [VERIFIED: npm registry]
- Architecture: HIGH - Phase 6 decisions and existing code surfaces are concrete and aligned. [VERIFIED: 06-CONTEXT.md] [VERIFIED: codebase grep]
- Pitfalls: HIGH for local constraints; MEDIUM for external docs due Context7 unavailability. [VERIFIED: PITFALLS.md] [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]
- Validation: HIGH - test scripts and existing test directories are present; Phase 6 files are missing and listed as Wave 0 gaps. [VERIFIED: package.json] [VERIFIED: codebase grep]

**Research date:** 2026-06-20
**Valid until:** 2026-07-20 for local architecture; re-check official package and Supabase/Next/Resend docs within 7 days before dependency upgrades or production newsletter sending. [ASSUMED]
