---
phase: 04
slug: trusted-payments-and-orders
status: approved
shadcn_initialized: true
preset: new-york
created: 2026-06-15
reviewed_at: 2026-06-15
---

# Phase 04 - UI Design Contract

> Hợp đồng hình ảnh và tương tác cho Trusted Payments and Orders. Đây là nguồn
> sự thật cho customer payment/order views và admin payment operations. Phase 4
> không tạo entitlement, download, shipment hoặc refund initiation.

---

## Hướng thiết kế

Giữ nguyên ngôn ngữ thị giác ấm, rõ ràng và đáng tin cậy từ Phase 1-3. Customer
views phải tạo cảm giác bình tĩnh, dễ quét và luôn nói rõ tiền đang ở trạng thái
nào. Admin views phải dày thông tin hơn nhưng có cấu trúc cố định, bằng chứng dễ
đối chiếu và hành động không mơ hồ.

Không tạo brand system, palette, font scale hoặc design-system directory mới.
Kết quả tìm kiếm theo hướng dẫn `ui-ux-pro-max` được áp dụng ở mức nguyên tắc:
ưu tiên accessibility, touch target 44px, trạng thái không phụ thuộc màu, layout
mobile-first, số liệu dùng tabular figures, loading giữ geometry, và motion chỉ
phục vụ phản hồi. Bundled search script không khả dụng tại target được skill
đóng gói trỏ tới, nên không persist output riêng.

### Nguyên tắc

1. **Verified, not optimistic:** PayPal return không bao giờ tự hiển thị paid.
2. **One clear next step:** mỗi customer state có tối đa một CTA primary.
3. **Fulfillment lock is visible:** mọi trạng thái trước full payment đều hiển
   thị digital và physical fulfillment đang bị khóa.
4. **Evidence before action:** admin xem amount, currency, reference, deadline
   và payment history trước khi confirm/reject.
5. **Dense but predictable:** admin detail dùng cùng thứ tự section và cùng
   label trên mọi order.
6. **Bilingual parity:** customer copy có VI/EN đầy đủ; admin operational copy
   dùng English theo shell hiện hữu, nhưng dữ liệu customer và localized status
   phải hiển thị đúng locale của order.
7. **No color-only status:** badge luôn có text và Lucide icon hoặc shape.

---

## Design System

| Thuộc tính | Giá trị |
|------------|---------|
| Tool | shadcn/ui đã khởi tạo |
| Preset | `new-york`, base Radix, RSC, CSS variables |
| Component library | shadcn/Radix và component nội bộ hiện hữu |
| Styling | Tailwind CSS 4 với semantic CSS variables trong `globals.css` |
| Icon library | Lucide React, outline, stroke 1.5-2px |
| Font | Be Vietnam Pro, weight 400 và 600 |
| Radius | 8px control, 12px card, 16px surface lớn |
| Elevation | Border mặc định; một soft shadow cho dialog/sheet/sticky panel |

Reuse `Alert`, `Button`, `Card`, `Separator`, `Sheet`, `Skeleton` và
`formatMoney`. Có thể thêm component official shadcn được liệt kê trong
Component inventory. Không dùng registry bên thứ ba.

---

## Spacing Scale

| Token | Giá trị | Cách dùng |
|-------|---------|-----------|
| `xs` | 4px | Icon-label, metadata nội dòng |
| `sm` | 8px | Status content, compact evidence row |
| `md` | 16px | Component gap, mobile card padding |
| `lg` | 24px | Card padding, section gap |
| `xl` | 32px | Page column gap |
| `2xl` | 48px | Major section break |
| `3xl` | 64px | Desktop page-level spacing |

Ngoại lệ:

- Interactive target tối thiểu 44x44px.
- Input/select/textarea quan trọng cao tối thiểu 48px.
- QR image customer là 240x240px desktop, 220x220px mobile; không nhỏ hơn
  200x200px.
- Status dot/icon visual có thể 16px nhưng container tương tác vẫn tối thiểu
  44px.
- Border 1px, timeline rail 2px và focus ring 2px là giá trị cấu trúc.
- Desktop gutter 32px tại 1024-1279px và 48px từ 1280px.
- Sticky mobile action bar dùng
  `padding-bottom: max(16px, env(safe-area-inset-bottom))`.

---

## Typography

Chỉ dùng bốn size và hai weight trong UI Phase 4.

| Vai trò | Size | Weight | Line height |
|---------|------|--------|-------------|
| Label / Meta | 14px | 600 | 1.4 |
| Body / Control | 16px | 400 | 1.5 |
| Section heading | 20px | 600 | 1.3 |
| Page heading / Total | 28px | 600 | 1.2 |

Quy tắc:

- Không dùng weight ngoài 400 và 600.
- Amount, order number, reference, deadline, event ID, timestamps và counters
  dùng `tabular-nums`.
- Provider/event IDs dài dùng 14px, `font-mono` chỉ trong admin evidence,
  `break-all`; customer không thấy internal IDs.
- Không tách currency khỏi amount sang dòng khác.
- VND hiển thị whole units theo `vi-VN`; USD hiển thị 2 decimals theo `en-US`
  qua helper hiện hữu.
