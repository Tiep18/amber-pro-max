# Phase 3: Mixed Cart and Checkout - Nghiên cứu

**Ngày nghiên cứu:** 2026-06-15
**Lĩnh vực:** Mixed cart, checkout, shipping, discount, inventory reservation, Supabase RLS/RPC
**Độ tin cậy:** CAO

<user_constraints>
## User Constraints (from CONTEXT.md)

Nguồn toàn bộ nội dung nguyên văn trong mục này: [VERIFIED: `.planning/phases/03-mixed-cart-and-checkout/03-CONTEXT.md`]

### Locked Decisions

### Cart Persistence and Identity
- **D-01:** Guest carts persist in the browser for 30 days.
- **D-02:** Browser storage contains only `productId`, optional `variantId`, quantity, added/updated timestamps, and the market active when the item was added.
- **D-03:** Browser storage must not contain authoritative price, product name, stock, validated discount state, address, email, or payment data. The server reloads current product data and recalculates the cart.
- **D-04:** Signed-in carts synchronize across devices.
- **D-05:** When a customer signs in, merge the guest cart into the account cart. Matching lines have their quantities combined, followed by server-side price, availability, and inventory validation.
- **D-06:** If a merged quantity exceeds available inventory, reduce it to the maximum available quantity and clearly notify the customer.
- **D-07:** Saved carts automatically refresh stale price and availability data and clearly identify each change before checkout.
- **D-08:** On sign-out, the current device retains the cart as a guest cart, but cross-device synchronization stops.
- **D-09:** If a different account signs in on a device containing a guest cart, ask before merging that cart into the account.

### Destination and Market Revalidation
- **D-10:** If the shipping country changes the effective market, price, currency, shipping, or eligibility, pause checkout and show a preview before changing the accepted checkout state.
- **D-11:** The preview shows old and new values for affected lines plus old and new totals. The customer confirms the complete change set once.
- **D-12:** A physical item unavailable in the destination market remains visible but is excluded from any payable order until resolved. The customer may submit a market exception request instead of having the item silently removed.
- **D-13:** Every later shipping-country change triggers a fresh server recalculation and a new confirmation when anything material changes.

### Shipping Calculation
- **D-14:** All physical units in the cart form one shipping calculation group, even when products use different shipping profiles.
- **D-15:** Among chargeable physical units, the unit with the highest first-item fee supplies the single first-item fee. Every other unit uses its own additional-item fee. Cart insertion order must not affect the result.
- **D-16:** Free-shipping eligibility applies per product or unit. Eligible units contribute no shipping fee; remaining physical units are calculated normally.
- **D-17:** Digital lines never contribute shipping fees.
- **D-18:** If no shipping rule supports the selected destination, checkout is blocked, the cart is preserved, and the customer can submit an exception request. A placeholder or later-confirmed shipping fee is not allowed.

### Inventory Reservations and Exceptions
- **D-19:** Physical inventory is not reserved while browsing, editing the cart, or merely opening checkout. Reservation starts atomically when the customer confirms the authoritative total and submits checkout.
- **D-20:** PayPal checkout reserves inventory for 15 minutes. VietQR checkout reserves inventory for 24 hours.
- **D-21:** Customer-visible availability and subsequent checkout validation subtract active reservations from on-hand inventory.
- **D-22:** An exception request is non-binding and does not reserve inventory.
- **D-23:** After admin approval, the customer receives a request-bound checkout link valid for 48 hours.
- **D-24:** The approved link grants only the specific exception permission. Opening it still requires fresh validation of price, market, shipping, variant, and inventory.
- **D-25:** The approved link does not reserve stock. Reservation begins only when the customer confirms the recalculated total and submits checkout.

### the agent's Discretion
- Exact cart, checkout, market-change preview, and exception-request layouts may follow existing responsive UI patterns.
- Exact notification copy, empty states, and how stale values are visually highlighted may be selected during UI specification and planning.
- The implementation may choose secure identifiers and storage mechanics for guest carts and approved exception links while preserving the behavior and data-minimization decisions above.

### Deferred Ideas (OUT OF SCOPE)

CONTEXT.md không có mục Deferred Ideas riêng; phase boundary loại payment capture/confirmation, final inventory consumption/release, order lifecycle management, digital entitlement và physical fulfillment khỏi Phase 3. [VERIFIED: `03-CONTEXT.md`]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Mô tả | Nghiên cứu hỗ trợ |
|---|---|---|
| MKT-06 | Revalidate eligibility theo shipping country và xác nhận thay đổi | Quote version, material-change preview, accepted quote hash |
| CART-01 | Mixed digital + physical cart | Unified intent lines, fulfillment type từ catalog |
| CART-02 | Sửa quantity/variant/remove | Guest adapter + account cart RPC + server refresh |
| CART-03 | Server tính lại giá/discount/shipping/total | Pure quote pipeline + authoritative RPC |
| CART-04 | Guest hoặc signed-in checkout | Nullable owner, guest access secret hash, account ownership |
| CART-05 | Immutable commercial snapshot | `order_lines` snapshot, revoke update, immutability trigger |
| SHIP-01 | Reusable shipping profiles | Profile/rule/zone schema và admin surface |
| SHIP-02 | First/additional item fees | Deterministic highest-first algorithm |
| SHIP-03 | Chỉ physical lines có shipping | Shipping allocator bỏ digital/free units |
| SHIP-04 | Non-binding exception request | Request schema, no reservation, anti-enumeration |
| SHIP-05 | Admin approve/reject | Server-admin action, scoped grant token, audit fields |
| INV-02 | Atomic reservation | Single PostgreSQL transaction, row locks, idempotency |
| INV-03 | Chặn invalid/out-of-stock | Catalog/variant validation inside locked transaction |
| DISC-01 | Fixed/percentage codes | Discount schema và admin CRUD |
| DISC-02 | Restrictions | Date, limit, customer, market, spend, product/taxonomy relations |
| DISC-03 | Server validation + allocation snapshot | Locked usage check, deterministic line allocations |

Nguồn mô tả yêu cầu: [VERIFIED: `.planning/REQUIREMENTS.md`]
</phase_requirements>

## Tóm tắt

