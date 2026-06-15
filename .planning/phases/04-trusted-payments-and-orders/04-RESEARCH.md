# Phase 4: Trusted Payments and Orders - Research

**Researched:** 2026-06-15  
**Domain:** PayPal Orders API, verified webhooks, VietQR manual confirmation, order/payment state machines, inventory finalization, audit, Supabase RLS  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Payment Lifecycle and Order State
- **D-01:** Payment records and payment events are the source of truth for paid transitions. An order does not become paid merely because a callback returns or an admin action is submitted; it must pass through a verified, idempotent payment transition.
- **D-02:** Customer-facing payment status stays simple: awaiting payment, verifying payment, paid, payment failed or cancelled, expired, partially refunded, and refunded.
- **D-03:** Admin-facing payment status includes provider event details, VietQR evidence, reservation deadline, actor/source, duplicate or retry history, and audit records.
- **D-04:** Phase 4 models and displays `partially_refunded` and `refunded`, but does not build a full refund initiation workflow.
- **D-05:** A valid paid transition opens the paid gate for later fulfillment and finalizes inventory, but Phase 4 does not create digital entitlements, download emails, or physical shipping tasks.
- **D-06:** If the payment window or reservation deadline expires, the order/payment becomes `expired`, inventory is released, and the customer must create a new checkout/order to buy again.
- **D-07:** If PayPal fails or is cancelled, or if VietQR is rejected by admin, inventory is released immediately and the order is no longer payable.
- **D-08:** Customers cannot retry payment on the same order after `failed`, `cancelled`, `rejected`, or `expired`. A new checkout/order must recalculate current price, stock, shipping, and discounts.

### PayPal and VietQR Confirmation
- **D-09:** PayPal webhook verification is the primary confirmation path for paid status. The PayPal return/callback page may trigger a server-side recheck, but it should not claim the order is paid before the verified payment transition succeeds.
- **D-10:** When a customer returns from PayPal before the webhook has confirmed payment, the order page should show a verifying-payment state with the order number, remaining reservation/payment window, and a refresh or recheck affordance.
- **D-11:** A PayPal event may mark an order paid only after validating webhook authenticity/signature, provider order mapping, merchant or receiver identity, amount, currency, and event deduplication.
- **D-12:** VietQR admin confirmation is manual: the customer transfers outside the app, then an authorized admin checks the bank account and confirms or rejects payment in the admin UI.
- **D-13:** VietQR confirmation must store the bank reference, received amount, and received date/time. Admin note and screenshot/receipt attachment are optional.
- **D-14:** If a VietQR transfer has the wrong amount or wrong reference, admin rejects the payment, records the reason, releases inventory immediately, and the order is no longer payable.
- **D-15:** PayPal webhook events, PayPal rechecks, VietQR admin confirmation/rejection, duplicate webhooks, delayed events, and admin double-submits must all flow through one idempotent state-machine command for payment and inventory transitions.

### Inventory Finalization and Audit
- **D-16:** A paid transition finalizes or consumes each active reservation exactly once and permanently reflects sold stock. Duplicate paid events must not decrement inventory again.
- **D-17:** Failed, cancelled, rejected, and expired orders change reservations to `released` or `expired` and keep the reservation records for audit. Reservations are not deleted.
- **D-18:** Released or expired reservations must record when they were released and why or which transition/source caused the release.
- **D-19:** Phase 4 audit trail is required for important money, stock, and paid-gate transitions, including order created, payment event received, payment verified paid, payment failed/cancelled/rejected/expired, inventory finalized, inventory released, and admin VietQR confirmed/rejected.
- **D-20:** Phase 4 audit does not need to log every customer view, refresh, or admin click; focus on state transitions that affect payment, stock, access rights, or customer-visible order status.
- **D-21:** Admin order detail should show an order timeline with payment events, VietQR evidence, inventory finalization/release, actor/source, amount/reference, customer email, and immutable line snapshots.

### the agent's Discretion
- Exact database enum/status names may be chosen during planning, provided they preserve separate payment state, order summary state, and fulfillment gate semantics.
- Exact customer copy for verifying payment, expired payment windows, and rejected payments may follow existing bilingual UI patterns.
- Exact admin timeline layout and filtering may follow existing admin table/detail patterns as long as the required audit evidence remains inspectable.

### Deferred Ideas (OUT OF SCOPE)

None - discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|---|---|---|
| INV-04 | Finalize reserved inventory exactly once after confirmed payment | One transactional transition command, row locks, reservation `consumed`, conditional stock decrement |
| INV-05 | Release stock on cancel/fail/expiry | Terminal transition matrix, retained reservation rows, scheduled expiry command |
| ORD-01 | Customer sees order number and summary | Localized owner/guest order route using immutable snapshots |
| ORD-02 | Separate order, payment, digital, and physical states | Payment row as truth, order summary projection, explicit paid gate, blocked fulfillment states |
| ORD-03 | Admin sees history, transitions, payments, fulfillment, customer | Protected list/detail/timeline queries over audit and immutable snapshots |
| PAY-01 | Eligible international USD order uses PayPal | Market/method invariant and PayPal JS SDK handoff |
| PAY-02 | Server creates and captures exact PayPal order | Server-only REST client, authoritative local amount, stable provider request IDs |
| PAY-03 | Verify webhook, mapping, merchant, amount, currency | Raw-body verification plus provider reconciliation validation |
| PAY-04 | Idempotent PayPal event and paid transition | Unique provider event and transition keys, no-op duplicate semantics |
| PAY-05 | VND order gets exact VietQR instructions | Stable order reference, integer VND amount, bank instruction snapshot, deadline |
| PAY-06 | Admin confirms/rejects VietQR with audit | `requireAdmin`, database admin check, evidence fields, same transition command |
| PAY-07 | No fulfillment before full paid state | Database paid gate remains closed for all non-paid/review states |
| PAY-08 | Customer/admin see payment lifecycle | Customer status mapping and detailed admin provider/evidence view |
| SEC-03 | Audit sensitive admin and state transitions | Append-only commerce audit table and authorization/security tests |

Nguồn: [VERIFIED: `.planning/REQUIREMENTS.md`, `04-CONTEXT.md`]
</phase_requirements>

## Summary

Phase 4 nên mở rộng trực tiếp order shell của Phase 3, không tạo một hệ order thứ hai. `checkout_orders`, immutable `checkout_order_lines`, và `checkout_inventory_reservations` đã là aggregate bền vững; phần còn thiếu là payment record, provider event inbox, append-only audit, paid gate, và một database command duy nhất để áp dụng mọi transition ảnh hưởng tiền hoặc stock. [VERIFIED: codebase grep và migrations Phase 3] [VERIFIED: D-01, D-15 đến D-21]

