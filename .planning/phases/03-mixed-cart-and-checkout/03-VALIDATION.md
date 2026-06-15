---
phase: 03
slug: mixed-cart-and-checkout
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-15
---

# Phase 03 - Validation Strategy

> Hợp đồng kiểm chứng cho mixed cart, authoritative checkout, shipping, discount,
> inventory reservation và market exception.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.8, pgTAP qua Supabase CLI, Playwright 1.60.0 |
| **Config file** | `vitest.config.ts`, `playwright.config.ts`, `supabase/config.toml` |
| **Quick run command** | `npm run test:unit -- --run tests/unit/cart tests/unit/checkout` |
| **Database command** | `npm run db:reset && npm run db:lint && npm run db:test` |
| **Full suite command** | `npm run ci` |
| **Estimated runtime** | Quick < 30 giây; full suite phụ thuộc local Supabase và E2E |

## Sampling Rate

- **Sau mỗi task commit:** Chạy unit test liên quan và targeted pgTAP file.
- **Sau mỗi plan wave:** Chạy `npm run test:unit && npm run db:reset && npm run db:lint && npm run db:test && npm run typecheck`.
- **Trước `$gsd-verify-work`:** `npm run ci` phải xanh; concurrency script chạy xanh ít nhất 20 vòng.
- **Max feedback latency:** 30 giây cho targeted test; không dùng watch mode.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | CART-01, CART-02 | T-03-01 | Browser chỉ giữ cart intent tối thiểu; mixed lines hydrate từ server | unit + E2E | `npx vitest run tests/unit/cart/guest-storage.test.ts tests/unit/cart/merge.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | CART-03 | T-03-01, T-03-12 | Client price bị bỏ qua; quote được tính từ record hiện hành | unit + pgTAP | `npx vitest run tests/unit/checkout/quote-diff.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | SHIP-01, SHIP-02 | T-03-01 | Shipping rule được validate và tính không phụ thuộc insertion order | unit + pgTAP | `npx vitest run tests/unit/checkout/shipping.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | SHIP-03 | T-03-01 | Digital/free-shipping units không tạo phí; physical units tính đúng | unit + E2E | `npx playwright test tests/e2e/admin-shipping.spec.ts` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 2 | MKT-06 | T-03-12 | Material change phải preview và confirm trước khi submit | unit + E2E | `npx playwright test tests/e2e/checkout-market-change.spec.ts` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | DISC-01, DISC-02 | T-03-03, T-03-04 | Admin-only CRUD; restriction và usage limit được DB bảo vệ | pgTAP + E2E | `npx playwright test tests/e2e/admin-discounts.spec.ts` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 2 | DISC-03 | T-03-01, T-03-03 | Discount server-validated; integer allocation được snapshot | unit + DB | `npx vitest run tests/unit/checkout/discounts.test.ts` | ❌ W0 | ⬜ pending |
| 03-04-01 | 04 | 3 | CART-04 | T-03-04, T-03-05 | Guest secret và account ownership không thể bị IDOR | RLS + E2E | `npx playwright test tests/e2e/checkout.spec.ts` | ❌ W0 | ⬜ pending |
| 03-04-02 | 04 | 3 | CART-05 | T-03-01 | Order lines là immutable commercial snapshots | pgTAP | `supabase test db supabase/tests/database/03_checkout_model.test.sql` | ❌ W0 | ⬜ pending |
| 03-04-03 | 04 | 3 | INV-02 | T-03-02, T-03-03, T-03-10 | Một transaction lock tồn kho, discount và tạo reservation idempotent | integration | `node tests/integration/checkout-concurrency.mjs` | ❌ W0 | ⬜ pending |
| 03-04-04 | 04 | 3 | INV-03 | T-03-02, T-03-12 | Invalid variant, stale quote và oversell không tạo partial order | pgTAP + integration | `supabase test db supabase/tests/database/03_checkout_concurrency.test.sql` | ❌ W0 | ⬜ pending |
| 03-05-01 | 05 | 4 | SHIP-04 | T-03-05, T-03-09 | Request không reserve stock và không lộ PII/token | RLS + E2E | `npx playwright test tests/e2e/market-exception.spec.ts` | ❌ W0 | ⬜ pending |
| 03-05-02 | 05 | 4 | SHIP-05 | T-03-06, T-03-07 | Chỉ admin approve/reject; grant giới hạn scope, expiry và single-use | pgTAP + E2E | `npx playwright test tests/e2e/market-exception.spec.ts` | ❌ W0 | ⬜ pending |

## Threat References

| Ref | Threat | Required evidence |
|-----|--------|-------------------|
| T-03-01 | Price, shipping hoặc discount tampering | Payload âm tính và authoritative recalculation |
| T-03-02 | Oversell race | Hai checkout tranh stock cuối: đúng một thành công |
| T-03-03 | Coupon overuse hoặc duplicate redemption | Concurrent last-use và idempotency tests |
| T-03-04 | IDOR account cart/order | RLS owner tests và action ownership check |
| T-03-05 | Guest token theft/enumeration | Hash-at-rest, expiry, generic error và log test |
| T-03-06 | Exception scope escalation/reuse | Exact scope và atomic single-use consume |
| T-03-07 | Admin action forgery | Server guard cộng database-owned admin check |
| T-03-08 | CSRF/action replay | Origin protection và same-key replay |
| T-03-09 | PII leakage | Không lưu PII trong localStorage hoặc sensitive logs |
| T-03-10 | Definer RPC abuse | Explicit grants, pinned search path và privilege tests |
| T-03-11 | Reservation exhaustion | Rate limit/idempotency và bounded reservation windows |
| T-03-12 | Stale quote acceptance | Quote version/hash và full recalculation |

## Required Concurrency Scenarios

1. Hai checkout tranh quantity cuối: đúng một thành công, một `inventory_unavailable`.
2. Hai mixed carts lock inventory IDs theo thứ tự ngược: không deadlock vĩnh viễn, không partial order.
3. Retry cùng idempotency key: cùng order ID, không duplicate line, reservation hoặc redemption.
4. Hai checkout dùng lượt coupon cuối: tối đa một pending redemption.
5. Một exception grant được dùng đồng thời hai lần: tối đa một order consume grant.
6. Giá hoặc stock đổi sau accepted quote: submit trả stale/conflict và không ghi partial data.

## Wave 0 Requirements

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
- [ ] `tests/security/checkout-boundaries.test.ts`

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bản xem trước market change dễ hiểu trên desktop/mobile và song ngữ | MKT-06 | Chất lượng thị giác và copy | Kiểm tra `/vi` và `/en`, old/new line values, totals, confirm/cancel |
| Cart mixed goods thể hiện rõ PDF và physical item | CART-01 | Phân cấp thị giác | Kiểm tra icon/label, quantity, variant và unavailable states |
| Checkout digital-only không hỏi địa chỉ giao hàng | CART-04, SHIP-03 | UX điều kiện | So sánh digital-only, physical-only và mixed carts |
| Admin shipping/discount/exception flows có trạng thái đầy đủ | SHIP-01, SHIP-05, DISC-01 | Workflow usability | Kiểm tra empty/loading/error/success và keyboard navigation |

## Validation Sign-Off

- [x] Mọi requirement Phase 3 có automated test hoặc Wave 0 dependency.
- [x] Không có ba task liên tiếp thiếu automated verification.
- [x] Wave 0 bao phủ toàn bộ file test còn thiếu.
- [x] Không dùng watch-mode flags.
- [x] Targeted feedback latency mục tiêu dưới 30 giây.
- [x] `nyquist_compliant: true` đã đặt trong frontmatter.

**Approval:** pending
