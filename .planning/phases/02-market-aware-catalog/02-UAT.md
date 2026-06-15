---
status: partial
phase: 02-market-aware-catalog
source:
  - 02-01-SUMMARY.md
  - 02-02-SUMMARY.md
  - 02-03-SUMMARY.md
  - 02-04-SUMMARY.md
  - 02-05-SUMMARY.md
  - 02-06-SUMMARY.md
  - 02-07-SUMMARY.md
  - 02-08-SUMMARY.md
started: 2026-06-14T01:31:43.213Z
updated: 2026-06-15T00:41:29.305Z
---

## Current Test

[testing paused - Test 1 bị chặn vì chưa có tài khoản admin]

## Tests

### 1. Mở khu vực quản trị catalog
expected: Đăng nhập bằng tài khoản admin rồi mở `/admin/catalog`. Trang danh sách sản phẩm xuất hiện và có hành động tạo sản phẩm mới. Người dùng không phải admin không thể mở khu vực này.
result: blocked
blocked_by: other
reason: "tôi chưa có tài khoản admin"

### 2. Tạo bản nháp sản phẩm song ngữ
expected: Từ trang catalog, tạo một sản phẩm PDF hoặc sản phẩm vật lý, nhập tên, slug, mô tả và metadata SEO bằng cả tiếng Việt và tiếng Anh rồi lưu. Bản nháp xuất hiện trong danh sách và mở lại vẫn giữ đúng dữ liệu.
result: [pending]

### 3. Thiết lập phân loại và giá theo thị trường
expected: Gán danh mục, bộ sưu tập và cấu hình offer Việt Nam bằng VND, offer quốc tế bằng USD. Sau khi lưu, mỗi thị trường giữ giá và trạng thái khả dụng độc lập, không tự quy đổi tiền tệ.
result: [pending]

### 4. Quản lý ảnh và PDF riêng tư
expected: Tải ảnh sản phẩm lên, chọn ảnh chính/ảnh chia sẻ và, với sản phẩm mẫu móc, liên kết tệp PDF. Ảnh xem trước hiển thị được; PDF chỉ hiện metadata trong admin và không có URL công khai cho khách.
result: [pending]

### 5. Quản lý biến thể và tồn kho vật lý
expected: Với sản phẩm vật lý có biến thể, thêm SKU, thuộc tính, giá ghi đè tùy chọn và số lượng tồn cho từng biến thể. Hệ thống không cho đồng thời dùng tồn kho cấp sản phẩm và cấp biến thể.
result: [pending]

### 6. Xuất bản sản phẩm hợp lệ
expected: Nhấn xuất bản khi dữ liệu còn thiếu sẽ thấy các blocker rõ ràng. Sau khi hoàn thiện nội dung song ngữ, offer, media, SEO và dữ liệu theo loại sản phẩm, thao tác xuất bản thành công.
result: [pending]

### 7. Mở catalog tiếng Việt
expected: Mở `/vi/cua-hang`. Trang hiển thị catalog tiếng Việt, thị trường đang hoạt động rõ ràng, thẻ sản phẩm có loại sản phẩm, trạng thái tồn và giá đúng định dạng của thị trường.
result: [pending]

### 8. Chuyển thị trường và giữ lựa chọn
expected: Chuyển giữa Việt Nam và Quốc tế từ header. Catalog cập nhật assortment và giá sang VND hoặc USD tương ứng; tải lại trang hoặc đổi ngôn ngữ vẫn giữ lựa chọn thị trường.
result: [pending]

### 9. Tìm kiếm, lọc và sắp xếp catalog
expected: Dùng ô tìm kiếm, bộ lọc loại sản phẩm/danh mục/bộ sưu tập và sắp xếp. URL phản ánh lựa chọn và danh sách chỉ hiển thị các sản phẩm phù hợp trong thị trường đang hoạt động.
result: [pending]

### 10. Mở trang chi tiết mẫu PDF
expected: Mở một sản phẩm mẫu móc từ catalog. Trang chi tiết đúng ngôn ngữ, có gallery, nhãn cho biết đây là mẫu PDF, giá đúng thị trường và không lộ đường dẫn tệp PDF riêng tư.
result: [pending]

### 11. Chọn biến thể sản phẩm vật lý
expected: Mở sản phẩm vật lý có biến thể. Các lựa chọn còn hàng có thể chọn và cập nhật trạng thái/giá hiệu lực; lựa chọn hết hàng vẫn nhìn thấy nhưng bị vô hiệu hóa.
result: [pending]

### 12. Xem sản phẩm không khả dụng ở thị trường hiện tại
expected: Mở trực tiếp URL của sản phẩm chỉ bán ở thị trường khác. Nội dung công khai vẫn xem được nhưng trang không hiển thị giá hoặc hành động mua của thị trường khác và chỉ gợi ý thị trường phù hợp.
result: [pending]

### 13. Kiểm tra metadata bản địa hóa
expected: Trên trang sản phẩm, danh mục và bộ sưu tập, title/description đúng ngôn ngữ; canonical trỏ đúng URL hiện tại; alternate tiếng Việt/Anh và ảnh chia sẻ công khai được khai báo.
result: [pending]

### 14. Kiểm tra biên bảo mật trước thanh toán
expected: Khi duyệt catalog với vai trò khách, không có liên kết tải PDF, entitlement, email giao file hoặc luồng fulfillment trước thanh toán; dữ liệu draft, số lượng tồn chính xác và giá thị trường khác không xuất hiện.
result: [pending]

### 15. Xác nhận kết quả User Story
expected: Sau toàn bộ luồng, admin có thể xuất bản sản phẩm số và vật lý song ngữ; khách Việt Nam và quốc tế chỉ duyệt đúng assortment, tiền tệ, giá, biến thể và tài sản công khai dành cho thị trường của họ trước checkout.
result: [pending]

## Summary

total: 15
passed: 0
issues: 0
pending: 14
skipped: 0
blocked: 1

## Gaps

[none yet]