- CTA, heading, label dùng sentence case.
- Copy VI/EN được phép nở 30%; không truncate heading, CTA hoặc status.
- Customer paragraph giới hạn 68 ký tự mỗi dòng; admin evidence có thể dùng
  full-width nhưng label/value phải dễ quét.

---

## Color

Giữ nguyên semantic tokens Phase 1-3.

| Vai trò | Token / giá trị | Cách dùng |
|---------|-----------------|-----------|
| Dominant 60% | `--background: #FFF9F2` | Nền page customer và admin content |
| Secondary 30% | `--surface: #FFFFFF`, `--surface-muted: #F5EDE3` | Card, evidence panel, table header, summary |
| Accent 10% | `--accent: #A6472D`, hover `#843823` | CTA primary, focus, selected filter, inline action link |
| Text | `--foreground: #2E2926`, muted `#6F655E` | Nội dung chính/phụ |
| Border | `--border: #DCCFC2` | Card, input, divider, table, timeline rail |
| Success | `--success: #2F6B4F`, surface `#E9F4ED` | Paid, inventory finalized, verified evidence |
| Warning | `--warning: #8A5A16`, surface `#FFF4D6` | Awaiting, verifying, deadline gần, stale/review |
| Destructive | `--destructive: #B42318`, surface `#FDECEC` | Failed, cancelled, expired, rejected, invalid evidence |
| Admin shell | `--admin-nav: #292623` | Boundary admin hiện hữu |

Accent chỉ dành cho:

- CTA primary duy nhất trong screen hoặc action region.
- Selected admin filter/tab.
- Focus ring.
- Inline navigation/action links.
- PayPal initiation button wrapper khi official PayPal control chưa render.

Accent không dùng làm payment status. Status dùng semantic surface + icon +
text. `partially_refunded` dùng warning; `refunded` dùng neutral/muted, không
dùng success. Provider brand color chỉ được phép trong official PayPal button
hoặc official logo, không thay semantic status tokens.

---

## Icon Contract

Chỉ dùng Lucide khi icon giúp quét trạng thái:

| Trạng thái / hành động | Icon |
|------------------------|------|
| Awaiting payment | `Clock3` |
| Verifying payment | `LoaderCircle` hoặc `RefreshCw` |
| Paid / verified | `CircleCheck` |
| Failed / rejected | `CircleX` |
| Cancelled | `Ban` |
| Expired | `TimerOff` |
| Partially refunded | `Undo2` |
| Refunded | `RotateCcw` |
| Fulfillment locked | `LockKeyhole` |
| Inventory finalized | `PackageCheck` |
| Inventory released | `PackageX` |
| Copy amount/reference | `Copy` |
| Audit actor/source | `UserRound` / `Webhook` / `ServerCog` |

Icon 16px trong badge/metadata, 20px trong alert/button, 24px trong state
header. Icon decorative dùng `aria-hidden`; icon-only button có accessible name
và tooltip.

---

## Information Architecture và Routes

### Customer routes

- Signed-in và guest order detail dùng localized path tương đương:
  `/vi/don-hang/[orderNumber]` và `/en/orders/[orderNumber]`.
- PayPal return đi vào localized order detail, không tạo một success page riêng.
- Invalid/expired guest access không xác nhận order tồn tại; hiển thị generic
  access error.
- Phase 4 chỉ cung cấp detail cho order vừa tạo hoặc order được authorize.
  Account order-history list đầy đủ thuộc Phase 5.

### Admin routes

- `/admin/orders`: operational order queue.
- `/admin/orders/[orderId]`: order/payment detail và audit timeline.
- Admin route không localized slug. Operational labels theo English shell hiện
  hữu; customer-facing status preview hiển thị cả source locale khi cần.
- Server authorization phải hoàn tất trước render; không flash table hoặc action.

---

## Customer Order Detail

### Layout

- Max width 1200px, gutter hiện hữu.
- Desktop từ 1024px: grid `minmax(0, 1fr) 380px`, gap 32px.
- Main column: payment state, payment instructions/evidence-safe summary,
  immutable order lines.
- Side column: order totals, order number, deadline, fulfillment lock; sticky
  `top: 96px`.
- Mobile: một cột theo thứ tự payment state, next action/instructions, deadline,
  fulfillment lock, totals, lines, support guidance.

### State header

Mỗi page bắt đầu bằng:

1. Eyebrow `Đơn hàng {number}` / `Order {number}`.
2. H1 là customer-facing status.
3. Một câu giải thích hiện tại.
4. Exact timestamp/deadline nếu liên quan.
5. Một CTA primary hoặc không có CTA nếu terminal.

Không hiển thị provider event names, webhook IDs, merchant IDs, raw state enum,
inventory reservation IDs hoặc audit metadata cho customer.

### Order summary

- Card totals dùng đúng snapshot: subtotal, discount, shipping, total.
- `Total` 20px/600; page không tạo cỡ chữ mới.
- Hiển thị payment method `PayPal` hoặc `Chuyển khoản VietQR / VietQR bank
  transfer`.
- Order line giữ product type label `Mẫu PDF / PDF pattern` hoặc
  `Sản phẩm thủ công / Handmade item`, title snapshot, variant, quantity,
  unit price, discount allocation, shipping allocation.
