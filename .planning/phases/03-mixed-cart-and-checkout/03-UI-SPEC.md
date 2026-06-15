---
phase: 03
slug: mixed-cart-and-checkout
status: draft
shadcn_initialized: true
preset: new-york
created: 2026-06-15
---

# Phase 03 - Hợp đồng thiết kế UI

> Nguồn sự thật về trực quan và tương tác cho mixed cart, checkout một trang,
> shipping, discount, inventory reservation và market exception. Payment capture,
> payment confirmation, order lifecycle và fulfillment thuộc các phase sau.

---

## Hướng thiết kế

Phase 3 tiếp tục ngôn ngữ thiết kế của Phase 1 và 2: ấm áp, thủ công, gọn gàng
và đáng tin cậy. Chất crochet đến từ nền kem, accent terracotta, ảnh sản phẩm,
bo góc mềm và khoảng trắng; checkout loại bỏ trang trí không phục vụ quyết định
mua hàng.

Checkout phải tạo cảm giác đây là một bản báo giá có thể kiểm tra, không phải
một biểu mẫu bí ẩn. Mọi thay đổi về giá, currency, shipping, discount, eligibility
hoặc quantity đều phải hiện rõ nguyên nhân, giá trị trước/sau và hành động tiếp theo.

### Nguyên tắc

1. **Một luồng, nhiều section:** checkout là một trang duy nhất; không dùng wizard,
   stepper hoặc các màn hình tách rời.
2. **Server là nguồn giá trị:** UI gọi dữ liệu hiển thị là “tổng đã cập nhật” hoặc
   “tổng được tính lại”, không ngụ ý giá lưu trong browser là chính thức.
3. **Mixed nhưng không mơ hồ:** mọi line luôn có nhãn `Mẫu PDF` / `PDF pattern`
   hoặc `Sản phẩm thủ công` / `Handmade item`.
4. **Thay đổi phải được đồng ý:** đổi quốc gia không được âm thầm thay cart; modal
   so sánh là checkpoint bắt buộc khi có material change.
5. **Lỗi có đường thoát:** unavailable, stale, out-of-stock và unsupported destination
   luôn giữ cart, chỉ rõ line bị ảnh hưởng và cung cấp hành động hợp lệ.
6. **Guest ngang hàng account:** không ép tạo tài khoản; đăng nhập là lựa chọn phụ
   và merge cart phải minh bạch.
7. **Một CTA chính:** mỗi screen hoặc vùng hành động chỉ có một nút primary.

---

## Design System

| Thuộc tính | Giá trị |
|------------|---------|
| Tool | shadcn/ui đã khởi tạo |
| Preset | `new-york`, base Radix, RSC, CSS variables |
| Component library | shadcn/Radix và component nội bộ hiện hữu |
| Styling | Tailwind CSS 4 với semantic CSS variables trong `globals.css` |
| Icon library | Lucide React, stroke 1.5-2px |
| Font | Be Vietnam Pro; dùng cấu hình hiện hữu của Phase 1 |
| Radius | 8px control, 12px card, 16px surface lớn |
| Elevation | Border mặc định; một soft shadow cho sheet, dialog và sticky summary |

Không tạo design system mới. Reuse `Button`, `Alert`, `Card`, `Sheet`,
`Separator`, `Skeleton` và bổ sung component shadcn chính thức khi cần.
Không cài registry bên thứ ba.

---

## Spacing Scale

| Token | Giá trị | Cách dùng |
|-------|---------|-----------|
| `xs` | 4px | Khoảng icon-label, chi tiết validation |
| `sm` | 8px | Nội dung control nhỏ, price rows |
| `md` | 16px | Padding component, khoảng field mặc định |
| `lg` | 24px | Padding card, gutter mobile rộng |
| `xl` | 32px | Khoảng section checkout |
| `2xl` | 48px | Ngắt vùng lớn |
| `3xl` | 64px | Nhịp dọc page desktop |

Ngoại lệ:

- Touch target tối thiểu 44x44px; input/select checkout cao tối thiểu 48px.
- Quantity stepper có control 44x44px và giá trị rộng tối thiểu 48px.
- Border 1px và focus ring 2px là giá trị cấu trúc, không phải spacing token.
- Sticky mobile action bar có padding bottom `max(16px, env(safe-area-inset-bottom))`.
- Desktop gutter là 32px tại 1024px và 48px tại 1280px trở lên.

---

## Typography

Chỉ dùng bốn size và hai weight cho UI Phase 3.

| Vai trò | Size | Weight | Line height |
|---------|------|--------|-------------|
| Label / Meta | 14px | 600 | 1.4 |
| Body / Control | 16px | 400 | 1.5 |
| Section heading | 20px | 600 | 1.3 |
| Page heading / Total lớn | 28px | 600 | 1.2 |

Quy tắc:

- Body trên mobile luôn 16px; không thu nhỏ field hoặc price để tiết kiệm chỗ.
- Chỉ dùng weight 400 và 600.
- Tên sản phẩm tối đa hai dòng trong mini-cart; full cart cho phép wrap đầy đủ.
- Giá, quantity, subtotal, shipping, discount và total dùng `tabular-nums`.
- Không tách currency khỏi amount sang dòng khác.
- Heading, label và button dùng sentence case.
- Cho phép copy tiếng Việt/Anh nở 30%; button có thể cao hơn một dòng nhưng không
  truncate CTA quan trọng.

---

## Color

Giữ nguyên semantic tokens hiện hữu.

| Vai trò | Token / giá trị | Cách dùng |
|---------|-----------------|-----------|
| Dominant 60% | `--background: #FFF9F2` | Nền trang và vùng checkout yên tĩnh |
| Secondary 30% | `--surface: #FFFFFF`, `--surface-muted: #F5EDE3` | Card, cart line, summary, nav |
| Accent 10% | `--accent: #A6472D`, hover `#843823` | CTA chính, focus, selected state, link hành động |
| Text | `--foreground: #2E2926`, `--muted-foreground: #6F655E` | Nội dung chính/phụ |
| Border | `--border: #DCCFC2` | Card, input, divider, table |
| Success | `--success: #2F6B4F`, surface `#E9F4ED` | Discount hợp lệ, merge hoàn tất, request approved |
| Warning | `--warning: #8A5A16`, surface `#FFF4D6` | Stale price, quantity adjusted, unsupported destination |
| Destructive | `--destructive: #B42318`, surface `#FDECEC` | Remove, reject, invalid/out-of-stock, blocking error |
| Admin shell | `--admin-nav: #292623` | Sidebar và ranh giới admin |

Accent chỉ dành cho:

- CTA primary duy nhất trong screen/region.
- Cart indicator có item và selected navigation.
- Focus ring.
- Link điều hướng/hành động inline.
- Selected variant, selected shipping country và discount đã áp dụng khi không
  trùng semantic status.

Không dùng accent cho mọi icon, toàn bộ nền summary hoặc các nút secondary.
Old value trong comparison dùng muted text và gạch ngang; new value dùng
foreground/semibold. Warning/destructive luôn có icon và text, không chỉ màu.

---

## Hợp đồng shell và route

### Header cart

- Thêm cart trigger vào `SiteHeader`, nằm trước locale/menu ở desktop và luôn hiện
  trên mobile.
- Trigger dùng icon Lucide `ShoppingBag` hoặc `ShoppingCart`, accessible name
  `Giỏ hàng, {count} sản phẩm` / `Cart, {count} items`.
- Badge count hiển thị tổng quantity, giới hạn trực quan `99+`; screen reader đọc
  số thực.
- Count `0` không cần badge, nhưng trigger vẫn truy cập được.
- Desktop trigger mở mini-cart sheet từ bên phải, rộng 400px tối đa.
- Mobile trigger mở mini-cart full-width; link `Xem giỏ hàng` dẫn tới localized
  full cart route.
- Header không nhảy layout khi count thay đổi. Cập nhật count dùng
  `aria-live="polite"` ngoài accessible name của nút.

### Localized routes

| Bề mặt | Tiếng Việt | English |
|--------|------------|---------|
| Full cart | `/vi/gio-hang` | `/en/cart` |
| Checkout | `/vi/thanh-toan` | `/en/checkout` |
| Exception request | `/vi/yeu-cau-ngoai-le` | `/en/exception-request` |
| Approved exception | Localized route + opaque token | Localized route + opaque token |

Admin routes giữ ngoài locale prefix:

- `/admin/shipping`
- `/admin/discounts`
- `/admin/exceptions`

---

## Product add-to-cart

### Product detail

- CTA primary: `Thêm vào giỏ` / `Add to cart`.
- PDF không có variant: CTA enabled khi offer hiện hành hợp lệ.
- Physical có variant: CTA disabled cho đến khi chọn valid in-stock variant.
  Hiển thị lý do trực tiếp phía trên CTA, không chỉ dựa vào disabled state.
- Variant out-of-stock vẫn hiển thị trong selector với text `Hết hàng` /
  `Out of stock`, disabled input và không cho add.
- Quantity mặc định `1`; quantity selector chỉ xuất hiện khi inventory cho phép
  nhiều hơn một. Không cho nhập số âm, số thập phân hoặc vượt max hiện biết.
- Add thành công: cập nhật header count, mở mini-cart trên desktop; trên mobile
  hiển thị inline confirmation và hai hành động `Xem giỏ hàng` / `View cart`
  (secondary) và `Tiếp tục mua sắm` / `Continue shopping` (text link).
- Không dùng toast làm feedback duy nhất.

### Unavailable market

- Reuse warning surface từ `UnavailableMarket`.
- Nếu sản phẩm physical có thể yêu cầu exception, thêm secondary action
  `Yêu cầu ngoại lệ giao hàng` / `Request shipping exception`.
- Không hiển thị exception action cho PDF hoặc trường hợp không thuộc destination
  exception.
