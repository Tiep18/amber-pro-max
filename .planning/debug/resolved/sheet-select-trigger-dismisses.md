---
status: resolved
trigger: 'Bật dropdown trong Sheet rồi click vào phần input/trigger của dropdown vẫn làm Sheet bị đóng.'
created: 2026-07-14
updated: 2026-07-14
---

# Debug Session: Sheet Select Trigger Dismisses

## Symptoms

- Expected behavior: Select có thể mở, đóng hoặc nhận click lại trên trigger/input mà Sheet cha vẫn mở.
- Actual behavior: Sau khi mở dropdown, click vào vùng input/trigger của dropdown làm cả Sheet đóng.
- Error messages: Không có lỗi được báo cáo.
- Timeline: Vẫn xảy ra sau bản vá portal interaction `c344c1dc`.
- Reproduction: Mở một Sheet có Select, mở Select, rồi click lại vào vùng field/trigger của Select.

## Current Focus

- hypothesis: Khi Select portal đang modal, click lên trigger bên dưới bị Sheet overlay bắt; Select unmount trước khi Sheet xử lý outside interaction nên guard theo DOM target/open state đến muộn.
- test: Ghi nhớ open Select state tại overlay pointerdown capture, sau đó chặn đúng outside interaction của Sheet trong cùng event loop.
- expecting: Click overlay/field khi Select mở chỉ đóng Select; Sheet vẫn mở và click overlay tiếp theo mới đóng Sheet theo hành vi bình thường.
- next_action: None — fix verified.

## Evidence

- timestamp: 2026-07-14
  note: Playwright tái hiện được lỗi bằng cách mở `Shipping rate availability`, rồi click `.sheet-overlay`; cả Select và `Edit shipping rate` Sheet đều biến mất.
- timestamp: 2026-07-14
  note: Playwright cho thấy click nhắm vào Select trigger bị `.sheet-overlay` intercept vì Radix Select `disableOutsidePointerEvents: true`.
- timestamp: 2026-07-14
  note: Guard cũ chỉ kiểm tra target nằm trong `[data-sheet-select-content]`, nên không nhận diện event có target là overlay sau khi Select đóng.
- timestamp: 2026-07-14
  note: Sau bản vá, Playwright xác nhận click overlay đầu tiên khi Select mở chỉ đóng Select và giữ `Edit shipping rate` Sheet; click overlay tiếp theo đóng Sheet bình thường.
- timestamp: 2026-07-14
  note: `npm run lint`, `npm run typecheck`, và toàn bộ 470 unit tests đều pass.

## Eliminated

- hypothesis: Chỉ cần kiểm tra open Select bằng DOM query trong `onInteractOutside`.
  reason: Select có thể đã xử lý pointerdown và unmount trước khi Sheet nhận outside interaction; open state phải được chụp ở overlay capture phase.

## Resolution

- root_cause: Radix Select disables outside pointer events, so a click aimed at its trigger is intercepted by the Sheet overlay. The Select closes during pointerdown, then the same interaction reaches the Sheet after the Select content has unmounted; the previous target-only guard no longer recognizes it as a Select interaction and dismisses the Sheet.
- fix: Capture whether a Select portal is open when the Sheet overlay receives pointerdown, retain that fact through the current event loop, and prevent only the matching Sheet outside interaction. The next ordinary overlay click continues to dismiss the Sheet.
- verification: Live Playwright reproduction passed for both the guarded first overlay click and normal second overlay dismissal; lint, typecheck, and 470 unit tests passed.
- files_changed: `src/components/ui/sheet.tsx`, `tests/e2e/admin-shipping.spec.ts`
