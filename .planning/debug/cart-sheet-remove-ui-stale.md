---
status: resolved
trigger: "Xóa sản phẩm trong cart Sheet nhưng sản phẩm không biến mất khỏi UI."
created: 2026-07-31T00:00:00+07:00
updated: 2026-07-31T15:07:00+07:00
---

# Debug Session: Cart Sheet Remove UI Stale

## Symptoms

- Expected behavior: Khi người dùng bấm xóa một sản phẩm trong cart Sheet, dòng sản phẩm biến mất khỏi UI và cart badge/tổng tiền được cập nhật.
- Actual behavior: Thao tác xóa được thực hiện nhưng sản phẩm vẫn còn hiển thị trên UI.
- Error messages: Chưa ghi nhận thông báo lỗi.
- Timeline: Chưa xác định; được báo cáo ngày 2026-07-31.
- Reproduction: Mở cart Sheet có sản phẩm và thực hiện thao tác xóa sản phẩm.

## Current Focus

- hypothesis: `diffMarketCartQuotes` không phân biệt dòng biến mất do người dùng xóa với dòng biến mất do market requote; Mini Cart ghép mọi `changes.removed` từ `previousQuote` trở lại UI.
- test: Tái hiện xóa Garden Snail PDF Pattern trên browser, kiểm tra localStorage, request/response của Server Action và DOM sau requote.
- expecting: Cart intent và server quote đều rỗng, trong khi UI vẫn dựng lại dòng cũ từ `previousQuote`.
- next_action: resolved

## Evidence

- timestamp: 2026-07-31T14:56:37+07:00
  observation: Trước khi xóa, `amigurumi.guestCart.v1` chứa một dòng Garden Snail PDF Pattern.
- timestamp: 2026-07-31T14:56:38+07:00
  observation: Sau khi xóa, localStorage được cập nhật thành `lines: []` và badge cart giảm từ 1 xuống 0.
- timestamp: 2026-07-31T14:56:38+07:00
  observation: Server Action nhận payload `{locale: "en", lines: []}` và trả HTTP 200 với quote `status: "empty"` cùng `lines: []`.
- timestamp: 2026-07-31T14:56:39+07:00
  observation: Cart Sheet vẫn hiển thị Garden Snail PDF Pattern ở trạng thái "Unavailable for the current quote"; nút xóa bị disabled và summary ghi "Removed from current offer".
- timestamp: 2026-07-31T14:57:08+07:00
  observation: Các unit test hiện có cho market sync và guest storage đều pass, nhưng không có regression test cho thao tác xóa qua CartProvider/MiniCart.
- timestamp: 2026-07-31T14:58:00+07:00
  observation: `MiniCart` và `CartPageContent` đều nối lại mọi dòng `changes.removed` từ `previousQuote` mà không kiểm tra dòng đó còn tồn tại trong cart intent hay không.
- timestamp: 2026-07-31T15:03:09+07:00
  observation: Regression tests xác nhận dòng người dùng xóa bị ẩn cả trong lúc requote pending và sau khi quote rỗng settle, trong khi dòng bị market loại vẫn được giữ nếu intent còn tồn tại.
- timestamp: 2026-07-31T15:05:28+07:00
  observation: `settleMarketRequote` không còn phân loại intent người dùng đã xóa thành market removal; market removal thật vẫn tạo change fact.
- timestamp: 2026-07-31T15:06:47+07:00
  observation: Browser remote verification xác nhận Mini Cart và trang Cart đều chuyển sang empty ngay sau xóa, badge về 0, localStorage có `lines: []`, không còn cảnh báo "Removed from current offer".

## Eliminated

- hypothesis: Xóa localStorage thất bại.
  reason: localStorage chuyển đúng sang `lines: []` ngay sau thao tác.
- hypothesis: Supabase hoặc server quote giữ lại sản phẩm.
  reason: Server Action trả quote rỗng, không có dòng sản phẩm và không có lỗi.
- hypothesis: React CartProvider không cập nhật cart state.
  reason: Badge cart giảm về 0, chứng minh state `cart` đã commit intent rỗng.

## Resolution

- root_cause: `settleMarketRequote` dùng diff giữa quote cũ và quote mới nên coi mọi dòng biến mất là thay đổi market. `MiniCart` và `CartPageContent` sau đó chủ động ghép các dòng `changes.removed` từ `previousQuote` trở lại `displayLines`. Khi người dùng chủ động xóa, dòng không còn trong cart intent nhưng vẫn bị ghép lại như một offer bị loại khỏi market.
- fix: Thêm selector dùng chung lọc `previousQuote` theo cart intent hiện tại; Mini Cart và trang Cart chỉ dựng lại dòng market-removed nếu intent vẫn tồn tại. `settleMarketRequote` cũng lọc quote cũ theo intent trước khi tạo market-change facts, ngăn cảnh báo sai sau thao tác xóa.
- files_changed:
  - `src/cart/display-lines.ts`
  - `src/cart/market-sync.ts`
  - `src/components/cart/mini-cart.tsx`
  - `src/components/cart/cart-page.tsx`
  - `tests/unit/cart/display-lines.test.ts`
  - `tests/unit/cart/market-sync.test.ts`
  - `.planning/debug/cart-sheet-remove-ui-stale.md`
- verification:
  - `npm run test:unit -- tests/unit/cart/display-lines.test.ts tests/unit/cart/market-sync.test.ts tests/unit/cart/guest-storage.test.ts` (16 tests passed)
  - `npm run typecheck`
  - Targeted ESLint trên 6 file source/test thay đổi
  - Browser verification trên Mini Cart và `/en/cart` với remote Supabase từ `.env.local`
