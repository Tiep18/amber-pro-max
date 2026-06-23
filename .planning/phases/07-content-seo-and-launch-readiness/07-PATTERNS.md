# Phase 07: Content, SEO, and Launch Readiness - Pattern Map

**Mapped:** 2026-06-23
**Files analyzed:** 36 planned new/modified file groups
**Analogs found:** 35 / 36

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/migrations/*_content_seo_launch.sql` | migration | CRUD + request-response + transform | `supabase/migrations/20260612230000_market_catalog.sql`, `20260620102618_customer_retention_trust.sql`, `20260615034000_trusted_payments_orders.sql` | exact |
| `src/content/blog/schemas.ts` | model | transform | `src/catalog/schemas.ts`, `src/reviews/actions.ts` | role-match |
| `src/content/blog/publish-checks.ts` | utility | transform | `src/catalog/publish-checks.ts` | exact |
| `src/content/blog/actions.ts` | service | CRUD + request-response | `src/catalog/actions.ts`, `src/reviews/actions.ts` | exact |
| `src/content/blog/queries.ts` | service | public query projection | `src/reviews/queries.ts`, `src/catalog/queries.ts` | exact |
| `src/app/admin/blog/page.tsx` | route | request-response | `src/app/admin/reviews/page.tsx`, `src/app/admin/newsletter/page.tsx` | exact |
| `src/app/admin/blog/[postId]/page.tsx` | route | request-response | `src/app/admin/catalog/[productId]/page.tsx` | role-match |
| `src/components/admin/blog/blog-post-form.tsx` | component | CRUD + request-response | `src/components/admin/catalog/product-form.tsx` | exact |
| `src/app/[locale]/blog/page.tsx` and alias route | route | public query projection | `src/app/[locale]/category/[categorySlug]/page.tsx` | role-match |
| `src/app/[locale]/blog/[postSlug]/page.tsx` and alias route | route | public query projection + metadata | `src/app/[locale]/product/[productSlug]/page.tsx` | exact |
| `src/content/seo/metadata.ts` | utility | transform | `src/catalog/metadata.ts` | exact |
| `src/content/seo/json-ld.tsx` | component/utility | transform | no existing JSON-LD helper | no analog |
| `src/app/sitemap.xml/route.ts` or `src/app/sitemap.ts` | route | public query projection | `src/catalog/metadata.ts`, product/category metadata routes | partial |
| `src/app/robots.ts` | route/config | request-response | no existing robots route; use Next convention from research | no analog |
| `src/policies/schemas.ts` | model | transform | `src/catalog/schemas.ts` | role-match |
| `src/policies/publish-checks.ts` | utility | transform | `src/catalog/publish-checks.ts` | exact |
| `src/policies/actions.ts` | service | CRUD + request-response | `src/catalog/actions.ts`, `src/reviews/actions.ts` | exact |
| `src/policies/queries.ts` | service | public query projection | `src/reviews/queries.ts`, `src/newsletter/admin-queries.ts` | exact |
| `src/app/admin/policies/page.tsx` | route | request-response | `src/app/admin/reviews/page.tsx` | exact |
| `src/components/admin/policies/policy-form.tsx` | component | CRUD + request-response | `src/components/admin/catalog/product-form.tsx` | exact |
| `src/app/[locale]/policies/[policySlug]/page.tsx` and localized aliases | route | public query projection + metadata | `src/app/[locale]/product/[productSlug]/page.tsx` | exact |
| `src/operations/errors.ts` | service | event-driven + CRUD | `src/payments/paypal/logging.ts`, `src/payments/queries.ts` | role-match |
| `src/operations/redaction.ts` | utility | transform | `src/payments/paypal/logging.ts`, `src/payments/queries.ts` | exact |
| `src/operations/admin-queries.ts` | service | CRUD | `src/newsletter/admin-queries.ts` | exact |
| `src/app/admin/operations/page.tsx` | route | request-response | `src/app/admin/newsletter/page.tsx` | exact |
| `src/components/admin/operations/error-queue.tsx` | component | CRUD + request-response | `src/components/admin/fulfillment/failed-email-queue.tsx`, `src/components/admin/reviews/review-moderation-list.tsx` | exact |
| `src/launch/settings.ts` | service/model | CRUD + transform | `src/newsletter/admin-queries.ts`, `src/reviews/actions.ts` | role-match |
| `src/launch/gates.ts` | utility | transform | `src/catalog/publish-checks.ts` | role-match |
| `src/app/admin/launch/page.tsx` | route | request-response | `src/app/admin/newsletter/page.tsx` | exact |
| `src/components/admin/launch/launch-checklist.tsx` | component | CRUD + request-response | `src/components/admin/reviews/review-moderation-list.tsx` | role-match |
| `src/app/admin/page.tsx` | route/component | request-response + dashboard projection | `src/app/admin/page.tsx`, `src/app/admin/orders/page.tsx` | modify existing |
| `src/app/admin/layout.tsx` | route/component | request-response | `src/app/admin/layout.tsx` | modify existing |
| `src/components/site-footer.tsx` / `site-header.tsx` | component | request-response | existing same files | modify existing |
| `tests/unit/content/*.test.ts` | test | transform + request-response | `tests/unit/catalog/publish-checks.test.ts`, `tests/unit/reviews/eligibility.test.ts` | exact |
| `tests/unit/operations/*.test.ts` | test | transform + CRUD | `tests/unit/newsletter/admin.test.ts`, `tests/unit/payments/paypal-logging.test.ts` | exact |
| `tests/e2e/*seo*.spec.ts`, `admin-dashboard.spec.ts`, `policies.spec.ts` | test | request-response | `tests/e2e/catalog-detail-seo.spec.ts`, `tests/e2e/admin-newsletter.spec.ts` | exact |
| `tests/security/content-boundaries.test.mjs`, `operations-boundaries.test.mjs` | test | static boundary scan | `tests/security/retention-boundaries.test.mjs`, `tests/security/payment-boundaries.test.mjs` | exact |

## Pattern Assignments

### Blog Database and RLS

**Analog:** `supabase/migrations/20260612230000_market_catalog.sql`

**RLS/admin policy pattern** (lines 431-450, 522-532, 737-745):
```sql
alter table public.products enable row level security;
alter table public.product_translations enable row level security;
...
create or replace function public.catalog_publish_issues(target_product_id uuid)
...
revoke all on function public.catalog_publish_issues(uuid) from public;
revoke all on function public.catalog_publish_issues(uuid) from anon;
grant execute on function public.catalog_publish_issues(uuid) to authenticated;
```

Use this for blog/policy base tables, translation tables, taxonomy join tables, related-product joins, and publish RPCs. Keep publish checks callable only to authenticated admins through `private.is_admin()` inside the function/RLS path, not as public inspection.

**Public projection pattern** (from `supabase/migrations/20260612232000_market_catalog_queries.sql` lines 36 and 260):
```sql
create or replace function public.list_catalog_products(...)
create or replace function public.get_catalog_product_by_slug(p_locale text, p_market text, p_slug text)
```

Create public blog/policy projection functions or views that only return rows satisfying `status = 'published'` and `published_at <= now()`. Do not query raw draft/admin tables from public pages.

### Blog and Policy Publish Blockers

**Analog:** `src/catalog/publish-checks.ts`

**Issue mapping pattern** (lines 1-57):
```typescript
export type PublishBlocker = {
  code: PublishBlockerCode;
  group: PublishBlockerGroup;
  field: string;
  locale?: CatalogLocale;
  marketCode?: MarketCode;
};

export function mapPublishIssues(issues: DatabasePublishIssue[]): PublishBlocker[] {
  return issues.map((issue) => {
    if (!isPublishIssueCode(issue.issue_code)) {
      return {code: 'publish_requirement', group: 'general', field: 'product'};
    }
```

Copy this shape for `blog_publish_issues` and `policy_publish_issues`: stable issue codes, locale-aware blockers, generic fallback for unknown DB detail. Do not surface raw `detail` text.

**Admin UI blocker pattern** from `src/components/admin/catalog/product-form.tsx` (lines 62-78, 188-201):
```tsx
function blockerLabel(code: string, locale?: CatalogLocale) {
  const prefix = locale === 'vi' ? 'Vietnamese ' : locale === 'en' ? 'English ' : '';
  ...
}

{result?.status === 'blocked' ? (
  <Alert variant="warning">
    <AlertTitle>Publishing blocked</AlertTitle>
    <ul>
      {result.issues.map((issue) => <li>{blockerLabel(issue.code, issue.locale)}</li>)}
    </ul>
  </Alert>
) : null}
```

Blog publish blockers must include missing category and missing localized slug/title/description/social image for both `vi` and `en`. Policy blockers must include policy kind plus localized content/SEO/social fields.

### Admin Server Actions

**Analog:** `src/reviews/actions.ts`

**Imports and validation pattern** (lines 1-41, 100-139):
```typescript
'use server';

import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {requireAdmin, requireUser} from '@/auth/guards';

const moderationInputSchema = z.object({
  reviewId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  expectedStatus: reviewStatusSchema
});

const parsed = moderationInputSchema.safeParse(input);
if (!parsed.success) {
  return {status: 'invalid', code: 'invalid_review_admin_action'};
}
```

**Authorization and revalidation pattern** (lines 143-150):
```typescript
async function getAdminRpcClient() {
  await requireAdmin();
  return await createSupabaseServerClient() as unknown as RpcClient;
}

function revalidateReviewSurfaces() {
  revalidatePath('/admin/reviews');
  revalidatePath('/en/product/[productSlug]', 'page');
  revalidatePath('/vi/san-pham/[productSlug]', 'page');
}
```

Use `requireAdmin()` before creating privileged clients for blog/policy/launch/operations mutations. Return typed states such as `invalid`, `blocked`, `stale`, `forbidden`, `error`; never return DB exception text.

### Admin Pages and Queues

**Analog:** `src/app/admin/reviews/page.tsx`

**Protected page pattern** (lines 1-25):
```tsx
import {requireAdmin} from '@/auth/guards';

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage({searchParams}: {searchParams: SearchParams}) {
  await requireAdmin({next: '/admin/reviews'});
  const status = reviewStatus((await searchParams).status);
  const result = await getAdminProductReviews({status});
```

Apply to `/admin/blog`, `/admin/policies`, `/admin/operations`, `/admin/launch`, and the upgraded `/admin` dashboard. Admin pages must authorize before loading counts or queue rows.

**Queue UI pattern** from `src/components/admin/reviews/review-moderation-list.tsx` (lines 15-41, 48-89):
```tsx
<Card>
  <CardHeader>
    <CardTitle>Review moderation</CardTitle>
    <div className="flex flex-wrap gap-2" aria-label="Review status filter">
      <Link aria-current={active ? 'page' : undefined} ...>{filter.label}</Link>
    </div>
  </CardHeader>
  <CardContent>
    {reviews.length === 0 ? <p>No reviews match this filter.</p> : (
      <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
```

Use one top-level `Card`; rows inside are bordered/divided list items, not nested cards. This matches the Phase 07 UI-SPEC.

### Admin Query Helpers

**Analog:** `src/newsletter/admin-queries.ts`

**Server-only + injected auth pattern** (lines 1-18, 119-157):
```typescript
import 'server-only';

import {createSupabaseAdminClient} from '@/lib/supabase/admin';

export async function getAdminNewsletterSubscribers({
  client,
  requireAdmin,
  filters
}: {
  client: QueryClient;
  requireAdmin: RequireAdmin;
  filters?: AdminNewsletterFilters;
}): Promise<AdminNewsletterResult> {
  await requireAdmin();
  const normalized = normalizeFilters(filters);
```

Copy for admin dashboard counts, operational error queue, blog drafts/scheduled posts, policy readiness, and launch settings. Keep `requireAdmin` injectable for unit tests, but call real `requireAdmin` from route pages.

### Public Localized Metadata and Pages

**Analog:** `src/catalog/metadata.ts`

**Metadata helper pattern** (lines 1-46):
```typescript
export function localizedMetadata({
  title,
  description,
  canonicalPath,
  alternatePaths,
  socialImage
}: {...}): Metadata {
  const base = siteUrl();
  const canonical = new URL(canonicalPath, base).toString();
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        vi: new URL(alternatePaths.vi, base).toString(),
        en: new URL(alternatePaths.en, base).toString()
      }
    },
```

Extend this pattern for blog, policy, category, collection, sitemap, robots, Organization/WebSite, Article, Product, and Breadcrumb data. Alternates must be built from actual localized slugs, not static route guesses.

**Page metadata + notFound pattern** from `src/app/[locale]/product/[productSlug]/page.tsx` (lines 72-92, 95-106):
```tsx
export async function generateMetadata({params}: {params: Params}): Promise<Metadata> {
  const {locale, productSlug} = await params;
  const product = await getCatalogProductBySlug({locale, market, slug: productSlug});
  if (!product) return {};
  const slugs = localizedSlugs(product.localized_slugs);
  if (!slugs.vi || !slugs.en) return {};
  return localizedMetadata({...});
}

export default async function ProductPage({params}: {params: Params}) {
  const {locale, productSlug} = await params;
  setRequestLocale(locale);
  ...
  if (!product) notFound();
```

Blog and policy detail pages should use this exact flow: load public projection by locale slug, return empty metadata for missing records, call `setRequestLocale`, and `notFound()` for non-public/draft/future rows.

### Public SEO Tests

**Analog:** `tests/e2e/catalog-detail-seo.spec.ts`

**Canonical/hreflang/social pattern** (lines 26-42):
```typescript
await page.goto('/en/product/both-market-bear');
await expect(page).toHaveTitle('Both-market bear');
await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
  'href',
  'http://127.0.0.1:3210/en/product/both-market-bear'
);
await expect(page.locator('link[rel="alternate"][hreflang="vi"]')).toHaveAttribute(
  'href',
  'http://127.0.0.1:3210/vi/san-pham/gau-ca-hai'
);
```

Add equivalent tests for blog, policy, sitemap index/localized sitemaps, robots, JSON-LD, and admin/private noindex exclusions.

### Sanitized Operational Errors

**Analog:** `src/payments/paypal/logging.ts`

**Sanitizer pattern** (lines 1-21, 37-80):
```typescript
type PayPalLogValue = string | number | boolean | null | undefined | PayPalLogValue[] | {[key: string]: PayPalLogValue};

export function logPayPalStage(stage: string, metadata: Record<string, PayPalLogValue> = {}, level: PayPalLogLevel = 'info') {
  const safeMetadata = Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined));
  const serializedMetadata = JSON.stringify(safeMetadata, null, 2);
  ...
}

export function sanitizePayPalProviderOrderForLog(providerOrder: unknown): Record<string, PayPalLogValue> {
  if (!isRecord(providerOrder)) return {providerOrderShape: 'non_object'};
  ...
  return {providerOrderId, providerOrderStatus, purchaseUnits: ...};
}
```

Operational errors must be sanitized before insert and before display. Keep diagnostic facts such as area, status, code, provider/order IDs, timestamps, and amounts; drop emails unless masked, full addresses, tokens, signatures, raw payloads, signed URLs, stack traces, and provider secrets.

**DB constraint pattern** from `supabase/migrations/20260615034000_trusted_payments_orders.sql` (lines 75, 94, 176, 529-544):
```sql
sanitized_facts jsonb not null default '{}'::jsonb check (jsonb_typeof(sanitized_facts) = 'object')
...
if not private.payment_safe_json(new.sanitized_facts) then
  raise exception ...
end if;
```

Use a `private.operational_error_safe_json(...)` constraint/trigger for operational error records, not UI-only masking.

**Admin display pattern** from `src/components/admin/fulfillment/failed-email-queue.tsx` (lines 9-18, 39):
```tsx
<p className="text-sm text-[var(--muted-foreground)]">
  Sanitized transactional email recovery. Sensitive provider details and tokens are not shown.
</p>
...
<dd>{email.sanitizedError}</dd>
```

The operations queue should explicitly render sanitized fields only.

### RLS Patterns

**Analog:** `supabase/migrations/20260619085118_fulfillment_purchase_access.sql`

**Owner/admin split** (lines 197-231):
```sql
alter table public.digital_entitlements enable row level security;
...
create policy "digital entitlements are owner readable" on public.digital_entitlements
for select to authenticated using (owner_user_id = (select auth.uid()));
create policy "digital entitlements are admin managed" on public.digital_entitlements
for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "email outbox is admin managed" on public.transactional_email_outbox
for all to authenticated using (private.is_admin()) with check (private.is_admin());
```

For Phase 07: blog/policy admin tables are admin-managed; public reads must go through narrow published projections; operational errors and launch settings are admin-only; no raw private table should be granted broad anon access.

### Unit and Security Tests

**Analog:** `tests/unit/catalog/publish-checks.test.ts`

**Publish blocker tests** (lines 94-151, 157-204):
```typescript
describe('publish issue mapping', () => {
  it('maps database issue codes to stable field and workflow groups', () => {
    expect(mapPublishIssues([...])).toEqual([...]);
  });

  it('maps unknown database codes to a generic blocker without raw details', () => {...});
});

it('does not expose raw RPC errors', async () => {
  ...
  await expect(publishProductAction(productId)).resolves.toEqual({
    status: 'error',
    code: 'publish_failed'
  });
});
```

Add equivalent `tests/unit/content/publish-checks.test.ts` for blog and policies.

**Admin query tests** from `tests/unit/newsletter/admin.test.ts` (lines 18-57, 76-111):
```typescript
const requireAdmin = vi.fn(async () => ({id: 'admin-user'}));
...
expect(requireAdmin).toHaveBeenCalledOnce();
expect(from).toHaveBeenCalledWith('newsletter_subscribers');
...
expect(serialized).not.toMatch(/token_hash|raw_ip|user_agent_hash|ip_hash/i);
```

Use this for operations/admin dashboard/launch settings tests: prove admin auth happens before reads and prove raw sensitive fields are absent from serialized results.

**Static security boundary pattern** from `tests/security/retention-boundaries.test.mjs` (lines 23-55):
```javascript
test('admin newsletter inspection requires admin authorization before reads', () => {
  const source = readExisting(adminNewsletterFiles);
  assert.match(source, /requireAdmin/);
});

test('admin newsletter UI never renders raw request or token material', () => {
  const source = readExisting(adminNewsletterUiFiles);
  assert.doesNotMatch(source, /raw_ip|rawIp|ip_hash|user_agent_hash|token_hash|rawToken/i);
});
```

Create Phase 07 security tests for blog preview/admin auth, operations redaction, sitemap/private URL exclusion, and policy launch gates.

## Shared Patterns

### Authentication and Authorization

**Source:** `src/auth/guards.ts` and admin pages using it.
**Apply to:** all `/admin/*` pages, admin query helpers, server actions, preview routes, operations queue, launch settings.

Pattern: call `requireAdmin({next: '/admin/...'})` in the page before reads; call `requireAdmin()` before mutation clients in actions; keep DB RLS using `private.is_admin()`.

### Validation

**Source:** `src/reviews/actions.ts` and `src/catalog/schemas.ts`.
**Apply to:** blog/policy/admin operations/launch form inputs.

Pattern: Zod `safeParse`; return typed `invalid` codes; coerce numeric/version fields server-side; do not trust browser-submitted publish/visibility/owner/admin facts.

### Response and Error Handling

**Source:** `src/catalog/actions.ts`, `src/reviews/actions.ts`, `src/payments/paypal/logging.ts`.
**Apply to:** all Phase 07 actions, route handlers, operational error ingestion.

Pattern: map database/provider failure into stable codes like `publish_failed`, `admin_*_load_failed`, `operational_error_record_failed`; never return raw SQL/provider errors.

### Public Query Projections

**Source:** `supabase/migrations/20260612232000_market_catalog_queries.sql`, `src/reviews/queries.ts`.
**Apply to:** blog index/detail, policy pages, sitemap generation, related products.

Pattern: public pages query only published/indexable projections; scheduled content becomes visible by predicate `published_at <= now()`; related products reload current market-safe facts instead of storing snapshots.

### UI Layout

**Source:** `src/app/admin/reviews/page.tsx`, `src/components/admin/reviews/review-moderation-list.tsx`, `src/components/admin/fulfillment/failed-email-queue.tsx`, `src/components/admin/catalog/product-form.tsx`.
**Apply to:** admin dashboard, blog editor, policy editor, operations queue, launch checklist.

Pattern: max width near `1120px` or `1200px`, compact headings, one top-level `Card` per panel, visible labels, `Alert` for blocked/error/success states, Lucide icons in action buttons, no nested cards for rows.

### SEO and Localization

**Source:** `src/catalog/metadata.ts`, `src/app/[locale]/product/[productSlug]/page.tsx`, `tests/e2e/catalog-detail-seo.spec.ts`.
**Apply to:** blog, policy, product/category/collection SEO extension, sitemap/robots tests.

Pattern: use localized route helpers and DB slug facts for canonical/hreflang; `setRequestLocale(locale)` in pages; `notFound()` for unavailable public rows; tests must assert both inclusion and exclusion.

### Sanitization

**Source:** `src/payments/paypal/logging.ts`, `tests/unit/payments/paypal-logging.test.ts`, `src/components/admin/fulfillment/failed-email-queue.tsx`.
**Apply to:** operational errors, launch evidence, provider/manual UAT notes.

Pattern: sanitize before persistence; store only allowlisted facts; tests assert forbidden substrings are absent after serialization.

## Patterns to Avoid

| Avoid | Why | Use Instead |
|---|---|---|
| Headless CMS or SEO plugin | Phase 07 research recommends no new package/provider for v1. | First-party Supabase tables, App Router metadata routes, existing helpers. |
| Filesystem route walking for sitemap | Can leak admin/draft/private URLs. | Generate from public published projections only. |
| UI-only masking of operational errors | Raw secrets/PII would already be stored. | Redact before insert plus DB safe-json checks. |
| Client-side admin checks | Violates established admin boundary. | `requireAdmin` + RLS `private.is_admin()`. |
| Public preview tokens by default | Draft exposure risk. | Admin-only preview route; if token is required later, hash/scope/expire it. |
| Hardcoded policy footer links before publish | Creates broken or misleading launch state. | Query published required policies and fail launch readiness when absent. |
| Returning raw SQL/provider errors | Leaks internals/secrets. | Stable typed error codes and sanitized facts. |
| Static alternate URLs for content detail pages | Blog/policy slugs are localized content facts. | Build alternates from both localized slug rows. |

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/content/seo/json-ld.tsx` | utility/component | transform | No existing JSON-LD helper exists; use Next research guidance and centralize safe serialization by escaping `<` before `dangerouslySetInnerHTML`. |
| `src/app/robots.ts` | route/config | request-response | No existing robots route; implement using Next metadata route convention and `siteUrl()`. |

## Metadata

**Analog search scope:** `src/`, `tests/`, `supabase/migrations/`, `supabase/tests/database/`
**Files scanned:** existing code grep covered 1,300+ matches across source/tests/migrations; strong analog extraction stopped after catalog, reviews, newsletter, fulfillment, payment logging, SEO, RLS, and security tests.
**Pattern extraction date:** 2026-06-23