- Switching storefront market và requesting destination exception là hai hành
  động khác nhau, copy không được trộn lẫn.

---

## Mini-cart

- Sheet header gồm title, line count và close button 44x44px.
- Mỗi line gồm thumbnail 72x72px, type badge, title, variant, quantity, current
  unit price, line subtotal và remove action.
- PDF line có icon `FileText`; physical line có `Package`. Icon bổ trợ cho text label.
- Mini-cart cho sửa quantity bằng stepper; variant change dẫn tới full cart nếu
  không thể trình bày selector gọn.
- Summary cố định ở cuối sheet: subtotal, discount nếu có, shipping
  `Tính khi chọn điểm đến` / `Calculated after destination`, estimated total.
- CTA primary: `Tiến hành thanh toán` / `Checkout`.
- Secondary: `Xem giỏ hàng` / `View cart`.
- Nếu có blocking line, CTA checkout disabled và ngay trước CTA có alert chỉ rõ
  cần sửa line nào.
- Sheet content scroll độc lập; header và footer không che line cuối, kể cả safe area.

### Empty mini-cart

- Heading: `Giỏ hàng đang trống` / `Your cart is empty`.
- Body: `Thêm mẫu PDF hoặc sản phẩm thủ công để bắt đầu đơn hàng.` /
  `Add a PDF pattern or handmade item to start your order.`
- CTA: `Khám phá sản phẩm` / `Browse products`.

---

## Full cart

### Bố cục

- 375px: một cột; lines trước, summary sau; CTA sticky bottom chỉ khi summary
  không đang nằm trong viewport.
- 768px: một cột rộng, line dùng grid thumbnail/content/price.
- 1024px+: content 2/3 và sticky summary 1/3; gap 32px.
- 1440px: max width 1200px; summary rộng 360-400px.

### Cart line

- Desktop: thumbnail 112x112px; mobile 88x88px.
- Thứ tự: type badge, title link, variant/SKU-friendly label, availability note,
  unit price, quantity, subtotal, remove.
- Variant edit mở inline selector hoặc dialog nhỏ; save thay đổi phải revalidate
  price và stock trước khi thay line.
- Remove là ghost/destructive text action với icon `Trash2`; không cần confirm cho
  một line vì hành động có thể undo trong 8 giây bằng inline notice.
- `Undo` là button, không chỉ toast. Sau 8 giây hoặc navigation, undo hết hiệu lực.
- Quantity update pending chỉ khóa line đó, giữ layout ổn định và hiển thị
  `Đang cập nhật` / `Updating`.

### Mixed grouping

- Không chia cart thành hai đơn. Có thể dùng section heading `Sản phẩm trong giỏ`
  nhưng mọi line nằm trong một list và một summary.
- Type badge bắt buộc trên từng line.
- Summary có note: `Mẫu PDF chỉ được cung cấp sau khi toàn bộ đơn hàng được xác nhận
  đã thanh toán.` / `PDF patterns are delivered only after the full order is
  confirmed paid.`

### Stale và merge changes

- Price changed: warning strip trong line, old price gạch ngang, new price semibold,
  copy nêu đã cập nhật theo giá hiện hành.
- Quantity reduced: warning strip nêu requested quantity và available quantity.
- No longer available: giữ line, đánh dấu blocking, subtotal không cộng vào payable
  total và cung cấp `Xóa khỏi giỏ` hoặc exception nếu hợp lệ.
- Sau refresh/merge, hiển thị một summary alert đầu cart với số thay đổi và anchor
  tới từng line.
- Không tự dismiss alert thay đổi thương mại.

### Cart summary

Hiển thị theo thứ tự:

1. Subtotal sản phẩm.
2. Discount, nếu đã áp dụng.
3. Shipping: `Chưa tính` / `Not calculated` trước destination.
4. Total hiện tại.

CTA primary: `Tiến hành thanh toán` / `Checkout`.
Không hiển thị logo PayPal, VietQR hoặc nút payment trong Phase 3.

---

## Sign-in và cart merge

- Khi guest chọn sign in, giải thích ngắn: cart hiện tại sẽ được kiểm tra và có thể
  merge sau đăng nhập.
- Nếu cùng customer context thông thường: merge tự động theo D-05, sau đó điều
  hướng về cart với merge result.
- Nếu thiết bị có guest cart và account khác đăng nhập: modal bắt buộc:
  `Gộp giỏ hàng trên thiết bị này?` / `Merge this device cart?`.
- Modal liệt kê số line guest, số line account và cảnh báo quantity/price sẽ được
  kiểm tra lại.
- CTA primary: `Gộp và kiểm tra giỏ hàng` / `Merge and review cart`.
- Secondary: `Giữ giỏ hàng tài khoản` / `Keep account cart`.
- Close/Escape tương đương cancel, không merge.

Merge result dùng alert + list:

- Added lines.
- Combined quantities.
- Quantities reduced to stock.
- Price/availability changes.
- Lines not merged.

