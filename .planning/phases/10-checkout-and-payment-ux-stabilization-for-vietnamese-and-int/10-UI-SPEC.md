---
phase: 10
slug: checkout-and-payment-ux-stabilization-for-vietnamese-and-int
status: approved
shadcn_initialized: true
preset: new-york / neutral / radix / lucide
created: 2026-08-04
reviewed_at: 2026-08-04
---

# Phase 10 — UI Design Contract

> Visual and interaction source of truth for stabilizing product/cart, checkout,
> PayPal, VietQR, order recovery, and success states for Vietnamese and
> international customers. Current code and `10-CONTEXT.md` supersede stale
> audit line numbers and earlier visual assumptions.

---

## Intent

Phase 10 is a conversion, accessibility, and recovery stabilization pass, not a
visual rebrand. Preserve the current warm Ambertinybear storefront, Nunito,
flat bordered surfaces, compact checkout cards, current product imagery, and
existing desktop two-column layouts. The phase should make the path from product
to a truthfully confirmed payment easier to scan, easier to complete on a phone,
and safer to recover when something fails.

The customer should always be able to answer three questions without decoding
implementation language:

1. What information or action is needed now?
2. What has already been saved or confirmed?
3. What safe next step is available if this state cannot continue?

### Authority boundary

The UI displays and collects intent; it does not become commerce authority.

- Preserve server-owned price, discount, destination market, currency, payment
  method, inventory reservation, immutable order evidence, verified-paid
  transition, inventory finalization/release, and entitlement authorization.
- Preserve the canonical pairs `vn + VND → VietQR` and
  `intl + USD → PayPal`. There is no customer payment-method selector.
- A PayPal return, client callback, VietQR declaration, URL query, countdown,
  or local draft never marks an order paid.
- Failed, cancelled, rejected, and expired orders never offer same-order payment
  retry. Recovery restores eligible intent to the cart and creates a fresh
  checkout.
- `sessionStorage` may hold only the versioned, expiring editable checkout draft
  and the existing idempotency record. It must never hold authoritative quote
  data, guest proof, access tokens, provider evidence, payment status, secrets,
  or bank evidence.
- No new provider, carrier rate/ETA, receipt upload, analytics, refund initiation,
  or Phase 09 deployment/SEO work is authorized.

---

## Design System

| Property | Value | Evidence |
|----------|-------|----------|
| Tool | Existing project-owned shadcn/ui | `components.json`, `npx shadcn info` on 2026-08-04 |
| Preset | `new-york`, neutral base, Tailwind v4 CSS variables | `components.json` |
| Component library | Radix-backed shadcn primitives plus current local commerce components | `src/components/ui/*` |
| Installed primitives to reuse | `alert`, `button`, `card`, `checkbox`, `form`, `input`, `label`, `popover`, `select`, `separator`, `sheet`, `skeleton`, `sonner`, `textarea`, `toggle-group` | shadcn info |
| Icon library | Lucide React, outline, 1.5–2px stroke | `components.json`, existing commerce UI |
| Font | Nunito, Vietnamese and Latin subsets | `src/app/layout.tsx` |
| Styling | Tailwind CSS 4 using semantic variables in `src/app/globals.css` | Current code |
| Radius | Existing `8px` control/card/surface tokens | `src/app/globals.css` |
| Elevation | Border-first; current restrained shadow only for sticky rails, sheets, dialogs, and elevated commerce summaries | Current code |

Do not add a design-system directory, new UI/state dependency, third-party
registry, alternate icon family, glass effect, oversized pill language, or a
parallel checkout component tree. Extend the current `AddToCart`, `CartPage`,
`MiniCart`, `CheckoutPage`, `DestinationForm`, `OrderSummary`,
`PaymentStatePanel`, `VietQrInstructions`, and recovery patterns.

### Continuity rules

- Preserve the current header, catalog/product layout, cart two-column layout,
  and desktop checkout/order rails except where this contract reserves a state
  region or adds the mobile order-summary disclosure.
- Use one primary action per region. Provider-owned PayPal controls count as the
  primary payment action.
- Status and errors use semantic color plus icon/text; color is never the only
  signal.
- Essential destination, payment, error, incident, and disabled-reason text
  wraps. It must never use ellipsis or one-line truncation.

---

## Spacing Scale

All new or modified Phase 10 layout spacing uses the following scale:

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Icon-to-label gap, validation detail |
| `sm` | 8px | Compact controls, adjacent action spacing |
| `md` | 16px | Default field gap, mobile surface padding |
| `lg` | 24px | Desktop card padding, section gap |
| `xl` | 32px | Desktop column/major section gap |
| `2xl` | 48px | Page-region separation only |
| `3xl` | 64px | Existing page-level rhythm only |

Exceptions:

- Every interactive target is at least `44px × 44px`, including inline links
  presented as actions, copy controls, QR download, disclosure triggers, checkbox
  labels, and icon-only controls.
- Checkout text inputs, comboboxes, selects, and primary actions are at least
  `48px` high.
- Quote/status regions reserve at least `56px` before content may expand.
- Borders are `1px`; focus outlines are `2px` plus `2px` offset.
- Sticky mobile regions use
  `padding-bottom: max(16px, env(safe-area-inset-bottom))` and page content
  reserves enough bottom space that no field, error, or footer is covered.
