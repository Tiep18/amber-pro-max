---
status: resolved
trigger: 'Nút Đăng xuất trong menu tài khoản ở header không hoạt động khi bấm; xử lý tương tự nút đăng xuất trong trang khách hàng.'
created: 2026-08-28
updated: 2026-08-28
---

# Debug Session: Header Account Sign-out No Action

## Symptoms

- Expected behavior: Bấm `Đăng xuất` trong menu tài khoản ở header phải đăng xuất người dùng và cập nhật/điều hướng giao diện giống nút đăng xuất trong trang khách hàng.
- Actual behavior: Bấm nút không thấy thay đổi gì.
- Error messages: Chưa được cung cấp.
- Timeline: Chưa xác định; người dùng báo lỗi ngày 2026-08-28.
- Reproduction: Mở menu tài khoản đã đăng nhập trong header rồi bấm `Đăng xuất` ở cuối menu.

## Current Focus

- hypothesis: `DropdownMenuItem` đóng và unmount menu/form khi chọn item, trước khi trình duyệt thực hiện default submit của `PendingSubmitButton`; nút trang khách hàng không nằm trong primitive này nên submit bình thường.
- test: Giữ menu mở bằng cách prevent default riêng cho Radix `onSelect`, rồi chạy lại E2E đăng xuất từ header.
- expecting: Form vẫn tồn tại đủ lâu để submit `signOutAction`, redirect về `/vi`, và header chuyển sang liên kết `Đăng nhập`.
- next_action: None; fix verified.

## Evidence

- timestamp: 2026-08-28
  note: `src/components/account/account-shell.tsx` đặt `PendingSubmitButton` trực tiếp trong form và test E2E hiện có xác nhận đăng xuất thành công.
- timestamp: 2026-08-28
  note: `src/components/account-menu.tsx` bọc cùng submit button bằng `DropdownMenuItem asChild`; đây là khác biệt hành vi duy nhất trên đường submit.
- timestamp: 2026-08-28
  note: E2E mới click được `menuitem "Đăng xuất"`; menu đóng nhưng avatar `Tài khoản` vẫn còn và liên kết `Đăng nhập` không xuất hiện, chứng minh session chưa được đăng xuất.
- timestamp: 2026-08-28
  note: Sau khi ngăn default select-close của Radix, E2E header chuyển xanh và liên kết `Đăng nhập` xuất hiện sau click.

## Eliminated

- hypothesis: `signOutAction` hoặc Supabase sign-out bị hỏng trên mọi bề mặt.
  reason: Nút trang khách hàng gọi cùng `signOutAction` trực tiếp và luồng E2E hiện có vẫn đăng xuất về `/vi`.

## Resolution

- root_cause: `DropdownMenuItem` tự đóng/unmount menu khi select, khiến submit button và form biến mất trước bước default form submission; `signOutAction` không được gọi.
- fix: Prevent default trên sự kiện `onSelect` của riêng item đăng xuất để form còn mounted trong lúc `PendingSubmitButton` submit cùng server action và pending state như trang khách hàng.
- verification: Red/green E2E xác nhận lỗi trước sửa và thành công sau sửa; cả hai luồng đăng xuất header/trang khách hàng đều pass. TypeScript và ESLint pass.
- files_changed: `src/components/account-menu.tsx`, `tests/e2e/admin-boundary.spec.ts`