Focus chuyển tới heading của merge result sau navigation.

---

## Checkout một trang

### Cấu trúc và thứ tự section

1. `Thông tin liên hệ` / `Contact`.
2. `Điểm đến giao hàng` / `Shipping destination`, chỉ với physical/mixed cart.
3. `Giao hàng` / `Shipping`, chỉ với physical/mixed cart và sau destination hợp lệ.
4. `Mã giảm giá` / `Discount code`.
5. `Xác nhận đơn hàng` / `Order confirmation`.
6. Sticky `Tóm tắt` / `Summary` và submit.

Không dùng progress stepper. Mỗi section là `Card` có heading, short helper text,
validation state và edit affordance rõ ràng.

### Responsive

- 375px: một cột; summary ở cuối và compact sticky action bar gồm total + CTA.
- 768px: một cột max 720px; summary không sticky nếu làm che nội dung.
- 1024px+: form 2/3, summary sticky 1/3 với `top: 96px`.
- 1440px: max width 1200px, form tối đa 760px, summary tối đa 400px.
- Sticky region phải dừng trước footer và không che error, keyboard hoặc safe area.

### Contact

- Guest: email bắt buộc; tên và phone chỉ hiện nếu cần cho physical shipping.
- Signed-in: prefill email nhưng vẫn hiển thị; không khóa nếu business rules cho
  phép email nhận đơn khác.
- Label luôn visible. Autocomplete dùng semantic tokens như `email`, `name`, `tel`.
- Copy không ngụ ý account là bắt buộc.

### Destination

- Digital-only checkout bỏ toàn bộ destination và shipping section; summary ghi
  `Không cần giao hàng` / `No shipping required`.
- Physical/mixed: country là field đầu tiên. Các address fields chỉ render sau khi
  country được chọn.
- Country change gửi server recalculation. Nếu không có material change, update
  inline và announce. Nếu có material change, mở comparison modal trước khi áp dụng.
- Country không được dùng flag icon.
- Unsupported destination hiển thị blocking alert trong destination section,
  giữ toàn bộ cart và cung cấp exception request khi hợp lệ.

### Shipping

- Chỉ hiển thị authoritative shipping fee sau destination hợp lệ.
- Nếu một số unit free shipping, summary có thể nêu `Miễn phí cho {n} sản phẩm` /
  `Free shipping for {n} items`; không cần lộ thuật toán fee nội bộ.
- Nếu recalculation pending, giữ giá trước đó nhưng đánh dấu `Đang tính lại` /
  `Recalculating`; submit disabled.
- Không hiển thị placeholder fee, estimate hoặc “sẽ liên hệ sau”.

### Discount

- Field label `Mã giảm giá` / `Discount code`, input và button secondary
  `Áp dụng mã` / `Apply code`.
- Code tự động trim, giữ casing người dùng nhập trong UI nhưng server quyết định
  normalization.
- Success hiển thị code, discount amount và `Xóa mã` / `Remove code`.
- Invalid/expired/not eligible/usage limit dùng một thông báo an toàn, nêu code
  không áp dụng được và đề nghị kiểm tra hoặc tiếp tục không dùng code.
- Customer restriction không được tiết lộ dữ liệu customer khác.
- Apply/remove discount luôn recalculates summary và announce total mới.

### Confirmation

- Checkbox bắt buộc chỉ dùng cho acknowledgement thực sự cần thiết; không tạo
  newsletter opt-in mặc định.
- Hiển thị line snapshot review, destination, shipping, discount và total.
- Copy trước submit:
  `Giá và tồn kho sẽ được kiểm tra lại khi bạn gửi đơn. Hàng vật lý chỉ được giữ
  sau khi gửi thành công.` /
  `Prices and stock are checked again when you submit. Physical inventory is
  reserved only after a successful submission.`
- Phase 3 không yêu cầu nhập payment details.

### Submit và outcome

- CTA primary: `Xác nhận tổng tiền và tiếp tục` /
  `Confirm total and continue`.
- Pending label: `Đang giữ hàng và tạo đơn...` /
  `Reserving items and creating order...`.
- Submit disabled khi quote pending, material change chưa xác nhận, line blocked,
  discount đang validate hoặc field invalid.
- Success outcome là handoff `Đơn hàng đang chờ thanh toán` /
  `Order awaiting payment`, gồm order reference, total, reservation deadline và
  CTA sang bước payment của Phase 4 khi route tồn tại.
- Không hiển thị “Đã thanh toán”, “Đặt hàng thành công” hoặc delivery/download
  promise trong Phase 3.
- Conflict outcome không tạo cảm giác partial success; hiển thị cart/quote đã đổi,
  refresh summary và yêu cầu review lại.

---

## Modal so sánh thay đổi market

Đây là modal blocking, dùng shadcn `Dialog`; không dùng toast, popover hoặc sheet
thay thế trên desktop. Trên 375px dialog có thể chiếm gần full viewport nhưng vẫn
giữ semantics dialog, focus trap và action footer.