- Adjacent touch targets keep an `8px` gap wherever controls are not part of one
  native grouped widget.

---

## Typography

Phase 10 additions and modified commerce state/copy use exactly four sizes and
two weights. Existing untouched product marketing display prices may retain their
current inherited size.

| Role | Size | Weight | Line height |
|------|------|--------|-------------|
| Meta / helper / field error | 14px | 400 | 1.4 |
| Body / control / visible label | 16px | 400 | 1.5 |
| Section or state heading | 20px | 600 | 1.2 |
| Page heading / confirmed total | 28px | 600 | 1.2 |

Rules:

- Only weights `400` and `600` are introduced or retained in touched Phase 10
  state UI. Do not add 500, 700, or 800 to modified controls or status panels.
- Button labels, field labels, selected options, state headings, and important
  amounts may use 600; body and explanations use 400.
- Amounts, order numbers, transfer references, account numbers, timestamps, and
  countdowns use tabular numerals.
- Do not split a currency from its amount. Long references use `break-all` or
  `overflow-wrap:anywhere`, never viewport overflow.
- Vietnamese and English copy may grow by at least 30%. CTA, status, destination,
  and error text wraps rather than truncates.
- Long explanatory paragraphs stay within `68ch` on desktop.

---

## Color

Use the current tokens; do not introduce literal per-component palette values.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#f6f2ea` / `--background` | Page canvas and unbounded space |
| Secondary (30%) | `#fffaf2` / `--surface`, `#fffdf8` / `--surface-paper`, `#ece3d4` / `--surface-muted` | Cards, form sections, mobile summary, payment details |
| Accent (10%) | `#a94734` / `--accent`, hover `#873627` | One primary CTA, focus, selected valid choice, copy/action links |
| Destructive | `#b42318` / `--destructive`, surface `#fdecec` | Blocking invalid state and destructive cart removal only |
| Warning | `#8a5a16`, surface `#fff4d6` | Pending payment, review, stale/changed totals, unsupported recovery |
| Success | `#2f6b4f`, surface `#e9f4ed` | Confirmed save, confirmed payment, completed copy/restore |
| Text | `#3b332d` / `--foreground`, `#786b61` / `--muted-foreground` | Primary and supporting copy |
| Border | `#ded2c2` / `--border` | Surface, input, and divider boundaries |

Accent is reserved for: the one primary customer action in a region, visible
focus, selected valid address/option state, explicit navigation/action links,
and copy/download actions. It is not a payment status color and is not applied
to every icon, card, heading, or secondary action.

Normal text must meet WCAG AA `4.5:1`; large text and meaningful non-text UI
must meet `3:1` against the rendered surface. Disabled text remains readable
and always has adjacent explanatory copy.

---

## Journey and Responsive Hierarchy

### Product detail and cart

- Keep the current add-to-cart agreement gate and authoritative cart hydration.
- The desktop and mobile sticky Add to Cart actions share one state predicate and
  one complete blocked reason. The mobile reason may wrap to multiple lines; it
  must not truncate the product title, price, or reason into ambiguity.
- A sticky action that is visually hidden is conditionally unmounted or made
  inert and unfocusable. `aria-hidden` alone is insufficient.
- Add success remains durable inline feedback with `View cart` and a subordinate
  continue-shopping action; a toast is not the only confirmation.
- Cart checkout controls expose their complete blocking reason before the
  disabled control. Name the affected item count or item names when useful.
- Cart mutation loading locks only the affected line; cart requote loading locks
  quote-dependent actions and keeps the last confirmed product intent visible.
- Empty cart uses the existing product-browse recovery. Terminal order recovery
  restores to this same cart surface rather than deep-linking directly to a new
  checkout.

### Checkout desktop (`lg` and above)

- Preserve the current two-column layout: editable information column plus a
  `380–400px` sticky order summary at `top: 96px`.
- Contact precedes destination. Destination renders only for physical/mixed
  carts. Digital-only checkout never asks for shipping address.
- The summary keeps lines, discount, shipping, total, destination, derived
  payment method, policy links, one submit action, and its complete blocker.
- Sticky regions stop before the footer and never cover a focused field or
  validation text at 200% zoom.

### Checkout mobile (below `lg`)

The DOM/reading order is:

1. Page title and short checkout context.
2. A bounded, collapsible `Order summary` disclosure near the top.
3. Contact details.
4. Destination and address, when required.
5. Quote/submit feedback.
6. Safe-area-aware total and primary action dock.

- The summary disclosure trigger is at least 48px, shows current total, uses
  `aria-expanded` and `aria-controls`, and announces `Show order summary` /
  `Hide order summary` in the active locale.
- Expanding reveals the same commercial facts as desktop without creating a
  second mutable source. Collapsing does not reset discount, destination, or
  validation state.
- The bottom dock displays the complete blocking reason above the button. The
  reason may expand the dock; it never uses `truncate` or an ellipsis.
- Desktop-only submit controls and mobile-only sticky controls are not keyboard
  reachable outside their active breakpoint. Prefer conditional rendering;
  otherwise use `inert`, `hidden`, and disabled semantics together.
