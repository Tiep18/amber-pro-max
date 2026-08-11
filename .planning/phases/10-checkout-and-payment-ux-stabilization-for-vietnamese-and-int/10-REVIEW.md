---
phase: 10-checkout-and-payment-ux-stabilization-for-vietnamese-and-int
reviewed: 2026-08-11T09:06:47Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - src/app/[locale]/checkout/page.tsx
  - src/app/[locale]/contact/page.tsx
  - src/app/[locale]/orders/[orderNumber]/qr/route.ts
  - src/checkout/editable-draft.ts
  - src/components/checkout/checkout-page.tsx
  - src/components/storefront-context.tsx
  - src/messages/en.json
  - src/messages/vi.json
  - src/payments/vietqr/instructions.ts
  - tests/e2e/checkout-ux.spec.ts
  - tests/e2e/fixtures/phase-10-commerce-seed.ts
  - tests/security/checkout-boundaries.test.mjs
  - tests/security/payment-boundaries.test.mjs
  - tests/unit/checkout/editable-draft.test.ts
  - tests/unit/i18n/phase-10-message-parity.test.ts
  - tests/unit/payments/vietqr.test.ts
findings:
  critical: 1
  warning: 3
  info: 0
  total: 4
status: issues_found
---

# Phase 10: Báo cáo tái review mã nguồn

**Thời điểm review:** 2026-08-11T09:06:47Z
**Độ sâu:** standard
**Số file đã review:** 16
**Trạng thái:** issues_found

## Summary

Đã tái review toàn bộ 16 file sửa sau vòng review đầu và đối chiếu trực tiếp năm finding cũ. CR-02 đã được sửa đúng ở implementation: route xác thực quyền trước, sau đó từ chối deadline thiếu, sai, hết hạn hoặc đúng biên trước khi dựng URL/gọi upstream. WR-01 và WR-02 đã được sửa bằng message catalog UTF-8 hợp lệ và accessible name theo locale. WR-03 đã loại bỏ thuật ngữ nội bộ “paid gate”. Các gate chạy lại đều xanh: 50 unit tests, 38 security tests và `check:vi-diacritics`.

Tuy nhiên CR-01 chưa đạt đầy đủ thuộc tính “opaque”: scope hiện là SHA-256 công khai, xác định được từ `user.id`, nên vẫn có thể đối chiếu scope với danh tính ứng viên. Fix còn thêm thao tác xóa draft vô điều kiện trước khi auth transition được xác nhận, làm mất draft hợp lệ cùng scope. Hai khoảng trống test/UX khác là route deadline chưa có runtime test chứng minh upstream không được gọi và copy rejected luôn hướng khách tới support dù có thể không có kênh/link support.

## Narrative Findings (AI reviewer)

### Critical Issues

#### CR-01 [BLOCKER]: Draft scope là hash công khai có thể đối chiếu ngược với danh tính ứng viên

**File:** `src/checkout/editable-draft.ts:4`, `src/checkout/editable-draft.ts:107-109`, `src/app/[locale]/checkout/page.tsx:25-30`, `tests/unit/checkout/editable-draft.test.ts:42-58`, `tests/security/checkout-boundaries.test.mjs:191-204`

**Issue:** `buildCheckoutDraftScope` tính trực tiếp `sha256("checkout-editable-draft:v1:" + userId)` với prefix cố định và không có secret. Digest sau đó được truyền vào client và lưu trong `sessionStorage`. Vì thuật toán và prefix đều công khai, bất kỳ bên nào biết hoặc có một `user.id` ứng viên đều tính lại được chính xác scope và liên kết giá trị pseudonymous trong browser storage với tài khoản đó. Đây không phải opaque/HMAC scope như finding cũ yêu cầu. Unit test chỉ chứng minh chuỗi hash không chứa nguyên văn UUID; nó không chứng minh khả năng chống correlation, và security test cũng chỉ regex việc gọi builder. Scope mismatch đã ngăn việc vô tình hydrate PII của tài khoản A sang B, nhưng thuộc tính bảo mật “không thể correlate/leak raw identity” vẫn chưa đạt.

**Fix:** Chuyển việc tạo account scope sang module `server-only` và dùng HMAC-SHA-256 với secret server chuyên biệt/được quản lý qua env, ví dụ `HMAC(secret, "checkout-editable-draft:v2:" + user.id)`. Chỉ truyền digest xuống client, tăng schema/key version để loại record cũ, và không export builder có thể chạy trong client-shared module. Test phải chứng minh cùng identity cho cùng scope, identity khác cho scope khác, digest không chứa raw ID, builder là server-only/HMAC và không có construction SHA-256 công khai từ `user.id`.

