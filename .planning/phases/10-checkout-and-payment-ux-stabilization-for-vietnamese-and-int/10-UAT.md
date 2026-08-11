---
phase: 10-checkout-and-payment-ux-stabilization-for-vietnamese-and-int
status: complete
source:
  - 10-VERIFICATION.md
started: 2026-08-11T10:08:36Z
updated: 2026-08-11T10:47:00Z
---

# Phase 10 — Post-review UAT

Đây là checkpoint UAT hẹp cho các thay đổi user-visible được sửa sau lần duyệt Phase 10 ban đầu. Phase 09 geo/SEO không thuộc checkpoint này.

## Current Test

[testing complete]

## Test 1 — Checkout draft qua thay đổi danh tính

result: pass
evidence: Playwright chạy luồng tài khoản A → B và guest → account trong cùng tab; 1/1 test pass ngày 2026-08-11.

1. Trong cùng một tab, đăng nhập tài khoản A và nhập email/địa chỉ checkout nhưng chưa đặt hàng.
2. Đăng xuất rồi đăng nhập tài khoản B, mở lại checkout.
3. Xác nhận dữ liệu cá nhân của A không xuất hiện cho B.
4. Lặp lại từ guest sang tài khoản đã đăng nhập; dữ liệu guest không được tự gán cho tài khoản.
5. Với cùng một danh tính, tạo draft rồi thực hiện một lần chuyển trạng thái auth không thành công hoặc không làm đổi danh tính; quay lại checkout.
6. Xác nhận draft hợp lệ của cùng danh tính vẫn còn.

**Mong đợi:** Không lộ PII giữa guest/tài khoản hoặc giữa hai tài khoản; draft chỉ bị loại khi scope danh tính thực sự không khớp.

## Test 2 — Copy và accessible name tiếng Việt

result: pass
evidence: Người dùng xác nhận copy `/vi/lien-he` đúng; focused i18n/accessibility unit 11/11 pass.

1. Mở `/vi/lien-he`.
2. Xác nhận cảnh báo bảo mật hiển thị tiếng Việt đúng dấu, không có ký tự lỗi/méo chữ.
3. Đi qua checkout tiếng Việt tới trạng thái hoàn tất hoặc kiểm tra bằng accessibility tree/screen reader.
4. Xác nhận icon hoàn tất có accessible name tiếng Việt, không đọc là `Complete`.

**Mong đợi:** Copy tiếng Việt đúng Unicode và nhãn hỗ trợ tiếp cận được bản địa hóa.

## Test 3 — VietQR hết hạn và link QR cũ

result: pass
evidence: Người dùng xác nhận trang expired; runtime QR deadline tests 6/6 pass.

1. Mở một đơn VietQR đã hết hạn.
2. Xác nhận trang không còn hướng dẫn chuyển khoản hoặc nút tải QR.
3. Mở lại URL tải QR đã lưu trước đó.
4. Xác nhận request bị từ chối bằng phản hồi chung, không lộ thông tin đơn và không khuyến khích chuyển khoản.
5. Xác nhận CTA phục hồi dẫn tới khôi phục giỏ; nếu snapshot không còn dùng được thì có lối về catalog.

**Mong đợi:** Không thể lấy QR sau hạn; hành trình chuyển sang recovery an toàn.

## Test 4 — VietQR rejected ở cả hai locale

result: pass
evidence: Người dùng xác nhận bản tiếng Việt; browser verification xác nhận bản tiếng Anh tương đương, không literal key/MISSING_MESSAGE và không retry cùng order.

1. Mở một đơn VietQR trạng thái `rejected` dưới `/vi` và `/en`.
2. Xác nhận không xuất hiện literal key `orders.status.rejected.vietqrBody`, `MISSING_MESSAGE`, hoặc nội dung mặc định giả định luôn có kênh hỗ trợ.
3. Xác nhận hành động chính là khôi phục giỏ; khi không thể khôi phục thì có CTA về catalog.
4. Xác nhận không có CTA thử thanh toán lại trên cùng đơn.

**Mong đợi:** Copy recovery đầy đủ ở cả hai ngôn ngữ và hành động không tạo nguy cơ thanh toán lại cùng đơn.

## Summary

| Kết quả | Số lượng |
|---|---:|
| Total | 4 |
| Passed | 4 |
| Issues | 0 |
| Pending | 0 |
| Skipped | 0 |
| Blocked | 0 |

## Cách phản hồi

- Nếu cả 4 test đạt: trả lời `approved`.
- Nếu có lỗi: gửi số test, locale, bước lỗi và kết quả thực tế; ảnh chụp màn hình nếu thuận tiện.
