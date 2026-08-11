---
phase: 10-checkout-and-payment-ux-stabilization-for-vietnamese-and-int
fixed_at: 2026-08-11T08:57:33.1194748Z
review_path: .planning/phases/10-checkout-and-payment-ux-stabilization-for-vietnamese-and-int/10-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 10: Code Review Fix Report

**Fixed at:** 2026-08-11T08:57:33.1194748Z  
**Source review:** `.planning/phases/10-checkout-and-payment-ux-stabilization-for-vietnamese-and-int/10-REVIEW.md`  
**Iteration:** 1

**Summary:**

- Findings in scope: 5
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01: Checkout draft có thể làm lộ PII giữa hai tài khoản dùng cùng một tab

**Status:** fixed: requires human verification  
**Files modified:** `src/app/[locale]/checkout/page.tsx`, `src/checkout/editable-draft.ts`, `src/components/checkout/checkout-page.tsx`, `src/components/storefront-context.tsx`, `tests/e2e/checkout-ux.spec.ts`, `tests/e2e/fixtures/phase-10-commerce-seed.ts`, `tests/security/checkout-boundaries.test.mjs`, `tests/unit/checkout/editable-draft.test.ts`  
**Commit:** `fdf88d1c`  
**Applied fix:** Gắn draft với scope SHA-256 opaque do server suy ra từ identity đã xác thực hoặc guest marker; không lưu raw identity/PII trong scope. Draft sai scope bị xóa, chuyển trạng thái auth cũng xóa draft, TTL 12 giờ và server authority được giữ nguyên. Bổ sung unit, security và E2E cho account A → B và guest → account trong cùng tab.

### CR-02: Route tải VietQR bỏ qua deadline và cho phép chuyển khoản sau khi hết hạn giữ hàng

**Status:** fixed: requires human verification  
**Files modified:** `src/app/[locale]/orders/[orderNumber]/qr/route.ts`, `src/payments/vietqr/instructions.ts`, `tests/security/payment-boundaries.test.mjs`, `tests/unit/payments/vietqr.test.ts`  
**Commit:** `f3ea4c6e`  
**Applied fix:** Dùng chung một helper eligibility cho deadline VietQR. Route tiếp tục xác thực quyền trước để không làm lộ order, sau đó từ chối deadline thiếu, sai định dạng, hết hạn hoặc đúng biên trước khi dựng URL/gọi upstream.

### WR-01: Cảnh báo bảo mật trên trang liên hệ tiếng Việt bị mojibake

**Status:** fixed  
**Files modified:** `src/app/[locale]/contact/page.tsx`, `src/messages/en.json`, `src/messages/vi.json`, `tests/unit/i18n/phase-10-message-parity.test.ts`  
**Commit:** `3a4bf880`  
**Applied fix:** Chuyển cảnh báo bảo mật sang message bounded song ngữ và thay chuỗi tiếng Việt mojibake bằng Unicode hợp lệ; thêm assertion parity/UTF-8.

### WR-02: Hai accessible name báo hoàn tất luôn là tiếng Anh trên checkout tiếng Việt

**Status:** fixed  
**Files modified:** `src/components/checkout/checkout-page.tsx`, `src/messages/en.json`, `src/messages/vi.json`, `tests/security/checkout-boundaries.test.mjs`, `tests/unit/i18n/phase-10-message-parity.test.ts`  
**Commit:** `9d003ed9`  
**Applied fix:** Thay hai `aria-label="Complete"` bằng key message theo locale và kiểm tra cả tiếng Anh lẫn tiếng Việt ở unit/security tests.

### WR-03: Thông báo rejected để lộ thuật ngữ trạng thái nội bộ “paid gate”

**Status:** fixed  
**Files modified:** `src/messages/en.json`, `src/messages/vi.json`, `tests/unit/i18n/phase-10-message-parity.test.ts`  
**Commit:** `a2dfc0e0`  
**Applied fix:** Thay nội dung rejected bằng hướng dẫn thân thiện cho khách hàng ở cả hai locale và mở rộng forbidden-term coverage cho `paid gate`, `cổng thanh toán`, `cổng đã mở`.

## Verification

- Focused unit: 61/61 passed.
- Focused checkout/payment security: 38/38 passed.
- Focused checkout auth-transition E2E: 1/1 passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run test:security`: 76/76 passed.
- `npm run ci`: passed (lint, typecheck, Vietnamese diacritics, 978 unit tests, 942 DB tests, production build, 76 security tests, full E2E).
- Phase 09 deferred UAT was not modified.

---

_Fixed: 2026-08-11T08:57:33.1194748Z_  
_Fixer: the agent (gsd-code-fixer)_  
_Iteration: 1_