### Nội dung

- Heading: `Điểm đến làm thay đổi đơn hàng` /
  `Your destination changes this order`.
- Intro nêu quốc gia mới và yêu cầu review trước khi áp dụng.
- Mỗi affected line là một row/card có thumbnail nhỏ, type, title, variant và các
  field thay đổi.
- Mỗi field dùng hai cột `Trước` / `Before` và `Sau` / `After`.
- Hiển thị đầy đủ các thay đổi có material impact:
  eligibility, market, unit price, currency, quantity, discount allocation,
  shipping contribution và line subtotal.
- Sau line list là total comparison: subtotal, discount, shipping, grand total.
- Dòng không đổi không xuất hiện trong line list; modal nêu số line không đổi.
- Unavailable line vẫn hiện, trạng thái `Không thể thanh toán` /
  `Not eligible for checkout`, cùng exception action nếu hợp lệ.

### Hành động

- CTA primary: `Chấp nhận thay đổi` / `Accept changes`.
- Secondary: `Giữ điểm đến hiện tại` / `Keep current destination`.
- Không có close icon là đường thứ ba mơ hồ; close/Escape tương đương secondary.
- Cancel giữ nguyên country, quote và form state trước đó.
- Confirm áp dụng toàn bộ new quote atomically ở UI, không apply từng line.
- Sau confirm, focus trả về country field và `aria-live` đọc total mới.

### Mobile

- Header và footer sticky trong dialog; body scroll.
- Comparison row chuyển từ hai cột thành hai block có label rõ `Trước` và `Sau`,
  không tạo horizontal scroll.
- Action buttons stack, primary trước về thị giác nhưng đứng sau trong DOM để
  keyboard order tự nhiên từ nội dung tới secondary rồi primary.

---

## Exception request - customer

### Entry points

- Unavailable product/destination alert.
- Blocking cart line.
- Unsupported shipping alert trong checkout.

### Form

- Pre-populate product, variant, current market và requested country dưới dạng
  read-only summary.
- Fields: email, destination country, optional short note tối đa 500 ký tự.
- Không hỏi payment, full address hoặc dữ liệu không cần cho review ban đầu.
- Notice bắt buộc:
  `Yêu cầu này không giữ hàng và không đảm bảo đơn hàng sẽ được chấp thuận.` /
  `This request does not reserve stock or guarantee approval.`
- CTA: `Gửi yêu cầu ngoại lệ` / `Submit exception request`.

### Outcomes

- Success: request reference, trạng thái `Đang xem xét` / `Under review`, giải thích
  admin sẽ approve/reject và stock vẫn có thể thay đổi.
- Approved-link page: hiển thị exact scope, expiry 48 giờ, fresh price/stock
  validation và CTA `Kiểm tra lại và tiếp tục thanh toán` /
  `Recheck and continue to checkout`.
- Expired/used/invalid link dùng generic error, không xác nhận token từng tồn tại;
  cung cấp link quay lại catalog hoặc tạo request mới.

---

## Admin shipping profiles và rules

### List

- Heading, description, CTA primary `Tạo hồ sơ giao hàng` /
  `Create shipping profile`.
- Desktop table; mobile card list. Columns: name, attached product count, active
  destination rules, updated date, status, actions.
- Search/filter là optional; không thêm nếu volume v1 chưa cần.
- Empty state giải thích profile được gắn vào physical products để tính fee theo
  destination.

### Create/edit

- Một form page, không modal.
- Sections: profile identity, attached products, destination rules, review.
- Rule fields: destination/country group, currency, first-item fee,
  additional-item fee, free-shipping condition nếu supported, active state.
- Money input luôn có currency suffix và helper nêu integer storage không cần lộ
  cho user; UI nhận decimal USD đúng locale và whole-unit VND.
- Rule list có reorder-independent copy; không cho admin hiểu nhầm rule đầu tiên
  luôn là first-item fee áp dụng cho cart.
- Delete profile/rule cần `AlertDialog` khi đang attached; copy nêu số product bị
  ảnh hưởng và checkout có thể bị block.

---

## Admin discount CRUD

### List

- CTA primary `Tạo mã giảm giá` / `Create discount`.
- Desktop table/mobile cards: code, type/value, market, active dates, usage,
  status, updated date.
- Status text: Draft, Scheduled, Active, Exhausted, Expired, Disabled.
- Copy code action có accessible confirmation; không dùng icon-only không label.

### Create/edit

- Sections: code/value, schedule and limits, customer/market restrictions,
  product/category/collection scope, review.
- Type selector `Phần trăm` / `Percentage` hoặc `Giá trị cố định` /
  `Fixed amount`.
- Chỉ hiển thị currency cho fixed discount; market/currency mismatch là inline
  blocking error.
- Restriction builder dùng checkbox/select có visible label; không dùng query
  builder tự do.
- Preview nêu bằng câu người đọc được: “10% cho collection X tại thị trường quốc tế,
  tối thiểu 50 USD, tối đa 100 lượt”.