- At `375px` and 200% zoom there is no horizontal scroll. Button labels may wrap
  to two lines and grow vertically.

### Order and payment page

- Desktop preserves the main column plus `360–380px` sticky order rail. Mobile
  is one column with state/next action before totals and fulfillment detail.
- State-specific content replaces generic repeated panels. The page has one H1,
  one dominant state heading, one next action, and one deadline/countdown region
  at most.
- Do not repeat reservation countdowns in both the state panel and summary rail.
  Do not repeat the same “downloads/shipping wait for payment” message in the
  state panel, VietQR card, fulfillment track, and download panel.

---

## Vietnamese Address Contract

### Field model and order

For country `VN`, render the current two-level administration model in this
order:

1. Recipient name — required.
2. Vietnamese phone number — required.
3. Province/City — required searchable controlled choice.
4. Ward/Commune/Special zone — required searchable controlled choice, scoped to
   the selected province/city.
5. Detailed street address — required free text for house number, street,
   hamlet/building details.
6. District — optional legacy carrier detail only, visually labelled optional
   and never used as authoritative validation or quote input.

Labels:

| Field | Vietnamese | English |
|-------|------------|---------|
| Province/city | `Tỉnh/Thành phố` | `Province/City` |
| Ward level | `Phường/Xã/Đặc khu` | `Ward/Commune/Special zone` |
| Street detail | `Số nhà, tên đường và địa chỉ chi tiết` | `House number, street, and address details` |
| Legacy district | `Quận/Huyện (không bắt buộc)` | `District (optional)` |

- Options come from a versioned repository-owned snapshot of official data.
  The UI never calls a third-party administrative-address API at runtime.
- Snapshot version is testable metadata, not customer-facing technical copy.
- Changing province/city clears a no-longer-valid ward selection and announces
  that the ward must be selected again. It does not clear recipient, phone, or
  street details.
- The persisted immutable address snapshot retains the human-readable province
  and ward values required for historical orders. A legacy district value may
  be retained, but cannot become required or authoritative.

### Country and international subdivisions

- Country uses the existing localized label plus code and normalized
  `searchText`, exposed through an accessible searchable combobox. Searching is
  case- and diacritic-tolerant where the current normalizer supports it.
- No flag-only options. Every result has localized name plus ISO code.
- United States state/territory choices show localized readable name followed
  by code, for example `California (CA)`, not code-only rows. The server still
  receives the normalized two-letter code.
- Existing international destination, postal, and US final-submit rules remain
  intact.

### Vietnamese phone

- Accept common `0…` and `+84…` input forms, spaces, and separators useful while
  typing. Visible helper copy gives one example in the active locale.
- Normalize to the canonical server persistence form only after validation;
  do not rewrite a partially typed value on each keystroke.
- Validate again on the server. An invalid phone is a field error and cannot be
  treated as a generic address failure.

### Draft persistence

- Key and schema are isolated in a dedicated reviewed module, for example
  `checkout.editableDraft.v1` with `{version, savedAt, expiresAt, email,
  shippingAddress}`.
- TTL is **12 hours**, still tab-scoped because storage is `sessionStorage`.
- Read only the current schema version. Ignore and remove malformed, expired,
  oversized, or unknown-version data without breaking checkout.
- Persist trimmed editable email/address only after the customer has interacted
  with checkout. Do not persist selected payment method, quote hashes, totals,
  discount validity, save-address consent, order number, guest access material,
  incident detail, or any provider value.
- A server-provided signed-in email/address wins on first render only when the
  draft has no newer valid user edit. Restoration never causes an automatic
  commercial requote before the existing destination lifecycle is ready.
- Clear the draft after successful order creation. Do not clear it on validation,
  network, stale-quote, or server failure.

### Save-address opt-in

- Signed-in physical/mixed checkout shows a labelled Checkbox immediately after
  the validated address: `Lưu địa chỉ này vào tài khoản` /
  `Save this address to my account`.
- It is unchecked on every fresh checkout and is not restored from draft
  storage. Guest checkout never renders it.
- Checking only records intent. Saving occurs only after server-side address
  validation. Unchecked means no save request.
- Address-save failure is non-blocking for commerce and never turns a
  successfully created order into a checkout failure. If it can be shown before
  navigation, use a localized inline warning; never expose RPC/database text.
- No default-address promotion is implied. Existing account address rules remain
  authoritative.

---

## Form Validation and Submission

### Error timing

- Track `touched` per field, not one form-wide boolean. A field reveals its own
  error after blur; untouched unrelated fields remain neutral.
- On submit, reveal all blocking errors, focus and scroll the first invalid field
  into view, and keep the remaining errors associated with their fields.
- Every field has a persistent `<label>`, stable error ID,
  `aria-invalid`, and `aria-describedby`/`aria-errormessage` linkage.
- Field errors sit directly below the field in 14px text. Cross-field quote and
  server errors use one persistent `Alert` adjacent to the affected section.
- Do not announce every field error assertively at once. The focused field and
  one submit summary provide the screen-reader recovery path.

### Disabled action

- A disabled submit/add/cart action always has one complete visible reason linked
  with `aria-describedby`. A grey button alone is not a valid state.