- Digital và physical line vẫn phân biệt bằng text + icon.
- Không hiển thị action download/tracking trong Phase 4.

### Fulfillment lock

Một card/alert luôn xuất hiện trước khi paid:

- Icon `LockKeyhole`.
- Heading `Quyền nhận hàng đang khóa` / `Fulfillment is locked`.
- Body: `File PDF và xử lý giao hàng chỉ bắt đầu sau khi toàn bộ đơn hàng được
  xác nhận đã thanh toán.` / `PDF access and shipping work begin only after the
  full order is confirmed paid.`

Sau paid:

- Dùng success surface nhưng copy không hứa fulfillment đã bắt đầu:
  `Thanh toán đã được xác nhận. Đơn hàng đã mở điều kiện để xử lý ở bước tiếp
  theo.` / `Payment is confirmed. This order is now eligible for the next
  fulfillment step.`
- Digital/physical statuses vẫn hiển thị `Chưa bắt đầu / Not started` trong
  Phase 4.

---

## Customer Payment Status Mapping

| Internal class | VI heading | EN heading | Surface | Required content / action |
|----------------|------------|------------|---------|---------------------------|
| awaiting payment | `Đang chờ thanh toán` | `Awaiting payment` | warning | Method, exact amount, deadline, next action |
| verifying payment | `Đang xác minh thanh toán` | `Verifying payment` | warning | Order number, last checked time, remaining window, recheck |
| paid | `Đã thanh toán` | `Payment confirmed` | success | Confirmed time, paid amount, fulfillment eligibility |
| failed | `Thanh toán không thành công` | `Payment failed` | destructive | Explain order cannot be retried; start new checkout |
| cancelled | `Thanh toán đã hủy` | `Payment cancelled` | destructive | Explain inventory released; start new checkout |
| rejected | `Chuyển khoản không được chấp nhận` | `Bank transfer rejected` | destructive | Safe rejection reason, inventory released, new checkout |
| expired | `Đã hết hạn thanh toán` | `Payment window expired` | destructive | Exact expiry, inventory released, new checkout |
| partially refunded | `Đã hoàn tiền một phần` | `Partially refunded` | warning | Refunded amount and remaining paid amount when available |
| refunded | `Đã hoàn tiền` | `Refunded` | muted/default | Refunded amount/date; no initiation action |
| review required | `Đang kiểm tra thanh toán` | `Payment needs review` | warning | No technical anomaly detail; support/recheck guidance |

`failed`, `cancelled`, `rejected`, `expired` không render retry-same-order CTA.
CTA primary là `Tạo đơn hàng mới` / `Start a new checkout`, dẫn về cart/checkout
với fresh quote. Không dùng `Try payment again`.

---

## PayPal Contract

### Awaiting / initiation

- Chỉ render PayPal cho international market + USD.
- Trước official button, hiển thị exact total và copy:
  `Bạn sẽ thanh toán {amount} qua PayPal.` /
  `You will pay {amount} through PayPal.`
- Official PayPal button là primary payment control. Không đặt một terracotta
  primary button cạnh nó.
- Khi SDK loading quá 300ms, giữ vùng cao 48px bằng Skeleton.
- SDK load failure dùng persistent Alert với CTA secondary `Tải lại PayPal` /
  `Reload PayPal`; order vẫn awaiting trong window.

### Create/capture pending

- Sau click, disable duplicate initiation và dùng `aria-busy`.
- Copy pending: `Đang kết nối với PayPal` / `Connecting to PayPal`.
- Nếu popup bị đóng/cancelled trước provider confirmation, không tự suy ra paid.
- Nếu network outcome không chắc chắn, chuyển đến order detail ở verifying state,
  không mời submit lại ngay.

### Return before webhook

- State header là verifying, không dùng success green.
- Hiển thị order number và countdown/reference deadline.
- CTA secondary `Kiểm tra lại trạng thái` / `Check payment status`.
- Recheck có cooldown tối thiểu 5 giây; pending giữ chiều rộng button.
- Tự refresh tối đa mỗi 5 giây trong 30 giây khi tab visible, sau đó dừng và
  giữ manual recheck. Screen reader không bị announce mỗi poll; chỉ announce
  khi state thực sự thay đổi.
- Copy:
  `PayPal đã đưa bạn trở lại cửa hàng. Chúng tôi đang xác minh thanh toán trước
  khi cập nhật đơn hàng.` /
  `PayPal returned you to the store. We are verifying the payment before
  updating your order.`

### Duplicate / delayed events

- Customer không thấy toast hoặc timeline item mới cho duplicate webhook.
- Duplicate event không làm status nhấp nháy, reset countdown hoặc lặp success
  announcement.
- Delayed paid event sau terminal local state dùng `review required`; fulfillment
  lock vẫn đóng cho đến khi backend tạo verified transition hợp lệ.

---

## VietQR Customer Contract

### Instruction card

Hiển thị theo thứ tự:

1. Exact amount, lớn nhất trong card, tabular figures.
2. QR image có alt `Mã VietQR cho đơn hàng {orderNumber}` /
   `VietQR code for order {orderNumber}`.