- Disable là reversible secondary action; delete là destructive và chỉ cho phép
  khi domain rules cho phép.

---

## Admin exception review

### Queue

- Tabs hoặc segmented filter: `Chờ xử lý`, `Đã duyệt`, `Đã từ chối`, `Hết hạn`.
- Queue row/card: request reference, requested product/variant, destination,
  customer email masked trong list, submitted time, current stock status.
- Không dùng color làm tín hiệu trạng thái duy nhất.

### Detail

- Summary gồm request data, current market offer, current inventory, shipping
  feasibility và customer note.
- Admin phải nhập hoặc xác nhận shipping rule/fee hợp lệ trước approve; không cho
  approve với placeholder fee.
- CTA primary cho pending request: `Duyệt và tạo liên kết` /
  `Approve and create link`.
- Destructive secondary: `Từ chối yêu cầu` / `Reject request`.
- Reject mở dialog yêu cầu reason ngắn; reason customer-facing phải có bản dịch
  hoặc chọn reason template localized.
- Approve outcome hiển thị scoped grant, expiry timestamp 48 giờ, exact product,
  variant, country và trạng thái chưa reserve stock.
- Copy-link action không hiển thị raw secret sau khi rời page nếu security model
  không cho phép; ưu tiên hệ thống gửi link ở phase phù hợp.

---

## Component inventory

| Component | Nền tảng | Contract |
|-----------|----------|----------|
| Button | Existing shadcn-style `Button` | Primary/secondary/ghost/destructive; min 44px; pending giữ width |
| Alert | Existing `Alert` | Inline status/error; heading + next action; không color-only |
| Card | Existing `Card` | Cart lines, checkout sections, admin forms |
| Sheet | Existing `Sheet` | Mini-cart và mobile navigation; cần focus trap/restore đúng Radix behavior |
| Dialog | shadcn official | Market-change và cart-merge blocking modal |
| AlertDialog | shadcn official | Admin destructive confirmation |
| Input/Textarea | shadcn official hoặc style hiện hữu | Visible labels, 48px checkout height, error association |
| Select | shadcn official hoặc native | Country, restriction và rule fields; keyboard đầy đủ |
| Checkbox/Radio | Radix/native | Confirmation, discount restrictions, variant state |
| Table | shadcn official | Admin desktop lists; không dùng table cho mobile |
| Badge | Local | Product type và statuses; text + semantic surface |
| QuantityStepper | Local | Minus/value/plus; min 44px; announce updates |
| MoneyRow | Local | Label + tabular amount; loading/stale states |
| CartLine | Local | Shared mini/full/checkout review presentation |
| OrderSummary | Local | Subtotal, discount, shipping, total, CTA slot |
| QuoteDiff | Local | Old/new line and total comparison |
| EmptyState | Local composition | Icon, heading, body, một action |
| Skeleton | Existing `Skeleton` | Chỉ khi hydrate cart/quote; match geometry |

Navigation dùng link; mutation dùng button. Icon-only control phải có accessible
name và tooltip trên pointer devices.

---

## Form, validation và error recovery

- Validate field sau blur và khi submit; không báo lỗi ngay lúc initial focus.
- Field error đặt ngay dưới field và liên kết bằng `aria-describedby`.
- Cross-field/quote/server error đặt trong `Alert` trước CTA của section liên quan.
- Submit lỗi chuyển focus tới field invalid đầu tiên; blocking server error focus
  alert heading.
- Giữ contact, destination và safe form values sau lỗi. Không reset cart.
- Server quote là authoritative; raw database/Supabase/RPC error không xuất hiện.
- Network error phải nói rõ chưa xác nhận hoàn tất; cho retry với cùng idempotency
  semantics nhưng không nói chi tiết kỹ thuật.
- Nếu submit outcome không chắc chắn do mất mạng, copy:
  `Chưa thể xác nhận đơn đã được tạo. Không gửi lại ngay; hãy kiểm tra trạng thái
  bằng mã yêu cầu này.` / tương đương English, khi backend hỗ trợ lookup.
- Stale quote đưa user về confirmation/summary, không xóa input contact/address.
- Out-of-stock nêu từng line và quantity còn khả dụng; không chỉ báo “Có lỗi”.
- Discount failure không chặn checkout trừ khi UI đang giữ một total chưa được
  server xác nhận.

---

## Copywriting contract

Tone ấm áp, trực tiếp, chính xác. Không dùng chơi chữ thủ công trong lỗi checkout.
Tiếng Việt phải tự nhiên; tiếng Anh ngắn gọn và quốc tế.