- Reasons use customer language and specify the corrective action, for example
  `Complete the delivery address` or `Review 1 unavailable item`.
- Quote recalculation preserves the previous confirmed total visually, labels it
  `Updating shipping…`, and blocks submission until current evidence is ready.

### Order creation

- On activation, lock the editable form with real disabled/read-only semantics,
  set `aria-busy="true"` on the checkout form region, and keep every entered
  value visible. Do not replace the form with a spinner or clear it.
- The primary action retains width and uses a two-stage truthful label when
  observable: `Checking the total…` then `Creating your order…` (localized).
- Prevent duplicate submission. A lost/uncertain response never invites an
  immediate second submit.
- Successful order creation clears the editable draft and existing idempotency
  record at the established safe point, updates the cart only for final ordered
  quantities, then routes to the authorized order page.
- Stale price, stock, or shipping returns to the relevant summary/destination
  region, keeps all safe inputs, focuses the error heading or field, and requires
  review of the authoritative update.
- Network failure that proves no order was created may offer `Try again`.
  Unknown outcome must say not to submit again and offer the signed-in order list
  or localized guest-order recovery path as appropriate.

### Incident reference and support

- Render a safe incident ID as text plus a labelled 44px copy button. Copy
  success is announced politely and does not rely on a toast.
- When at least one support channel is configured, errors that need human help
  include `Contact support` / `Liên hệ hỗ trợ` to the localized contact route.
- Never place raw error payloads, tokens, email, address, payment evidence, or
  incident internals into the URL.

---

## Contact Surface

Add one public localized route backed by the existing routing system:

- Vietnamese: `/vi/lien-he`
- English: `/en/contact`

The page uses a narrow `max-width: 720px` single column:

1. H1 `Liên hệ hỗ trợ` / `Contact support`.
2. One sentence asking the customer to include their order number but never a
   password, bank credential, or access link.
3. Configured contact channels as a semantic list.
4. Safe navigation back to the store or guest-order recovery.

Central support configuration exposes only sanitized public presentation data.
Email and Zalo each render only when configured:

- Email action: `Gửi email` / `Send email`, with the public address visible.
- Zalo action: `Nhắn qua Zalo` / `Message on Zalo`, with a clear external-link
  accessible name.
- No placeholder email, invented phone number, empty disabled channel, or
  hard-coded business identity.
- When no channel is configured, the contact page may show
  `Kênh hỗ trợ hiện chưa khả dụng` / `Support channels are not available right
  now`, but checkout/order error surfaces do not link to this dead end.
- Order access-denied states link to localized guest recovery
  (`/vi/don-hang-khach` or `/en/guest-order`) as the primary recovery action;
  support remains secondary when configured.

---

## Payment Information Hierarchy by State

Each row below defines the visible order. Only the stated primary action receives
accent/primary emphasis.

| State | Required hierarchy | Primary action | Deadline / polling |
|-------|--------------------|----------------|--------------------|
| Awaiting PayPal | Status heading → exact USD total → PayPal context/control → one short confirmation warning → order summary | Official PayPal control | One exact reservation deadline; no duplicate countdown |
| Awaiting VietQR | Status heading → numbered transfer steps → exact amount/reference/account/manual fallback → one confirmation note → order summary | Transfer action in the numbered flow; before declaration, QR/manual transfer is the task | One exact deadline in the instruction flow; VietQR recheck uses the slower existing timing |
| Verifying PayPal | `Verifying payment` → “do not pay again” → last checked → order summary | `Check payment status` | Short visible-tab polling window; announce once when automatic checks stop |
| Verifying VietQR | `Checking your bank transfer` → seller verification explanation → last checked → order summary | `Check payment status` | No rapid PayPal cadence; show deadline only if the order is still genuinely payable/pending |
| Review required | Calm review heading → what remains safe → order number → configured support | `Contact support` only when configured; otherwise no primary mutation | No reservation countdown unless server still reports a genuine pending deadline |
| Paid | Celebratory success header → confirmed total/time → masked-email acknowledgement → digital/physical next step → eligible download/tracking content | State-relevant action such as available download; otherwise `View my orders` for signed-in customers | Never render reservation deadline or countdown |
| Failed | Status-specific explanation → items no longer held/current facts must be recalculated → recovery | `Restore items to cart` | No countdown, no provider control |
| Cancelled | Cancellation explanation → items no longer held → recovery | `Restore items to cart` | No same-order PayPal button |
| Rejected | Bank transfer not accepted in customer language → items no longer held → recovery/support | `Restore items to cart` | No VietQR controls or declaration |
| Expired | Expiry explanation → items no longer held → recovery | `Restore items to cart` | Show past expiry as historical detail at most, never a live countdown |
| Partially refunded | Read-only amount/status → fulfillment/tracking facts still applicable → support if configured | No new payment action | No countdown |
| Refunded | Read-only refund confirmation → order history/support | No new payment action | No countdown |

### Recovery behavior

- For failed, cancelled, rejected, or expired, cart restoration is the one primary
  action when an order snapshot can be recovered.
- While restoring: button remains visible, disabled, `aria-busy`, and says
  `Restoring items…` / `Đang khôi phục sản phẩm…`.
- Successful restore routes to the localized cart and lets the authoritative
  cart quote show price, availability, or quantity changes.