3. Bank name.
4. Account name.
5. Masked account number theo cấu hình được phép hiển thị.
6. Unique transfer reference.
7. Exact deadline gồm date, time và timezone.

Amount và reference có button `Sao chép / Copy`, target 44px. Sau copy, label
tạm đổi `Đã sao chép / Copied` trong 3 giây và announce qua `aria-live="polite"`.
Không chỉ dùng icon.

### Instruction copy

- Heading: `Chuyển khoản đúng số tiền và nội dung` /
  `Transfer the exact amount and reference`.
- Body: `Đơn hàng chỉ được xác nhận sau khi người bán kiểm tra tài khoản ngân
  hàng. Không chỉnh sửa số tiền hoặc nội dung chuyển khoản.` /
  `The order is confirmed only after the seller checks the bank account. Do not
  change the amount or transfer reference.`
- Lock notice nằm ngay dưới instructions.
- Không có customer upload receipt trong Phase 4.
- Không có button `Tôi đã thanh toán` làm paid transition. Có thể có secondary
  `Kiểm tra trạng thái` chỉ để refresh.

### Deadline

- Trên 60 phút: hiển thị exact deadline, không cần ticking seconds.
- Dưới 60 phút: hiển thị `Còn khoảng {minutes} phút` cùng exact deadline.
- Dưới 15 phút: warning icon + text; không đổi thành destructive trước khi hết hạn.
- Khi deadline qua, UI chuyển expired sau server response; client countdown
  không tự release inventory hoặc tự quyết định terminal state.

---

## Admin Order Queue

### Layout

- Max width 1200px.
- Header: eyebrow `Admin orders`, H1 `Orders and payments`, short operational
  description.
- Filter bar sticky dưới admin header từ 1024px, surface, border bottom.
- Desktop từ 1024px dùng table; dưới 1024px dùng semantic card list, không cho
  horizontal scroll.

### Filters

- Search: order number hoặc exact customer email; 300ms debounce.
- Status: All, Awaiting, Verifying, Paid, Failed/cancelled, Expired, Refunded.
- Method: All, PayPal, VietQR.
- Market: All, Vietnam, International.
- Date range là optional; nếu có dùng visible labels.
- Filter state nằm trong URL query để back/refresh giữ context.

### Desktop columns

| Cột | Contract |
|-----|----------|
| Order | Order number + created time |
| Customer | Masked email trong queue |
| Market | VN / INTL text badge |
| Total | Formatted VND/USD, right aligned |
| Method | PayPal / VietQR |
| Payment | Icon + text badge |
| Reservation | Exact deadline hoặc terminal outcome |
| Updated | Last meaningful transition |
| Action | Text link `View order` |

Row height tối thiểu 64px. Header 14px/600. Không đặt confirm/reject trực tiếp
trong queue; hành động tiền phải ở detail có evidence.

### Empty/loading/error

- Empty all: `No orders yet.` và giải thích order xuất hiện sau checkout submit.
- Empty filtered: `No orders match these filters.` + `Clear filters`.
- Loading: table/card skeleton đúng geometry; không spinner toàn page.
- Error: persistent Alert `Orders could not be loaded. Retry without changing
  the current filters.` + Retry.

---

## Admin Order Detail

### Desktop structure

- Max width 1200px.
- Header row: back link, order number, status badge, created time.
- Grid từ 1024px: main `minmax(0, 1fr)` + right rail 360px, gap 24px.
- Main section order:
  1. Payment evidence/action.
  2. Payment records and provider events.
  3. Order timeline/audit.
  4. Immutable line snapshots.
- Right rail:
  1. Customer/contact.
  2. Order totals.
  3. Reservation/inventory.
  4. Fulfillment gate.
- Right rail sticky `top: 96px`, nhưng bỏ sticky nếu content cao hơn viewport.

### Header actions

- Pending VietQR: one primary `Confirm payment`, one destructive secondary
  `Reject payment`.
- PayPal: no manual mark-paid action. Cho secondary `Recheck PayPal`.
- Paid/refunded/terminal: không render action không hợp lệ.
- Action availability dựa trên server state, không chỉ disable client-side.

### Stable labels

Admin detail luôn dùng label cố định:

- `Order status`
- `Payment status`
- `Digital fulfillment`
- `Physical fulfillment`
- `Fulfillment gate`
- `Reservation status`
- `Inventory outcome`
- `Payment method`
- `Provider order`
- `Provider capture`
- `Received amount`
- `Currency`
- `Transfer reference`
- `Customer email`
- `Created`
- `Deadline`
- `Last transition`

Không gộp payment/order/fulfillment vào một badge.

---

## VietQR Admin Evidence và Actions

### Evidence form

Required trước confirm:

- Bank reference: text, 1-120 chars.
- Received amount: currency-aware money input; VND whole-unit display.
- Received date/time: local date-time input với timezone label.

Optional:

- Admin note: textarea, max 1000 chars.
- Screenshot/receipt attachment: optional, file name/size/type shown; preview
  không thay required evidence. Không bắt buộc trong v1.

Form hiển thị expected amount/reference cạnh received values, theo layout
old/received:

- Desktop: hai cột 1:1.
- Mobile: stack expected trước, received sau.
- Match dùng success icon + `Matches`.
- Mismatch dùng destructive icon + text `Amount does not match` hoặc
  `Reference does not match`; không chỉ border đỏ.

