# Phase 6: Customer Retention and Trust - Pattern Map

**Mapped:** 2026-06-20
**Files analyzed:** 30
**Analogs found:** 30 / 30

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/*_customer_retention_trust.sql` | migration | CRUD / request-response / event-driven | `supabase/migrations/20260619085118_fulfillment_purchase_access.sql` | exact |
| `supabase/tests/database/06_customer_retention.test.sql` | test | CRUD / request-response | `supabase/tests/database/05_fulfillment_entitlements.test.sql` | exact |
| `src/account/addresses.ts` | service | CRUD | `src/fulfillment/account-queries.ts` + `src/checkout/shipping-address.ts` | role-match |
| `src/account/address-actions.ts` | service | request-response / CRUD | `src/fulfillment/admin-entitlement-actions.ts` | role-match |
| `src/app/[locale]/account/addresses/page.tsx` | route | request-response | `src/app/[locale]/account/orders/account-orders-page.tsx` | exact |
| `src/app/[locale]/tai-khoan/dia-chi/page.tsx` | route | request-response | `src/app/[locale]/account/orders/page.tsx` | role-match |
| `src/components/account/address-book.tsx` | component | CRUD | `src/components/fulfillment/pattern-library.tsx` | role-match |
| `src/components/account/address-form.tsx` | component | request-response | `src/components/checkout/destination-form.tsx` | role-match |
| `src/components/checkout/saved-address-selector.tsx` | component | request-response | `src/components/checkout/destination-form.tsx` | exact |
| `src/account/wishlist.ts` | service | CRUD / transform | `src/fulfillment/account-queries.ts` | role-match |
| `src/account/wishlist-actions.ts` | service | request-response / CRUD | `src/checkout/actions.ts` | role-match |
| `src/app/[locale]/account/wishlist/page.tsx` | route | request-response | `src/app/[locale]/account/orders/account-orders-page.tsx` | exact |
| `src/components/account/wishlist-page.tsx` | component | CRUD / transform | `src/components/fulfillment/pattern-library.tsx` | role-match |
| `src/components/catalog/wishlist-heart.tsx` | component | request-response | `src/components/catalog/product-card.tsx` | role-match |
| `src/reviews/eligibility.ts` | service | request-response / transform | `src/fulfillment/downloads.ts` | role-match |
| `src/reviews/actions.ts` | service | request-response / CRUD | `src/fulfillment/entitlements.ts` + `src/checkout/actions.ts` | role-match |
| `src/reviews/queries.ts` | service | CRUD / transform | `src/fulfillment/account-queries.ts` | role-match |
| `src/components/reviews/review-form.tsx` | component | request-response | `src/components/checkout/destination-form.tsx` | role-match |
| `src/components/reviews/product-reviews.tsx` | component | transform | `src/components/fulfillment/pattern-library-card.tsx` | role-match |
| `src/app/admin/reviews/page.tsx` | route | request-response / CRUD | `src/app/admin/exceptions/page.tsx` | exact |
| `src/components/admin/reviews/review-moderation-list.tsx` | component | CRUD | `src/components/admin/fulfillment/entitlement-actions.tsx` | role-match |
| `src/newsletter/consent.ts` | service | event-driven / request-response | `src/fulfillment/downloads.ts` + `src/checkout/exceptions.ts` | role-match |
| `src/newsletter/actions.ts` | service | request-response / CRUD | `src/checkout/actions.ts` | role-match |
| `src/newsletter/admin-queries.ts` | service | CRUD / transform | `src/payments/queries.ts` / `src/fulfillment/account-queries.ts` | role-match |
| `src/app/[locale]/newsletter/unsubscribe/page.tsx` | route | request-response | `src/app/[locale]/guest-order/page.tsx` / token route pattern from `src/fulfillment/downloads.ts` | partial |
| `src/components/newsletter/subscribe-form.tsx` | component | request-response | `src/components/checkout/contact-form.tsx` | role-match |
| `src/components/newsletter/unsubscribe-result.tsx` | component | request-response | `src/components/checkout/approved-exception-page.tsx` | role-match |
| `src/app/admin/newsletter/page.tsx` | route | request-response / CRUD | `src/app/admin/exceptions/page.tsx` | exact |
| `tests/unit/{account,reviews,newsletter}/*.test.ts` | test | transform / request-response | `tests/unit/fulfillment/downloads.test.ts` | exact |
| `tests/security/retention-boundaries.test.mjs` | test | file-I/O / static boundary | `tests/security/fulfillment-boundaries.test.mjs` | exact |
| `tests/e2e/{account-retention,reviews,newsletter,admin-newsletter}.spec.ts` | test | request-response | `tests/e2e/account-purchases.spec.ts` + `tests/e2e/admin-fulfillment.spec.ts` | exact |

## Pattern Assignments

### `supabase/migrations/*_customer_retention_trust.sql` (migration, CRUD / request-response / event-driven)

**Analog:** `supabase/migrations/20260619085118_fulfillment_purchase_access.sql`

**Table and constraint pattern** (lines 1-20):
```sql
create table public.digital_entitlements (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.checkout_orders(id) on delete cascade,
  order_line_id uuid not null references public.checkout_order_lines(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete set null,
  contact_email text not null,
  product_id uuid references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'revoked')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index digital_entitlements_one_active_line_idx on public.digital_entitlements (order_line_id) where status = 'active';
```

Apply this style to `customer_shipping_addresses`, `wishlist_items`, `product_reviews`, `review_admin_replies`, `newsletter_subscribers`, `newsletter_consent_events`, and `newsletter_unsubscribe_tokens`: explicit `status` checks, timestamps, owner/customer FKs, partial unique indexes for one default address and one review per user/product, and token hash constraints.

**RLS/grant pattern** (lines 197-231):
```sql
alter table public.digital_entitlements enable row level security;
alter table public.digital_access_tokens enable row level security;

revoke all on table public.digital_entitlements from public, anon, authenticated;
revoke all on table public.digital_access_tokens from public, anon, authenticated;

grant select on table public.digital_entitlements to authenticated;
grant select, insert, update on table public.digital_entitlements to service_role;
grant select, insert, update on table public.digital_access_tokens to service_role;

create policy "digital entitlements are owner readable" on public.digital_entitlements
for select to authenticated using (owner_user_id = (select auth.uid()));
create policy "digital entitlements are admin managed" on public.digital_entitlements
for all to authenticated using (private.is_admin()) with check (private.is_admin());
```

Use owner policies for addresses, wishlist, and customer reviews. Use admin-managed policies for moderation, reply management, subscriber inspection, and private token tables. Newsletter subscribe/unsubscribe should happen through RPCs or server code, not direct anon table grants.

**Security-definer RPC pattern** (lines 165-178):
```sql
create or replace function public.revoke_digital_entitlement(p_entitlement_id uuid, p_expected_version integer, p_reason text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare entitlement_row public.digital_entitlements%rowtype;
begin
  if not private.is_admin() then return jsonb_build_object('status', 'forbidden'); end if;
  select * into entitlement_row from public.digital_entitlements where id = p_entitlement_id for update;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if entitlement_row.status <> 'active' or entitlement_row.version <> p_expected_version then return jsonb_build_object('status', 'stale', 'version', entitlement_row.version); end if;
  update public.digital_entitlements set status = 'revoked', version = version + 1, revoked_by = auth.uid(), revoked_at = now(), revoke_reason = coalesce(nullif(btrim(p_reason), ''), 'admin_revoked'), updated_at = now() where id = p_entitlement_id;
  return jsonb_build_object('status', 'revoked', 'version', p_expected_version + 1);
end;
$$;
```

Copy this result-object style for admin review approve/hide/reply RPCs and tokenized unsubscribe RPCs. Review eligibility must lock/check paid order-line evidence in the same write path.

### `src/account/addresses.ts` and `src/account/wishlist.ts` (service, CRUD / transform)

**Analog:** `src/fulfillment/account-queries.ts`

**Imports/types pattern** (lines 1-42):
```typescript
import type {Locale} from '@/i18n/routing';

type QueryClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, options?: Record<string, unknown>) => Promise<{data: unknown[] | null; error: unknown}>;
      };
    };
  };
};

export type CustomerOrderHistoryResult =
  | {status: 'success'; orders: CustomerOrderHistoryItem[]}
  | {status: 'error'; code: 'account_orders_failed'};
```

**Row mapping pattern** (lines 44-68):
```typescript
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mapOrderRow(row: Record<string, unknown>): CustomerOrderHistoryItem | null {
  if (typeof row.order_id !== 'string' || typeof row.order_number !== 'string') {
    return null;
  }
  return {
    orderId: row.order_id,
    orderNumber: row.order_number,
    paymentStatus: typeof row.payment_status === 'string' ? row.payment_status : 'review_required',
    amountMinor: typeof row.total_minor === 'number' ? row.total_minor : 0,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null
  };
}
```

**Customer-owned query pattern** (lines 89-98):
```typescript
export async function getCustomerOrderHistory({userId, client}: {userId: string; client: QueryClient}): Promise<CustomerOrderHistoryResult> {
  const query = client.from('order_payment_statuses').select(
    'order_id,order_number,customer_payment_status,payment_status,fulfillment_gate_status,digital_fulfillment_status,physical_fulfillment_status,total_minor,currency_code,updated_at'
  );
  const {data, error} = await query.eq('owner_user_id', userId).order('updated_at', {ascending: false});
  if (error || !Array.isArray(data)) {
    return {status: 'error', code: 'account_orders_failed'};
  }
  return {status: 'success', orders: data.filter(isRecord).map(mapOrderRow).filter((row): row is CustomerOrderHistoryItem => Boolean(row))};
}
```

For wishlist, store product IDs only and hydrate current catalog/product facts in the query, like `getCustomerPatternLibrary` groups current product translations from entitlement rows (lines 100-149).

### `src/account/address-actions.ts`, `src/account/wishlist-actions.ts`, `src/newsletter/actions.ts` (server action, request-response / CRUD)

**Analog:** `src/checkout/actions.ts`

**Validation + server client + safe result pattern** (lines 31-57):
```typescript
const checkoutQuoteInputSchema = quoteCartInputSchema.extend({
  acceptedQuote: z.custom<CartQuote>().optional().nullable()
});

export async function refreshCheckoutQuoteAction(input: unknown): Promise<CheckoutQuoteActionState> {
  const parsed = checkoutQuoteInputSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_checkout_quote'};
  }

  try {
    const client = await createSupabaseServerClient();
    const {
      data: {user}
    } = await client.auth.getUser();
    const quote = await quoteCartIntent({...parsed.data, userId: user?.id ?? null, client});
    return {status: 'success', quote, materialChanges: parsed.data.acceptedQuote ? diffMaterialQuotes(parsed.data.acceptedQuote, quote) : []};
  } catch {
    return {status: 'error', code: 'checkout_quote_failed'};
  }
}
```

Saved address and wishlist mutations should use `requireUser` when sign-in is mandatory; newsletter subscribe should not require auth, but must validate locale/market/email and return generic safe status codes.

**Admin form action pattern** from `src/fulfillment/admin-entitlement-actions.ts` (lines 23-30, 46-67):
```typescript
async function getAdminRpcClient() {
  const {requireAdmin} = await import('@/auth/guards');
  await requireAdmin();
  const {createSupabaseAdminClient} = await import('@/lib/supabase/admin');
  return createSupabaseAdminClient() as unknown as {
    rpc: (fn: string, args?: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
  };
}

export async function revokeDigitalEntitlementAction(formData: FormData): Promise<EntitlementActionResult> {
  const parsed = parsedAction(formData);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_entitlement_action'};
  }

  const client = await getAdminRpcClient();
  const result = await revokeDigitalEntitlement(parsed.data, client);
  revalidateAdminOrder(parsed.data.orderId);
  return result;
}
```

Copy this for review moderation actions. Do not copy admin override actions for newsletter consent, because v1 admin subscriber inspection is read-only.

### Account Routes and Components

**Analogs:** `src/app/[locale]/account/orders/account-orders-page.tsx`, `src/app/[locale]/account/account-overview.tsx`, `src/components/fulfillment/pattern-library.tsx`

**Localized signed-in page pattern** (account orders lines 9-20):
```typescript
export const dynamic = 'force-dynamic';

export async function renderAccountOrdersPage({params, expectedLocale}: {params: Promise<{locale: Locale}>; expectedLocale: Locale}) {
  const {locale} = await params;
  if (locale !== expectedLocale) {
    notFound();
  }
  setRequestLocale(locale);
  const user = await requireUser({locale, next: `${getLocalizedPath('/account', locale)}/orders`});
  const t = await getTranslations({locale, namespace: 'accountPurchases.orders'});
  const client = await createSupabaseServerClient();
  const result = await getCustomerOrderHistory({userId: user.id, client: client as never});
```

**Account layout pattern** (account overview lines 20-49):
```tsx
return (
  <main className="mx-auto w-full max-w-[760px] px-4 py-10 sm:px-6">
    <Card>
      <CardHeader>
        <p className="text-sm font-semibold uppercase text-[var(--accent)]">{locale.toUpperCase()}</p>
        <CardTitle>{t('title')}</CardTitle>
        <p className="text-base text-[var(--muted-foreground)]">{t('intro')}</p>
      </CardHeader>
      <CardContent>
        ...
      </CardContent>
    </Card>
  </main>
);
```

**Repeated account row/card pattern** (pattern library lines 14-31 and card lines 13-31):
```tsx
export function PatternLibrary({patterns, labels}: {patterns: CustomerPatternLibraryItem[]; labels: Labels}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {patterns.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">{labels.empty}</p>
        ) : (
          <div className="grid gap-3">
            {patterns.map((pattern) => (
              <PatternLibraryCard key={pattern.productId} pattern={pattern} labels={labels} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

```tsx
<article className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--border)] p-4 sm:grid-cols-[1fr_auto]">
  <div>
    <h2 className="text-lg font-semibold">{pattern.title}</h2>
    <p className="text-sm text-[var(--muted-foreground)]">{labels.purchases}: {pattern.purchaseCount}</p>
  </div>
  {pattern.active ? (
    <form action={`/api/downloads?orderNumber=${encodeURIComponent(pattern.latestOrderNumber)}`} method="post">
      <Button type="submit" className="gap-2">...</Button>
    </form>
  ) : (
    <p className="text-sm font-semibold text-[var(--destructive)]">{labels.inactive}</p>
  )}
</article>
```

Use this for address rows and wishlist rows. Keep one top-level card; repeated items are bordered rows, not nested cards.

### Checkout Saved Address Selection

**Analog:** `src/components/checkout/destination-form.tsx`

**Material-change revalidation pattern** (lines 105-140, 311-321):
```tsx
function submit() {
  setShowValidation(true);
  setError(null);
  if (!addressReady) {
    setError(t.invalid);
    return;
  }
  startTransition(async () => {
    const result = await refreshCheckoutQuoteAction({
      locale,
      market: acceptedQuote?.market ?? (locale === 'vi' ? 'vn' : 'intl'),
      lines: acceptedQuote?.lines.map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.requestedQuantity,
        marketAtAdd: line.marketAtAdd,
        addedAt: acceptedQuote.quotedAt,
        updatedAt: acceptedQuote.quotedAt
      })) ?? [],
      destinationCountryCode: shippingAddress.countryCode,
      acceptedQuote
    });
    if (result.materialChanges.length > 0) {
      setProposal({quote: result.quote, changes: result.materialChanges});
      return;
    }
    onAcceptedQuote(result.quote);
  });
}

{proposal ? (
  <QuoteDiffDialog
    locale={locale}
    proposal={proposal.quote}
    changes={proposal.changes}
    onCancel={() => setProposal(null)}
    onConfirm={() => {
      onAcceptedQuote(proposal.quote);
      setProposal(null);
    }}
  />
) : null}
```

Saved address selection must copy the address into the existing checkout state, then run this same server quote refresh and diff confirmation before continuing.

### Catalog Wishlist Heart

**Analog:** `src/components/catalog/product-card.tsx`

**Product card layout pattern** (lines 21-60):
```tsx
<article
  aria-label={product.title}
  className="grid overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]"
>
  <div className="aspect-[4/3] bg-[var(--surface-muted)]">
    {imageUrl ? (
      <img
        src={imageUrl}
        alt={product.primary_image_alt || product.title}
        className="h-full w-full object-cover"
      />
    ) : null}
  </div>
  <div className="grid gap-3 p-4">
    <div className="flex items-start justify-between gap-3">
      <h2 className="text-lg font-semibold leading-snug">{product.title}</h2>
      <span className="shrink-0 rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-2 py-1 text-xs font-semibold text-[var(--accent)]">
        {badge}
      </span>
    </div>
    ...
  </div>
</article>
```

Add the heart inside the image/product-card boundary without shifting the title/price CTA. Guest heart flows should redirect to `getLocalizedPath('/sign-in', locale)` with `next` like `requireUser` does.

### Reviews Services and UI

**Analogs:** `src/fulfillment/downloads.ts`, `src/fulfillment/entitlements.ts`, `src/components/admin/fulfillment/entitlement-actions.tsx`

**Eligibility/authorization service pattern** (downloads lines 71-104):
```typescript
export async function authorizeDownloadRequest(
  input: DownloadRequestInput,
  deps: DownloadAuthorizationDeps
): Promise<DownloadAuthorizationResult> {
  const parsed = downloadRequestSchema.safeParse(input);
  if (!parsed.success) {
    return denied();
  }

  let record: EntitlementDownloadRecord | null;
  try {
    record = await deps.repository.findActiveEntitlementForOrder(parsed.data.orderNumber);
  } catch {
    return {status: 'error', code: 'download_lookup_failed'};
  }

  if (!record || record.status !== 'active' || !record.asset) {
    return denied();
  }
  ...
}
```

Review eligibility should use the same shape: parse input, query server/database paid order-line evidence, deny generically if missing, and never accept `verifiedPurchase` from the browser.

**RPC result mapping pattern** (entitlements lines 34-70):
```typescript
function mapRpcResult(data: unknown, successStatus: 'revoked' | 'reissued'): EntitlementActionResult {
  if (!isRecord(data) || typeof data.status !== 'string') {
    return {status: 'error', code: 'entitlement_action_failed'};
  }
  if (data.status === successStatus) {
    return {status: successStatus, version: typeof data.version === 'number' ? data.version : 0};
  }
  if (data.status === 'stale') {
    return {status: 'stale', version: typeof data.version === 'number' ? data.version : null};
  }
  if (data.status === 'forbidden') {
    return {status: 'forbidden', code: 'admin_required'};
  }
  return {status: 'error', code: 'entitlement_action_failed'};
}
```

Use this for submit/update review, approve/hide review, and create/edit/remove admin reply results.

**Admin action component pattern** (entitlement actions lines 21-31, 69-99):
```tsx
export function EntitlementActions({orderId, entitlements}: {orderId: string; entitlements: AdminDigitalEntitlementItem[]}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Digital entitlement actions</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">Revoke or reissue access with expected-version checks and audit events.</p>
      </CardHeader>
      <CardContent>
        {entitlements.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No digital entitlements for this order.</p>
        ) : (
          <div className="grid gap-3">
            ...
            <form action={revokeDigitalEntitlementAction as unknown as (formData: FormData) => Promise<void>} className="grid gap-2 rounded-[var(--radius-card)] border border-[var(--border)] p-3">
              <input type="hidden" name="orderId" value={orderId} />
              <input type="hidden" name="entitlementId" value={entitlement.id} />
              <input type="hidden" name="expectedVersion" value={entitlement.version} />
              <label className="flex items-center gap-2 text-sm">
                <input required type="checkbox" name="confirm" value="yes" />
                Confirm revoke access
              </label>
              <Button type="submit" variant="destructive" className="gap-2">Revoke access</Button>
            </form>
```

For review moderation, keep the compact card/list style, include expected version/status hidden fields, and revalidate admin review pages after mutation.

### Newsletter Consent and Unsubscribe

**Analogs:** `src/fulfillment/downloads.ts`, `src/fulfillment/email-outbox.ts`, `src/fulfillment/email-outbox.server.ts`, `src/emails/transactional.ts`

**Hash-only token pattern** (downloads lines 54-65):
```typescript
export function hashFulfillmentAccessToken(rawToken: string) {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

function isTokenUsable(record: EntitlementDownloadRecord, rawGuestToken: string | null | undefined, guestTokenHash: string | null | undefined, now: Date) {
  if (!record.tokenHash || record.tokenStatus !== 'active' || !record.tokenExpiresAt) {
    return false;
  }
  const candidateHash = guestTokenHash ?? (rawGuestToken ? hashFulfillmentAccessToken(rawGuestToken) : null);
  const expiryMs = Date.parse(record.tokenExpiresAt);
  return Boolean(candidateHash) && Number.isFinite(expiryMs) && expiryMs > now.getTime() && candidateHash === record.tokenHash;
}
```

Newsletter unsubscribe should store only token hashes, status, expiry/consumed metadata, and generic result states.

**Email rendering pattern** (transactional lines 36-72):
```typescript
function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function absoluteUrl(siteUrl: string, path: string) {
  return new URL(path, siteUrl).toString();
}

function messageShell(subject: string, intro: string, linkText: string, link: string, footer: string): RenderedTransactionalEmail {
  const safeSubject = escapeHtml(subject);
  const safeIntro = escapeHtml(intro);
  const safeLinkText = escapeHtml(linkText);
  const safeLink = escapeHtml(link);
  const safeFooter = escapeHtml(footer);
  return {
    subject,
    html: `<main><h1>${safeSubject}</h1><p>${safeIntro}</p><p><a href="${safeLink}">${safeLinkText}</a></p><p>${safeFooter}</p></main>`,
    text: `${subject}\n\n${intro}\n${linkText}: ${link}\n\n${footer}`
  };
}
```

Use this if Phase 6 sends welcome/unsubscribe emails. Keep unsubscribe links in rendered emails only, not durable payloads.

**Outbox processing pattern** (email outbox lines 66-105):
```typescript
export async function processTransactionalEmailBatch(input: ProcessInput) {
  if (!input.config.fromEmail) {
    return {status: 'unconfigured' as const, code: 'missing_transactional_email_config' as const};
  }

  const now = input.now?.() ?? new Date();
  const rows = await input.repository.claimDueRows(batchSize(input.config.batchSize), now);
  let sent = 0;
  let retry = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const context = await renderContextForRow(row, input.repository, input.config.siteUrl, now);
      const rendered = renderTransactionalEmail(row, context);
      const result = await input.sender.send({...});
      ...
    } catch {
      failed += 1;
      await input.repository.markFailed(row.id, 'email_worker_error', now);
    }
  }

  return {status: 'processed' as const, claimed: rows.length, sent, retry, failed};
}
```

### Admin Review and Subscriber Pages

**Analog:** `src/app/admin/exceptions/page.tsx`

**Protected admin list pattern** (lines 30-68):
```tsx
export default async function AdminExceptionsPage() {
  await requireAdmin();
  const supabase = (await createSupabaseServerClient()) as unknown as UntypedSupabaseClient;
  const {data} = await supabase
    .from('market_exception_requests')
    .select('id,status,contact_email,product_id,variant_id,market,destination_country_code,customer_note,created_at')
    .order('created_at', {ascending: false});
  const requests = (data ?? []) as unknown as ExceptionRequestRow[];

  return (
    <main className="mx-auto grid w-full max-w-[1040px] gap-4 px-4 py-10 sm:px-6">
      <div>
        <p className="text-sm font-semibold uppercase text-[var(--accent)]">Admin exceptions</p>
        <h1 className="text-3xl font-semibold">Market exception requests</h1>
      </div>
      {requests.length === 0 ? (
        <Card>
          <CardContent>No exception requests yet.</CardContent>
        </Card>
      ) : (
        requests.map((request) => (
          <Card key={request.id}>
            <CardHeader>
              <CardTitle>{maskEmail(request.contact_email)}</CardTitle>
              <p className="text-sm text-[var(--muted-foreground)]">{request.status}</p>
            </CardHeader>
            <CardContent>...</CardContent>
          </Card>
        ))
      )}
    </main>
  );
}
```

Use this for review moderation and subscriber inspection. Subscriber admin page must not include manual subscribe/unsubscribe forms.

## Shared Patterns

### Authentication And Authorization

**Source:** `src/auth/guards.ts`
**Apply to:** account pages/actions, wishlist actions, review customer actions, admin moderation/subscriber pages

```typescript
export async function requireUser({locale, next}: {locale: Locale; next: string}): Promise<AuthUser> {
  const supabase = await createSupabaseServerClient();
  const claims = await supabase.auth.getClaims();
  if (claims.error || !claims.data?.claims?.sub) {
    signInRedirect(locale, next);
  }

  const user = await supabase.auth.getUser();
  const authUser = user.data.user;
  if (user.error || !authUser?.email) {
    signInRedirect(locale, next);
  }

  return {
    id: authUser.id,
    email: authUser.email
  };
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireUser({locale: 'en', next: '/admin'});
  const supabase = await createSupabaseServerClient();
  const {data} = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();

  if (!data) {
    redirect('/admin/forbidden');
  }

  return user;
}
```

Unsubscribe is the exception: it must be token-authenticated and must not call `requireUser`.

### Address Validation And Immutable Order Snapshot

**Source:** `src/checkout/shipping-address.ts`
**Apply to:** saved address form schema, checkout saved-address copy, tests

```typescript
export const shippingAddressSchema = z.object({
  recipientName: z.string().trim().min(1).max(120),
  phoneNumber: z.string().trim().min(5).max(40),
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  region: optionalAddressPart,
  locality: optionalAddressPart,
  addressLine1: z.string().trim().min(1).max(200),
  addressLine2: optionalAddressPart,
  postalCode: optionalAddressPart
});

export function formatShippingAddressLines(address: ShippingAddress) {
  return [
    address.recipientName,
    address.phoneNumber,
    address.addressLine1,
    address.addressLine2,
    [address.locality, address.region, address.postalCode].filter(Boolean).join(', '),
    address.countryCode
  ].filter((line): line is string => Boolean(line));
}
```

**Source:** `supabase/migrations/20260618093000_checkout_shipping_address_snapshot.sql`
**Apply to:** never link orders to mutable saved address rows

```sql
create or replace function private.prevent_checkout_order_shipping_address_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.shipping_address is distinct from new.shipping_address then
    raise exception 'checkout order shipping address is immutable' using errcode = '23000';
  end if;

  return new;
end;
$$;
```

### Error Handling And Result Objects

**Source:** `src/checkout/actions.ts`, `src/fulfillment/downloads.ts`, `src/fulfillment/entitlements.ts`
**Apply to:** all Phase 6 server actions/services

```typescript
const parsed = schema.safeParse(input);
if (!parsed.success) {
  return {status: 'invalid', code: 'invalid_action'};
}

try {
  const {data, error} = await client.rpc('some_rpc', {p_payload: parsed.data});
  if (error) {
    return {status: 'error', code: 'action_failed'};
  }
  return mapRpcResult(data);
} catch {
  return {status: 'error', code: 'action_failed'};
}
```

Use typed unions and generic public failure codes. Do not leak token hashes, raw tokens, full public emails, raw IP/user-agent, or provider payloads.

### Public Masking

**Source:** `src/app/admin/exceptions/page.tsx` via `maskEmail` from `src/checkout/exceptions.ts`
**Apply to:** public reviews, admin rows where masked identity is sufficient, tests

```tsx
<CardHeader>
  <CardTitle>{maskEmail(request.contact_email)}</CardTitle>
  <p className="text-sm text-[var(--muted-foreground)]">{request.status}</p>
</CardHeader>
```

Public reviews must render masked or shortened identity and a verified badge, never the full customer email.

### Security Static Harness

**Source:** `tests/security/fulfillment-boundaries.test.mjs`
**Apply to:** `tests/security/retention-boundaries.test.mjs`

```javascript
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

function readExisting(files) {
  return files
    .filter((file) => existsSync(file))
    .map((file) => `\n/* ${file} */\n${readFileSync(file, 'utf8')}`)
    .join('\n');
}

test('fulfillment surfaces store hashes and never raw download token material', () => {
  const source = readExisting(contractFiles);

  assert.match(source, /token_hash/);
  assert.match(source, /expires_at/);
  assert.doesNotMatch(source, /rawDownloadToken|downloadToken\s*[:=]|plainToken|token_secret/i);
});
```