- If restoration is unavailable, replace the dead restore control with
  `Browse products` / `Xem sản phẩm`; do not leave only an alert.
- The generic `Start a new checkout` link is removed when it competes with
  restore-to-cart. A fresh checkout begins only after cart review.

### Recheck and time behavior

- Cooldown state is driven by a timer that wakes at the actual `cooldownUntil`;
  the button must re-enable without requiring an unrelated render.
- Format last-checked time and exact deadlines with the active locale and the
  store’s explicit timezone policy. Do not call an unscoped browser-default
  formatter.
- Poll only while the tab is visible and while the current state is eligible.
  Stop at the real poll-window deadline, clear timers on unmount/state change,
  and announce once: `Automatic checks have stopped. Check again when you are
  ready.` / `Đã dừng kiểm tra tự động. Bạn có thể kiểm tra lại khi cần.`
- Do not announce every poll or countdown tick. Announce material state change,
  the 15-minute threshold when relevant, expiry, and polling termination.

---

## VietQR Contract

Present a clear numbered sequence:

1. **Scan or save the QR code.** QR remains `220px` mobile and `240px` desktop,
   with descriptive alt text. Provide a labelled `Download QR code` /
   `Tải mã QR` action with a safe filename containing the public order number,
   not account credentials or tokens.
2. **Transfer the exact amount and reference.** Amount, bank, account name,
   account number, and transfer reference are always readable as manual fallback
   details, even if the QR image loads. Amount/reference/account copy actions are
   at least 44px and show copied/manual-selection failure states inline.
3. **Wait for seller confirmation.** A transfer declaration may record customer
   intent but its copy must say it does not confirm payment. It cannot unlock
   downloads, shipping, or paid styling.

Additional rules:

- The exact amount is the strongest text within the instruction card.
- QR load failure retains the manual details and a retry/download-safe path; it
  never blocks manual transfer.
- Do not show receipt-image upload, drag-and-drop, attachment retention, or an
  “I paid” control that changes paid state.
- Pending VietQR content contains the confirmation condition once, not repeated
  in a second fulfillment-lock alert and multiple downstream locked panels.
- When the server reports paid, remove the QR instructions and declaration/recheck
  actions immediately; render the paid success hierarchy.

---

## Paid Success and Fulfillment Presentation

- Begin with a success surface and `CircleCheck`, H1/state heading
  `Thanh toán đã được xác nhận` / `Payment confirmed`, and the confirmed total.
- Show `Chúng tôi đã gửi thông tin đơn hàng tới {maskedEmail}` /
  `We sent the order details to {maskedEmail}`. Never render an unmasked address.
- Mixed order next steps are separated in plain customer language:
  `Tải mẫu PDF` / `Pattern downloads` and
  `Theo dõi hàng giao` / `Shipping updates`.
- Render download actions only through the existing entitlement-authorized
  surface and tracking only through the authorized order projection.
- Do not say “entitlement,” “gate open,” “fulfillment eligible,” or imply that a
  parcel has shipped before its actual physical status.
- No confetti, autoplay motion, or decorative celebration that competes with the
  receipt facts. A success icon/surface and concise warm copy are sufficient.

---

## Copywriting Contract

All new or migrated customer copy uses bounded `next-intl` namespaces with key
parity in `en.json` and `vi.json`, for example `cart`, `checkout.address`,
`checkout.summary`, `checkout.submit`, `orders.status`, `payments.paypal`,
`payments.vietqr`, and `support.contact`. Do not expand one unbounded namespace
or continue inline component copy for changed Phase 10 strings.

Tone is warm, calm, direct, and precise. Payment/error copy is never playful.

Customer-facing forbidden terms and replacements:

| Avoid | Use instead |
|-------|-------------|
| quote / quote hash | current total / updated total |
| market | shopping region, or omit when destination explains it |
| payment gate / gate open | payment confirmed |
| entitlement | download access |
| fulfillment lock / eligible | downloads and shipping start after payment is confirmed |
| provider event / webhook / reconciliation | we are checking the payment |
| immutable snapshot / reservation record | order details / items held until… |

### Required bilingual copy

