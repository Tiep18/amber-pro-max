# Phase 5: Fulfillment and Purchase Access - Pattern Map

**Mapped:** 2026-06-19
**Files analyzed:** 25
**Analogs found:** 25 / 25

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/*_fulfillment_purchase_access.sql` | migration | CRUD, event-driven | `supabase/migrations/20260615034000_trusted_payments_orders.sql` | exact |
| `supabase/tests/database/05_fulfillment_entitlements.test.sql` | test | CRUD | `supabase/tests/database/04_payment_transitions.test.sql` | exact |
| `supabase/tests/database/05_email_outbox.test.sql` | test | event-driven | `supabase/tests/database/04_payment_transitions.test.sql` | role-match |
| `supabase/tests/database/05_guest_claim.test.sql` | test | request-response | `supabase/tests/database/03_checkout_model.test.sql` and `04_payment_transitions.test.sql` | role-match |
| `src/fulfillment/entitlements.ts` | service | CRUD | `src/payments/transitions.ts` | exact |
| `src/fulfillment/downloads.ts` | service | request-response, file-I/O | `src/payments/queries.ts`, `src/catalog/media-actions.ts` | role-match |
| `src/fulfillment/email-outbox.ts` | service | event-driven, batch | `src/payments/transitions.ts`, `src/payments/admin-actions.ts` | role-match |
| `src/fulfillment/physical.ts` | service | CRUD, event-driven | `src/payments/admin-actions.ts` | role-match |
| `src/fulfillment/guest-access.ts` | utility | request-response | `src/payments/guest-access.ts` | exact |
| `src/fulfillment/schemas.ts` | utility | transform | `src/payments/schemas.ts`, `src/catalog/media-schemas.ts` | role-match |
| `src/emails/*` | utility | transform | no existing email helpers; use `src/payments/format.ts` and `src/i18n/routing.ts` style | partial |
| `src/app/api/downloads/route.ts` | route | request-response, file-I/O | `src/app/api/paypal/orders/route.ts` | role-match |
| `src/app/api/fulfillment/email-outbox/route.ts` | route | batch, event-driven | `src/app/api/webhooks/paypal/route.ts`, `src/app/api/paypal/orders/route.ts` | role-match |
| `src/app/[locale]/orders/[orderNumber]/page.tsx` | route/page | request-response | existing `src/app/[locale]/orders/[orderNumber]/page.tsx` + `OrderPaymentPage` | exact |
| `src/app/[locale]/guest-order/page.tsx` | route/page | request-response | `src/app/[locale]/orders/[orderNumber]/page.tsx` | role-match |
| `src/app/[locale]/account/orders/page.tsx` | route/page | request-response | `src/app/[locale]/account/page.tsx` | exact |
| `src/app/[locale]/account/patterns/page.tsx` | route/page | request-response | `src/app/[locale]/account/page.tsx` | exact |
| `src/components/fulfillment/download-panel.tsx` | component | request-response | `src/components/payments/order-payment-page.tsx` | role-match |
| `src/components/fulfillment/fulfillment-status-panel.tsx` | component | request-response | `src/components/payments/payment-state-panel.tsx` | role-match |
| `src/components/fulfillment/physical-tracking-panel.tsx` | component | request-response | `src/components/payments/order-payment-page.tsx` | role-match |
| `src/components/admin/fulfillment/failed-email-queue.tsx` | component | request-response | `src/components/admin/orders/order-queue.tsx` | exact |
| `src/components/admin/fulfillment/physical-fulfillment-form.tsx` | component | request-response | `src/components/admin/orders/vietqr-evidence-form.tsx` | role-match |
| `src/components/admin/fulfillment/entitlement-actions.tsx` | component | request-response | `src/components/admin/orders/vietqr-evidence-form.tsx` | role-match |
| `tests/unit/fulfillment/*.test.ts` | test | CRUD, request-response, event-driven | `tests/unit/payments/*.test.ts` | exact |
| `tests/e2e/order-downloads.spec.ts`, `tests/e2e/admin-fulfillment.spec.ts`, `tests/security/fulfillment-boundaries.test.mjs` | test | request-response | `tests/e2e/admin-orders.spec.ts`, `tests/security/payment-boundaries.test.mjs` | role-match |

## Pattern Assignments

### `supabase/migrations/*_fulfillment_purchase_access.sql` (migration, CRUD/event-driven)

**Analog:** `supabase/migrations/20260615034000_trusted_payments_orders.sql`

**State column and check-constraint pattern** (lines 4-35):
```sql
alter table public.checkout_orders
  add column if not exists digital_fulfillment_status text not null default 'blocked',
  add column if not exists physical_fulfillment_status text not null default 'blocked',
  add constraint checkout_orders_digital_fulfillment_status_check
    check (digital_fulfillment_status in ('blocked', 'eligible', 'not_required')),
  add constraint checkout_orders_physical_fulfillment_status_check
    check (physical_fulfillment_status in ('blocked', 'awaiting_fulfillment', 'not_required'));
```

**Idempotency/index pattern** (lines 136-149):
```sql
create unique index payment_events_provider_event_unique_idx
on public.payment_events (provider, provider_event_id)
where provider_event_id is not null;

create unique index payment_transitions_transition_key_unique_idx
on public.payment_transitions (transition_key);

create index commerce_audit_events_order_timeline_idx
on public.commerce_audit_events (order_id, created_at);
```

**Sanitized metadata and append-only audit pattern** (lines 158-220):
```sql
create or replace function private.payment_safe_json(p_value jsonb)
returns boolean
language sql
immutable
set search_path = private, public, pg_temp
as $$
  select not (
    lower(coalesce(p_value::text, '')) ~
    '(client_secret|authorization|paypal_client_secret|webhook_id|signed_url|raw_payload|access_token|refresh_token)'
  );
$$;

create or replace function private.prevent_commerce_audit_mutation()
returns trigger
language plpgsql
set search_path = private, public, pg_temp
as $$
begin
  raise exception 'commerce audit events are append only'
    using errcode = '23514';
end;
$$;
```

**Security-invoker projection and authorized RPC pattern** (lines 378-468):
```sql
create view public.order_payment_statuses
with (security_invoker = true)
as
select
  co.id as order_id,
  co.order_number,
  co.owner_user_id,
  co.guest_secret_hash,
  p.digital_fulfillment_status,
  p.physical_fulfillment_status
from public.checkout_orders co
join public.payments p on p.order_id = co.id;

create or replace function public.get_order_payment_status(p_order_number text, p_guest_secret_hash text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  select *
  from public.order_payment_statuses ops
  where ops.order_number = p_order_number
    and (
      (auth.uid() is not null and ops.owner_user_id = auth.uid())
      or (p_guest_secret_hash is not null and ops.guest_secret_hash = p_guest_secret_hash)
      or private.is_admin()
    );
end;
$$;
```

Apply this to entitlement tables, access token tables, order-claim records, transactional email outbox/attempts, fulfillment events, customer projections, admin projections, and RPCs. Keep raw tokens, signed URLs, provider payloads, and PDF object paths out of public/customer projections unless strictly required server-side.

---

### `src/fulfillment/entitlements.ts` (service, CRUD)

**Analog:** `src/payments/transitions.ts`

**Imports and typed RPC wrapper pattern** (lines 1-6):
```typescript
import {paymentTransitionInputSchema, paymentTransitionResultSchema} from './schemas';
import type {PaymentTransitionInput, PaymentTransitionResult} from './types';

type RpcClient = {
  rpc: (fn: 'apply_payment_transition', args: {p_payload: Record<string, unknown>}) => Promise<{data: unknown; error: unknown}>;
};
```

**Validation and error-result pattern** (lines 17-31):
```typescript
export async function applyPaymentTransition(
  input: PaymentTransitionInput,
  client: RpcClient
): Promise<PaymentTransitionResult> {
  const parsed = paymentTransitionInputSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_payment_transition'};
  }

  const {data, error} = await client.rpc('apply_payment_transition', {p_payload: parsed.data});
  if (error) {
    return {status: 'error', code: 'payment_transition_failed'};
  }

  return mapPaymentTransitionResult(data);
}
```

Use the same shape for `fulfillPaidOrder`, `revokeEntitlement`, and `reissueEntitlement`: Zod-parse input, call one Supabase RPC, parse unknown RPC output into a discriminated result, and never hand-assemble paid/entitlement authority in browser code.

---

### `src/fulfillment/downloads.ts` and `src/app/api/downloads/route.ts` (service/route, request-response + file-I/O)

**Analogs:** `src/app/api/paypal/orders/route.ts`, `src/payments/queries.ts`, `src/catalog/media-actions.ts`

**Route imports and local JSON helper pattern** (route lines 1-14, 26-32):
```typescript
import {NextResponse} from 'next/server';
import {z} from 'zod';

import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {getGuestOrderAccessHashFromServer} from '@/payments/guest-access';
import {getAuthorizedOrderPayment} from '@/payments/queries';

const createRouteSchema = z.object({
  orderNumber: z.string().trim().min(1).max(80)
});

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, {status});
}
```

**Authorization-before-provider/API action pattern** (route lines 89-107):
```typescript
export async function POST(request: Request) {
  const input = createRouteSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return json(400, {status: 'invalid', code: 'invalid_paypal_order_request'});
  }

  const authClient = (await createSupabaseServerClient()) as unknown as RouteClient;
  const client = createSupabaseAdminClient() as unknown as RouteClient;
  const guestSecretHash = await getGuestOrderAccessHashFromServer(input.data.orderNumber);
  const authorized = await getAuthorizedOrderPayment({
    orderNumber: input.data.orderNumber,
    guestSecretHash,
    client: authClient
  });
  if (authorized.status !== 'found') {
    return json(404, {status: 'not_found'});
  }
}
```

**Private PDF object pattern** (`src/catalog/media-actions.ts` lines 297-328):
```typescript
const bytes = Buffer.from(await file.arrayBuffer());
const checksum = createHash('sha256').update(bytes).digest('hex');
const objectPath = `patterns/${parsed.data.productId}/${crypto.randomUUID()}.pdf`;
const supabase = await createSupabaseServerClient();

const upload = await supabase.storage.from(PATTERN_PDF_BUCKET).upload(objectPath, bytes, {
  contentType: patternPdfMimeType,
  upsert: false
});

const {error} = await supabase.from('product_digital_assets').upsert(
  {
    product_id: parsed.data.productId,
    bucket_id: PATTERN_PDF_BUCKET,
    object_path: objectPath,
    file_name: file.name,
    content_type: patternPdfMimeType,
    checksum_sha256: checksum,
    is_private: true
  },
  {onConflict: 'product_id'}
);
```

For downloads, invert the upload pattern: validate entitlement/token through an RPC or service query first, then use the admin/server Supabase Storage client to issue a short-lived signed URL. Do not put `createSignedUrl` in client components.

---

### `src/fulfillment/guest-access.ts` (utility, request-response)

**Analog:** `src/payments/guest-access.ts`

**Token hashing and 24-hour lifetime pattern** (lines 1-5, 41-43):
```typescript
import {createHash} from 'node:crypto';
import {cookies} from 'next/headers';

const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24;

export function hashGuestOrderAccessToken(rawToken: string) {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}
```

**HttpOnly cookie read/write pattern** (lines 49-55, 69-75, 94-97):
```typescript
return {
  httpOnly: true,
  sameSite: 'lax',
  secure: production,
  path: '/',
  ...(validExpires ? {expires: validExpires} : {maxAge: DEFAULT_MAX_AGE_SECONDS})
};

cookieStore.set(cookieName, input.rawToken, guestCookieOptions(...));

export async function getGuestOrderAccessHashFromServer(orderNumber: string) {
  const cookieStore = await cookies();
  return getGuestOrderAccessHash({cookieStore, orderNumber});
}
```

Use the hash function pattern for guest reopen, download, and claim email tokens. Store only token hashes, expiry, purpose, status, and scoped order/email facts in the database; raw tokens exist only at creation/click time.

---

### `src/fulfillment/email-outbox.ts` and `src/app/api/fulfillment/email-outbox/route.ts` (service/route, event-driven batch)

**Analogs:** `src/payments/transitions.ts`, `src/payments/admin-actions.ts`, `src/app/api/webhooks/paypal/route.ts`

**Service result pattern:** copy the typed RPC wrapper from `src/payments/transitions.ts` lines 17-31 for `claimDueTransactionalEmails` and `recordTransactionalEmailAttempt`.

**Admin/manual retry action pattern** (`src/payments/admin-actions.ts` lines 94-127):
```typescript
export async function confirmVietQrPaymentAction(formData: FormData): Promise<VietQrAdminActionResult> {
  const admin = await requireAdmin();
  const parsed = vietQrEvidenceSchema.extend({...}).safeParse({...});
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_vietqr_evidence'};
  }

  const loaded = await loadExpectedPayment(parsed.data.orderId, admin);
  if (loaded.status !== 'success' || !loaded.expected) {
    return {status: loaded.status === 'stale' ? 'stale' : 'invalid', code: 'vietqr_action_not_available'};
  }

  const transition = await applyPaymentTransition(...);
  revalidatePath('/admin/orders');
  return mapConfirmResult(transition.status, transition.paymentStatus);
}
```

Admin resend/retry should require `requireAdmin`, parse form input with Zod, load a current authorized row, enqueue a fresh outbox request/token, revalidate `/admin/orders`, and return a narrow discriminated result.

---

### `src/fulfillment/physical.ts` and admin physical actions (service, CRUD/event-driven)

**Analog:** `src/payments/admin-actions.ts`

**Load-current-state-before-mutation pattern** (lines 75-92):
```typescript
async function loadExpectedPayment(orderId: string, admin: unknown) {
  const client = await createAdminOrderQueryClient();
  const detail = await getAdminOrderDetail({
    orderId,
    client,
    requireAdmin: async () => admin
  });
  if (detail.status !== 'success') {
    return {status: detail.status, client, expected: null};
  }

  const expected = expectedFromOrder(detail.order);
  if (!expected || !detail.order.vietQrEvidence?.actionAvailable || !isVietQrPaymentActionAvailable(expected)) {
    return {status: 'stale', client, expected};
  }

  return {status: 'success', client, expected};
}
```

Use this for `awaiting_fulfillment -> packing -> shipped -> delivered`: load the order under admin auth, reject stale/impossible transitions, allow optional carrier/tracking on `shipped`, enqueue shipping email when shipped, and audit every change.

---

### Customer pages and components (pages/components, request-response)

**Analogs:** `src/app/[locale]/account/page.tsx`, `src/app/[locale]/account/account-overview.tsx`, `src/components/payments/order-payment-page.tsx`

**Localized dynamic account route pattern** (`src/app/[locale]/account/page.tsx` lines 1-8):
```typescript
import {renderAccountOverview} from './account-overview';
import type {Locale} from '@/i18n/routing';

export const dynamic = 'force-dynamic';

export default async function AccountPage({params}: {params: Promise<{locale: Locale}>}) {
  return renderAccountOverview({params, expectedLocale: 'en'});
}
```

**Signed-in account guard and localized rendering pattern** (`account-overview.tsx` lines 10-18):
```typescript
export async function renderAccountOverview({params, expectedLocale}: {params: Promise<{locale: Locale}>; expectedLocale: Locale}) {
  const {locale} = await params;
  if (locale !== expectedLocale) {
    notFound();
  }

  setRequestLocale(locale);
  const user = await requireUser({locale, next: getLocalizedPath('/account', locale)});
  const t = await getTranslations('account');
}
```

**Authorized order page pattern** (`OrderPaymentPage` lines 37-54):
```typescript
const client = await createSupabaseServerClient();
const guestSecretHash = await getGuestOrderAccessHashFromServer(orderNumber);
const result = await getAuthorizedOrderPayment({orderNumber, guestSecretHash, client: client as never});

if (result.status !== 'found') {
  return (
    <main className="mx-auto grid w-full max-w-[900px] gap-6 px-4 py-10 sm:px-6">
      <Alert variant="destructive">
        <AlertTitle>{t('accessDenied.heading')}</AlertTitle>
        <p>{t('accessDenied.body')}</p>
      </Alert>
    </main>
  );
}
```

**Split status/card layout pattern** (`OrderPaymentPage` lines 106-186, 189-227): keep primary status/actions in the main column and order/shipping summary in a sticky aside. Extend this with separate digital download and physical tracking panels so digital ready does not imply physical delivered.

---

### Admin pages and components (pages/components, request-response)

**Analogs:** `src/app/admin/orders/page.tsx`, `src/components/admin/orders/order-queue.tsx`, `src/components/admin/orders/order-detail.tsx`

**Admin page guard/query/component pattern** (`src/app/admin/orders/page.tsx` lines 1-24):
```typescript
import {requireAdmin} from '@/auth/guards';
import {OrderQueue} from '@/components/admin/orders/order-queue';
import {createAdminOrderQueryClient, getAdminOrderQueue} from '@/payments/queries';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  await requireAdmin();
  const client = await createAdminOrderQueryClient();
  const result = await getAdminOrderQueue({client, requireAdmin: async () => true});

  return result.status === 'success' ? <OrderQueue orders={result.orders} /> : <p role="alert">...</p>;
}
```

**Queue row/card pattern** (`order-queue.tsx` lines 15-45):
```typescript
{orders.length === 0 ? (
  <p className="text-[var(--muted-foreground)]">No payment orders need review.</p>
) : (
  <div className="grid gap-3">
    {orders.map((order) => (
      <Link
        key={order.orderId}
        href={`/admin/orders/${encodeURIComponent(order.orderNumber)}`}
        className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--border)] p-4 transition-colors hover:border-[var(--accent)] sm:grid-cols-[1.2fr_0.8fr_0.8fr_auto]"
      >
        ...
      </Link>
    ))}
  </div>
)}
```

**Admin detail status panel pattern** (`order-detail.tsx` lines 21-63):
```typescript
<Card>
  <CardHeader>
    <CardTitle>Payment and fulfillment state</CardTitle>
  </CardHeader>
  <CardContent>
    <dl className="grid gap-3 text-sm sm:grid-cols-3">
      <div>
        <dt className="font-semibold">Digital fulfillment</dt>
        <dd>{statusLabel(order.digitalFulfillmentStatus)}</dd>
      </div>
      <div>
        <dt className="font-semibold">Physical fulfillment</dt>
        <dd>{statusLabel(order.physicalFulfillmentStatus)}</dd>
      </div>
    </dl>
  </CardContent>
</Card>
```

Use this for failed email queue, entitlement actions, and physical tracking forms. Keep admin copy compact and operational.

---

### Tests (database, unit, e2e, security)

**Analogs:** `supabase/tests/database/04_payment_transitions.test.sql`, `tests/security/payment-boundaries.test.mjs`, `tests/unit/payments/order-queries.test.ts`

**Database contract test pattern** (`04_payment_transitions.test.sql` lines 1-18):
```sql
begin;

select plan(31);

select has_function('public', 'apply_payment_transition', array['jsonb'], 'shared transition command exists');

select results_eq(
  $$select status from jsonb_to_record(public.apply_payment_transition('{"transitionKey":"x"}'::jsonb)) as r(status text)$$,
  $$values ('invalid'::text)$$,
  'invalid transition payload returns a typed invalid result'
);
```

**Idempotent transition test pattern** (`04_payment_transitions.test.sql` lines 85-90):
```sql
select lives_ok(
  $$select public.apply_payment_transition(jsonb_build_object(
    'transitionKey', 'contract-duplicate-event',
    'source', 'paypal_webhook',
    'targetStatus', 'paid',
    'providerEventId', 'WH-TEST-CAPTURE-COMPLETED-0001'
  ))$$
);
```

**Security boundary file-list and source scan pattern** (`payment-boundaries.test.mjs` lines 5-17, 95-102):
```javascript
const contractFiles = [
  'tests/unit/payments/status-mapping.test.ts',
  'tests/integration/payment-concurrency.mjs',
  'tests/e2e/order-status.spec.ts',
  'supabase/tests/database/04_payment_model.test.sql'
];

test('payment implementation cannot add direct paid, order, inventory, or fulfillment mutation shortcuts', () => {
  const source = readExisting(paymentSurfaceFiles);
  assert.doesNotMatch(source, /\.from\(['"]checkout_orders['"]\)\.update\([^)]*paid/i);
  assert.doesNotMatch(source, /createSignedUrl|digital entitlement|download link|shipment|tracking number/i);
});
```

For Phase 5, add positive allow-list coverage for fulfillment modules and negative scans blocking public PDF URLs, raw token logging, service-role imports in client components, direct browser `createSignedUrl`, and cross-user order/download access.

## Shared Patterns

### Authentication and Admin Guards
**Source:** `src/auth/guards.ts` via call sites in `src/payments/admin-actions.ts` and `src/app/admin/orders/page.tsx`  
**Apply to:** all admin pages/actions, physical fulfillment mutations, entitlement revoke/reissue, email resend/retry.
```typescript
const admin = await requireAdmin();
const client = await createAdminOrderQueryClient();
const result = await getAdminOrderQueue({client, requireAdmin: async () => true});
```

### Guest Access Tokens
**Source:** `src/payments/guest-access.ts`  
**Apply to:** guest reopen tokens, guest download links, order claim proof tokens.
```typescript
export function hashGuestOrderAccessToken(rawToken: string) {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}
```

### Non-Enumerating Customer Access
**Source:** `src/payments/queries.ts` and `OrderPaymentPage`  
**Apply to:** order detail, download issue, guest reopen, order claim, account library.
```typescript
if (result.status !== 'found') {
  return (
    <Alert variant="destructive">
      <AlertTitle>{t('accessDenied.heading')}</AlertTitle>
      <p>{t('accessDenied.body')}</p>
    </Alert>
  );
}
```

### Server-Only Private Storage
**Source:** `src/catalog/media-actions.ts`  
**Apply to:** PDF signed URL issuing and admin PDF asset references.
```typescript
const upload = await supabase.storage.from(PATTERN_PDF_BUCKET).upload(objectPath, bytes, {
  contentType: patternPdfMimeType,
  upsert: false
});
```

### Typed Error Results
**Source:** `src/payments/transitions.ts`, `src/payments/admin-actions.ts`  
**Apply to:** all fulfillment services/actions/routes.
```typescript
if (!parsed.success) {
  return {status: 'invalid', code: 'invalid_payment_transition'};
}
if (error) {
  return {status: 'error', code: 'payment_transition_failed'};
}
```

### SQL Audit and Secret Hygiene
**Source:** `supabase/migrations/20260615034000_trusted_payments_orders.sql`  
**Apply to:** email attempts, entitlement events, guest claim records, fulfillment events.
```sql
create trigger commerce_audit_events_no_secret_metadata
before insert or update on public.commerce_audit_events
for each row execute function private.reject_unsafe_audit_metadata();
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/emails/*` | utility | transform | No existing transactional email rendering subsystem exists. Use localized helper functions first, following `next-intl` message organization and narrow typed inputs. |

## Metadata

**Analog search scope:** `src`, `supabase/migrations`, `supabase/tests`, `tests/unit`, `tests/e2e`, `tests/security`  
**Files scanned:** 149 from `rg --files`; 12 analog files read with line numbers  
**Pattern extraction date:** 2026-06-19
