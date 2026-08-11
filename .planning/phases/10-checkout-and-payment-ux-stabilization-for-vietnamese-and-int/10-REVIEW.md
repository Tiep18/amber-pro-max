---
phase: 10-checkout-and-payment-ux-stabilization-for-vietnamese-and-int
reviewed: 2026-08-11T08:08:57Z
depth: standard
files_reviewed: 61
files_reviewed_list:
  - src/account/address-actions.ts
  - src/account/addresses.ts
  - src/app/[locale]/checkout/page.tsx
  - src/app/[locale]/contact/page.tsx
  - src/app/[locale]/orders/[orderNumber]/qr/route.ts
  - src/checkout/data/vietnam-administrative-units-2025-07-01.json
  - src/checkout/editable-draft.ts
  - src/checkout/schemas.ts
  - src/checkout/shipping-address-ui.ts
  - src/checkout/shipping-address.ts
  - src/checkout/submit-error-copy.ts
  - src/checkout/vietnam-address.ts
  - src/checkout/vietnam-phone.ts
  - src/components/cart/cart-line.tsx
  - src/components/cart/cart-page.tsx
  - src/components/cart/mini-cart.tsx
  - src/components/catalog/add-to-cart.tsx
  - src/components/checkout/checkout-page.tsx
  - src/components/checkout/contact-form.tsx
  - src/components/checkout/destination-form.tsx
  - src/components/checkout/discount-code-form.tsx
  - src/components/checkout/order-summary.tsx
  - src/components/payments/order-payment-page.tsx
  - src/components/payments/order-recovery-banner.tsx
  - src/components/payments/payment-state-panel.tsx
  - src/components/payments/payment-status-recheck.tsx
  - src/components/payments/vietqr-instructions.tsx
  - src/components/support/incident-reference.tsx
  - src/components/support/support-links.tsx
  - src/components/ui/searchable-select.tsx
  - src/i18n/routing.ts
  - src/lib/env/server.ts
  - src/messages/en.json
  - src/messages/vi.json
  - src/payments/format.ts
  - src/payments/order-recovery.ts
  - src/payments/recheck-model.ts
  - src/payments/status.ts
  - src/payments/vietqr/instructions.ts
  - src/support/config.ts
  - tests/e2e/account-retention.spec.ts
  - tests/e2e/cart.spec.ts
  - tests/e2e/checkout-market-change.spec.ts
  - tests/e2e/checkout-ux.spec.ts
  - tests/e2e/checkout.spec.ts
  - tests/e2e/fixtures/phase-10-commerce-seed.ts
  - tests/e2e/order-status.spec.ts
  - tests/e2e/payment-ux.spec.ts
  - tests/e2e/storefront-market-convergence.spec.ts
  - tests/e2e/storefront-state.spec.ts
  - tests/security/checkout-boundaries.test.mjs
  - tests/security/payment-boundaries.test.mjs
  - tests/unit/catalog/add-to-cart.test.ts
  - tests/unit/checkout/shipping-address-ui.test.ts
  - tests/unit/i18n/phase-10-message-parity.test.ts
  - tests/unit/payments/format.test.ts
  - tests/unit/payments/order-recovery.test.ts
  - tests/unit/payments/recheck-model.test.ts
  - tests/unit/payments/status-mapping.test.ts
  - tests/unit/payments/vietqr.test.ts
  - tests/unit/support/config.test.ts
findings:
  critical: 2
  warning: 3
  info: 0
  total: 5
status: issues_found
---

# Phase 10: Báo cáo review mã nguồn

**Thời điểm review:** 2026-08-11T08:08:57Z  
**Độ sâu:** standard  
**Số file đã review:** 61  
**Trạng thái:** issues_found

## Summary

Đã rà toàn bộ phạm vi 61 file của Phase 10, tập trung vào PII của checkout draft, thẩm quyền market/payment, idempotency khi submit, luồng VietQR, trạng thái/deadline thanh toán, quyền truy cập guest/authenticated, i18n và accessibility. Có 2 lỗi mức BLOCKER: draft PII không được ràng buộc với danh tính trong tab và route tải QR vẫn hoạt động sau hạn giữ hàng. Ngoài ra có 3 WARNING có đầu ra người dùng cụ thể về bản dịch bị hỏng, accessible name sai locale và thuật ngữ nội bộ trong thông báo thanh toán.

## Narrative Findings (AI reviewer)

### Critical Issues

#### CR-01 [BLOCKER]: Checkout draft có thể làm lộ PII giữa hai tài khoản dùng cùng một tab

**File:** `src/checkout/editable-draft.ts:4`, `src/app/[locale]/checkout/page.tsx:14-31`, `src/components/checkout/checkout-page.tsx:319-326`, `src/components/checkout/checkout-page.tsx:414-430`, `tests/e2e/checkout-ux.spec.ts:152-214`

**Issue:** Draft chứa email, tên người nhận, số điện thoại và địa chỉ (`editable-draft.ts:15-35`) nhưng tất cả người dùng dùng chung một key `atb_checkout_editable_draft_v1`. Checkout server đã lấy đúng user hiện tại và truyền email/địa chỉ đã lưu tại `page.tsx:14-31`, nhưng effect hydrate phía client luôn đọc draft và ghi đè các giá trị đó tại `checkout-page.tsx:414-427`, không kiểm tra draft thuộc guest hay tài khoản nào. `sessionStorage` tồn tại qua sign-out/sign-in trong cùng tab, vì vậy người B mở checkout trong tab từng được người A dùng sẽ nhìn thấy PII của người A. Test hiện tại chỉ chứng minh draft sống qua reload cùng phiên và loại các trường authority (`checkout-ux.spec.ts:152-214`), không bao phủ chuyển tài khoản.