| Element | Vietnamese | English |
|---------|------------|---------|
| Add to cart blocked | `Chọn một tùy chọn còn hàng để thêm vào giỏ.` | `Choose an in-stock option to add to cart.` |
| Cart blocked | `Kiểm tra {count} sản phẩm cần xử lý trước khi thanh toán.` | `Review {count} items before checkout.` |
| Mobile summary closed | `Xem tóm tắt đơn hàng` | `Show order summary` |
| Mobile summary open | `Ẩn tóm tắt đơn hàng` | `Hide order summary` |
| Save address | `Lưu địa chỉ này vào tài khoản` | `Save this address to my account` |
| Submit PayPal | `Tạo đơn và tiếp tục tới PayPal` | `Create order and continue to PayPal` |
| Submit VietQR | `Tạo đơn và xem hướng dẫn VietQR` | `Create order and view VietQR instructions` |
| Submit preflight | `Đang kiểm tra lại tổng tiền…` | `Checking the total…` |
| Submit order | `Đang tạo đơn hàng…` | `Creating your order…` |
| Unknown outcome | `Chưa thể xác nhận đơn đã được tạo. Đừng gửi lại ngay; hãy kiểm tra đơn hàng trước.` | `We could not confirm whether the order was created. Do not submit again yet; check your orders first.` |
| Incident ID | `Mã sự cố` | `Incident ID` |
| Copy incident | `Sao chép mã sự cố` | `Copy incident ID` |
| Support CTA | `Liên hệ hỗ trợ` | `Contact support` |
| Access recovery | `Mở lại đơn hàng khách` | `Recover a guest order` |
| Restore cart | `Khôi phục sản phẩm vào giỏ` | `Restore items to cart` |
| Restore unavailable | `Không thể khôi phục các sản phẩm này. Hãy xem sản phẩm hiện có.` | `These items cannot be restored. Browse currently available products.` |
| Browse fallback | `Xem sản phẩm` | `Browse products` |
| Paid heading | `Thanh toán đã được xác nhận` | `Payment confirmed` |
| Paid email | `Chúng tôi đã gửi thông tin đơn hàng tới {email}.` | `We sent the order details to {email}.` |
| PayPal uncertainty | `Chưa thể xác nhận kết quả với PayPal. Đừng thanh toán lại; hãy kiểm tra trạng thái đơn.` | `We could not confirm the PayPal result. Do not pay again; check the order status.` |
| VietQR download | `Tải mã QR` | `Download QR code` |
| VietQR declaration note | `Thông báo này không xác nhận thanh toán. Người bán vẫn cần kiểm tra chuyển khoản.` | `This notice does not confirm payment. The seller still needs to verify the transfer.` |
| Polling stopped | `Đã dừng kiểm tra tự động. Bạn có thể kiểm tra lại khi cần.` | `Automatic checks have stopped. Check again when you are ready.` |

### Destructive actions

Phase 10 adds no destructive confirmation flow. Existing cart-line removal keeps
its inline Undo contract. Clearing an expired or successful local draft is a
safe automatic cleanup and does not require a dialog. No payment, provider,
inventory, address-book deletion, refund, or receipt action is introduced.

---

## Component Inventory

| Need | Component contract |
|------|--------------------|
| Primary/secondary actions | Existing `Button`; 44px minimum, stable pending width, wrapped label |
| Inline status/error | Existing `Alert`; heading/body/recovery, persistent for commerce blockers |
| Checkout/order sections | Existing `Card`, `Separator`; avoid nested card clusters |
| Save-address opt-in | Existing `Checkbox` plus full-width clickable visible label |
| Country/province/ward search | Existing `Popover`, `Input`, local accessible listbox/combobox composition; no third-party registry |
| US region | Existing `Select` upgraded to localized name + code; normalized code submitted |
| Mobile order summary | Local controlled disclosure using semantic button + `aria-expanded`/`aria-controls`; no new dependency required |
| Material destination change | Existing `QuoteDiffDialog`; trapped focus and explicit accept/review paths |
| Initial loading | Existing `Skeleton` matching final geometry; status text on parent region |
| Payment state | Existing `PaymentStatePanel` simplified into state-specific hierarchy |
| Status recheck | Existing `PaymentStatusRecheck` with real cooldown/poll deadline timers |
| VietQR | Existing `VietQrInstructions` reorganized into numbered steps with download/manual fallback |
| Recovery | Existing `OrderRecoveryBanner` promoted to the terminal-state primary action |
| Copy action | Existing `Button` + Lucide `Copy`; labelled, polite result, manual-selection fallback |
| Contact channels | Semantic list + existing `Card`/`Button`/`Link`; only configured channels |

Navigation uses links; mutations use buttons. Icon-only controls require a
localized accessible name and remain at least 44px even when the glyph is 16px.

---

## Accessibility Contract

- Target WCAG 2.2 AA. Preserve the existing 2px accent focus outline and 2px
  offset on every control.
- Keyboard users can complete product option selection, add to cart, cart edits,
  mobile summary disclosure, all address choices, quote review, checkout submit,
  payment/recheck, VietQR copy/download, recovery, and contact navigation.
- DOM focus order matches the visible order at each active breakpoint. Hidden
  sticky desktop/mobile duplicates are not in the tab order or accessibility
  tree.
- Comboboxes expose accessible name, expanded state, active option, selection,
  result count/no-result text, Escape close, arrow navigation, and focus return.
- Dialog and popover primitives trap/manage focus according to their role and
  return focus to the invoking control. `Review destination` returns to the
  first field responsible for the change.
- On submit failure, focus the first blocking field. If no field owns the error,
  focus the persistent alert heading (`tabIndex={-1}`).
- One shared polite region announces quote success, payment state change, copy,
  restore, and polling termination. Blocking newly introduced errors use
  `role="alert"`; repeated polling/retry failures do not spam announcements.
- Loading regions use `aria-busy`; skeletons and decorative icons use
  `aria-hidden`. Spinner/text remain together.
- QR has descriptive alt text, but all QR information is also available as text.
- Status never relies on color. Invalid fields have text; selected options have
  checked semantics; disabled controls have linked reasons.
- At 200% zoom and at `375px`, content reflows without horizontal scroll, clipped
  CTA text, covered errors, or overlapping sticky regions.