### Confirm payment

- Primary CTA `Confirm payment`.
- Click mở AlertDialog tóm tắt order, expected/received amount, reference và
  received time.
- Confirmation copy:
  `Confirm this bank transfer as full payment? This finalizes reserved
  inventory and opens the fulfillment gate.`
- Confirm label `Confirm full payment`.
- Pending state disable cả confirm/reject và giữ dialog mở.
- Success chuyển detail sang paid, timeline thêm một transition, inventory
  outcome thành finalized. Không dùng toast-only.

### Reject payment

- Destructive CTA `Reject payment`.
- Dialog bắt buộc chọn reason:
  `Wrong amount`, `Wrong reference`, `Transfer not found`, `Other`.
- `Other` bắt buộc note.
- Confirmation copy:
  `Reject this transfer? The order becomes non-payable and reserved inventory
  is released immediately. This cannot be retried on the same order.`
- Confirm label `Reject and release inventory`.
- Sau success, evidence vẫn đọc được, timeline giữ actor/time/reason.

### Stale/double submit

- Nếu admin action dựa trên stale state, dialog đóng và detail refresh.
- Alert: `This order changed before your action was applied. Review the current
  payment and inventory state.`
- Duplicate confirm/reject đã được backend no-op không tạo success animation lần
  hai; hiển thị neutral status `No additional transition was applied.`

---

## PayPal Admin Evidence

- Summary hiển thị local expected total và provider verified amount cạnh nhau.
- Hiển thị provider order ID, capture ID, merchant validation result, currency,
  event type, event received time, verification outcome.
- Raw payload không hiển thị mặc định. Nếu lưu sanitized facts, dùng definition
  list; không dump JSON lớn trong page chính.
- Failed validation dùng destructive Alert với human-readable reason:
  signature, mapping, merchant, amount hoặc currency mismatch.
- Duplicate event có badge neutral `Duplicate` và link tới original applied
  transition nếu có.
- Recheck action là secondary; pending copy `Rechecking PayPal`.
- Không có admin override `Mark paid`.

---

## Timeline và Audit Display

### Visual structure

- Vertical timeline, newest first mặc định trong admin detail.
- Event row: 24px icon node, 2px neutral rail, content card/row.
- Mỗi event hiển thị event label, exact timestamp, actor/source, concise facts,
  outcome badge.
- Desktop metadata 2-3 columns; mobile stack.
- Có control `Oldest first / Newest first`; không cần animation.

### Required event labels

- Order created.
- Payment event received.
- Payment verification passed/failed.
- Payment marked paid.
- Payment failed/cancelled/rejected/expired.
- Inventory finalized.
- Inventory released/expired.
- VietQR confirmed/rejected by admin.
- Duplicate event ignored.
- Refund visibility updated.

### Actor/source

- Customer/browser: `Customer`.
- Authorized admin: masked email hoặc stable display name.
- PayPal webhook: `PayPal webhook`.
- PayPal recheck: `PayPal recheck`.
- Scheduler: `Reservation expiry job`.
- Database command: `Payment state machine`.

Không hiển thị service-role token, IP thô, secret headers hoặc raw guest token.

### Duplicate events

- Duplicate timeline item dùng neutral muted style, `Copy`/`Duplicate` text badge
  và copy `Recorded without applying another payment or inventory transition.`
- Duplicate không dùng warning/destructive trừ khi verification cũng failed.
- Collapsible group được phép khi có hơn 3 duplicates cùng provider event; group
  header vẫn nêu count và first/last received time.

---

## Inventory và Fulfillment Outcomes

Admin side rail luôn hiển thị:

| State | Text |
|-------|------|
| Active reservation | `Reserved until {timestamp}` |
| Finalized | `Inventory finalized once at {timestamp}` |
| Released | `Inventory released at {timestamp}` + reason |
| Expired | `Reservation expired at {timestamp}` |
| No physical lines | `No physical inventory reservation` |

Customer copy chỉ dùng:

- Active: `Hàng được giữ đến {timestamp}` / `Items are reserved until
  {timestamp}`.
- Finalized: không nói technical decrement; dùng `Thanh toán đã được xác nhận`.
- Released/expired: `Hàng đã không còn được giữ cho đơn này` /
  `Items are no longer reserved for this order`.

Fulfillment gate:

- Non-paid: `Locked` + `LockKeyhole`.
- Paid: `Eligible` + `CircleCheck`.
- Review required/late event: vẫn `Locked`.
- Không có button bắt đầu fulfillment trong Phase 4.

---

## Authorization và Privacy UI

- Signed-in customer chỉ xem order thuộc mình.
- Guest chỉ xem order qua server-validated scoped access; token không xuất hiện
  trong visible URL sau exchange nếu implementation hỗ trợ cookie flow.
- Unauthorized/mismatched order dùng cùng generic page:
  `Không thể mở đơn hàng này` / `This order cannot be opened`.
- Body: `Liên kết không hợp lệ, đã hết hạn hoặc bạn không có quyền truy cập.`
  / `The link is invalid, expired, or you do not have access.`