**Fix:** Gắn draft với một scope không chứa PII được server cấp cho phiên/danh tính hiện tại (ví dụ opaque/HMAC account scope), tách scope guest và authenticated, đồng thời từ chối/xóa draft khi scope không khớp. Xóa draft tại mọi auth transition/sign-out như lớp bảo vệ bổ sung. Thêm E2E: nhập PII ở tài khoản A, sign out, sign in tài khoản B trong cùng tab, mở checkout và xác nhận không có dữ liệu A; làm tương tự cho chuyển guest sang account.

#### CR-02 [BLOCKER]: Route tải VietQR bỏ qua deadline và cho phép chuyển khoản sau khi hết hạn giữ hàng

**File:** `src/app/[locale]/orders/[orderNumber]/qr/route.ts:112-123`, `src/payments/status.ts:95-105`, `src/payments/vietqr/instructions.ts:113-115`, `tests/security/payment-boundaries.test.mjs:215-245`

**Issue:** Route download xác minh quyền truy cập và cặp VN/VND/VietQR, nhưng chỉ yêu cầu trạng thái DB thô là `pending`; nó không đọc hoặc kiểm tra `reservationExpiresAt` trước khi fetch ảnh QR. Trong khi đó model hiển thị đã coi `pending` quá deadline là `expired` (`status.ts:95-105`) và builder instruction cũng từ chối deadline thiếu/không hợp lệ/đã qua (`instructions.ts:113-115`). Khoảng thời gian giữa deadline và job cập nhật trạng thái DB vì thế tạo ra bất nhất an toàn: một URL QR đã mở sẵn hoặc request trực tiếp vẫn tải được mã chuyển khoản sau khi hàng không còn được giữ, làm khách có thể trả tiền cho đơn đã hết cửa sổ thanh toán. Security test hiện chỉ regex điều kiện `paymentStatus !== 'pending'` và hardening fetch, nên không bắt lỗi deadline.

**Fix:** Trước khi tạo URL upstream, parse `order.reservationExpiresAt` và trả generic denial nếu thiếu, invalid hoặc `<= Date.now()`. Nên trích một validator eligibility dùng chung cho trang instruction và route download để hai cửa sổ không lệch nhau. Thêm test route/runtime cho `pending + expired deadline`, `pending + invalid/missing deadline`, và boundary đúng thời điểm hết hạn; tất cả phải từ chối mà không gọi upstream.

### Warnings

#### WR-01 [WARNING]: Cảnh báo bảo mật trên trang liên hệ tiếng Việt bị mojibake

**File:** `src/app/[locale]/contact/page.tsx:24-26`

**Issue:** Chuỗi hiển thị cho locale `vi` được lưu thành `KhÃ´ng chia sáº»...`, nên khách hàng thấy chữ Việt bị lỗi ngay trong cảnh báo về mật khẩu, thông tin ngân hàng và link truy cập đơn hàng. Kiểm tra parity JSON hiện không thể bắt lỗi vì chuỗi này được hardcode ngoài message catalog.

**Fix:** Chuyển cả hai bản cảnh báo vào namespace message của trang contact và lưu bản tiếng Việt UTF-8 hợp lệ (ví dụ: “Không chia sẻ mật khẩu, thông tin đăng nhập ngân hàng hoặc liên kết truy cập đơn hàng riêng tư.”). Bổ sung test render `/vi/lien-he` hoặc cấm literal customer-facing theo locale nằm ngoài catalog.

#### WR-02 [WARNING]: Hai accessible name báo hoàn tất luôn là tiếng Anh trên checkout tiếng Việt

**File:** `src/components/checkout/checkout-page.tsx:926-930`, `src/components/checkout/checkout-page.tsx:963-967`

**Issue:** Icon hoàn tất của phần contact và shipping dùng `aria-label="Complete"` hardcode. Trên `/vi/thanh-toan`, screen reader vì thế đọc tiếng Anh trong một form tiếng Việt, trái với yêu cầu accessible name theo locale của Phase 10.

**Fix:** Lấy label từ message catalog theo locale (một key dùng chung như `checkout.complete`) hoặc, nếu icon chỉ mang tính trang trí và trạng thái đã có text tương đương, đặt `aria-hidden="true"`. Thêm assertion accessible-name ở cả checkout `en` và `vi`.

#### WR-03 [WARNING]: Thông báo rejected để lộ thuật ngữ trạng thái nội bộ “paid gate”

**File:** `src/messages/en.json:526-528`, `src/messages/vi.json:526-528`, `src/components/payments/order-payment-page.tsx:197-203`

**Issue:** Body của trạng thái rejected nói “The paid gate stays closed”; bản Việt dùng “Cổng thanh toán vẫn đóng”. Đây là thuật ngữ triển khai nội bộ thay vì hướng dẫn khách hàng, và component thực sự render trực tiếp body này cho trạng thái rejected. Nó vi phạm quyết định copy Phase 10 phải tránh các thuật ngữ như gate/entitlement/fulfillment lock trên bề mặt khách hàng.

**Fix:** Thay bằng kết quả và hành động cụ thể, ví dụ: “Payment was not confirmed, so this order cannot be fulfilled or retried. Contact support if you believe this is an error.” và bản Việt tương ứng. Mở rộng test message Phase 10 để cấm các thuật ngữ nội bộ trong toàn bộ namespace payment được render, không chỉ kiểm tra parity key.

---

_Reviewed: 2026-08-11T08:08:57Z_  
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: standard_