- Do not autofocus the first input on mobile. Programmatic focus occurs only
  after a user action or route/error recovery.

---

## Loading, Error, Empty, and Success States

| Surface | Loading/submitting | Error/empty | Success/recovery |
|---------|--------------------|-------------|------------------|
| Add to Cart | Stable 48px action, `Adding…`, duplicate actions disabled | Full reason adjacent; quote failure keeps selection | Inline added confirmation + cart link |
| Cart | Preserve intent lines, mask unconfirmed money, one `Updating…` status | Empty → catalog; requote failure → retry; blocked lines stay visible | One grouped change summary |
| Checkout draft | Restore only after safe parse; no full-page skeleton | Invalid/expired draft is discarded silently | Draft remains until successful order creation |
| Address quote | Reserve 56px, keep old confirmed total labelled updating | Unsupported differs from network/server; preserve inputs | Announce confirmed shipping once |
| Submit | Lock form, preserve values, `aria-busy`, stable two-stage CTA | Field/stale/network/unknown outcomes have distinct recovery | Clear draft and route to authorized order |
| Contact | Stable page shell | No configured channel → neutral explanation + safe navigation | Configured channels rendered as 44px actions |
| Payment | Geometry-stable state header and relevant action | No raw provider/server error; support only if configured | Render only server-projected state |
| VietQR | Reserved QR square + loading text | Manual details remain; copy/download failure has fallback | Copied/declaration feedback is inline and truthful |
| Recovery | Stable restoring button | Snapshot unavailable → catalog CTA | Restore then route to authoritative cart |
| Paid | Success facts first | Missing downstream detail does not downgrade payment | Masked email + state-relevant next step |

---

## Motion and Reduced Motion

- Use current tokens: approximately `210ms` enter and `150ms` exit/color
  feedback. No new transition exceeds `300ms`.
- Animate opacity/transform only. Never animate amount counting, layout height of
  error text, payment progress, or reservation time.
- Collapsible summary may use a short opacity transition; content is immediately
  available with `prefers-reduced-motion`.
- No bounce, spring, confetti, parallax, pulsing full cards, or infinite status
  animation. A spinner may repeat only while a request is active and must have
  text.
- Reduced motion removes nonessential transforms/pulses and uses immediate or
  at most 100ms opacity feedback. Polling and state reconciliation cause no
  visual motion or layout jump.

---

## Testable Responsive and Interaction Matrix

Browser verification must use semantic roles/names and include representative
Vietnamese and English journeys.

| Viewport | Required assertions |
|----------|---------------------|
| `375×812` | No horizontal overflow; mobile summary near top; complete wrapping blocker; 44px targets; safe-area dock does not cover errors; Vietnamese address order is usable |
| `390×844` | Country/province/ward combobox keyboard/touch behavior; sticky duplicates are not tabbable; VietQR QR/manual/copy/download fit |
| `768×1024` | Single-column checkout remains readable; disclosure and form focus order remain logical; no desktop rail collision |
| `1024×768` | Desktop checkout/order rails are sticky without covering footer/errors; mobile dock is absent from tab order |
| `1440×900` | Stable max-width hierarchy, one primary action, full state copy, no stretched long-form text |

Required automated assertions:

1. Product and cart disabled actions expose full linked reasons on desktop and
   mobile; hidden sticky actions cannot receive keyboard focus.
2. VN checkout requires Province/City and Ward/Commune/Special zone, does not
   require District, accepts and normalizes `0…`/`+84…`, and does not call an
   address API at runtime.
3. Country search uses normalized localized text; US results show localized name
   plus code and submit the code.
4. Blur affects only the blurred field. Submit focuses the first blocking field
   and reveals remaining field errors without marking untouched fields early.
5. A valid draft restores within 12 hours in the same tab; malformed/expired
   data is removed; successful order creation clears it; sensitive/authoritative
   values never enter the draft.
6. Save-address appears only when signed in, begins unchecked, is not restored,
   and produces no save call when unchecked.
7. Mobile order summary expands/collapses without changing total, discount,
   address, quote, or submit state. Complete blocker text wraps.
8. Order creation locks editable fields, retains entered values, sets
   `aria-busy`, prevents duplicate submit, and distinguishes confirmed failure
   from unknown outcome.
9. Incident copy and configured support navigation work by keyboard; absent
   email/Zalo channels render no placeholders or contextual dead link.
10. Access denied links to localized guest recovery without revealing whether
    another order exists.
11. Every payment status renders the hierarchy/action in this contract. Paid
    renders no deadline; pending renders exactly one; terminal states render no
    provider retry.
12. Recheck cooldown re-enables at its actual deadline, uses locale-formatted
    time, stops at the poll-window deadline, and announces termination once.
13. Terminal recovery restores to cart as primary; unavailable restore provides
    catalog navigation; same-order retry remains absent.
14. VietQR has three numbered steps, QR download, persistent manual details,
    accessible copy fallbacks, and no receipt upload/paid mutation.
15. Paid success starts with confirmation, masked email, and relevant next step;
    verified server state remains the only trigger.
16. Existing security tests continue to prove the exact provider pairs,
    authoritative submit reconstruction, idempotency, immutable snapshots,
    inventory outcomes, and private entitlement boundary. The sessionStorage
    test is narrowed to allow only the reviewed draft/idempotency modules.

