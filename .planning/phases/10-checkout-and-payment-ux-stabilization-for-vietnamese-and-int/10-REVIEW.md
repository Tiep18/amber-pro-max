---
phase: 10-checkout-and-payment-ux-stabilization-for-vietnamese-and-int
reviewed: 2026-08-11T09:43:46Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/app/[locale]/checkout/page.tsx
  - src/checkout/editable-draft-scope.server.ts
  - src/checkout/editable-draft.ts
  - src/lib/env/server.ts
  - src/components/storefront-context.tsx
  - src/messages/en.json
  - src/messages/vi.json
  - tests/unit/checkout/editable-draft.test.ts
  - tests/unit/components/storefront-context-notifier.test.ts
  - tests/unit/payments/vietqr-download-route.test.ts
  - tests/security/checkout-boundaries.test.mjs
  - tests/unit/i18n/phase-10-message-parity.test.ts
findings:
  critical: 0
  warning: 1
  info: 0
  total: 1
status: issues_found
---

# Phase 10: Báo cáo tái review mã nguồn

**Thời điểm review:** 2026-08-11T09:43:46Z
**Độ sâu:** standard
**Số file đã review:** 12
**Trạng thái:** issues_found

## Summary

Đã review trực tiếp 12 file của iteration 2 tại HEAD `447e110586b5bcb46bbdeb2eaa1ec1eb28dd3edc` và trace các consumer liên quan để đối chiếu bốn finding cũ.

CR-01 đã được sửa đúng: account draft scope nằm trong module `server-only`, dùng HMAC-SHA-256 với khóa đặc quyền hiện hữu qua accessor tập trung, có domain/version `checkout-editable-draft:account-scope:v2:`, chỉ truyền digest xuống client, tách guest scope v2 không chứa danh tính, và loại storage/schema v1. WR-01 cũng đã được sửa: notifier không còn pre-clear; record cùng scope được giữ và record sai scope vẫn tự bị loại bằng `scope_mismatch`. WR-02 đã được sửa bằng test runtime thực sự import/gọi `GET`; các nhánh unauthorized, deadline thiếu/sai/hết hạn/đúng biên đều chứng minh URL builder và `fetch` có số lần gọi bằng 0, còn deadline tương lai là control gọi upstream.

WR-03 chưa được sửa end-to-end. Catalog và test hiện chỉ sửa/kiểm tra `orders.status.rejected.body`, nhưng trang order của VietQR chọn key không tồn tại `orders.status.rejected.vietqrBody`. Phép gọi translator runtime trả literal key và phát lỗi `MISSING_MESSAGE`, nên khách ở trạng thái rejected không nhận được copy recovery mới dù test catalog đang xanh.

Verification chạy trong lượt review: 31/31 focused unit tests passed, 19/19 checkout security tests passed, `npm run typecheck` passed, và `npm run check:vi-diacritics` passed. Các kết quả xanh không phủ được key runtime bị chọn sai nêu dưới đây.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01 [WARNING]: Nhánh VietQR rejected chọn key không tồn tại nên copy recovery mới không bao giờ hiển thị

**File:** `src/messages/en.json:528-530`, `src/messages/vi.json:528-530`, `tests/unit/i18n/phase-10-message-parity.test.ts:42-51`; consumer liên quan: `src/components/payments/order-payment-page.tsx:48-58`, `src/components/payments/order-payment-page.tsx:198-203`

**Issue:** Iteration 2 thay đúng nội dung `orders.status.rejected.body` để không phụ thuộc support, và test parity khóa chính xác hai chuỗi đó. Tuy nhiên `OrderPaymentPage` xác định mọi order VietQR bằng `isVietQrOrder`, rồi `vietQrStatusBodyKey('rejected')` trả `status.rejected.vietqrBody`. Cả catalog tiếng Anh lẫn tiếng Việt đều không khai báo `vietqrBody` cho `rejected`. Với chính translator đang dùng trong dự án, đường gọi này phát `MISSING_MESSAGE` và render fallback literal `orders.status.rejected.vietqrBody`; vì vậy khách không thấy giải thích/recovery đã sửa. Test hiện chỉ truy cập trực tiếp `.body`, không chạy resolver/key selection của trang, nên vẫn pass trong khi runtime sai.

**Fix:** Cho rejected dùng body chung bằng cách bỏ `status === 'rejected'` khỏi nhánh đặc biệt của `vietQrStatusBodyKey` (tránh nhân đôi copy):

```ts
function vietQrStatusBodyKey(status: string) {
  if (
    status === 'awaiting_payment' ||
    status === 'verifying_payment' ||
    status === 'expired' ||
    status === 'review_required'
  ) {
    return `status.${status}.vietqrBody`;
  }
  return `status.${status}.body`;
}
```

Bổ sung test qua đúng key-selection/runtime translator cho VietQR `rejected` ở cả `en` và `vi`, assert không có `MISSING_MESSAGE`, không render literal key, có hướng dẫn khôi phục giỏ, và không giả định kênh support. Một lựa chọn kém gọn hơn là thêm `rejected.vietqrBody` ở cả hai catalog, nhưng khi đó phải giữ parity và nội dung recovery đồng bộ với `body`.

---

_Reviewed: 2026-08-11T09:43:46Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