Phase 3 nên được lập kế hoạch như năm vertical slice đã khóa trong roadmap, nhưng mọi slice phải dùng chung một hợp đồng dữ liệu: browser/account cart chỉ lưu **ý định mua**, server trả về **quote có version**, và thao tác submit checkout gọi **một RPC PostgreSQL duy nhất** để tính lại, khóa tồn kho, tạo order pending, snapshot line, ghi discount allocation và reservation. [VERIFIED: `03-CONTEXT.md`, `.planning/ROADMAP.md`, codebase] [CITED: https://www.postgresql.org/docs/17/explicit-locking.html]

Không được đưa reservation, discount usage hoặc market acceptance thành nhiều Server Action độc lập. Cách đó tạo TOCTOU giữa “đã kiểm tra” và “đã ghi”. PostgreSQL xác nhận row lock có thể serialize các writer, deadlock phải được giảm bằng thứ tự lock ổn định và transaction lỗi phải được retry; OWASP cũng nêu `SELECT ... FOR UPDATE`/conditional update và idempotency key là các mẫu an toàn cho business logic cạnh tranh. [CITED: https://www.postgresql.org/docs/17/explicit-locking.html] [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html]

UI phải có UI-SPEC riêng cho cart, checkout, market-change preview, shipping/discount admin và exception review. Research này chỉ khóa workflow, state và dữ liệu; không khóa bố cục hình ảnh. [VERIFIED: `.planning/config.json`, `03-CONTEXT.md`]

**Khuyến nghị chính:** Dùng thin Server Actions + `server-only` domain layer + một `submit_checkout` PostgreSQL RPC idempotent làm transaction boundary duy nhất cho checkout. [CITED: https://nextjs.org/docs/app/guides/data-security] [CITED: https://supabase.com/docs/guides/database/functions]

## Architectural Responsibility Map

| Năng lực | Tier chính | Tier phụ | Lý do |
|---|---|---|---|
| Guest cart 30 ngày | Browser / Client | API / Backend | Browser giữ intent tối thiểu; server hydrate dữ liệu hiện hành |
| Signed-in cart sync/merge | API / Backend | Database / Storage | Quyền sở hữu, merge và quantity validation phải server-enforced |
| Authoritative quote | API / Backend | Database / Storage | Giá/discount/shipping/availability lấy từ record hiện hành |
| Destination revalidation | API / Backend | Browser / Client | Server quyết định material changes; client chỉ preview/confirm |
| Shipping rules | Database / Storage | API / Backend | Rule là dữ liệu admin; calculator là domain code có test |
| Discount validation | Database / Storage | API / Backend | Usage race và restriction cần constraint/transaction |
| Checkout submission | Database / Storage | API / Backend | Một transaction sở hữu snapshot + reservation |
| Exception approval | API / Backend | Database / Storage | Admin authorization ở action và database-owned check |
| Cart/checkout UI | Browser / Client | Frontend Server | Interactive island nhỏ, route localized, server render shell |

Nguồn: [VERIFIED: codebase và `.planning/research/ARCHITECTURE.md`] [CITED: https://nextjs.org/docs/app/guides/data-security]

## Project Constraints (from AGENTS.md)

- Giữ Next.js 16.2.x, React 19.2.x, TypeScript 5.9.x, Supabase, next-intl, Tailwind 4.3.x, Zod, Vitest và Playwright; không thêm ORM hoặc microservice. [VERIFIED: `AGENTS.md`]
- Money dùng integer minor units và currency code; không dùng floating point hoặc tự chuyển đổi tỷ giá. [VERIFIED: `AGENTS.md`, `src/catalog/money.ts`]
- Tổng checkout luôn được server tính lại; browser không gửi giá có thẩm quyền. [VERIFIED: `AGENTS.md`]
- Guest checkout và mixed cart là bắt buộc. [VERIFIED: `AGENTS.md`]
- Physical inventory do admin quản lý; Phase 2 đã khóa XOR product-level/variant-level inventory. [VERIFIED: `AGENTS.md`, Phase 2 CONTEXT, migration catalog]
- Public routes phải có `/vi` hoặc `/en`; locale, market, currency và shipping country là các khái niệm tách biệt. [VERIFIED: `AGENTS.md`, `src/i18n/routing.ts`, `src/catalog/market.ts`]
- Admin authorization phải được kiểm tra server-side và database-side; không tin client metadata. [VERIFIED: `AGENTS.md`, `src/auth/guards.ts`, foundation migration]
- RLS phải bảo vệ customer/order/private data; service role không được vào client bundle. [VERIFIED: `AGENTS.md`]
- Mọi thay đổi schema dùng Supabase migration, regenerate `src/types/supabase.ts`, chạy database tests, lint, typecheck, build và E2E. [VERIFIED: `AGENTS.md`, `package.json`]
- Đây là research trong workflow `$gsd-plan-phase`; không tạo implementation ngoài artifact nghiên cứu. [VERIFIED: `AGENTS.md`]

## Standard Stack

### Core

| Thành phần | Phiên bản | Mục đích | Chỉ dẫn |
|---|---:|---|---|
| Next.js | 16.2.9 | Localized cart/checkout/admin routes, Server Actions | Giữ action mỏng, tự auth/authz mỗi mutation [VERIFIED: npm registry] [CITED: https://nextjs.org/docs/app/guides/data-security] |
| Supabase JS | 2.108.1 | Typed RPC và auth context | Chỉ gọi RPC/table theo grants/RLS [VERIFIED: npm registry] |
| Supabase SSR | 0.12.0 | Cookie-bound guest/account request context | Dùng server client hiện có [VERIFIED: npm registry] |
| PostgreSQL | 17 local target | Transaction, locks, constraints, RLS | Sở hữu submit checkout và reservation [VERIFIED: `supabase/config.toml`] |
| Zod | 4.4.3 | Validate cart intent, address, code, admin forms | Validate tại mọi Server Action boundary [VERIFIED: npm registry] |

### Supporting

| Thành phần | Phiên bản | Mục đích | Khi dùng |
|---|---:|---|---|
| Vitest | 4.1.8 | Pure domain calculations | Quote diff, shipping, discount allocation, merge |
| pgTAP qua Supabase CLI | Local extension | Schema/RLS/RPC transaction tests | Constraint, grants, immutable lines, reservation |
| Playwright | 1.60.0 | Guest/account/admin workflow | Mixed cart, destination confirm, exception flow |
| Web Storage API | Browser standard | Guest cart intent 30 ngày | Chỉ browser cart; tự quản expiry [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage] |

### Alternatives Considered

| Thay cho | Có thể dùng | Tradeoff |
|---|---|---|
| PostgreSQL RPC transaction | Nhiều Supabase calls từ Server Action | Không atomic; loại bỏ |
| `localStorage` guest cart nhỏ | IndexedDB | Quá nặng cho vài intent line; không cần |
| Direct SQL/Supabase | Prisma/Drizzle | Trùng quyền sở hữu migration/RLS; ngoài stack khóa |
| Modular monolith | Checkout microservice | Tăng consistency/ops cost; ngoài MVP |

**Cài đặt:** Không cần thêm npm package cho Phase 3. [VERIFIED: `package.json`, research]

**Xác minh phiên bản:** Registry được kiểm tra ngày 2026-06-15; các version trên trùng `package.json`. [VERIFIED: npm registry]

## Package Legitimacy Audit

Phase không cài package mới. Audit dưới đây chỉ ghi nhận package lõi đã tồn tại trong repository. [VERIFIED: `package.json`]

| Package | Registry | Downloads/tuần | Source repo | Verdict | Disposition |
|---|---|---:|---|---|---|
| `next` | npm | 37.5M | `vercel/next.js` | SUS: bản publish rất mới | Đã khóa trong repo; không cài mới |
| `@supabase/supabase-js` | npm | 20.4M | `supabase/supabase-js` | SUS: bản publish rất mới | Đã khóa trong repo; không cài mới |
| `@supabase/ssr` | npm | 4.3M | `supabase/ssr` | SUS: bản publish rất mới | Đã khóa trong repo; không cài mới |
| `zod` | npm | 193.6M | `colinhacks/zod` | OK | Approved |
| `vitest` | npm | 68.2M | `vitest-dev/vitest` | SUS: bản publish rất mới | Đã khóa trong repo; không cài mới |
| `@playwright/test` | npm | 40.7M | `microsoft/playwright` | OK | Approved |

Không package nào có `scripts.postinstall` theo npm registry. [VERIFIED: npm registry]
**Packages removed due to SLOP:** none. [VERIFIED: package-legitimacy seam]
**Packages flagged SUS:** `next`, `@supabase/supabase-js`, `@supabase/ssr`, `vitest`; chỉ cần checkpoint nếu planner quyết định reinstall/upgrade, không cần checkpoint để tiếp tục dùng lockfile hiện tại. [VERIFIED: package-legitimacy seam]

## Architecture Patterns

### System Architecture Diagram

```text
Product page / Header / Guest localStorage / Account cart
                      |
                      v
            Cart intent normalization
      IDs + variant + qty + market-added only
                      |
                      v
       Server-only authoritative quote service
   catalog -> market -> inventory availability
          -> discount -> shipping -> totals
                      |
          +-----------+------------+
          | material change?       | no change
          v                        v
  Market-change preview       accepted quote version
  confirm complete delta             |
          +--------------------------+
                      |
                      v
       submit_checkout(idempotency key)
                      |
                      v
      PostgreSQL transaction / decision point
  validate auth/guest + exception grant + quote version
  lock inventory rows in stable ID order
  recalculate authoritative quote
  validate discount usage under lock
  create pending order + immutable lines
  create discount allocations + reservations
          | success                 | conflict/stale
          v                         v
  pending payment shell       return typed reason +
  (Phase 4 continues)         fresh quote, no partial write
```

Nguồn tổng hợp: [VERIFIED: `03-CONTEXT.md`, architecture research] [CITED: https://www.postgresql.org/docs/17/explicit-locking.html]

### Recommended Project Structure

```text
src/
├── cart/
│   ├── types.ts              # Intent, hydrated line, merge/change result
│   ├── guest-storage.ts      # Versioned localStorage + 30-day expiry
│   ├── calculations.ts       # Pure subtotal/change helpers
│   ├── queries.ts            # Authoritative hydrate/quote RPC wrappers
│   └── actions.ts            # Thin cart merge/update actions
├── checkout/
│   ├── schemas.ts            # Destination, contact, submit, exception grant
│   ├── quote.ts              # Pipeline orchestration and material diff
│   ├── shipping.ts           # Deterministic shipping algorithm
│   ├── discounts.ts          # Eligibility and integer allocations
│   ├── actions.ts            # Quote/confirm/submit server actions
│   └── types.ts
├── components/
│   ├── cart/
│   ├── checkout/
│   └── admin/commerce/
├── app/[locale]/
│   ├── cart|gio-hang/
│   └── checkout|thanh-toan/
└── app/admin/
    ├── shipping/
    ├── discounts/
    └── market-exceptions/

supabase/
├── migrations/*_mixed_cart_checkout.sql
└── tests/database/
    ├── 03_checkout_model.test.sql
    ├── 03_checkout_rls.test.sql
    ├── 03_checkout_quote.test.sql
    └── 03_checkout_concurrency.test.sql
```

Tên route thật phải được thêm vào `src/i18n/routing.ts`; không tạo hai implementation tách biệt cho VI/EN. [VERIFIED: existing i18n pattern]

### Pattern 1: Intent Cart và Authoritative Hydration

**What:** Guest/account cart line chỉ định product, optional variant và quantity. Mọi render cart gọi server để lấy title, current offer, variant validity và available quantity. [VERIFIED: D-02, D-03]

**When to use:** Add/update/remove, page load, sign-in merge, market switch, checkout entry.

```typescript
type CartIntentLine = {
  productId: string;
  variantId: string | null;
  quantity: number;
  marketAdded: 'vn' | 'intl';
  addedAt: string;
  updatedAt: string;
};

type StoredGuestCart = {
  version: 1;
  expiresAt: string;
  lines: CartIntentLine[];
};
```

`localStorage` không tự hết hạn; implementation phải kiểm tra `expiresAt`, catch lỗi storage và nghe `storage` event để đồng bộ tab khác. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage] [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event]

### Pattern 2: Versioned Quote + Explicit Acceptance

**What:** Server trả `quoteId`/`quoteVersion`, line snapshots tạm, total và `materialChanges`. Client chỉ được submit version đã confirm. Shipping-country change luôn tạo quote mới; quote cũ không được mutate thành accepted. [VERIFIED: D-10, D-11, D-13]

**Material fields:** effective market, currency, unit price, eligibility, selected variant validity, shipping amount, discount amount, subtotal, grand total. [VERIFIED: D-10, D-11]

**Recommendation:** Hash canonical JSON của authoritative quote bằng server crypto và lưu version/hash trong draft; không dùng client-generated hash làm trust boundary. [CITED: https://nextjs.org/docs/app/guides/data-security]

### Pattern 3: Deterministic Shipping Allocation

**What:** Expand physical lines thành units; bỏ digital và free-shipping units; resolve rule cho từng chargeable unit; chọn unit có first fee cao nhất làm first unit; mọi unit còn lại dùng own additional fee. Tie-break theo `lineId`, rồi unit index để kết quả không phụ thuộc insertion order. [VERIFIED: D-14 đến D-18]

```typescript
const chargeable = units
  .filter((unit) => unit.fulfillmentType === 'physical' && !unit.freeShipping)
  .sort((a, b) => b.firstFeeMinor - a.firstFeeMinor || a.stableKey.localeCompare(b.stableKey));

const shippingMinor = chargeable.reduce(
  (sum, unit, index) => sum + (index === 0 ? unit.firstFeeMinor : unit.additionalFeeMinor),
  0
);
```

Nếu bất kỳ chargeable unit nào không có destination rule, quote bị block toàn bộ; không dùng fee tạm. [VERIFIED: D-18]

### Pattern 4: Atomic Reservation RPC

**What:** Một RPC nhận intent, destination, payment method, discount code, accepted quote version và idempotency key. RPC lock `inventory_records` theo ID tăng dần, tính `available = on_hand - active_unexpired_reservations`, sau đó ghi toàn bộ order/lines/reservations. [VERIFIED: D-19 đến D-21] [CITED: https://www.postgresql.org/docs/17/explicit-locking.html]

```sql
select ir.id
from public.inventory_records ir
where ir.id = any (target_inventory_ids)
order by ir.id
for update;

-- Sau lock: recalculate, reject nếu thiếu, rồi insert snapshot + reservation.
```

Transaction không gọi PayPal, email hoặc chờ user input. [CITED: https://www.postgresql.org/docs/17/explicit-locking.html]

### Pattern 5: Idempotent Checkout Submission

**What:** Unique `(checkout_actor_key, idempotency_key)` hoặc global UUID idempotency key; retry trả lại cùng order/result, không tạo reservation thứ hai. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html]

**Actor key:** `user_id` cho account; guest cart/session secret hash cho guest. Raw guest secret chỉ trả một lần và không log. [VERIFIED: D-04, D-08, Agent's Discretion] [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html]

### Pattern 6: Discount Reservation và Allocation

**What:** Lock discount row khi code có usage cap; eligibility tính từ authoritative subtotal/market/user/product taxonomy. Tạo pending redemption cùng order và expiry bằng reservation window; Phase 4 chuyển trạng thái hoặc để expiry ngừng được đếm. [VERIFIED: DISC-01 đến DISC-03] [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html]

**Allocation:** Dùng integer arithmetic. Fixed discount được cap ở eligible subtotal; phân bổ theo tỷ lệ line subtotal bằng largest-remainder, tie-break line ID. Percentage discount tính trên eligible line subtotal và cũng phân phối phần dư ổn định để tổng allocation đúng bằng order discount. [VERIFIED: integer-money constraint]

### Pattern 7: Scoped Exception Grant

**What:** Approval tạo token ngẫu nhiên, DB chỉ lưu hash, expiry 48 giờ và scope chính xác request/product/variant/destination. Link chỉ mở quyền exception; submit vẫn chạy full quote và reservation validation. [VERIFIED: D-22 đến D-25]

**Recommendation:** Grant single-purpose, single-order-use; consume atomically trong `submit_checkout`, nhưng không consume chỉ vì link được mở. [VERIFIED: D-24, D-25]

### Anti-Patterns to Avoid

- **Tin browser price/stock/discount:** client data có thể sửa; resolve lại từ DB. [CITED: https://nextjs.org/docs/app/guides/data-security]
- **Check inventory rồi insert reservation ở request khác:** tạo TOCTOU và oversell. [CITED: OWASP Business Logic Security]
- **Lock inventory theo cart order:** tăng deadlock; sort stable IDs trước lock. [CITED: PostgreSQL explicit locking]
- **Giữ transaction trong khi preview hoặc gọi provider:** lock kéo dài và gây contention. [CITED: PostgreSQL explicit locking]
- **Cho anon đọc base commerce tables:** lộ customer/cart/order/discount data; dùng scoped RPC/RLS. [CITED: https://supabase.com/docs/guides/api/securing-your-api]
- **Dùng `SECURITY DEFINER` nhưng không pin `search_path`:** tăng nguy cơ object resolution sai. [CITED: https://supabase.com/docs/guides/database/functions]
- **Silent market switch/removal:** vi phạm quyết định D-10 đến D-13. [VERIFIED: `03-CONTEXT.md`]
- **Reserve stock khi mở checkout/exception link:** vi phạm D-19 và D-25. [VERIFIED: `03-CONTEXT.md`]

## Schema, RPC và RLS Blueprint

### Tables

| Bảng | Trách nhiệm | Constraint/index bắt buộc |
|---|---|---|
| `carts` | Account cart identity | unique active cart/user; RLS own |
| `cart_lines` | Account intent lines | unique cart/product/variant; qty > 0 |
| `shipping_profiles` | Reusable profile | admin-only mutation |
| `shipping_zones` / `shipping_zone_countries` | Destination grouping | ISO country unique per zone |
| `shipping_rules` | First/additional fee by profile+zone | nonnegative integer, currency matches market |
| `discounts` | Code/type/value/dates/limits | normalized unique code; valid date/value checks |
| `discount_markets` | Market restriction | composite PK |
| `discount_products/categories/collections` | Eligibility scope | composite PK/FK |
| `orders` | Pending payment shell | owner xor guest hash; currency/totals; idempotency unique |
| `order_lines` | Immutable snapshot | product/variant/title/SKU/type/market/currency/unit/subtotal/discount/shipping |
| `discount_redemptions` | Pending/consumed/expired usage | unique order+discount; indexed active expiry |
| `inventory_reservations` | Physical quantity hold | inventory FK, order line FK, status, expires_at |
| `market_exception_requests` | Non-binding customer request | requested scope, destination, status, audit |
| `market_exception_grants` | Approved scoped permission | token hash unique, expires_at, consumed_at |

Nguồn và ràng buộc: [VERIFIED: requirements, CONTEXT, existing catalog schema]

### RPC Surface

| RPC | Caller | Security |
|---|---|---|
| `hydrate_cart` | anon/authenticated | Read-only safe projection; no base table grants |
| `merge_account_cart` | authenticated | Verify `auth.uid()`, own cart only |
| `quote_checkout` | anon/authenticated | No writes/reservation; returns versioned quote |
| `submit_checkout` | anon/authenticated | Idempotent transaction; inventory locks |
| `submit_market_exception` | anon/authenticated | Rate-limit at app boundary; no inventory write |
| Admin CRUD/approve | authenticated admin | `requireAdmin()` + `private.is_admin()` |

Supabase ghi rõ RLS không bảo vệ function; phải revoke mặc định rồi grant `EXECUTE` đúng role và review mọi `SECURITY DEFINER`. [CITED: https://supabase.com/docs/guides/api/securing-your-api]

### Function Security

- Ưu tiên `SECURITY INVOKER`; dùng `SECURITY DEFINER` chỉ cho safe projection hoặc transaction cần vượt base-table RLS. [CITED: https://supabase.com/docs/guides/database/functions]
- Với definer function, dùng `set search_path = ''` và fully qualify mọi object mới; pattern hiện tại `public, private, pg_temp` cần được harden dần, không bắt buộc refactor Phase 2 nếu ngoài scope. [CITED: https://supabase.com/docs/guides/database/functions] [VERIFIED: current migrations]
- `revoke all on function ... from public, anon, authenticated` trước `grant execute`. [CITED: https://supabase.com/docs/guides/api/securing-your-api]
- Public commerce tables bật RLS; base order/cart/discount/reservation tables không cấp anon direct access. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]
- Account cart/order policies dùng `(select auth.uid()) = user_id`; guest access đi qua scoped server/RPC secret, không qua broad anon SELECT. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]

### Migration và Schema Push

1. Tạo file bằng `supabase migration new mixed_cart_checkout`; không tự đặt timestamp. [CITED: https://supabase.com/docs/reference/cli/introduction]
2. `npm run db:reset`, `npm run db:lint`, `npm run db:test`, `npm run db:types`. [VERIFIED: `package.json`]
3. Review `git diff src/types/supabase.ts`; RPC signatures phải xuất hiện trong generated types. [VERIFIED: existing CI]
4. Trước remote push: `supabase link`, `supabase migration list`, backup phù hợp môi trường, rồi `supabase db push --dry-run` nếu CLI hỗ trợ và `supabase db push`. [CITED: https://supabase.com/docs/reference/cli/introduction]
5. Sau push chạy smoke RPC/RLS trên staging trước production. [CITED: https://supabase.com/docs/guides/deployment/managing-environments]

Supabase changelog ngày 2026-04-28 thông báo new tables có thể không tự expose Data API; migration phải có explicit grants cần thiết thay vì dựa vào default project setting. [CITED: https://supabase.com/changelog]

## Don't Hand-Roll

| Vấn đề | Không tự xây | Dùng thay thế | Lý do |
|---|---|---|---|
| Atomicity/locking | JS mutex/in-memory lock | PostgreSQL transaction + row locks | Không hoạt động đa instance |
| Authorization | Hidden button/client role | Supabase Auth + RLS + `private.is_admin()` | Client state không phải trust boundary |
| Input parsing | Ad-hoc coercion | Zod + DB constraints | Hai lớp kiểm tra |
| Guest tokens | Predictable IDs/plain token DB | Node/Web Crypto random token + SHA-256 hash | Giảm token theft impact |
| Money | float/decimal JS | integer minor units | Tránh rounding drift |
| Cart expiry | Tin `localStorage` tự hết hạn | app-managed `expiresAt` | Web Storage không có TTL |
| Discount allocation | float percentage | deterministic integer allocation | Tổng line phải khớp order |
| Concurrency test | Chỉ unit test | pgTAP + concurrent DB integration script | Unit test không chứng minh lock behavior |

**Key insight:** Phần khó của checkout không phải form; đó là bảo toàn invariant khi hai request đồng thời dùng cùng stock, coupon hoặc exception grant. Database phải là authority cuối. [CITED: OWASP Business Logic Security] [CITED: PostgreSQL explicit locking]

## Common Pitfalls

### Pitfall 1: Quote và submit dùng hai logic khác nhau
**What goes wrong:** UI hiển thị một total nhưng transaction ghi total khác hoặc bỏ sót restriction.
**Why:** Duplicate calculation giữa TypeScript và SQL.
**Avoid:** Một canonical quote contract; pure TS dùng cho preview nhưng submit RPC re-implements cùng test vectors và luôn là authority.
**Warning signs:** Golden vectors lệch giữa Vitest và pgTAP. [VERIFIED: architecture synthesis]

### Pitfall 2: Reservation không trừ expired đúng thời điểm
**What goes wrong:** Stock bị giữ vô hạn hoặc được bán hai lần.
**Avoid:** Availability chỉ đếm reservation active với `expires_at > transaction_timestamp()`; Phase 4 cleanup chỉ là housekeeping, không phải điều kiện correctness. [VERIFIED: D-20, D-21]

### Pitfall 3: Deadlock ở mixed cart
**What goes wrong:** Hai cart chứa SKU A/B theo thứ tự ngược nhau khóa chéo.
**Avoid:** Lock mọi inventory ID theo cùng thứ tự tăng dần; retry SQLSTATE deadlock/serialization với bounded attempts. [CITED: https://www.postgresql.org/docs/17/explicit-locking.html]

### Pitfall 4: Discount usage cap bị oversubscribe
**What goes wrong:** Nhiều checkout cùng thấy remaining usage.
**Avoid:** Lock discount row và ghi pending redemption trong cùng submit transaction. [CITED: OWASP Business Logic Security]

### Pitfall 5: Guest/account merge mất dữ liệu
**What goes wrong:** Auto merge vào tài khoản khác hoặc sign-out xóa cart local.
**Avoid:** Track last account marker local, prompt theo D-09, snapshot account cart về guest intent trước sign-out theo D-08. [VERIFIED: D-05 đến D-09]

### Pitfall 6: Market preview chỉ đổi header
**What goes wrong:** Customer confirm market mới nhưng line/discount/shipping cũ vẫn payable.
**Avoid:** Preview là complete quote delta; acceptance gắn quote version, không chỉ market cookie. [VERIFIED: D-10 đến D-13]

### Pitfall 7: Exception grant trở thành bypass tổng quát
**What goes wrong:** Token cho phép product/destination khác hoặc dùng lại.
**Avoid:** Scope exact request, hash token, 48h, one-order use, fresh full validation. [VERIFIED: D-23 đến D-25]

### Pitfall 8: RLS được bật nhưng function vẫn public
**What goes wrong:** RPC definer bypass RLS cho caller không mong muốn.
**Avoid:** Explicit function grants và internal authorization. [CITED: https://supabase.com/docs/guides/api/securing-your-api]

## UI-SPEC Surfaces Required

Planner phải tạo hoặc yêu cầu `03-UI-SPEC.md` bao phủ các surface sau; research không tự tạo UI-SPEC. [VERIFIED: workflow.ui_phase=true]

| Surface | Trạng thái bắt buộc |
|---|---|
| Header cart indicator + mobile access | empty/count/loading/storage unavailable |
| Product add-to-cart | selected variant, invalid/out-of-stock, added, current market |
| Cart page/sheet | mixed lines, qty/edit/remove, stale price, capped merge, unavailable |
| Sign-in merge prompt | same account/other account/merge/cancel/result changes |
| Checkout contact/destination | guest/account, digital-only, physical/mixed, validation |
| Market-change preview | old/new per line, old/new totals, confirm/cancel/block |
| Discount entry | valid/invalid/expired/not eligible/usage exhausted |
| Submit/reservation result | pending, stale quote, stock conflict, duplicate retry |
| Exception request | unavailable item retained, request form, submitted status |
| Admin shipping | profile/rule/zone CRUD, validation, empty state |
| Admin discounts | code/restrictions/usage CRUD, active/expired |
| Admin exception review | details, approve/reject, generated link, audit state |

Mọi form cần loading, disabled, validation, error và success state; physical/mixed checkout cần address, digital-only không hỏi shipping address. [VERIFIED: project frontend skill rules and constraints]

## Code Examples

### Thin Server Action

```typescript
'use server';

import {checkoutSubmitSchema} from './schemas';
import {submitCheckout} from './server/submit-checkout';

export async function submitCheckoutAction(input: unknown) {
  const parsed = checkoutSubmitSchema.safeParse(input);
  if (!parsed.success) return {status: 'invalid', issues: parsed.error.flatten()};
  return submitCheckout(parsed.data);
}
```

Server Action là direct POST entry point nên auth/authz và input validation phải lặp lại bên trong boundary. [CITED: https://nextjs.org/docs/app/guides/data-security]

### Server-only DAL

```typescript
import 'server-only';

export async function submitCheckout(input: CheckoutSubmitInput) {
  const supabase = await createSupabaseServerClient();
  const {data, error} = await supabase.rpc('submit_checkout', {
    p_request: input
  });
  if (error) return mapCheckoutDatabaseError(error);
  return data;
}
```

Next.js khuyến nghị mutation database/auth logic ở dedicated server-only DAL. [CITED: https://nextjs.org/docs/app/guides/data-security]

### Stable Lock Ordering

```sql
perform ir.id
from public.inventory_records as ir
where ir.id = any (target_inventory_ids)
order by ir.id
for update;
```

Consistent lock order là phòng thủ chính chống deadlock. [CITED: https://www.postgresql.org/docs/17/explicit-locking.html]

### Guest Cart Expiry

```typescript
export function readGuestCart(now = Date.now()): StoredGuestCart | null {
  try {
    const raw = window.localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return null;
    const parsed = storedGuestCartSchema.parse(JSON.parse(raw));
    if (Date.parse(parsed.expiresAt) <= now) {
      window.localStorage.removeItem(GUEST_CART_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
```

`localStorage` không có expiration tự động và có thể bị browser policy chặn. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage]

## State of the Art

| Cách cũ | Cách hiện tại | Khi thay đổi | Tác động |
|---|---|---|---|
| Tin cart total từ client | Backend revalidation + immutable snapshot | Secure commerce baseline | Chặn price tampering |
| Multi-call checkout | Single transactional command/RPC | PostgreSQL/OWASP standard | Loại partial writes |
| RLS-only thinking | Grants + RLS + function EXECUTE review | Supabase current guidance | Function surface được kiểm soát |
| Auto-exposed public tables | Explicit grants may be required | Supabase rollout từ 2026-04-28 | Migration phải khai báo grants |
| Server Actions như private functions | Treat as public POST endpoints | Next.js current docs | Auth/authz mỗi action |
| Storage “persistent forever” | App-managed TTL + failure fallback | Web Storage behavior | Đúng D-01, chịu privacy settings |

**Deprecated/outdated:**
- Supabase Auth Helpers không được thêm; project dùng `@supabase/ssr`. [VERIFIED: `AGENTS.md`, package.json]
- Không dùng experimental declarative schema alpha cho phase; tiếp tục SQL migrations đã khóa. [CITED: https://supabase.com/changelog/44938-public-alpha-declarative-schema-management-with-pg-delta]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | Customer-specific discount chỉ áp dụng cho signed-in `user_id`; guest không đủ điều kiện | Discount Pattern | Cần product decision nếu business muốn email-targeted guest code |
| A2 | Shipping zones dùng ISO country membership, chưa cần state/province/postal ranges trong MVP | Schema | Có thể thiếu rule cho US state/remote areas |
| A3 | Phase 3 tạo `orders` ở `pending_payment`; Phase 4 sở hữu payment/lifecycle tiếp theo | Schema | Nếu planner chọn checkout draft riêng, CART-05 mapping phải điều chỉnh |
| A4 | Tax chưa nằm trong requirements Phase 3 và total tax là 0/not modeled | Quote | Legal/tax decision trước launch có thể thêm schema |

Các giả định trên là `[ASSUMED]` và cần được planner ghi thành checkpoint quyết định nếu ảnh hưởng task. Các quyết định D-01 đến D-25 không phải giả định. [ASSUMED]

## Open Questions (RESOLVED)

1. **Targeted discount cho guest**
   - Đã biết: guest checkout bắt buộc; discount có customer restriction. [VERIFIED: requirements]
   - Chưa rõ: “customer” có bao gồm email chưa xác minh hay chỉ account ID.
   - RESOLVED: Plan 03-03 dùng `restricted_user_id` cho customer-specific discount; guest targeted code trả safe not-eligible/sign-in guidance. [ASSUMED]

2. **Shipping granularity**
   - Đã biết: destination-based reusable rules, Vietnam và international markets. [VERIFIED: PROJECT/requirements]
   - Chưa rõ: country-only hay cần region/postal.
   - RESOLVED: Plan 03-02 dùng country-level rules cho UI Phase 3 và giữ schema country-scope có khả năng mở rộng. [ASSUMED]

3. **Order shell hay checkout draft**
   - Đã biết: immutable lines thuộc Phase 3, payment lifecycle thuộc Phase 4. [VERIFIED: roadmap/context]
   - RESOLVED: Plan 03-04 tạo order shell `pending_payment` trong Phase 3 để reservation có owner bền vững; Phase 4 thêm payment transitions. [ASSUMED]

4. **Tax**
   - Đã biết: không có Phase 3 requirement về tax; STATE ghi tax/legal cần xác minh trước launch. [VERIFIED: `.planning/STATE.md`]
   - RESOLVED: Phase 3 không tự tính tax; Plan 03-04 chỉ cho phép snapshot field nullable/zero nếu cần forward compatibility và không đưa tax vào payable calculation. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---:|---:|---|
| Node.js | Next/Vitest/scripts | Có | 20.19.4 | Không |
| npm | package scripts | Có | 10.8.1 | Không |
| Supabase CLI | migration/local DB/tests/types | Có | 2.58.5 | Upgrade CLI |
| Local Supabase | pgTAP/E2E/RPC | Có | Running | `supabase start` |
| PostgreSQL local target | locks/transactions | Có | 17 | Không |
| Git | migration/type diff | Có | 2.45.1 | Không |

Supabase CLI báo bản mới 2.106.0; planner nên thêm Wave 0 kiểm tra/upgrade CLI trước khi dựa vào flags mới, nhưng các command hiện hữu `migration new`, `db reset`, `db lint`, `test db`, `gen types`, `db push` đã có ở 2.58.5. [VERIFIED: local CLI output] [CITED: https://supabase.com/docs/reference/cli/introduction]

**Missing dependencies with no fallback:** Không có. [VERIFIED: environment probe]
**Missing dependencies with fallback:** Không có; chỉ có CLI cũ hơn current release. [VERIFIED: environment probe]

## Validation Architecture

### Test Framework

| Thuộc tính | Giá trị |
|---|---|
| Unit | Vitest 4.1.8, `vitest.config.ts` |
| Database | pgTAP qua `supabase test db` |
| E2E | Playwright 1.60.0, Chromium, workers=1 |
| Security | Node test + pgTAP RLS/grants |
| Quick run | `npm run test:unit -- --run tests/unit/cart tests/unit/checkout` |
| Full suite | `npm run ci` |

Nguồn: [VERIFIED: `package.json`, test configs]

### Phase Requirements → Test Map

| Req | Behavior | Test type | Automated command | File exists? |
|---|---|---|---|---|
| CART-01/02 | Mixed line add/edit/remove | unit + E2E | `npx vitest run tests/unit/cart/cart.test.ts` | ❌ Wave 0 |
| CART-03 | Authoritative total ignores client price | DB + unit | `supabase test db supabase/tests/database/03_checkout_quote.test.sql` | ❌ Wave 0 |
| CART-04 | Guest/account checkout | E2E + RLS | `npx playwright test tests/e2e/checkout.spec.ts` | ❌ Wave 0 |
| CART-05 | Immutable snapshots | pgTAP | `supabase test db supabase/tests/database/03_checkout_model.test.sql` | ❌ Wave 0 |
| MKT-06 | Destination material-change confirm | unit + E2E | `npx playwright test tests/e2e/checkout-market-change.spec.ts` | ❌ Wave 0 |
| SHIP-01/02/03 | Profile/rule and deterministic shipping | unit + DB | `npx vitest run tests/unit/checkout/shipping.test.ts` | ❌ Wave 0 |
| SHIP-04/05 | Request/review/scoped link | E2E + RLS | `npx playwright test tests/e2e/market-exception.spec.ts` | ❌ Wave 0 |
| INV-02 | Atomic reservation under concurrency | DB integration | `node tests/integration/checkout-concurrency.mjs` | ❌ Wave 0 |
| INV-03 | Invalid/oversold variant rejected | pgTAP + integration | `supabase test db supabase/tests/database/03_checkout_concurrency.test.sql` | ❌ Wave 0 |
| DISC-01/02 | Discount admin/restrictions | unit + E2E | `npx playwright test tests/e2e/admin-discounts.spec.ts` | ❌ Wave 0 |
| DISC-03 | Server validation/allocation/usage race | unit + DB integration | `npx vitest run tests/unit/checkout/discounts.test.ts` | ❌ Wave 0 |

### Required Concurrency Scenarios

1. Hai checkout tranh quantity cuối: đúng một success, một `inventory_unavailable`, tổng active reservation không vượt on-hand. [CITED: OWASP Business Logic Security]
2. Hai mixed carts chứa inventory IDs theo thứ tự ngược: không deadlock vĩnh viễn; retry bounded; không partial order. [CITED: PostgreSQL explicit locking]
3. Retry cùng idempotency key: cùng order ID, không duplicate line/reservation/redemption. [CITED: OWASP Business Logic Security]
4. Hai checkout dùng coupon usage cuối: đúng một pending redemption. [VERIFIED: DISC-02, DISC-03]
5. Exception grant dùng đồng thời hai lần: tối đa một order consume grant. [VERIFIED: D-23 đến D-25]
6. Quote accepted rồi admin đổi price/stock: submit trả stale/conflict và không ghi partial data. [VERIFIED: D-03, D-07, D-19]

### Sampling Rate

- **Mỗi task commit:** unit file liên quan + targeted pgTAP file, dưới 30 giây khi có thể. [VERIFIED: Nyquist requirement]
- **Mỗi wave merge:** `npm run test:unit && npm run db:reset && npm run db:lint && npm run db:test && npm run typecheck`. [VERIFIED: package scripts]
- **Phase gate:** `npm run ci` xanh, concurrency script xanh lặp ít nhất 20 vòng, và UI UAT song ngữ/mobile hoàn tất. [VERIFIED: security block_on=high, UI phase]

### Wave 0 Gaps

- [ ] `tests/unit/cart/guest-storage.test.ts`
- [ ] `tests/unit/cart/merge.test.ts`
- [ ] `tests/unit/checkout/quote-diff.test.ts`
- [ ] `tests/unit/checkout/shipping.test.ts`
- [ ] `tests/unit/checkout/discounts.test.ts`
- [ ] `supabase/tests/database/03_checkout_model.test.sql`
- [ ] `supabase/tests/database/03_checkout_rls.test.sql`
- [ ] `supabase/tests/database/03_checkout_quote.test.sql`
- [ ] `supabase/tests/database/03_checkout_concurrency.test.sql`
- [ ] `tests/integration/checkout-concurrency.mjs`
- [ ] `tests/e2e/cart.spec.ts`
- [ ] `tests/e2e/checkout.spec.ts`
- [ ] `tests/e2e/checkout-market-change.spec.ts`
- [ ] `tests/e2e/admin-shipping.spec.ts`
- [ ] `tests/e2e/admin-discounts.spec.ts`
- [ ] `tests/e2e/market-exception.spec.ts`
- [ ] Mở rộng `tests/security/catalog-boundaries.test.ts` hoặc thêm `checkout-boundaries.test.ts`

## Security Domain

**Enforcement:** enabled, ASVS Level 1, block on HIGH. [VERIFIED: `.planning/config.json`]

### Applicable ASVS Categories

OWASP ASVS stable hiện tại là 5.0.0, phát hành tháng 5/2025. [CITED: https://owasp.org/www-project-application-security-verification-standard/]

| ASVS area | Applies | Standard control |
|---|---|---|
| Authentication | Có | Optional user auth; guest actor secret; reverify session in actions |
| Session Management | Có | Supabase SSR cookie; no sensitive localStorage |
| Access Control | Có | Deny-by-default RLS, owner checks, admin DB role |
| Validation & Business Logic | Có | Zod allowlists + DB constraints + authoritative recalculation |
| Stored Cryptography / Secrets | Có | Hash guest/exception tokens; server-only secrets |
| Data Protection | Có | Minimize PII; no address/email in guest storage/logs |
| API/Web Service | Có | Explicit EXECUTE grants, typed errors, idempotency |
| Configuration | Có | Explicit grants, pinned search path, security tests |

Nguồn: [CITED: https://owasp.org/www-project-application-security-verification-standard/] [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html] [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html]

### Threat Model

| Threat | STRIDE | Attack path | Mitigation / test |
|---|---|---|---|
| Price/discount tampering | Tampering | Modify Server Action payload/localStorage | Ignore price fields; authoritative RPC; negative test |
| Oversell race | Tampering/DoS | Concurrent submit same stock | Stable row locks; atomic transaction; concurrency test |
| Coupon overuse | Tampering | Parallel last-use redemption | Lock discount row; pending redemption unique |
| IDOR account cart/order | Information disclosure | Replace cart/order UUID | RLS owner policy + action ownership check |
| Guest token theft | Spoofing | Guess/leak raw token | 256-bit random, hash at rest, no logs, expiry |
| Exception scope escalation | Elevation | Reuse token for other product/country | Exact scope, one-order atomic consume |
| Admin action forgery | Elevation | Call Server Action directly | `requireAdmin()` plus `private.is_admin()` |
| CSRF/action replay | Spoofing | Cross-origin/repeated submit | Next origin checks + idempotency key + authz |
| PII leakage | Information disclosure | localStorage/log/error | No PII local; generic errors; sensitive log tests |
| Definer RPC abuse | Elevation | Public EXECUTE or unsafe search path | Revoke/grant, empty search_path, pgTAP privilege tests |
| Reservation exhaustion | DoS | Repeated guest checkout holds stock | Rate limit, idempotency, bounded windows, abuse monitoring |
| Stale quote acceptance | Tampering | Submit old quote after changes | Version/hash compare + full recalculation |

Next.js nói Server Actions có thể bị gọi trực tiếp bằng POST và page-level authorization không bảo vệ action; mỗi action phải tự kiểm tra. [CITED: https://nextjs.org/docs/app/guides/data-security]

### Transaction Boundaries

**Trong transaction:** actor validation, idempotency lookup, quote revalidation, exception scope check, inventory locks, discount lock, order + immutable lines, discount redemption, inventory reservations, grant consume. [VERIFIED: synthesis from locked requirements]

**Ngoài transaction:** preview UI, PayPal/VietQR provider calls, email, admin notification, cleanup jobs. [VERIFIED: Phase boundary] [CITED: PostgreSQL explicit locking]

**Retryable:** SQLSTATE `40001` serialization failure và `40P01` deadlock, tối đa bounded attempts với same idempotency key. [CITED: https://www.postgresql.org/docs/17/transaction-iso.html] [CITED: https://www.postgresql.org/docs/17/explicit-locking.html]

**Không retry mù:** validation, unavailable stock, stale quote, invalid grant, expired discount. [VERIFIED: domain semantics]

## Sources

### Primary (HIGH confidence)

- [PostgreSQL 17 Explicit Locking](https://www.postgresql.org/docs/17/explicit-locking.html) - row locks, deadlocks, stable lock ordering.
- [PostgreSQL 17 Transaction Isolation](https://www.postgresql.org/docs/17/transaction-iso.html) - serializable guarantees và retry `40001`.
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions) - invoker/definer và `search_path`.
- [Supabase Securing Your API](https://supabase.com/docs/guides/api/securing-your-api) - grants, RLS, function EXECUTE.
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) - row ownership policies.
- [Next.js Data Security](https://nextjs.org/docs/app/guides/data-security) - Server Action entry points, authz, DAL.
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/introduction) - migrations, push, types.
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) - stable 5.0.0 và L1.
- [OWASP Business Logic Security](https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html) - TOCTOU, locks, idempotency.

### Secondary (MEDIUM confidence)

- [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) - persistence, no automatic expiry, policy failures.
- [MDN storage event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event) - cross-document storage synchronization.
- [Supabase Changelog](https://supabase.com/changelog) - 2026 Data API exposure changes.

### Internal Verified Sources

- `AGENTS.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/01-secure-bilingual-foundation/01-CONTEXT.md`
- `.planning/phases/02-market-aware-catalog/02-CONTEXT.md`
- `.planning/phases/03-mixed-cart-and-checkout/03-CONTEXT.md`
- `.planning/research/STACK.md`
- `.planning/research/ARCHITECTURE.md`
- Existing `src/catalog`, `src/auth`, `src/i18n`, migrations và tests.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - lockfile, npm registry và official docs đã kiểm tra.
- Architecture: HIGH - locked decisions, PostgreSQL/Supabase/Next official guidance và existing patterns thống nhất.
- Pitfalls: HIGH - phần concurrency/RLS dựa trên PostgreSQL, Supabase và OWASP.
- Discount/customer/tax specifics: MEDIUM - bốn giả định đã tách riêng để planner xử lý.

**Research date:** 2026-06-15
**Valid until:** 2026-06-22 cho Next.js/Supabase CLI/changelog; 2026-07-15 cho PostgreSQL/OWASP patterns.

## RESEARCH COMPLETE