---

## Seven-Plan Contract Slices

Planning must produce exactly seven executable plans. The UI ownership and
acceptance boundaries are:

| Plan slice | UI contract owned |
|------------|-------------------|
| 1. Cart/PDP | Add-to-cart and cart blocked reasons, 44px targets, sticky keyboard removal, inline feedback, cart recovery entry |
| 2. Vietnamese address and draft | Official versioned two-level data, VN phone, searchable country/US labels, 12-hour session draft, unchecked save-address intent |
| 3. Checkout/mobile/copy | Mobile summary disclosure, desktop rail continuity, copy migration to bounded `next-intl`, wrapping dock and responsive hierarchy |
| 4. Submit/error/support | Per-field validation timing, first-error focus, locked/`aria-busy` submit, honest unknown outcome, incident copy, centralized contact route/config |
| 5. Payment/recovery | State-specific hierarchy, single next action, deadlines/recheck timing, access recovery, restore-to-cart terminal behavior |
| 6. VietQR/success | Numbered VietQR, QR download/manual fallback, truthful declaration, paid confirmation, masked email and next steps |
| 7. Regression/UAT | Desktop/mobile/a11y/state matrix, bilingual parity, authority/security regressions, final UAT without Phase 09 deployment SEO work |

Plan file ownership may be adjusted to avoid overlap, but no slice may add a
provider, same-order terminal retry, carrier ETA/rates, receipt upload, analytics,
or deployment SEO scope.

---

## Explicit Anti-Patterns

- No new checkout wizard or route split.
- No client-selected payment method or mismatched market/currency/provider pair.
- No paid/success styling from PayPal return, VietQR declaration, URL, or timer.
- No same-order retry after terminal failed/cancelled/rejected/expired state.
- No required district in Vietnamese addresses and no runtime third-party
  administrative-address dependency.
- No code-only US state list and no flag-only country selector.
- No form-wide touched boolean that turns all fields red on one blur.
- No draft in `localStorage`; no quote, discount validity, guest proof, token,
  incident payload, bank evidence, or payment state in the editable draft.
- No pre-checked or silently persisted save-address consent.
- No disabled CTA without a complete visible reason.
- No `truncate` on blocker, destination, status, incident, or CTA text.
- No hidden sticky control left keyboard-focusable.
- No duplicate deadline/countdown, duplicate fulfillment warning, or multiple
  competing payment actions.
- No polling that runs indefinitely, while hidden, or after state transition.
- No generic contact link when all support channels are absent.
- No placeholder support email/Zalo, secret config, or sensitive URL parameters.
- No receipt upload or `I paid` action that changes payment state.
- No toast-only commerce error/success.
- No raw enum, RPC/database/provider error, webhook detail, quote hash,
  idempotency key, internal UUID, unmasked email, or private access material.
- No new gradients, glassmorphism, oversized radius, emoji icons, or third-party
  registry.

---

## Registry Safety

| Registry | Blocks used | Safety gate |
|----------|-------------|-------------|
| `@shadcn` official | Existing project-owned primitives listed in Design System; no new block required | `npx shadcn info` passed — official `@shadcn`, `new-york`, Radix, Lucide — 2026-08-04 |
| Third-party | None | No third-party registry declared; no vetting required — 2026-08-04 |

If execution proposes a third-party block, stop and revise this contract only
after the required `shadcn view` safety gate. This UI-SPEC does not authorize it.

---

## Source Traceability

| Source | Decisions used |
|--------|----------------|
| `10-CONTEXT.md` | D-01–D-24: exact seven-plan shape, current-code precedence, VN two-level address, draft/save consent, validation, mobile hierarchy, support, payment recovery, VietQR/success, locked authority |
| `REQUIREMENTS.md` | MKT-01/02/06, CART-01–05, SHIP-03/09–13, INV-02–05, ORD-01–03, PAY-01–08, ACC-03, OPS-04 |
| `09-15-SUMMARY.md` | Current green CI baseline and explicit deferral of Vercel geo/SEO UAT |
| Current cart/PDP source | Agreement gate, authoritative cart quote, sticky actions, inline feedback, disabled-state gaps |
| Current checkout source | One-page layout, destination lifecycle, pre-submit requote, idempotency, saved-address selector, mobile dock and current validation behavior |
| Current payment source/messages | Server-projected states, PayPal uncertainty, VietQR fallbacks, recovery snapshot, duplicate deadline/copy/internal-language gaps |
| Current security/E2E tests | Exact provider pairs, server reconstruction, sessionStorage restriction, real guest/account journeys, destination authority |
| `components.json`, shadcn info, `globals.css`, `layout.tsx` | New York/neutral/Radix/Lucide, semantic palette, 8px radius, focus ring, Nunito |
| Phase 03/04/08/09 UI-SPECs | Existing checkout/payment state patterns, responsive rail, quote lifecycle, accessibility and design continuity; current code wins on conflicts |

The `ui-ux-pro-max` bundled search script was unavailable at its packaged target,
so no parallel design system was generated. Applicable accessibility, form,
touch, responsive, motion, and state-feedback rules were reconciled directly
against the current code and existing tokens.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