- Không tiết lộ order number, email, payment method hoặc existence.
- Customer email full chỉ hiển thị trên authorized customer detail; admin queue
  mask email, admin detail có thể hiển thị full email.
- Screenshot/receipt evidence chỉ admin-authorized.

---

## Component Inventory

| Component | Nền tảng | Contract |
|-----------|----------|----------|
| Button | Existing `Button` | 44px min, stable pending width, primary/secondary/ghost/destructive |
| Alert | Existing `Alert` | Icon + heading + recovery; blocking errors persistent |
| Card | Existing `Card` | Customer state, summary, evidence, side rail |
| Separator | Existing | Totals và evidence grouping |
| Skeleton | Existing | Match final geometry; reduced-motion disables pulse |
| Badge | Local hoặc shadcn official | Text + icon + semantic surface |
| Dialog / AlertDialog | shadcn official | VietQR confirm/reject, destructive consequences |
| Input / Textarea | shadcn official hoặc style hiện hữu | Visible label, 48px, errors associated |
| Select | shadcn official/native | Filters và reject reason |
| Table | shadcn official | Admin desktop only |
| Tabs | shadcn official | Status filters nếu URL-synced; không dùng cho core state |
| Tooltip | shadcn official | Icon-only metadata controls |
| Progress | shadcn official/local | Chỉ cho bounded reservation time, không giả tiến trình verification |
| PaymentStatusBadge | Local | Customer/admin mapping, icon + localized text |
| FulfillmentGate | Local | Locked/eligible, digital + physical rows |
| OrderSummary | Reuse/extend | Immutable totals and lines |
| PaymentStatePanel | Local | Customer status, copy, deadline, CTA slot |
| VietQrInstructions | Local | QR, amount, reference, bank, copy actions |
| VietQrEvidenceForm | Local | Expected vs received, confirm/reject |
| PaymentEventList | Local | Provider events and duplicate state |
| AuditTimeline | Local | Append-only transitions, source, facts |
| EmptyState | Local composition | Heading, explanation, one action |

Navigation dùng link; mutation dùng button. Không dùng third-party blocks.

---

## Interaction States

| State | Contract |
|-------|----------|
| Loading | Skeleton sau 300ms, geometry ổn định, `aria-busy` trên region |
| Empty | Heading + reason + one next action |
| Default | Authoritative status và exact money/deadline |
| Pending | Disable duplicate mutation, spinner/icon + progress copy |
| Success | Persistent inline state + next-step copy, `aria-live="polite"` |
| Validation error | Gần field + summary khi nhiều lỗi |
| Server error | Persistent Alert + retry/safe navigation |
| Network unknown | Không suy ra failed/paid; chuyển verifying hoặc offer status check |
| Stale | Nêu record changed, refresh evidence, require review |
| Duplicate | Neutral no-op message; không lặp success |
| Expired | Exact expiry + inventory released + new checkout |
| Unauthorized | Generic non-enumerating page |
| Offline | Giữ last confirmed state, label `Status may be out of date`, retry |
| Partially refunded | Amount refunded + current net paid amount |
| Refunded | Read-only result, no Phase 4 initiation action |

Không dùng toast làm nguồn phản hồi duy nhất cho payment, inventory hoặc admin
money action.

---

## Form, Validation và Error Recovery

- Validate VietQR fields sau blur và submit.
- Error đặt ngay dưới field, nối bằng `aria-describedby`.
- Confirm disabled kèm visible reason nếu required evidence thiếu.
- Sau submit lỗi, focus field invalid đầu tiên; server/state error focus Alert
  heading.
- Preserve safe evidence values sau lỗi; attachment không tự upload lại nếu
  request không chắc chắn.
- Raw PayPal/Supabase/RPC error không xuất hiện trong UI.
- Timeout copy phải nói outcome chưa rõ:
  `The request timed out. Refresh the order before submitting another action.`
- PayPal recheck failure không đổi trạng thái local đã xác nhận; hiển thị last
  checked time và retry.
- VietQR wrong amount/reference không cho confirm; admin dùng reject flow theo
  D-14.
- Destructive dialog không đóng khi request pending.

---

## Copywriting Contract

Tone customer: bình tĩnh, cụ thể, không hứa trước khi verify. Tone admin: ngắn,
action-oriented, nêu rõ consequence. Không dùng từ vui nhộn/craft-themed trong
money, error hoặc audit.

| Thành phần | Tiếng Việt | English |
|------------|------------|---------|
| PayPal CTA context | `Thanh toán bằng PayPal` | `Pay with PayPal` |
| Verifying CTA | `Kiểm tra lại trạng thái` | `Check payment status` |
| New order CTA | `Tạo đơn hàng mới` | `Start a new checkout` |
| VietQR heading | `Chuyển khoản đúng số tiền và nội dung` | `Transfer the exact amount and reference` |
| Copy amount | `Sao chép số tiền` | `Copy amount` |
| Copy reference | `Sao chép nội dung` | `Copy reference` |
| Fulfillment locked | `Quyền nhận hàng đang khóa` | `Fulfillment is locked` |
| Paid heading | `Đã thanh toán` | `Payment confirmed` |
| Verifying heading | `Đang xác minh thanh toán` | `Verifying payment` |
| Expired heading | `Đã hết hạn thanh toán` | `Payment window expired` |
| Generic customer error | `Chưa thể tải trạng thái đơn hàng. Thông tin thanh toán chưa bị thay đổi; vui lòng thử lại.` | `We couldn't load the order status. Your payment state was not changed; please try again.` |
| Unauthorized heading | `Không thể mở đơn hàng này` | `This order cannot be opened` |
| Admin empty | - | `No orders yet.` |
| Admin filtered empty | - | `No orders match these filters.` |
| Admin confirm | - | `Confirm payment` |
| Admin reject | - | `Reject payment` |
| Admin stale | - | `This order changed before your action was applied. Review the current payment and inventory state.` |
| Duplicate | - | `Recorded without applying another payment or inventory transition.` |

