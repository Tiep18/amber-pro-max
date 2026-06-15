# Phase 04: Trusted Payments and Orders - Pattern Map

**Mapped:** 2026-06-15
**Files analyzed:** 34 files/groups likely to be created or modified
**Analogs found:** 34 / 34

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/migrations/*_trusted_payments_orders.sql` | migration/model/state machine | transactional CRUD, event-driven | `supabase/migrations/20260615033000_market_exceptions.sql` | role + transaction match |
| `src/types/supabase.ts` | generated model types | transform | existing generated tables/RPCs in same file | exact |
| `src/payments/schemas.ts` | validation utility | transform | `src/checkout/schemas.ts` | exact |
| `src/payments/types.ts` | model/types | transform | `src/checkout/types.ts` | exact |
| `src/payments/transitions.ts` | service/RPC adapter | request-response, transactional CRUD | `src/checkout/submit-checkout.ts` | exact |
| `src/payments/queries.ts` | query service | request-response, CRUD projection | `src/app/admin/exceptions/page.tsx` + checkout order schema | role match |
| `src/payments/paypal/client.ts` | server-only provider service | request-response | `src/lib/supabase/server.ts` + `src/lib/env/server.ts` | boundary match |
| `src/payments/paypal/mapping.ts` | utility | transform | `src/checkout/submit-checkout.ts` result mapping | role match |
| `src/payments/paypal/verification.ts` | security/provider service | event-driven, request-response | no provider analog; use route/auth boundaries | partial |
| `src/payments/vietqr/instructions.ts` | utility | transform | `src/catalog/money.ts` + `src/checkout/schemas.ts` | role match |
| `src/app/api/paypal/orders/route.ts` | route/controller | request-response | `src/app/auth/callback/route.ts` | route match |
| `src/app/api/paypal/orders/[paypalOrderId]/capture/route.ts` | route/controller | request-response | `src/app/auth/callback/route.ts` | route match |
| `src/app/api/webhooks/paypal/route.ts` | webhook/controller | event-driven | `src/app/auth/callback/route.ts` | partial |
| `src/app/[locale]/order/[orderNumber]/page.tsx` | customer page | request-response | `src/app/[locale]/checkout/page.tsx` + `src/components/checkout/checkout-page.tsx` | role match |
| `src/components/payments/*` | customer components | request-response | `src/components/checkout/order-summary.tsx` | role match |
| `src/app/admin/orders/page.tsx` | admin page | request-response, CRUD projection | `src/app/admin/discounts/page.tsx` | exact |
| `src/app/admin/orders/[orderId]/page.tsx` | admin detail page | request-response, CRUD projection | `src/app/admin/exceptions/page.tsx` | role match |
| `src/components/admin/orders/*` | admin components | request-response, event-driven UI | `src/components/admin/commerce/exception-review.tsx` | role match |
| `src/payments/admin-actions.ts` | server action/controller | request-response, transactional CRUD | `src/checkout/admin-discount-actions.ts` | role match only |
| `src/lib/env/server.ts`, `.env.example` | config | request-response | existing files | exact |
| `src/lib/supabase/admin.ts` (if privileged client is needed) | server-only provider | request-response | `src/lib/supabase/server.ts` | role match |
| `src/messages/en.json`, `src/messages/vi.json` | localization config | transform | existing message namespaces | exact |
| `tests/unit/payments/status-mapping.test.ts` | unit test | transform | `tests/unit/checkout/submit-checkout.test.ts` | exact |
| `tests/unit/payments/paypal-client.test.ts` | unit test | request-response | `tests/unit/checkout/submit-checkout.test.ts` | role match |
| `tests/unit/payments/paypal-webhook.test.ts` | unit test | event-driven | `tests/unit/checkout/submit-checkout.test.ts` | role match |
| `tests/unit/payments/vietqr.test.ts` | unit test | transform | checkout schema/money tests | exact |
| `supabase/tests/database/04_payment_model.test.sql` | pgTAP model test | CRUD | `03_checkout_model.test.sql` | exact |
| `supabase/tests/database/04_payment_transitions.test.sql` | pgTAP behavior test | transactional CRUD | `03_checkout_concurrency.test.sql` | role match |
| `supabase/tests/database/04_payment_rls_audit.test.sql` | pgTAP security test | CRUD/security | `03_checkout_rls.test.sql` | exact |
| `tests/integration/payment-concurrency.mjs` | integration test | concurrent/event-driven | `tests/integration/checkout-concurrency.mjs` | role match |
| `tests/security/payment-boundaries.test.mjs` | security test | static boundary | `tests/security/checkout-boundaries.test.mjs` | exact |
| `tests/e2e/order-status.spec.ts` | E2E test | request-response | `tests/e2e/checkout.spec.ts` | role match |
| `tests/e2e/admin-orders.spec.ts` | E2E test | request-response | existing `tests/e2e/admin-*.spec.ts` | role match |
| `tests/e2e/admin-vietqr.spec.ts` | E2E test | request-response, transactional CRUD | existing admin E2E specs | role match |

## Pattern Assignments

### Database payment model and transition command

**Target:** migration, generated types, all database tests.

**Primary analog:** `supabase/migrations/20260615033000_market_exceptions.sql`

Copy the security-definer RPC boundary and fixed search path (lines 142-147):

```sql
create or replace function public.submit_checkout(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
```

Copy the early validation and typed JSON result style (lines 171-185), but enforce the stronger market/payment invariant:

```sql
if jsonb_typeof(p_payload) <> 'object'
  or length(idem_key) < 8
  or payment_intent not in ('paypal_intent', 'vietqr_intent') then
  return jsonb_build_object('status', 'invalid', 'code', 'invalid_checkout_submit');
end if;
```

Copy row locking before stock-sensitive work (lines 337-371):

```sql
select ir.id
into inventory_id
from public.inventory_records ir
where (...)
order by ir.id
for update;

available_units := public.checkout_available_inventory(inventory_id);
...
insert into public.checkout_inventory_reservations (...);
```

Copy duplicate/race normalization into safe results (lines 395-416):

```sql
exception
  when unique_violation then
    ...
  when serialization_failure or deadlock_detected then
    return jsonb_build_object('status', 'retryable', 'code', 'retryable_checkout_conflict');
  when others then
    return jsonb_build_object('status', 'conflict', 'code', 'checkout_unavailable');
```

For Phase 4, the single RPC must additionally lock payment, order, reservations, and inventory in deterministic order; insert the provider event/transition key first; validate the current transition; consume or release reservations; update the paid gate/order projection; and append audit rows in the same transaction. Return `applied`, `duplicate`, `stale`, `review_required`, or `invalid`.

RLS/grant analog (migration lines 428-445):

```sql
create policy "market exception requests are admin managed"
on public.market_exception_requests
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

revoke all on function public.create_market_exception_request(jsonb)
from public, anon, authenticated;
```

Payment events, evidence, transitions, reservations, and audit must not be directly writable by customers. Expose narrow read RPCs/policies for owner or guest order projections and narrow execute grants for trusted commands.

### Typed schemas, status mapping, and RPC adapters

**Targets:** `src/payments/schemas.ts`, `types.ts`, `transitions.ts`, PayPal mapping, VietQR instructions.

Validation analog from `src/checkout/schemas.ts` lines 1-13:

```typescript
import {z} from 'zod';

export const checkoutPaymentIntentSchema = z.enum(['paypal_intent', 'vietqr_intent']);
export const submitCheckoutInputSchema = quoteCartInputSchema.extend({
  idempotencyKey: z.string().trim().min(8).max(128),
  contactEmail: z.email().max(320)
});
```

Use Zod at every untrusted boundary. Amounts remain integer minor units; currency, market, provider event type, transition target, reference, timestamp, and idempotency key must be bounded enums/strings.

Discriminated result analog from `src/checkout/submit-checkout.ts` lines 5-16 and 22-47:

```typescript
export type SubmitCheckoutResult =
  | {status: 'success'; orderId: string; orderNumber: string}
  | {status: 'invalid' | 'stale' | 'conflict' | 'retryable' | 'error'; code: string};

function mapRpcResult(value: unknown): SubmitCheckoutResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {status: 'error', code: 'checkout_submit_failed'};
  }
  ...
}
```

RPC adapter analog (lines 50-67):

```typescript
const parsed = schema.safeParse(input);
if (!parsed.success) return {status: 'invalid', code: 'invalid_input'};

const {data, error} = await client.rpc('payment_transition', {p_payload: parsed.data});
if (error) return {status: 'error', code: 'payment_transition_failed'};
return mapRpcResult(data);
```

Keep provider payload types separate from customer-safe statuses. Customer projections must map detailed internal states to the eight approved lifecycle labels.

### Server-only environment and provider clients

**Targets:** `src/payments/paypal/client.ts`, `verification.ts`, `src/lib/env/server.ts`, `.env.example`, optionally `src/lib/supabase/admin.ts`.

Server module analog from `src/auth/guards.ts` line 1:

```typescript
import 'server-only';
```

Environment analog from `src/lib/env/server.ts` lines 1-6:

```typescript
import {getClientEnv} from './client';

export function getServerEnv(source: NodeJS.ProcessEnv = process.env) {
  return {...getClientEnv(source)};
}
```

Extend this with Zod-validated server-only PayPal client ID/secret, webhook ID, expected merchant/receiver ID, Supabase secret key, VietQR bank configuration, and expiry-job secret. Never place these under `NEXT_PUBLIC_*`.

Authenticated Supabase server-client construction analog from `src/lib/supabase/server.ts` lines 6-29 should be copied structurally, but a privileged client must use the server secret key, no browser export, and no cookie/session dependence.

PayPal client-specific rules with no local analog:

- Inject `fetch`/HTTP transport so unit tests use fixtures and never call live PayPal.
- Send a stable `PayPal-Request-Id` for create and capture.
- Build provider amounts only from authoritative order rows.
- Treat OAuth/provider failures as typed errors without logging credentials or full sensitive payloads.

### Route handlers and PayPal webhook

**Targets:** all three PayPal route handlers.

Route handler import/export shape from `src/app/auth/callback/route.ts` lines 1-4 and 16-27:

```typescript
import {NextRequest, NextResponse} from 'next/server';

export async function GET(request: NextRequest) {
  ...
  return NextResponse.redirect(new URL(next, request.nextUrl.origin));
}
```

Use `POST(request: Request)` and JSON responses for create/capture/webhook. Validate route params/body before service calls and return generic public errors.

Webhook-specific pattern not present in the codebase:

1. Read the raw body once before parsing.
2. Verify PayPal transmission headers/signature against the configured webhook ID.
3. Reconcile provider order/capture and validate local mapping, merchant, amount, and currency.
4. Persist the provider event and call the one transition RPC.
5. Return success for already-recorded duplicates; never repeat stock effects.

The PayPal return page/recheck may request reconciliation, but it must display `verifying` until the verified transition reports paid.

### Admin authorization and VietQR actions

**Targets:** `src/payments/admin-actions.ts`, admin list/detail pages and components.

Guard analog from `src/auth/guards.ts` lines 35-44:

```typescript
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireUser({locale: 'en', next: '/admin'});
  const supabase = await createSupabaseServerClient();
  const {data} = await supabase.from('user_roles')
    .select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
  if (!data) redirect('/admin/forbidden');
  return user;
}
```

Server action shape from `src/checkout/admin-discount-actions.ts` lines 1-6 and 54-68:

```typescript
'use server';

import {z} from 'zod';
import {requireAdmin} from '@/auth/guards';

export async function action(formData: FormData) {
  await requireAdmin();
  const parsed = schema.safeParse({...});
  if (!parsed.success) return {status: 'invalid', code: 'invalid_input'};
}
```

After application authorization, call exactly one payment transition RPC. The RPC must independently enforce admin authorization with `private.is_admin()` or a tightly controlled privileged-source contract. Confirmation requires bank reference, received amount, and received time; rejection requires a reason. Include an action idempotency key for double-submit/stale-tab safety.

Client action UI analog from `src/components/admin/commerce/exception-review.tsx` lines 13-56:

```tsx
const [result, setResult] = useState<Result | null>(null);
const [pending, startTransition] = useTransition();
...
<Button disabled={pending} onClick={() => startTransition(async () => {
  const actionResult = await action(...);
  setResult(actionResult);
  router.refresh();
})}>
```

Retain pending disabling and refresh, but add required fields, explicit confirm/reject dialogs, stale/duplicate result messaging, and the inventory-release consequence.

### Customer and admin pages

**Customer targets:** localized order page and payment components.

Thin localized route analog from `src/app/[locale]/checkout/page.tsx` lines 1-8:

```tsx
type Params = Promise<{locale: Locale}>;

export default async function Route({params}: {params: Params}) {
  const {locale} = await params;
  return <Page locale={locale} />;
}
```

Summary-card analog from `src/components/checkout/order-summary.tsx` lines 58-86:

```tsx
<Card>
  <CardHeader><CardTitle>{t.title}</CardTitle></CardHeader>
  <CardContent>
    <div className="flex justify-between gap-3 tabular-nums">...</div>
    <Separator />
    <div className="flex justify-between gap-3 text-lg font-semibold tabular-nums">...</div>
  </CardContent>
</Card>
```

Use immutable order-line snapshots, `formatMoney`, `tabular-nums`, semantic `Alert` variants, and the existing max-width/responsive card layout. Guest lookup must require order number plus opaque guest token and compare only a stored hash; account owners use server-authenticated identity. Neither path may reveal whether another order exists.

**Admin targets:** list/detail pages and timeline.

SSR authorization/query analog from `src/app/admin/discounts/page.tsx` lines 38-45:

```tsx
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const {data} = await supabase.from('...').select('...').order('updated_at', {ascending: false});
}
```

Card/empty-state analog is lines 47-92. Order list filters/search should remain in URL search params. Detail should present separate order, payment, paid-gate, digital, physical, and reservation states plus immutable lines and append-only timeline.

### Localization

**Targets:** `src/messages/en.json`, `src/messages/vi.json`.

Copy the parallel namespace shape shown in both message files, for example `navigation`, `catalog`, `auth`, `account`, and `admin`. Add matching `orders` and `payments` keys in both languages. Do not continue the component-local `copy` object pattern from `checkout-page.tsx` for the new large status surface.

### Test patterns

**pgTAP model:** copy `supabase/tests/database/03_checkout_model.test.sql` lines 1-30:

```sql
begin;
select plan(...);
select has_table(...);
select col_type_is(...);
select col_is_fk(...);
select has_index(...);
select has_function(...);
select * from finish();
rollback;
```

**RLS/grants:** copy `03_checkout_rls.test.sql` lines 5-29 and 39-103 using `policies_are`, `function_privs_are`, and `table_privs_are`. Add append-only audit tests and prove anon/authenticated cannot mutate payment/event/audit/reservation state.

**Typed unit adapters:** copy `tests/unit/checkout/submit-checkout.test.ts` lines 36-73: inject an `rpc`/HTTP mock, assert exact boundary arguments, and assert discriminated mapped output.

**E2E fixtures:** copy `tests/e2e/checkout.spec.ts` lines 3-28 for local Supabase setup and lines 94-101 for cleanup. Seed orders/payments through privileged test setup, then exercise only public/admin UI paths.

**Security boundary:** copy `tests/security/checkout-boundaries.test.mjs` lines 1-21: maintain an explicit file list and static assertions that no secrets, fulfillment, or unsafe logging cross the boundary.

**Concurrency:** `tests/integration/checkout-concurrency.mjs` is only a starting shell. Phase 4 must add a real parallel execution scenario against local Supabase proving two paid commands, webhook/recheck races, and admin double-submit produce one transition, one stock decrement, and one terminal state.

## Shared Patterns

### Authorization

**Source:** `src/auth/guards.ts:16-44`, foundation `private.is_admin()`.

Apply server identity checks to owner views and `requireAdmin()` to every admin page/action. Preserve database RLS/function authorization as the second boundary; UI hiding is never authorization.

### Transaction and Idempotency

**Source:** `supabase/migrations/20260615033000_market_exceptions.sql:192-208,337-417`.

Use unique idempotency/event indexes, `FOR UPDATE`, deterministic lock order, conditional updates, and typed duplicate results. All money, paid-gate, stock, reservation, and audit effects belong to one transaction.

### Error Handling

**Source:** `src/checkout/submit-checkout.ts:22-67`, `src/checkout/actions.ts:46-62`.

Return bounded discriminated results to UI/routes. Do not expose raw SQL, PayPal, signature, merchant, or storage errors. Preserve enough internal evidence in protected event/audit rows for admin diagnosis.

### Money and Snapshots

**Source:** `src/checkout/types.ts:42-85`, `src/components/checkout/order-summary.tsx:51-84`.

Use integer minor units plus explicit currency. Render and reconcile against immutable order snapshots, never browser-submitted amounts or current catalog prices.

### Dynamic Views

**Source:** `src/app/admin/discounts/page.tsx:8,38-45`.

Payment/order status pages are dynamic server-rendered views. Revalidation/refresh updates projections; it does not perform or imply a paid transition.

## Patterns That Must Not Be Copied

| Existing Pattern | Source | Why Unsafe for Phase 4 | Required Replacement |
|---|---|---|---|
| Multiple table writes in one admin action | `src/checkout/exceptions.ts:101-151` | Grant insert and request update can partially succeed; no single money/stock transaction | One transactional payment transition RPC |
| Direct admin `.update()` for terminal state | `src/checkout/exceptions.ts:154-174`, `admin-discount-actions.ts:114-131` | No transition matrix, event dedupe, audit coupling, or inventory coupling | Re-authorize, validate, then call state-machine RPC |
| Redirect callback as proof of success | `src/app/auth/callback/route.ts:16-27` | A provider return is customer-controlled navigation, not verified payment evidence | Show verifying; server recheck/webhook must verify and transition |
| Generic catch-all that hides all database failures | migration lines 415-416 | Payment mismatches and late completed payments require protected review evidence | Persist verified facts and return typed `review_required`/duplicate/stale outcomes |
| Component-local bilingual copy | `src/components/checkout/checkout-page.tsx:16-47` | Phase 4 has many shared customer/admin statuses and messages | Add parallel `orders`/`payments` namespaces to message JSON |
| Browser-generated business idempotency key only | `checkout-page.tsx:78-92` | Provider events, captures, rechecks, and admin actions need source-specific stable keys | Provider event IDs/request IDs plus database unique transition keys |
| Static regex-only concurrency test | `tests/integration/checkout-concurrency.mjs:4-18` | Confirms SQL text exists but not exact-once behavior under races | Execute concurrent commands against local database and assert final rows/stock |
| Service-role fallback-looking E2E fixture conventions | `tests/e2e/checkout.spec.ts:3-14` | Payment tests must not normalize unsafe production secret handling | Keep privileged keys test-only and add static secret-boundary assertions |

## No Analog Found

| File/Concern | Role | Data Flow | Reason |
|---|---|---|---|
| PayPal signature verification and reconciliation internals | security/provider service | event-driven | No payment provider integration exists yet |
| Real payment transition concurrency execution | integration test | concurrent/event-driven | Existing test inspects migration text rather than racing database commands |
| Scheduled expiry invocation | job/config | batch | No cron migration/config exists; use the shared expiry RPC and test/manual invocation until scheduling is planned |

Use the concrete architecture and provider rules in `04-RESEARCH.md` for these gaps, while retaining the local server-only, validation, typed-result, and transactional conventions above.

## Metadata

**Analog search scope:** `src/`, `supabase/migrations/`, `supabase/tests/database/`, `tests/unit/`, `tests/integration/`, `tests/security/`, `tests/e2e/`

**Files scanned:** 188 source/test files plus Phase 4 context, research, UI, validation, and project instructions

**Strong analogs used:** 18

**Pattern extraction date:** 2026-06-15