| Thành phần | Tiếng Việt | English |
|------------|------------|---------|
| Add to cart | `Thêm vào giỏ` | `Add to cart` |
| Cart CTA | `Tiến hành thanh toán` | `Checkout` |
| Checkout submit | `Xác nhận tổng tiền và tiếp tục` | `Confirm total and continue` |
| Empty cart heading | `Giỏ hàng đang trống` | `Your cart is empty` |
| Empty cart body | `Thêm mẫu PDF hoặc sản phẩm thủ công để bắt đầu đơn hàng.` | `Add a PDF pattern or handmade item to start your order.` |
| Market modal heading | `Điểm đến làm thay đổi đơn hàng` | `Your destination changes this order` |
| Accept market change | `Chấp nhận thay đổi` | `Accept changes` |
| Cancel market change | `Giữ điểm đến hiện tại` | `Keep current destination` |
| Merge CTA | `Gộp và kiểm tra giỏ hàng` | `Merge and review cart` |
| Discount apply | `Áp dụng mã` | `Apply code` |
| Exception CTA | `Gửi yêu cầu ngoại lệ` | `Submit exception request` |
| Generic cart error | `Chưa thể cập nhật giỏ hàng. Giỏ của bạn vẫn được giữ; vui lòng thử lại.` | `We couldn't update your cart. Your cart is still saved; please try again.` |
| Checkout conflict | `Giá hoặc tình trạng hàng đã thay đổi. Xem lại tổng mới trước khi tiếp tục.` | `A price or availability changed. Review the new total before continuing.` |
| Unsupported destination | `Chưa có phương thức giao hàng hợp lệ cho điểm đến này.` | `No valid shipping option is available for this destination.` |
| Pending-payment outcome | `Đơn hàng đang chờ thanh toán` | `Order awaiting payment` |

### Destructive confirmations

| Hành động | Contract |
|-----------|----------|
| Remove cart line | Không dialog; inline undo 8 giây |
| Delete shipping profile/rule | AlertDialog nêu impact lên attached products/checkouts |
| Delete discount | AlertDialog nêu code sẽ không thể áp dụng; không ảnh hưởng snapshot cũ |
| Reject exception | Dialog bắt buộc reason; confirm label `Từ chối yêu cầu` / `Reject request` |

---

## Trạng thái bắt buộc

Mỗi major surface phải có:

| State | Contract |
|-------|----------|
| Loading | Skeleton đúng geometry; không skeleton toàn trang sau initial shell |
| Empty | Heading, explanation, một next action |
| Default | Quote và actions hiện hành đầy đủ |
| Pending | Khóa mutation trùng; spinner + localized progress copy |
| Success | Inline status, next action và `aria-live="polite"` |
| Validation error | Gần field + summary khi nhiều lỗi |
| Server error | Persistent alert, retry hoặc safe navigation |
| Stale | Old/new values và review requirement |
| Unavailable | Line vẫn visible, excluded khỏi payable total, resolution actions |
| Out of stock | Text + icon + disabled invalid action |
| Offline/network | Nêu request chưa hoàn tất/không rõ; không giả định success |
| Unauthorized | Server-side admin boundary; không flash privileged UI |
| Expired | Exception link/reservation deadline có exact timestamp và next step |

---

## Accessibility

- WCAG 2.2 AA; contrast text thường tối thiểu 4.5:1.
- Focus ring 2px accent + 2px offset trên mọi control.
- Keyboard hoàn thành được add-to-cart, quantity, mini-cart, full cart, checkout,
  modal diff và admin CRUD.
- Dialog/sheet trap focus, Escape close theo contract và restore focus về trigger.
- Form labels luôn visible; placeholder chỉ là ví dụ.
- `aria-live="polite"` cho cart count, line subtotal, discount, shipping và total.
- `role="alert"` cho blocking validation/submit errors.
- Khi nhiều total thay đổi cùng lúc, announce một summary duy nhất để tránh spam.
- Quantity stepper có label chứa product name; minus disabled tại minimum.
- Price change không chỉ dùng gạch ngang/màu; có text `Giá đã thay đổi`.
- Table admin có caption hoặc accessible heading; mobile dùng semantic list/card.
- 200% zoom không che CTA hoặc tạo horizontal scroll.
- Không auto-focus input đầu trên mobile.

---

## Motion

- Color/border/opacity: 150ms ease-out.
- Sheet/dialog enter: 200ms ease-out; exit 150ms ease-in.
- Inline cart line update: tối đa 200ms opacity/background highlight.
- Market diff không animate số tiền đếm lên hoặc morph old/new.
- Không dùng bounce, spring, confetti, parallax hoặc continuous decoration.
- `prefers-reduced-motion`: bỏ transform, dùng immediate hoặc opacity dưới 100ms.
- Loading spinner là motion có ý nghĩa duy nhất được lặp liên tục.

---

## Responsive contract

| Viewport | Contract |
|----------|----------|
| 375px | Một cột; 16px gutter; mini-cart full-width; dialog gần full viewport; sticky total + CTA có safe area |
| 768px | 24px gutter; form/cart một cột rộng; line grid; action không cần full-width nếu đủ chỗ |
| 1024px | Cart/checkout hai cột; sticky summary; admin table và persistent sidebar |
| 1440px | Max width 1200px; gutter 48px; form 760px + summary 400px |