PayPal phải có hai lớp idempotency: stable `PayPal-Request-Id` cho create/capture tại provider, và unique transition/event keys trong Postgres cho business effects. Browser chỉ khởi tạo button và chuyển provider order ID về server; server tạo/capture/reconcile từ authoritative local order. `CHECKOUT.ORDER.APPROVED` không phải paid; chỉ capture `COMPLETED` sau signature/mapping/merchant/amount/currency validation mới có thể gọi paid transition. [CITED: https://developer.paypal.com/studio/checkout/standard/integrate] [CITED: https://developer.paypal.com/api/rest/reference/idempotency/] [CITED: https://developer.paypal.com/api/rest/webhooks/event-names/]

VietQR v1 chỉ là payment instruction. Tạo QR với exact VND amount và unique ASCII reference, giữ payment pending, rồi cho admin đã được xác thực nhập bank reference, received amount/time và confirm/reject. Cả PayPal webhook/recheck lẫn VietQR admin action đều phải gọi cùng một transition RPC để tránh logic lệch nhau. [VERIFIED: D-12 đến D-15] [CITED: https://www.vietqr.io/danh-sach-api/link-tao-ma-nhanh/api-tao-ma-qr/]

**Primary recommendation:** Lập kế hoạch năm slice theo roadmap, nhưng bắt buộc 04-01 hoàn thành state machine/RPC/audit/inventory transaction trước khi 04-02 hoặc 04-04 thêm bất kỳ provider/UI mutation nào. [VERIFIED: `.planning/ROADMAP.md`, D-15]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Payment/order state authority | Database / Storage | API / Backend | PostgreSQL transaction khóa và đổi payment, order, reservation, inventory, audit cùng lúc. [VERIFIED: D-01, D-15, D-16] |
| PayPal create/capture/recheck | API / Backend | Browser / Client | Route Handler giữ secret và gọi REST API; browser chỉ render JS SDK và gửi provider ID. [CITED: https://developer.paypal.com/studio/checkout/standard/integrate] |
| PayPal webhook verification | API / Backend | Database / Storage | Route Handler giữ raw body/headers; DB dedupe và apply transition. [CITED: https://developer.paypal.com/api/rest/webhooks/rest/] |
| VietQR instructions | API / Backend | Browser / Client | Server quyết định bank snapshot, exact amount/reference/deadline; UI chỉ hiển thị. [VERIFIED: D-12, D-13] |
| VietQR confirmation | API / Backend | Database / Storage | Server Action re-authorizes admin; RPC thực hiện transition/audit. [CITED: https://nextjs.org/docs/app/guides/data-security] |
| Inventory finalize/release | Database / Storage | — | Row locking và conditional updates ngăn duplicate decrement/release. [CITED: https://www.postgresql.org/docs/17/explicit-locking.html] |
| Customer order status | Frontend Server (SSR) | Database / Storage | Dynamic server page đọc owner/guest-scoped projection, không lộ provider payload. [VERIFIED: existing App Router/RLS pattern] |
| Admin timeline | Frontend Server (SSR) | API / Backend | `requireAdmin()` trước query; action tự re-check authorization. [VERIFIED: existing admin pattern] [CITED: https://nextjs.org/docs/app/guides/data-security] |
| Reservation expiry | Database / Storage | API / Backend | Scheduled DB function gọi cùng transition command; correctness vẫn kiểm deadline trong command. [CITED: https://supabase.com/docs/guides/cron] |

## Project Constraints (from AGENTS.md)

- Next.js 16.2.x, React 19.2.x, TypeScript 5.9.x, Supabase Postgres/Auth/Storage, App Router, integer minor units, Zod, Vitest và Playwright là stack đã khóa. [VERIFIED: `AGENTS.md`, `package.json`]
- Việt Nam dùng VND + VietQR manual; quốc tế dùng USD + PayPal. Không dùng tự động exchange rate. [VERIFIED: `AGENTS.md`]
- Không fulfillment/download trước full paid confirmation; mixed cart dùng một payment gate. [VERIFIED: `AGENTS.md`]
- Guest checkout không được yêu cầu account; RLS bảo vệ order/payment/private data. [VERIFIED: `AGENTS.md`]
- Service/secret key chỉ server; admin role được xác minh server-side/database-owned, không tin client metadata. [VERIFIED: `AGENTS.md`]
- Không public PDF URL, không floating-point money, không microservices v1. [VERIFIED: `AGENTS.md`]
- Repo chưa có conventions/architecture bổ sung ngoài patterns hiện hữu; phải theo source/migration/test hiện tại. [VERIFIED: `AGENTS.md`]
- Mọi file-changing work phải đi qua GSD workflow; nghiên cứu hiện tại được khởi tạo bởi phase workflow. [VERIFIED: `AGENTS.md`, init.phase-op]

## Existing Codebase Findings

### Reuse

| Existing asset | How Phase 4 should use it |
|---|---|
| `checkout_orders` | Giữ làm order aggregate; mở rộng summary status, paid gate và fulfillment-block fields. [VERIFIED: `20260615032000_checkout_orders_reservations.sql`] |
| `checkout_order_lines` | Dùng nguyên immutable snapshots cho PayPal amount validation và customer/admin summary. [VERIFIED: migration + immutability trigger] |
| `checkout_inventory_reservations` | Thêm consumed/finalized metadata và release reason/source; không thay bằng bảng mới. [VERIFIED: D-16 đến D-18] |
| `submit_checkout(jsonb)` | Tiếp tục là order/reservation creation boundary; thêm payment shell + order-created audit trong cùng transaction. [VERIFIED: existing RPC, D-19] |
| `requireAdmin()` / `private.is_admin()` | Dùng cả application và database boundary cho VietQR actions/admin views. [VERIFIED: `src/auth/guards.ts`, foundation migration] |
| Vitest + pgTAP + Playwright + Node security tests | Mở rộng cùng cấu trúc `tests/unit`, `supabase/tests/database`, `tests/e2e`, `tests/security`. [VERIFIED: repository test tree] |

### Gaps that planning must address

1. Checkout hiện cho chọn cả `paypal_intent` và `vietqr_intent` bất kể market/currency; DB cũng chỉ allowlist intent mà chưa enforce `intl+USD+PayPal` và `vn+VND+VietQR`. Phải thêm invariant tại submit/payment creation, không chỉ ẩn radio trên UI. [VERIFIED: `src/components/checkout/contact-form.tsx`, `submit_checkout` migration, project constraints]
2. `getServerEnv()` hiện chỉ có public Supabase variables; chưa có PayPal credentials, webhook ID, expected merchant ID, Supabase secret/server client, VietQR bank config hoặc cron secret/config. [VERIFIED: `.env.example`, `src/lib/env/server.ts`]
3. Guest token được trả một lần nhưng checkout UI chưa redirect/store cookie và chưa có order route. Phase 4 cần server-set HttpOnly scoped guest-order cookie hoặc một server exchange flow; không đưa raw token vào localStorage/log. [VERIFIED: `submit_checkout`, `checkout-page.tsx`, security constraints]
4. Reservation chưa có `consumed`, `finalized_at`, `release_reason`, hoặc transition reference; inventory `quantity_on_hand` chưa bao giờ decrement sau payment. [VERIFIED: catalog/checkout migrations]
5. Chưa có payment, payment event, audit, order timeline, PayPal route, order pages, admin order pages, hoặc scheduled expiry. [VERIFIED: repository file inventory]
6. Existing admin exception approval performs multiple table writes outside one RPC. Không sao chép pattern này cho payments; VietQR confirm/reject phải là một transactional RPC vì tiền và stock là high-risk. [VERIFIED: `src/checkout/exceptions.ts`, D-15]

## Standard Stack

### Core

| Technology | Version | Purpose | Why Standard |
|---|---|---|---|
| Next.js | 16.2.9, published 2026-06-09 | Route Handlers, SSR order pages, Server Actions | Đã cài và là project framework. [VERIFIED: npm registry, `package.json`] |
| PostgreSQL via Supabase | Local Postgres 17 target / managed current | Transactional payment state, locks, RLS, audit | Aggregate đã nằm trong Postgres; payment/stock cần atomicity. [VERIFIED: `supabase/config.toml`, migrations] |
| `@supabase/supabase-js` | 2.108.1 installed; 2.108.2 current 2026-06-15 | Browser/session client và server-only privileged client | Giữ installed pin trong Phase 4 trừ khi có lý do upgrade; patch mới cùng ngày chưa cần thiết cho scope. [VERIFIED: npm registry, `package.json`] |
| Zod | 4.4.3, published 2026-05-04 | Validate route/action/env/provider payload boundaries | Đã cài và là project validation pattern. [VERIFIED: npm registry, codebase] |
| PayPal Orders API / Payments API | REST v2 | Create, capture, retrieve, reconcile | Official payment APIs; server owns amount and credentials. [CITED: https://developer.paypal.com/docs/api/orders/v2/] |
| PayPal REST Webhooks | current REST webhook API | Signature verification and capture events | Official asynchronous confirmation path. [CITED: https://developer.paypal.com/api/rest/webhooks/rest/] |
| PayPal JavaScript SDK | hosted current SDK | Render PayPal buttons and return provider order ID | Official frontend integration calls backend create/capture endpoints. [CITED: https://developer.paypal.com/studio/checkout/standard/integrate] |

### Supporting

| Technology | Version | Purpose | When to Use |
|---|---|---|---|
| VietQR Quick Link or `v2/generate` | current documented API | Generate QR from account, exact amount, transfer content | Use for VN/VND payment instruction only, never confirmation. [CITED: https://www.vietqr.io/danh-sach-api/link-tao-ma-nhanh/] |
| Supabase Cron / `pg_cron` | managed current | Call expiry database function periodically | Use for pending order expiry/release; command must remain idempotent. [CITED: https://supabase.com/docs/guides/cron] |
| Vitest | 4.1.8 installed; 4.1.9 current 2026-06-15 | Pure transition/mapping/provider parser tests | Keep installed version during phase to avoid unrelated test-runner churn. [VERIFIED: npm registry, `package.json`] |
| Playwright | 1.60.0, published 2026-05-11 | Customer/admin/payment UI tests | Sandbox or mocked provider edge plus local order flows. [VERIFIED: npm registry, `package.json`] |
| pgTAP via Supabase CLI | CLI 2.106.0 local | Schema, grants, transition and concurrency tests | Required for exact-once inventory and RLS. [VERIFIED: local environment, existing tests] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|---|---|---|
| Direct `fetch` to PayPal REST | PayPal Server SDK | Official integration documents both, but direct REST avoids a new dependency and fits existing thin provider wrapper. [CITED: https://developer.paypal.com/studio/checkout/standard/integrate] |
| Hosted PayPal JS SDK script | `@paypal/paypal-js` | Package wrapper can improve loading ergonomics, but no new package is required for this phase. [VERIFIED: official integration uses hosted SDK] |
| Supabase Cron | Vercel Cron | Vercel Cron needs an authenticated HTTP route and can overlap; DB cron calls the expiry function with zero network hop. [CITED: https://vercel.com/docs/cron-jobs/manage-cron-jobs] [CITED: https://supabase.com/docs/guides/cron] |
| VietQR `v2/generate` | Quick Link | `v2/generate` uses API credentials; Quick Link is simpler. Both are instruction generation, not bank confirmation. [CITED: official VietQR docs] |

**Installation:** Không thêm npm package. Dùng existing dependencies, Web `fetch`, hosted PayPal JS SDK và SQL migrations. [VERIFIED: stack synthesis]

**Version verification:** `next@16.2.9`, `zod@4.4.3`, `@playwright/test@1.60.0` đang current; `@supabase/supabase-js@2.108.2` và `vitest@4.1.9` mới hơn installed một patch vào ngày nghiên cứu. Không upgrade trong Phase 4 trừ khi implementation cần fix cụ thể. [VERIFIED: npm registry 2026-06-15]

## Package Legitimacy Audit

Phase này không cài package mới, vì vậy Package Legitimacy Gate không tạo install checkpoint. Existing packages được giữ nguyên pin. [VERIFIED: Standard Stack recommendation]

| Package | Registry | Verdict | Disposition |
|---|---|---|---|
| `next` | npm | SUS chỉ vì release mới; official repo + 37M weekly downloads | Existing pin, không cài mới. [VERIFIED: package-legitimacy seam] |
| `@supabase/supabase-js` | npm | SUS chỉ vì release mới; official repo + 20M weekly downloads | Existing pin 2.108.1, không upgrade. [VERIFIED: package-legitimacy seam] |
| `zod` | npm | OK | Existing pin. [VERIFIED: package-legitimacy seam] |
| `vitest` | npm | SUS chỉ vì patch phát hành cùng ngày | Existing pin 4.1.8, không upgrade. [VERIFIED: package-legitimacy seam] |
| `@playwright/test` | npm | OK | Existing pin. [VERIFIED: package-legitimacy seam] |

**Packages removed due to SLOP verdict:** none. [VERIFIED: package-legitimacy seam]  
**Packages flagged for new-install human verification:** none, vì không có package mới. [VERIFIED: package plan]

## Architecture Patterns

### System Architecture Diagram

```text
Checkout submit
  -> submit_checkout transaction
      -> order + immutable lines + active reservations
      -> payment shell + order_created audit
      -> redirect to localized order/payment page

International USD / PayPal
  Browser PayPal button
    -> POST /api/paypal/orders
        -> authorize local owner/guest order
        -> validate intl + USD + paypal + unexpired/payable
        -> PayPal Create Order (stable PayPal-Request-Id)
        -> persist provider order mapping
    -> PayPal buyer approval
    -> POST /api/paypal/orders/{id}/capture
        -> authorize mapping
        -> PayPal Capture (stable PayPal-Request-Id)
        -> server-side retrieve/reconcile
        -> payment_transition(source=paypal_recheck)

PayPal webhook
  -> POST /api/webhooks/paypal
      -> read raw body
      -> verify signature/webhook ID
      -> insert-or-increment provider event inbox
      -> validate related order + merchant + amount + currency
      -> payment_transition(source=paypal_webhook)
      -> 2xx after durable processing/no-op duplicate

Vietnam VND / VietQR
  Order page
    -> exact bank snapshot + amount + unique reference + deadline + QR
  Admin bank check
    -> requireAdmin + Zod
    -> payment_transition(source=vietqr_admin, evidence)

payment_transition transaction
  -> lock payment + order
  -> lock reservations/inventory in stable order
  -> validate current state + deadline + idempotency key
  -> paid?
       yes -> decrement on_hand once -> reservation consumed
            -> paid_at gate -> fulfillment remains blocked for Phase 5
       no terminal -> reservation released/expired with reason
  -> append transition + commerce audit
  -> return applied | duplicate | stale | review_required

Supabase Cron
  -> expire_due_payments()
      -> same payment_transition command per due order
```

Nguồn: [VERIFIED: D-01 đến D-21, existing architecture] [CITED: PayPal, PostgreSQL, Supabase Cron official docs]

### Recommended Project Structure

```text
src/
├── payments/
│   ├── schemas.ts                 # transition/admin/provider boundary schemas
│   ├── types.ts                   # internal and customer status types
│   ├── queries.ts                 # owner/admin order/payment projections
│   ├── transitions.ts             # thin typed RPC adapter
│   ├── paypal/
│   │   ├── client.ts              # server-only OAuth + REST fetch
│   │   ├── mapping.ts             # amount/event/status mapping
│   │   └── verification.ts        # raw webhook verification/reconciliation
│   └── vietqr/
│       └── instructions.ts        # exact amount/reference/QR builder
├── app/api/paypal/orders/route.ts
├── app/api/paypal/orders/[paypalOrderId]/capture/route.ts
├── app/api/webhooks/paypal/route.ts
├── app/[locale]/order/[orderNumber]/page.tsx
├── app/admin/orders/page.tsx
├── app/admin/orders/[orderId]/page.tsx
├── components/payments/
└── components/admin/orders/

supabase/
├── migrations/*_trusted_payments_orders.sql
└── tests/database/04_*.test.sql
```

File mapping là recommendation phù hợp codebase, không phải factual framework requirement. [VERIFIED: existing project structure + architecture synthesis]

### Pattern 1: One Payment Transition Command

**What:** Một RPC nhận `order_id`, `target`, `source`, `idempotency_key`, actor/evidence và provider facts đã verified. RPC là nơi duy nhất thay payment/order/paid gate/reservation/inventory/audit. [VERIFIED: D-01, D-15, D-16]

**Recommended result contract:**

```typescript
type PaymentTransitionResult =
  | {status: 'applied'; paymentStatus: string; orderStatus: string}
  | {status: 'duplicate'; paymentStatus: string; orderStatus: string}
  | {status: 'stale'; code: 'invalid_transition' | 'deadline_passed'}
  | {status: 'review_required'; code: 'late_completed_payment' | 'provider_mismatch'}
  | {status: 'invalid'; code: string};
```

**Transition matrix:**

| Current | Input | Result | Inventory |
|---|---|---|---|
| awaiting/verifying | verified paid | paid | Consume active reservations and decrement on-hand once. [VERIFIED: D-16] |
| awaiting/verifying | failed/cancelled/rejected | terminal failure | Release active reservations immediately. [VERIFIED: D-07, D-17] |
| awaiting/verifying | deadline expiry | expired | Mark reservations expired. [VERIFIED: D-06, D-17] |
| paid | duplicate paid | no-op duplicate | No stock mutation. [VERIFIED: D-16] |
| paid | partial/full refund event | partially_refunded/refunded | Visibility only in Phase 4; no refund initiation. [VERIFIED: D-04] |
| terminal failure/expired | verified paid arrives late | internal review_required, customer “verifying” | Paid gate closed; do not decrement released stock. [VERIFIED: D-06, D-08, D-15 synthesis] |
| any | older/non-authoritative event | recorded/no-op | No regression. [VERIFIED: idempotent state-machine requirement] |

### Pattern 2: Transactional Inventory Consume

**What:** Lock order/payment first, sau đó reservation/inventory theo stable inventory ID. Chỉ reservations `active` của order được consume. Conditional update phải kiểm `quantity_on_hand >= quantity_reserved`, decrement và mark reservation `consumed` trong cùng transaction. [CITED: https://www.postgresql.org/docs/17/explicit-locking.html]

```sql
-- Source: PostgreSQL explicit-locking pattern, adapted to project schema.
select cir.id, cir.inventory_record_id, cir.quantity_reserved
from public.checkout_inventory_reservations cir
where cir.order_id = p_order_id
order by cir.inventory_record_id
for update;

update public.inventory_records ir
set quantity_on_hand = ir.quantity_on_hand - r.quantity_reserved,
    updated_at = now()
where ir.id = r.inventory_record_id
  and ir.quantity_on_hand >= r.quantity_reserved;

-- Require exactly one updated row, then mark reservation consumed.
```

Sau consume, availability không đổi ngoài lượng đã bán: trước paid, active reservation bị trừ khỏi on-hand khi tính available; sau paid, on-hand giảm và reservation không còn active. [VERIFIED: existing `checkout_available_inventory` semantics]

### Pattern 3: Provider Event Inbox + Transition Ledger

**What:** Tách receipt/dedup khỏi business transition.

| Table | Required uniqueness | Purpose |
|---|---|---|
| `payments` | one active payment per order; unique provider order/capture IDs where present | Source of payment lifecycle truth. [VERIFIED: D-01] |
| `payment_events` | unique `(provider, provider_event_id)` | Store first/last receipt, delivery count, type, verification result, sanitized facts, payload digest. [VERIFIED: D-03, D-15] |
| `payment_transitions` | unique `(payment_id, source, idempotency_key)` | Exact-once business command ledger and before/after states. [VERIFIED: D-15] |
| `commerce_audit_events` | append-only ID; indexed order/payment/time | Human-inspectable timeline for money, stock, admin actions. [VERIFIED: D-19 đến D-21, SEC-03] |

Duplicate webhook nên increment `delivery_count`/`last_received_at`, ghi audit `payment_event_duplicate`, rồi trả 2xx; không tạo transition hoặc stock side effect mới. [VERIFIED: D-03, D-15] [CITED: https://developer.paypal.com/api/rest/webhooks/rest/]

### Pattern 4: Raw-Body Webhook Verification

```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/route
// and https://developer.paypal.com/api/rest/webhooks/rest/
export async function POST(request: Request) {
  const rawBody = await request.text();
  const headers = {
    transmissionId: request.headers.get('paypal-transmission-id'),
    transmissionTime: request.headers.get('paypal-transmission-time'),
    certUrl: request.headers.get('paypal-cert-url'),
    authAlgo: request.headers.get('paypal-auth-algo'),
    transmissionSig: request.headers.get('paypal-transmission-sig')
  };

  // Verify exact rawBody before JSON.parse(rawBody).
}
```

Postback verification phải gửi `webhook_event` đúng nội dung nhận được; self-verification tính CRC32 trên raw body. Không parse rồi stringify trước verification. [CITED: https://developer.paypal.com/api/rest/webhooks/rest/]

### Pattern 5: PayPal Create/Capture Idempotency

Persist hai request IDs riêng trên payment row, ví dụ deterministic UUIDs/UUID columns `create_request_id` và `capture_request_id`. Create và capture không được dùng cùng ID vì PayPal yêu cầu uniqueness theo API call type. Retry timeout/5xx dùng lại ID cũ; concurrent same-ID requests có thể khiến request thứ hai fail nên local handler phải retrieve current provider state. [CITED: https://developer.paypal.com/api/rest/reference/idempotency/]

Create payload dùng local `checkout_orders.total_minor`, `USD`, một purchase unit, `custom_id` hoặc `invoice_id` chứa local order number/ID; không nhận amount từ browser. [VERIFIED: PAY-02, existing integer-money model] [CITED: https://developer.paypal.com/docs/api/orders/v2/]

Capture response không tự mở paid gate. Capture handler chuyển page sang verifying, rồi server retrieve order/capture details và gọi same transition với source `paypal_recheck`; webhook vẫn là primary confirmation. [VERIFIED: D-09, D-10]

### Pattern 6: VietQR Instruction Snapshot

Reference nên dùng existing `order_number` ASCII, unique, ngắn hơn giới hạn `addInfo`; amount là positive integer VND; bank/account/template fields lấy từ server config và snapshot vào payment evidence để lịch sử không đổi khi seller config thay đổi. [VERIFIED: existing order number and D-13] [CITED: https://www.vietqr.io/danh-sach-api/link-tao-ma-nhanh/]

Admin confirm input:

```typescript
const vietQrDecisionSchema = z.object({
  paymentId: z.guid(),
  decision: z.enum(['confirm', 'reject']),
  bankReference: z.string().trim().min(1).max(128),
  receivedAmountMinor: z.number().int().nonnegative(),
  receivedAt: z.iso.datetime(),
  reason: z.string().trim().max(1000).optional(),
  note: z.string().trim().max(1000).optional()
});
```

Admin action phải `requireAdmin()` trước RPC; RPC tiếp tục kiểm `private.is_admin()` hoặc nhận privileged server source, lock payment, kiểm expected reference/amount/deadline và idempotency key. [VERIFIED: existing admin pattern, D-12 đến D-15] [CITED: https://nextjs.org/docs/app/guides/data-security]

### Pattern 7: Customer and Guest Order Access

- Signed-in user: RLS owner check qua `owner_user_id = auth.uid()`. [VERIFIED: existing checkout RLS]
- Guest: sau submit, Server Action đổi raw guest token thành HttpOnly, Secure, SameSite=Lax cookie scoped cho order route hoặc opaque session; DB chỉ giữ hash. [VERIFIED: existing guest hash design + security constraints]
- Không đặt raw guest token trong localStorage, analytics, logs hoặc long-lived URL. [VERIFIED: AGENTS security rules]
- Customer projection chỉ trả simple status, deadline, totals và immutable lines; không trả raw/sanitized provider event payload, merchant secrets, admin notes hoặc customer khác. [VERIFIED: D-02, D-03, success criterion 5]

### Anti-Patterns to Avoid

- **Mark paid trong `onApprove` hoặc return URL:** buyer approval/callback không phải verified capture. [CITED: PayPal event docs] [VERIFIED: D-09]
- **Hai transition implementations cho webhook và admin:** sẽ lệch stock/audit/idempotency. Dùng một RPC. [VERIFIED: D-15]
- **Network call trong SQL transaction:** giữ lock lâu và tạo partial uncertainty. Provider I/O nằm ngoài DB transaction. [VERIFIED: project architecture]
- **Delete reservation khi release:** mất dispute/audit evidence. [VERIFIED: D-17, D-18]
- **Update order/payment rồi decrement stock ở request sau:** crash giữa hai bước tạo paid order nhưng chưa consume stock. [VERIFIED: D-16]
- **Trust event order/time:** webhook có retry/delay; transition matrix phải monotonic. [CITED: PayPal retry behavior]
- **Store full raw provider payload indefinitely:** có thể chứa PII; chỉ giữ sanitized facts + hash nếu không có retention decision. [VERIFIED: AGENTS security rules]
- **Cho customer đọc base payment event/audit tables:** dùng scoped projection/query. [VERIFIED: D-02, D-03, RLS rules]
- **Cho admin confirm mismatched VietQR amount/reference:** mismatch phải reject và release. [VERIFIED: D-14]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| PayPal checkout UI | Custom credential/card form | PayPal hosted JavaScript SDK | Provider owns payer authentication/payment UI. [CITED: official PayPal integration] |
| PayPal signature protocol | Invented HMAC/header check | PayPal self-verification or verify-webhook-signature endpoint | Protocol requires exact provider headers, webhook ID and raw body. [CITED: PayPal webhook docs] |
| Provider POST dedup | Random retry logic | `PayPal-Request-Id` persisted per operation | Official provider idempotency returns current request status. [CITED: PayPal idempotency docs] |
| Business exact-once | In-memory flags | Unique DB keys + row locks + one transaction | Serverless instances/retries are concurrent and ephemeral. [CITED: PostgreSQL locking] |
| Money conversion | Float/string arithmetic | Existing integer minor units + explicit currency | Prevents amount mismatch/rounding. [VERIFIED: project constraint] |
| Admin authorization | Hidden button/client role | `requireAdmin()` + RLS/private DB check | Server Actions are directly reachable by POST. [CITED: Next.js data security] |
| Reservation expiry | UI timer as authority | Database deadline + scheduled idempotent expiry command | Browser may close; backend owns release. [CITED: Supabase Cron] |
| QR image renderer | Custom EMV/VietQR encoder | Official VietQR Quick Link/API | Avoids implementing payment QR format. [CITED: VietQR official docs] |

**Key insight:** “Exactly once” không đến từ webhook provider. Nó đến từ accepting at-least-once provider delivery nhưng making local transition effects idempotent and transactional. [CITED: PayPal retry/idempotency docs] [VERIFIED: D-15, D-16]

## Common Pitfalls

### Pitfall 1: Approval Confused with Capture
**What goes wrong:** `CHECKOUT.ORDER.APPROVED` hoặc `onApprove` set local paid.  
**Why it happens:** Tên callback gợi ý flow hoàn tất.  
**How to avoid:** Capture server-side, then verify/retrieve `PAYMENT.CAPTURE.COMPLETED`, mapping, merchant, amount, currency.  
**Warning signs:** paid row không có provider capture ID hoặc verified event/recheck source.  
Nguồn: [CITED: PayPal integration/event docs] [VERIFIED: D-09, D-11]

### Pitfall 2: Duplicate Paid Decrements Inventory Twice
**What goes wrong:** webhook retry hoặc recheck + webhook cùng consume reservation.  
**Why it happens:** mỗi handler tự update stock.  
**How to avoid:** unique transition key, lock payment/order/reservations, only consume `active` reservations, commit audit together.  
**Warning signs:** `quantity_on_hand` giảm nhiều hơn order quantity; nhiều `inventory_finalized` audit cho cùng reservation.  
Nguồn: [VERIFIED: D-15, D-16] [CITED: PostgreSQL locking]

### Pitfall 3: Out-of-Order Events Regress State
**What goes wrong:** delayed pending/declined event đổi paid về failed, hoặc late completed event mở gate sau expiry.  
**Why it happens:** handler maps event directly to status without transition matrix.  
**How to avoid:** monotonic allowed transitions; stale event becomes recorded no-op; late money after terminal release becomes `review_required` and keeps paid gate closed.  
**Warning signs:** terminal state timestamp moves backward; released reservation becomes active again.  
Nguồn: [VERIFIED: D-06 đến D-08, D-15]

### Pitfall 4: Expiry Depends Only on Cleanup Job
**What goes wrong:** cron delay leaves an order payable after deadline.  
**Why it happens:** handlers check status but not `reservation_expires_at`.  
**How to avoid:** every create/capture/confirm transition validates deadline under lock; cron is housekeeping that applies the same expiry command.  
**Warning signs:** provider order can be created after local deadline.  
Nguồn: [VERIFIED: D-06] [CITED: Supabase Cron]

### Pitfall 5: Webhook Verification Uses Re-serialized JSON
**What goes wrong:** signature verification fails or validates a different byte representation.  
**Why it happens:** framework body parsed before verification.  
**How to avoid:** `await request.text()`, verify exact bytes, then parse.  
**Warning signs:** sandbox real webhooks fail while manually constructed tests pass.  
Nguồn: [CITED: https://developer.paypal.com/api/rest/webhooks/rest/]

### Pitfall 6: Market/Payment Method Mismatch
**What goes wrong:** VN/VND order reaches PayPal or intl/USD order receives VietQR.  
**Why it happens:** current UI and RPC allow both intents.  
**How to avoid:** database check/submit validation and provider endpoint invariant, not UI-only filtering.  
**Warning signs:** payment row provider contradicts order market/currency.  
Nguồn: [VERIFIED: current code gap, project constraints]

### Pitfall 7: Admin Double-submit or Stale Tab
**What goes wrong:** two admins confirm/reject same VietQR payment differently.  
**Why it happens:** UI disabled state is not concurrency control.  
**How to avoid:** stable action idempotency key, row lock, conditional transition; second action returns duplicate/stale.  
**Warning signs:** confirm and reject audit entries both show applied.  
Nguồn: [VERIFIED: D-15] [CITED: Next.js direct POST security]

### Pitfall 8: Guest Order Secret Leakage
**What goes wrong:** raw token lands in URL history, analytics, logs or localStorage.  
**Why it happens:** easiest redirect appends token query.  
**How to avoid:** server-set HttpOnly scoped cookie or one-time exchange; hash at rest; generic access errors.  
**Warning signs:** `guestAccessToken` rendered in client props or console.  
Nguồn: [VERIFIED: AGENTS security rules, existing token design]

## Code Examples

### Server-owned PayPal amount

```typescript
// Source: https://developer.paypal.com/docs/api/orders/v2/
function paypalAmount(totalMinor: number) {
  if (!Number.isSafeInteger(totalMinor) || totalMinor <= 0) {
    throw new Error('invalid local order total');
  }
  return {
    currency_code: 'USD',
    value: `${Math.floor(totalMinor / 100)}.${String(totalMinor % 100).padStart(2, '0')}`
  };
}
```

Chỉ gọi helper sau khi load local order và xác nhận currency `USD`; browser không gửi `totalMinor`. [VERIFIED: PAY-02]

### Stable provider request IDs

```typescript
// Source: https://developer.paypal.com/api/rest/reference/idempotency/
type PayPalOperation = 'create' | 'capture';

function requestIdFor(paymentId: string, operation: PayPalOperation) {
  // Persist the generated UUID once per payment+operation.
  // Do not derive a non-UUID string that exceeds PayPal's recommended limit.
  return loadPersistedRequestId(paymentId, operation);
}
```

### Transition call shared by webhook and VietQR

```typescript
// Source: project D-15, adapted to existing Supabase RPC pattern.
await supabase.rpc('apply_payment_transition', {
  p_payload: {
    orderId,
    target: 'paid',
    source: 'paypal_webhook',
    idempotencyKey: eventId,
    providerFacts: {
      providerOrderId,
      providerCaptureId,
      merchantId,
      amountMinor,
      currencyCode
    }
  }
});
```

### VietQR Quick Link

```typescript
// Source: https://www.vietqr.io/danh-sach-api/link-tao-ma-nhanh/
const url = new URL(
  `https://img.vietqr.io/image/${encodeURIComponent(bankId)}-${encodeURIComponent(accountNo)}-${encodeURIComponent(template)}.png`
);
url.searchParams.set('amount', String(order.totalMinor));
url.searchParams.set('addInfo', order.orderNumber);
url.searchParams.set('accountName', accountName);
```

## State of the Art

| Old/unsafe approach | Current recommended approach | Impact |
|---|---|---|
| Browser calls capture and trusts callback | Browser calls server create/capture; verified webhook/recheck drives local transition | Prevents client-forged paid state. [CITED: PayPal integration] |
| Webhook-specific business logic | Provider event inbox + shared idempotent command | Handles duplicate/out-of-order/admin paths uniformly. [VERIFIED: D-15] |
| Full raw payload logging | Sanitized structured facts + raw payload digest | Keeps forensic mapping without unnecessary PII. [VERIFIED: AGENTS security constraints] |
| One order status for everything | Payment state + order summary + paid gate + separate fulfillment states | Prevents fulfillment before payment and supports mixed orders. [VERIFIED: ORD-02, D-05] |
| Cleanup deletes holds | Retained consumed/released/expired reservations with reason/source | Supports stock/payment audit. [VERIFIED: D-17, D-18] |
| Legacy Supabase auth helpers/service role in browser | `@supabase/ssr`, RLS, server-only secret client | Matches current project and Supabase guidance. [CITED: Supabase RLS docs] |

**Deprecated/outdated:**
- PayPal Payments v1 event names such as `PAYMENT.CAPTURE.DENIED` must not be mixed blindly with Payments v2, where documented declined event is `PAYMENT.CAPTURE.DECLINED`. [CITED: https://developer.paypal.com/api/rest/webhooks/event-names/]
- `CHECKOUT.ORDER.COMPLETED` is documented for marketplaces/platforms, not the normal merchant paid signal for this flow. [CITED: PayPal event names]
- Page-level admin checks do not protect Server Actions; action-level authorization remains required. [CITED: Next.js data security]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| — | Không có claim `[ASSUMED]`; recommendations được suy ra từ locked decisions, codebase hoặc official docs. | All | — |

## Open Questions

1. **PayPal production identity and eligibility**
   - What we know: merchant ID must be validated, and seller-specific eligibility remains a launch concern. [VERIFIED: D-11, `.planning/STATE.md`]
   - What's unclear: live `PAYPAL_CLIENT_ID`, secret, webhook ID, expected merchant ID/email, approved currencies/countries and seller account readiness are not configured. [VERIFIED: environment audit]
   - Recommendation: planner adds a human checkpoint before live-mode verification; sandbox implementation can proceed with env placeholders. [VERIFIED: risk synthesis]

2. **VietQR seller bank configuration**
   - What we know: Phase 4 needs bank identifier, account number/name, template and exact transfer reference. [CITED: VietQR docs]
   - What's unclear: seller-approved receiving account and whether to use Quick Link or authenticated `v2/generate`. [VERIFIED: environment audit]
   - Recommendation: implement a typed server env contract and use Quick Link by default; keep generator adapter replaceable. [VERIFIED: no-package architecture]

3. **Late PayPal capture after local terminal expiry**
   - What we know: locked decisions forbid reopening expired orders and forbid fulfillment without a valid paid transition. [VERIFIED: D-06, D-08]
   - What's unclear: no Phase 4 refund initiation workflow exists. [VERIFIED: D-04]
   - Recommendation: internal `review_required/late_payment_detected`, customer maps to “verifying payment,” paid gate stays closed, admin timeline exposes the anomaly for manual seller resolution. [VERIFIED: safety-first synthesis]

4. **Scheduler deployment**
   - What we know: Supabase Cron can call database functions; no cron migration/config exists yet. [CITED: Supabase Cron] [VERIFIED: repo grep]
   - What's unclear: whether managed project has Cron enabled and desired interval.
   - Recommendation: use `pg_cron` every minute or operationally acceptable short interval, plus deadline checks in every transition so cron timing is not correctness-critical. [VERIFIED: architecture synthesis]

## Environment Availability

| Dependency | Required By | Available | Version / State | Fallback |
|---|---|---|---|---|
| Node.js | Next.js/payment modules | ✓ | 20.19.4, meets Next.js >=20.9 project constraint. [VERIFIED: local probe, AGENTS] | — |
| npm | Existing dependencies | ✓ | 10.8.1. [VERIFIED: local probe] | — |
| Supabase CLI | migrations/pgTAP/types | ✓ | 2.106.0. [VERIFIED: local probe] | — |
| Local Supabase | DB tests | ✓ partial | API/DB running; some optional services stopped. [VERIFIED: `supabase status`] | DB/payment tests do not require imgproxy/pooler. |
| Docker | Local Supabase | ✓ | Server 28.5.1. [VERIFIED: local probe] | — |
| PayPal Sandbox credentials | Provider integration/E2E | ✗ | No PayPal env names found. [VERIFIED: env-name audit] | Mock HTTP unit tests; sandbox checkpoint required. |
| PayPal webhook public HTTPS endpoint | Real webhook test | ✗ local-only | Not represented in repo/env. [VERIFIED: repo audit] | PayPal simulator/forwarding for development; deployed preview for real sandbox event. |
| VietQR bank configuration | VN instruction UI | ✗ | No bank/account/template env names. [VERIFIED: env-name audit] | Fixture config for automated tests; seller checkpoint required. |
| Supabase Cron job | Expiry release | ✗ | No cron migration/config. [VERIFIED: repo grep] | Directly call expiry RPC in tests/manual local run. |

**Missing dependencies with no fallback:**
- Live/sandbox provider verification cannot complete without PayPal sandbox app credentials and webhook ID. [VERIFIED: environment audit]
- Production VietQR cannot display seller-approved instructions without bank configuration. [VERIFIED: environment audit]

**Missing dependencies with fallback:**
- Automated tests can use deterministic mocked PayPal HTTP responses and local DB events until sandbox checkpoint. [VERIFIED: validation design]
- Local expiry tests call the DB function directly before managed Cron is configured. [VERIFIED: Supabase Cron model]

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Unit | Vitest 4.1.8, `vitest.config.ts`. [VERIFIED: package/config] |
| Database | pgTAP through `supabase test db`. [VERIFIED: package scripts] |
| Integration/concurrency | Node test/script plus local Supabase. [VERIFIED: existing Phase 3 pattern] |
| E2E | Playwright 1.60.0, Chromium, one worker. [VERIFIED: config] |
| Security | Node tests + pgTAP RLS/grants. [VERIFIED: existing scripts] |
| Quick run | `npx vitest run tests/unit/payments && npm run db:test` targeted file during implementation. [VERIFIED: existing toolchain] |
| Full suite | `npm run ci`. [VERIFIED: package.json] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| INV-04 | Duplicate paid events consume each reservation and decrement stock once | pgTAP + concurrency | `supabase test db supabase/tests/database/04_payment_transitions.test.sql` | ❌ Wave 0 |
| INV-05 | fail/cancel/reject/expire release or expire reservation with reason | pgTAP | `supabase test db supabase/tests/database/04_payment_transitions.test.sql` | ❌ Wave 0 |
| ORD-01 | Owner/guest sees order number, lines, totals, status | E2E + RLS | `npx playwright test tests/e2e/order-status.spec.ts` | ❌ Wave 0 |
| ORD-02 | Payment, order summary, paid gate and fulfillment states remain separate | pgTAP + unit | `supabase test db supabase/tests/database/04_payment_model.test.sql` | ❌ Wave 0 |
| ORD-03 | Admin timeline shows payment/evidence/transitions/customer and blocks customer | E2E + security | `npx playwright test tests/e2e/admin-orders.spec.ts` | ❌ Wave 0 |
| PAY-01/02 | USD intl creates/captures server-side exact amount | unit + route integration | `npx vitest run tests/unit/payments/paypal-client.test.ts` | ❌ Wave 0 |
| PAY-03 | Signature, mapping, merchant, amount and currency validation | unit + route integration | `npx vitest run tests/unit/payments/paypal-webhook.test.ts` | ❌ Wave 0 |
| PAY-04 | Duplicate/out-of-order/recheck+webhook are no-op-safe | pgTAP + integration | `node tests/integration/payment-concurrency.mjs` | ❌ Wave 0 |
| PAY-05 | VietQR amount/reference/deadline and market invariant | unit + E2E | `npx vitest run tests/unit/payments/vietqr.test.ts` | ❌ Wave 0 |
| PAY-06 | Admin confirm/reject authorized, audited, double-submit safe | E2E + pgTAP | `npx playwright test tests/e2e/admin-vietqr.spec.ts` | ❌ Wave 0 |
| PAY-07 | No entitlement/shipment/paid gate before paid | security + pgTAP | `node --test tests/security/payment-boundaries.test.mjs` | ❌ Wave 0 |
| PAY-08 | Customer mapping and admin detailed statuses including refunds | unit + E2E | `npx vitest run tests/unit/payments/status-mapping.test.ts` | ❌ Wave 0 |
| SEC-03 | Audit is append-only and records privileged transitions | pgTAP + security | `supabase test db supabase/tests/database/04_payment_rls_audit.test.sql` | ❌ Wave 0 |

### Required High-risk Scenarios

1. Same `PAYMENT.CAPTURE.COMPLETED` delivered twice: one applied transition, one duplicate receipt, one stock decrement. [VERIFIED: PAY-04, INV-04]
2. Capture recheck marks paid, webhook arrives later: webhook records event but no second paid effect. [VERIFIED: D-09, D-15]
3. Pending/declined event arrives after paid: no regression. [VERIFIED: monotonic state requirement]
4. Expiry and paid transition race: row lock permits one terminal business outcome; late completed money becomes review-required, never silent fulfillment. [VERIFIED: D-06, D-15]
5. Two admins confirm VietQR simultaneously: one applied, one duplicate/stale; one inventory consume. [VERIFIED: D-15, D-16]
6. Confirm then reject from stale tab: reject cannot regress paid. [VERIFIED: state matrix]
7. Wrong VietQR reference or amount: confirm is rejected, explicit rejection transition releases stock. [VERIFIED: D-14]
8. Forged webhook signature, merchant mismatch, provider-order mismatch, amount mismatch, currency mismatch: event recorded as rejected/suspicious, paid gate closed. [VERIFIED: D-11]
9. PayPal create/capture timeout retry with same `PayPal-Request-Id`: one provider resource/effect and one local mapping. [CITED: PayPal idempotency]
10. Customer substitutes another order ID; guest token from order A used on B; non-admin calls VietQR action: denied without data leakage. [VERIFIED: RLS/security requirements]

### Sampling Rate

- **Per task commit:** relevant Vitest file plus targeted pgTAP file, under 30 seconds where practical. [VERIFIED: Nyquist configuration]
- **Per wave merge:** `npm run test:unit && npm run db:reset && npm run db:lint && npm run db:test && npm run typecheck`. [VERIFIED: existing CI stages]
- **Phase gate:** `npm run ci`, concurrency scenario repeated, PayPal sandbox create/capture/real webhook test, and manual VietQR/admin UAT. [VERIFIED: high-risk phase scope]

### Wave 0 Gaps

- [ ] `tests/unit/payments/status-mapping.test.ts`
- [ ] `tests/unit/payments/paypal-client.test.ts`
- [ ] `tests/unit/payments/paypal-webhook.test.ts`
- [ ] `tests/unit/payments/vietqr.test.ts`
- [ ] `supabase/tests/database/04_payment_model.test.sql`
- [ ] `supabase/tests/database/04_payment_transitions.test.sql`
- [ ] `supabase/tests/database/04_payment_rls_audit.test.sql`
- [ ] `tests/integration/payment-concurrency.mjs`
- [ ] `tests/security/payment-boundaries.test.mjs`
- [ ] `tests/e2e/order-status.spec.ts`
- [ ] `tests/e2e/admin-orders.spec.ts`
- [ ] `tests/e2e/admin-vietqr.spec.ts`
- [ ] Provider HTTP test seam/fixture so unit tests never call live PayPal.

## Security Domain

**Enforcement:** enabled, ASVS Level 1, block on HIGH. [VERIFIED: `.planning/config.json`]  
OWASP ASVS stable 5.0.0 was released 2025-05-30. [CITED: https://owasp.org/www-project-application-security-verification-standard/]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---|---|---|
| V2 Authentication | yes | Supabase SSR auth for users/admin; provider OAuth client credentials server-only. [VERIFIED: stack] |
| V3 Session Management | yes | HttpOnly guest-order cookie; no payment secrets/local authoritative data in localStorage. [VERIFIED: security design] |
| V4 Access Control | yes | Owner RLS, guest hash scope, `requireAdmin`, `private.is_admin`, endpoint-level checks. [CITED: Supabase RLS, Next.js data security] |
| V5 Input Validation | yes | Zod at route/action boundaries plus DB constraints and exact provider fact checks. [VERIFIED: project pattern] |
| V6 Cryptography | yes | PayPal official signature protocol; SHA-256 token/payload digest; never custom payment crypto. [CITED: PayPal webhook docs] |
| V7 Error/Logging | yes | Append-only audit, sanitized provider facts, no secret/raw token/payment-sensitive logs. [VERIFIED: SEC-03, AGENTS] |
| V13 API/Web Service | yes | HTTPS provider endpoints, auth per endpoint, idempotency, request validation, bounded retries. [CITED: OWASP REST Security] |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---|---|---|
| Forged PayPal webhook | Spoofing | Verify signature from raw body/headers/webhook ID, then validate provider facts. [CITED: PayPal webhook docs] |
| Replay/duplicate event | Tampering | Unique provider event ID + unique transition key + no-op duplicate. [VERIFIED: D-15] |
| Client amount/provider tampering | Tampering | Load local order, enforce market/currency/method, ignore browser amount. [VERIFIED: PAY-02] |
| Inventory double-spend | Tampering | Stable row locks, consume active reservation once, conditional decrement. [CITED: PostgreSQL locking] |
| IDOR order/payment | Information disclosure | Owner RLS or guest hash; admin reauthorization; no broad anon select. [CITED: Supabase RLS] |
| Admin action forgery | Elevation of privilege | `requireAdmin()` in every action + DB-side admin check. [CITED: Next.js data security] |
| Secret leakage | Information disclosure | Non-`NEXT_PUBLIC_` env, `server-only` modules, secret scan. [CITED: Next.js env docs] |
| Webhook/cron resource exhaustion | Denial of service | Body size limit, event dedupe before expensive work, indexed due queries, bounded batches. [VERIFIED: security synthesis] |
| Audit log injection/PII leakage | Tampering/Information disclosure | Structured typed metadata, sanitize strings, no raw secrets/tokens/provider payload dump. [VERIFIED: AGENTS] |
| Late paid event after stock release | Repudiation/Tampering | Record immutable anomaly, keep gate closed, admin review; never resurrect reservation silently. [VERIFIED: locked terminal semantics] |

### RLS and Privilege Rules

- Base `payments`, `payment_events`, `payment_transitions`, `commerce_audit_events` bật RLS. [CITED: Supabase RLS]
- Customer không được direct-select provider event/audit base tables; expose server-owned projection or carefully scoped view with `security_invoker = true`. [CITED: Supabase RLS views]
- Webhook/cron code dùng dedicated server-only secret client; secret key không được qua `NEXT_PUBLIC_`. [CITED: Supabase RLS, Next.js env docs]
- `apply_payment_transition` phải revoke from public/anon; grant only authenticated admin if it self-checks admin, and/or privileged server role. Customer-facing endpoints không được execute arbitrary target transition. [CITED: Supabase database functions]
- Security-definer helpers đặt trong `private` schema với controlled/empty `search_path`; exposed public RPC chỉ là narrow contract. [CITED: Supabase database functions]
- Audit rows append-only: no UPDATE/DELETE grants for app roles; corrections là event mới. [VERIFIED: SEC-03 audit semantics]

## Sources

### Primary (HIGH confidence)

- Codebase migrations/source/tests - current Phase 1-3 schema, RLS, admin and test patterns. [VERIFIED: codebase]
- `.planning/phases/04-trusted-payments-and-orders/04-CONTEXT.md` - locked decisions and scope. [VERIFIED: context]
- `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/PROJECT.md` - requirements and success criteria. [VERIFIED: planning docs]
- `AGENTS.md` - stack, security, commerce and workflow constraints. [VERIFIED: project instructions]

### Official Documentation (MEDIUM confidence)

- https://developer.paypal.com/studio/checkout/standard/integrate - backend create/capture and frontend callbacks.
- https://developer.paypal.com/docs/api/orders/v2/ - Orders v2 resources and amount/purchase-unit fields.
- https://developer.paypal.com/docs/api/payments/v2/ - capture detail and reconciliation fields.
- https://developer.paypal.com/api/rest/reference/idempotency/ - `PayPal-Request-Id`.
- https://developer.paypal.com/api/rest/webhooks/rest/ - raw-body signature verification and retry behavior.
- https://developer.paypal.com/api/rest/webhooks/event-names/ - Payments v2 event semantics.
- https://nextjs.org/docs/app/api-reference/file-conventions/route - Route Handlers and request body.
- https://nextjs.org/docs/app/guides/environment-variables - server-only env behavior.
- https://nextjs.org/docs/app/guides/data-security - action-level authorization.
- https://supabase.com/docs/guides/database/functions - function privileges and security definer.
- https://supabase.com/docs/guides/database/postgres/row-level-security - RLS, service key and views.
- https://supabase.com/docs/guides/cron - scheduled database functions.
- https://www.postgresql.org/docs/17/explicit-locking.html - row locks and deadlocks.
- https://www.vietqr.io/danh-sach-api/link-tao-ma-nhanh/ - QR URL fields and limits.
- https://www.vietqr.io/danh-sach-api/link-tao-ma-nhanh/api-tao-ma-qr/ - QR generation API.
- https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Payment_Gateway_Integration_Cheat_Sheet.html - server verification/idempotency/audit.
- https://owasp.org/www-project-application-security-verification-standard/ - ASVS 5.0.0.

### Tertiary (LOW confidence)

- None. [VERIFIED: all external changing facts were checked against official sources]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing pinned stack plus official provider APIs; no new package. [VERIFIED]
- Architecture: HIGH - locked decisions align with existing transactional checkout schema and official provider semantics. [VERIFIED]
- Pitfalls: HIGH - directly covered by PayPal retry/event docs, PostgreSQL concurrency and current code gaps. [VERIFIED]
- Environment readiness: HIGH - locally probed; external seller/provider credentials remain explicitly missing. [VERIFIED]

**Research date:** 2026-06-15  
**Valid until:** 2026-06-22 for PayPal/Supabase/Next.js changing details; architecture and locked decisions remain valid until context changes.