Adapt checks for: no full public emails in review components, no raw newsletter tokens, no raw IP/user-agent fields, no service-role imports in public/customer UI, no admin newsletter consent override actions, and no browser-created signed/token URLs.

### Unit Test Style

**Source:** `tests/unit/fulfillment/downloads.test.ts`
**Apply to:** address, wishlist, review eligibility, newsletter consent tests

```typescript
import {describe, expect, test, vi} from 'vitest';

function deps(overrides: Partial<typeof activeEntitlement> = {}) {
  const entitlement = {...activeEntitlement, ...overrides};
  return {
    repository: {
      findActiveEntitlementForOrder: vi.fn().mockResolvedValue(entitlement)
    },
    storage: {
      createSignedUrl: vi.fn().mockResolvedValue({url: 'https://signed.example.test/pattern.pdf'})
    },
    now: () => new Date()
  };
}

test('wrong owner and cross-order guest token are denied generically', async () => {
  const ownerDeps = deps();
  await expect(authorizeDownloadRequest({orderNumber: activeEntitlement.orderNumber, userId: '22222222-2222-4222-8222-222222222222'}, ownerDeps)).resolves.toEqual({
    status: 'denied',
    code: 'download_not_available'
  });
  expect(ownerDeps.storage.createSignedUrl).not.toHaveBeenCalled();
});
```