Quy tắc:

- Không horizontal scroll ở mọi bề mặt.
- Old/new comparison stack trên mobile.
- Vietnamese labels wrap, không ellipsis ở CTA, headings hoặc statuses.
- Sticky summary/action không che field error, footer, mobile keyboard hoặc safe area.
- Adjacent touch targets có khoảng cách tối thiểu 8px khi có thể.
- Product image co lại trước khi nội dung/price bị truncate.

---

## Security-sensitive UI boundaries

- Browser cart chỉ hiển thị dữ liệu server hydrate; không coi local price/name/stock
  là nguồn thật.
- Không đưa email, address, discount validity, payment data hoặc authoritative
  quote vào local storage.
- Không render admin approve/reject cho non-admin rồi chỉ disable.
- Exception token không hiển thị trong analytics, error copy hoặc logs.
- Generic invalid/expired exception response không cho enumeration.
- Approved exception UI phải ghi rõ scope và không ngụ ý permanent availability.
- UI không nói stock đã giữ trước successful checkout submit.
- Không hiển thị internal IDs, quote hash, idempotency key, SQL/RPC error hoặc
  reservation implementation details.

---

## Explicit anti-patterns

- Không checkout wizard, progress stepper hoặc multi-page form.
- Không silent market/currency/eligibility mutation.
- Không tự xóa unavailable line khỏi cart.
- Không trộn VND và USD trong cùng accepted quote.
- Không dùng client-submitted price làm display sau submit.
- Không payment provider button hoặc capture UI trong Phase 3.
- Không yêu cầu account để checkout.
- Không hỏi shipping address cho digital-only cart.
- Không tính shipping cho PDF.
- Không placeholder shipping fee hoặc “liên hệ sau”.
- Không toast-only error/success cho hành động commerce.
- Không disabled CTA mà thiếu lý do.
- Không color-only status, flag icon hoặc emoji icon.
- Không data table gây horizontal scroll trên mobile.
- Không sticky bar che nội dung/safe area.
- Không gradients, glassmorphism, heavy shadow hoặc decoration crochet trong checkout.
- Không registry shadcn bên thứ ba.

---

## Registry Safety

| Registry | Blocks/components dùng | Safety gate |
|----------|------------------------|-------------|
| `@shadcn` official | Hiện có: alert, button, card, separator, sheet, skeleton. Có thể thêm: dialog, alert-dialog, input, textarea, select, checkbox, radio-group, table, badge, tooltip | `npx shadcn info` xác nhận registry official ngày 2026-06-15; không có third-party block |
| Registry bên thứ ba | Không | Không áp dụng; bị cấm trong Phase 3 |

---

## Acceptance checks

### Storefront và cart

- [ ] Header cart trigger hoạt động bằng keyboard và mobile tại 375/768/1024/1440.
- [ ] Product detail chặn add khi variant invalid/out-of-stock và nêu lý do.
- [ ] PDF và physical lines luôn phân biệt bằng text label + icon.
- [ ] Mini-cart và full cart có empty/loading/error/stale/unavailable states.
- [ ] Quantity, variant, remove/undo và totals không tạo horizontal scroll.
- [ ] Guest cart merge prompt/result đúng D-05, D-06 và D-09.

### Checkout

- [ ] Checkout là một page với các section theo thứ tự contract.
- [ ] Digital-only không render destination/shipping address.
- [ ] Mixed/physical destination change gọi server revalidation.
- [ ] Mọi material change mở modal old/new line + total và bắt buộc confirm/cancel.
- [ ] Cancel giữ quote/country cũ; confirm áp dụng toàn bộ new quote.
- [ ] Shipping chỉ tính physical units; unsupported destination block submit.
- [ ] Discount feedback và allocation total được server-confirmed.
- [ ] Submit pending chống duplicate, nêu reservation action và không capture payment.
- [ ] Success dừng tại pending-payment/reservation handoff.

### Exception và admin

- [ ] Exception request nêu rõ non-binding, không reserve stock.
- [ ] Approved link hiển thị scope, 48-hour expiry và fresh validation.
- [ ] Admin shipping CRUD có impact confirmation và currency-safe money fields.
- [ ] Admin discount CRUD thể hiện đầy đủ restriction bằng human-readable preview.
- [ ] Admin exception queue/detail có approve, reject reason và scoped-link outcome.
- [ ] Non-admin không thấy privileged controls trước redirect/403.

### Chất lượng chung

- [ ] Chỉ dùng 4 typography sizes và 2 weights đã khai báo.
- [ ] Semantic colors, tabular figures, 44px targets và visible focus được áp dụng.
- [ ] VI/EN copy hoàn chỉnh, chịu text expansion và route localized.
- [ ] Error gần field, blocking error có alert/focus, status update có aria-live.
- [ ] Motion trong 150-300ms và reduced-motion hoạt động.
- [ ] Không có third-party registry hoặc out-of-scope Phase 4 payment UI.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