### Warnings

#### WR-01 [WARNING]: Auth notifier xóa draft hợp lệ trước khi biết scope có đổi hoặc sign-out thành công

**File:** `src/components/storefront-context.tsx:63-68`, `src/checkout/editable-draft.ts:228-233`, `tests/e2e/checkout-ux.spec.ts:216-245`, `tests/security/checkout-boundaries.test.mjs:191-204`

**Issue:** `notifyStorefrontContextChanged()` gọi `clearBrowserEditableDraft()` vô điều kiện. Các form sign-out gọi notifier ở `onSubmit`, tức draft bị xóa trước kết quả server; sign-out thất bại vẫn làm mất dữ liệu. Cùng logic cũng xóa draft khi người dùng tái xác thực vào cùng tài khoản/same scope, dù record vẫn hợp lệ và `readEditableDraft` đã có cơ chế tự xóa an toàn khi scope thực sự mismatch. E2E mới chỉ chứng minh A→B và guest→account không hydrate email cũ; cả hai đường đều đi qua thao tác clear nên không chứng minh scope gate, không kiểm tra same-scope retention và không kiểm tra auth failure. Điều này trái với lifecycle Phase 10 là giữ draft qua failure và chỉ xóa khi thành công hoặc record không hợp lệ/sai scope.

**Fix:** Bỏ thao tác clear khỏi notifier chung. Sau auth transition đã xác nhận, để checkout đọc scope mới: mismatch thì `readEditableDraft` tự discard; same scope thì giữ record. Nếu vẫn muốn clear chủ động, chỉ làm sau khi server xác nhận identity mới và chỉ khi scope mới khác scope của record. Thêm test cho failed sign-out và re-auth cùng account giữ draft, đồng thời A→B và guest→account vẫn discard bằng chính `scope_mismatch` chứ không nhờ pre-clear.

#### WR-02 [WARNING]: Test deadline VietQR không chạy route nên chưa chứng minh upstream không được gọi

**File:** `tests/security/payment-boundaries.test.mjs:214-233`, `tests/unit/payments/vietqr.test.ts:222-236`, `src/app/[locale]/orders/[orderNumber]/qr/route.ts:94-125`

**Issue:** Implementation hiện đặt authorization và `isVietQrPaymentWindowOpen` đúng thứ tự trước `buildQuickLinkUrl`/`fetch`, và helper unit test đúng các case missing/invalid/expired/boundary/future. Nhưng security test chỉ đọc source rồi so vị trí chuỗi; không import/gọi `GET`, không mock `getAuthorizedOrderPayment`, clock hoặc `fetch`, và không assert `fetch` có số lần gọi bằng 0. Một refactor vẫn giữ các token theo thứ tự nhưng gọi upstream trên nhánh denied có thể làm test xanh. Vì CR-02 là biên thanh toán, thiếu runtime negative-path test là khoảng trống độ tin cậy đáng kể dù code hiện tại đúng.

**Fix:** Thêm route-level unit/integration test với dependency mocks/fake clock cho unauthorized, missing, invalid, expired và exact-boundary deadlines; assert response generic denial và `fetch`/URL builder không được gọi. Case future hợp lệ mới được phép gọi upstream. Giữ source assertions như lớp bổ sung, không dùng chúng làm bằng chứng duy nhất.

#### WR-03 [WARNING]: Copy rejected luôn yêu cầu liên hệ support dù nhánh terminal có thể không có kênh hoặc link support

**File:** `src/messages/en.json:528-530`, `src/messages/vi.json:528-530`, `tests/unit/i18n/phase-10-message-parity.test.ts:42-48`

**Issue:** Bản sửa đã loại đúng thuật ngữ “paid gate”, nhưng câu mới luôn nói “contact support/liên hệ hỗ trợ”. Cấu hình support cho phép `hasChannels=false`, và trang order chỉ render support CTA cho trạng thái `review_required`; trạng thái `rejected` chỉ có recovery banner. Vì vậy rejected customer có thể được hướng tới một hành động không tồn tại ngay cả khi không có kênh support cấu hình. Unit test khóa cứng chính câu này nên biến inconsistency thành expected behavior thay vì kiểm tra zero-channel/configured-channel rendering.

**Fix:** Giữ body rejected độc lập với support, ví dụ chỉ giải thích kết quả và yêu cầu khôi phục sản phẩm vào giỏ. Nếu muốn giữ hướng dẫn support, render suffix/CTA chỉ khi `publicSupportConfig.hasChannels` và bổ sung test cho cả zero-channel lẫn configured-channel; không hardcode một câu luôn giả định support khả dụng.

---

_Reviewed: 2026-08-11T09:06:47Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