### Database Test Style

**Source:** `supabase/tests/database/05_fulfillment_entitlements.test.sql`
**Apply to:** Phase 6 database/RLS test

```sql
begin;

select plan(28);

select has_table('public', 'digital_entitlements', 'paid digital entitlement table exists');
select has_function('public', 'revoke_digital_entitlement', array['uuid', 'integer', 'text'], 'admin revoke RPC exists');
select has_index('public', 'digital_entitlements', 'digital_entitlements_one_active_line_idx', 'one active entitlement per paid digital order line');

select throws_ok(
  $$insert into public.digital_access_tokens(entitlement_id, token_hash, expires_at) values (gen_random_uuid(), 'raw-short', now() + interval '24 hours')$$,
  null,
  null,
  'short raw-looking token material is rejected by token_hash length check'
);

select table_privs_are('public', 'digital_access_tokens', 'authenticated', array[]::text[], 'authenticated customers cannot read token hashes directly');

select * from finish();

rollback;
```

### E2E Test Style

**Source:** `tests/e2e/account-purchases.spec.ts`, `tests/e2e/admin-fulfillment.spec.ts`
**Apply to:** account retention, reviews, newsletter, admin newsletter tests

```typescript
import {expect, test} from '@playwright/test';

test.describe('account purchases', () => {
  test.skip('signed-in customer sees only their own order history', async ({page}) => {
    await page.goto('/en/account/orders');
    await expect(page.getByRole('heading', {name: /order history/i})).toBeVisible();
  });

  test.skip('signed-in customer can open grouped PDF pattern library without storage details', async ({page}) => {
    await page.goto('/en/account/patterns');
    await expect(page.getByRole('heading', {name: /pattern library/i})).toBeVisible();
    await expect(page.getByText(/pattern-pdfs|object_path|signed_url|token_hash/i)).toHaveCount(0);
  });
});
```

Use skipped browser contracts if test fixtures are not available yet, matching the existing phase style.

## No Analog Found

All Phase 6 file types have close local analogs. The weakest match is the unauthenticated newsletter unsubscribe page, which should combine the existing guest/token download authorization pattern with the localized page patterns.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| none | - | - | Existing account, token, admin, migration, and test patterns cover the phase. |

## Metadata

**Analog search scope:** `src`, `supabase`, `tests`
**Files scanned:** 230+ indexed files from `rg --files`
**Pattern extraction date:** 2026-06-20
**Project skill directories:** `.codex/skills` and `.agents/skills` not present
**Primary analogs:** account pages, fulfillment account queries, checkout destination/material-change flow, catalog product card, admin exceptions, fulfillment token/outbox services, Supabase migrations/RLS tests, unit/security/e2e test harnesses