### Destructive confirmations

| Hành động | Confirmation |
|-----------|--------------|
| Reject VietQR | Nêu order non-payable, inventory released immediately, same order cannot retry |
| Expire/cancel system transition | Không có customer/admin manual confirmation trong Phase 4 |
| Refund | Không có initiation UI trong Phase 4 |

---

## Accessibility

- WCAG 2.2 AA; normal text contrast tối thiểu 4.5:1.
- Focus ring 2px accent + 2px offset trên mọi control.
- Full keyboard support cho PayPal wrapper/reload, copy controls, status recheck,
  filters, admin evidence, dialogs và timeline controls.
- Native/official PayPal control giữ accessible behavior của provider.
- Status luôn text + icon; amount mismatch luôn text + icon.
- `role="alert"` cho blocking verification/action errors.
- `aria-live="polite"` cho copy success, payment status change và admin action
  result; không announce từng polling attempt/countdown second.
- Countdown announce tối đa khi qua mốc 60 phút, 15 phút, expired.
- Dialog trap focus, Escape close khi không pending, restore focus.
- Timeline dùng ordered list; mỗi event có accessible heading và timestamp.
- Table có caption/accessible heading; mobile card list giữ reading order.
- QR có alt; adjacent text cung cấp đầy đủ amount/reference nên QR không là kênh
  thông tin duy nhất.
- 200% zoom không che CTA, evidence hoặc sticky rail.
- Không auto-focus field đầu trên mobile.
- Touch target tối thiểu 44px, khoảng target lân cận tối thiểu 8px.

---

## Motion và Reduced Motion

- Color/border/opacity transition: 150ms ease-out.
- Dialog enter: 200ms ease-out; exit 150ms ease-in.
- Status content crossfade tối đa 150ms, không slide page hoặc animate amount.
- Spinner chỉ dùng cho request đang chạy; không dùng spinner vô hạn thay status
  copy.
- Không count-up money, bounce, spring, confetti, parallax hoặc pulse toàn card.
- `prefers-reduced-motion`: bỏ transform, transition tối đa 100ms opacity hoặc
  immediate; Skeleton bỏ `animate-pulse`; spinner có thể giữ nếu cần nhưng luôn
  có text progress.
- Polling/reconciliation không gây layout shift.

---

## Responsive Contract

| Viewport | Contract |
|----------|----------|
| 375px | Một cột, gutter 16px; status/actions full-width; QR 220px; admin cards; evidence stack |
| 768px | Gutter 24px; customer vẫn một cột rộng; action có thể inline; admin filters wrap |
| 1024px | Customer/order detail hai cột; sticky side rail; admin table và detail rail |
| 1440px | Max width 1200px; gutter 48px; main fluid + rail 360-380px |

Quy tắc:

- Không horizontal scroll.
- Admin table chuyển card trước khi cột bị ép; không dùng horizontal swipe.
- Customer primary CTA full-width dưới 768px.
- VI/EN labels wrap; không ellipsis status/order heading.
- Order number/reference/provider ID dùng break strategy; không đẩy viewport.
- Sticky rail/action không che footer, error, mobile keyboard hoặc safe area.
- Timeline metadata stack trên mobile.
- Expected/received evidence stack trên mobile, giữ label gần value.

---

## Loading, Empty, Error, Stale và Duplicate Copy

### Customer

- Loading: giữ state header, totals và line geometry.
- Empty lines do inconsistent data: blocking Alert
  `Chi tiết đơn hàng chưa thể tải. Trạng thái thanh toán không bị thay đổi.` /
  `Order details could not be loaded. The payment state was not changed.`
- Stale browser tab: sau mutation conflict, refresh server state và nêu
  `Trạng thái đơn hàng đã thay đổi ở nơi khác.` /
  `The order status changed elsewhere.`
- Offline: last confirmed status có timestamp và warning `Có thể chưa cập nhật`.
- Duplicate: không có customer-facing event.

### Admin

- Empty event list: `No payment events recorded yet.`
- Empty timeline: chỉ hợp lệ ngay sau migration/legacy data; nêu
  `No audit transitions are available for this order.`
- Partial load: section lỗi độc lập có retry; không làm mất section đã tải.
- Stale action: refresh toàn bộ payment/evidence/inventory panels.
- Duplicate action: neutral no-op result.
- Suspicious provider mismatch: persistent destructive Alert, fulfillment locked.

---

## Security-Sensitive UI Boundaries

- Không hiển thị paid từ URL query, PayPal return param hoặc client callback.
- Không lưu payment evidence, guest token, provider payload hoặc authoritative
  order state trong localStorage.
- Không render admin controls cho non-admin rồi chỉ disable.
- Không hiển thị raw webhook signature/header/body.
- Không cho customer biết duplicate/rejected provider event internals.
- Không expose internal UUID khi order number đủ cho customer.
- Không cho admin confirm nếu expected/received facts mismatch.
- Không cho action stale ghi đè paid/terminal state.
- Không hiển thị receipt URL công khai.
- Không ghi secret, token hoặc full provider payload vào visible error.
- Fulfillment gate luôn đọc từ server projection.

---

## Explicit Anti-Patterns

- Không success page riêng sau PayPal return.
- Không claim paid trước verified transition.
- Không manual `Mark paid` cho PayPal.
- Không customer `I have paid` button thay verification.
- Không retry payment trên failed/cancelled/rejected/expired order.
- Không ẩn fulfillment lock.
- Không gộp payment, order, digital fulfillment và physical fulfillment status.
- Không color-only badge hoặc raw enum.
- Không countdown theo giây gây screen-reader spam.
- Không polling vô hạn.
- Không optimistic inventory finalized/released.
- Không table horizontal-scroll trên mobile.
- Không admin action trong queue thiếu evidence.
- Không raw JSON dump làm primary evidence UI.
- Không toast-only feedback cho payment/admin mutation.
- Không gradient, glassmorphism, heavy shadow hoặc marketing decoration.
- Không emoji icon hoặc icon library khác Lucide.
- Không registry shadcn bên thứ ba.

---

## Registry Safety

| Registry | Blocks/components dùng | Safety gate |
|----------|------------------------|-------------|
| `@shadcn` official | Hiện có: alert, button, card, separator, sheet, skeleton. Có thể thêm: dialog, alert-dialog, input, textarea, select, table, tabs, badge, tooltip, progress | `npx shadcn info` xác nhận official registry, preset `new-york`, base Radix ngày 2026-06-15 |
| Registry bên thứ ba | Không | Không áp dụng; không được dùng trong Phase 4 |

---

## Acceptance Checks

### Customer payment/order

- [ ] Localized order detail hiển thị order number, immutable lines, totals và
      payment method đúng authorization.
- [ ] PayPal return trước webhook luôn là verifying, không paid.
- [ ] Recheck có cooldown, không poll vô hạn và không spam screen reader.
- [ ] VietQR hiển thị exact VND amount, unique reference, bank details và
      deadline.
- [ ] Copy amount/reference hoạt động bằng keyboard và announce success.
- [ ] Failed/cancelled/rejected/expired không cho retry same order.
- [ ] Paid mở eligible gate nhưng không giả vờ entitlement/shipment đã bắt đầu.
- [ ] Partially refunded/refunded hiển thị read-only đúng PAY-08.
- [ ] Guest/customer không thể mở order khác.

### Admin operations

- [ ] Queue filter/search giữ trong URL và có desktop table/mobile cards.
- [ ] Detail tách order/payment/digital/physical/gate/reservation states.
- [ ] VietQR confirm bắt buộc bank reference, received amount và received time.
- [ ] Amount/reference mismatch không thể confirm và có reject flow.
- [ ] Reject dialog nêu inventory release và same-order non-payable consequence.
- [ ] Double submit/stale tab không lặp transition.
- [ ] PayPal evidence hiển thị validation facts, duplicates và retry history.
- [ ] Timeline có actor/source, timestamp, amount/reference và inventory outcome.
- [ ] Non-admin không thấy privileged UI trước redirect/403.

### States và chất lượng

- [ ] Loading, empty, error, offline, stale, duplicate, expired và unauthorized
      states có copy và recovery path.
- [ ] Fulfillment lock visible ở mọi non-paid/review state.
- [ ] Status dùng icon + text, không color-only.
- [ ] Money/timestamp/reference dùng tabular figures và đúng VND/USD.
- [ ] Chỉ dùng 4 font sizes và 2 weights.
- [ ] Layout kiểm tra tại 375/768/1024/1440 và 200% zoom.
- [ ] Reduced motion bỏ pulse/transform không cần thiết.
- [ ] Không có third-party registry hoặc out-of-scope fulfillment/refund action.

---

## Nguồn quyết định

- `04-CONTEXT.md`: D-01 đến D-21, customer/admin status, PayPal verifying,
  VietQR evidence, exact-once inventory và audit.
- `04-RESEARCH.md`: route/layout integration, server-owned state, duplicate,
  delayed/review-required, authorization và existing component findings.
- `REQUIREMENTS.md`: INV-04/05, ORD-01/02/03, PAY-01 đến PAY-08, SEC-03.
- `03-UI-SPEC.md`: design tokens, spacing, typography, responsive, checkout
  summary và no-payment-before-Phase-4 boundary.
- `components.json` và `npx shadcn info`: `new-york`, Radix, Lucide, official
  shadcn registry.
- Existing code: Be Vietnam Pro, semantic CSS variables, max-width 1200px,
  44px controls, customer two-column checkout và admin commerce cards/forms.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-06-15
