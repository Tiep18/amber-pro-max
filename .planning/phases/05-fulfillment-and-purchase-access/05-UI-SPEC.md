---
phase: 05
slug: fulfillment-and-purchase-access
status: draft
shadcn_initialized: true
preset: new-york
created: 2026-06-19
---

# Phase 05 - UI Design Contract

> Visual and interaction contract for Fulfillment and Purchase Access. This is
> the source of truth for customer downloads, pattern library, guest reopen and
> claim flows, admin digital access actions, physical fulfillment, tracking, and
> failed transactional email operations.

---

## Design Direction

Extend the approved Phase 04 visual language. Customer screens must feel calm,
trustworthy, and specific: a paid customer should immediately understand which
PDFs are ready, which physical items are still being prepared, and what action
is safe to take next. Admin screens may be denser, but every privileged action
must show its consequence before submit.

This phase must never visually merge payment, digital fulfillment, and physical
fulfillment into one generic state. Mixed orders require two parallel tracks:
digital access and physical shipment.

### Principles

1. **Access follows paid state:** No download, resend, or shipping action appears
   as available until the server says the paid gate is open.
2. **Split fulfillment is visible:** Digital and physical progress use separate
   rows/cards on every customer and admin order detail.
3. **Secure by wording:** Customer copy says "new download link" or "request
   access" rather than exposing tokens, signed URLs, bucket names, or file paths.
4. **One primary action per region:** Pattern library cards can have one primary
   download action; admin forms can have one primary mutation and secondary
   review/navigation actions.
5. **Bilingual parity:** Customer-facing copy exists in Vietnamese and English.
   Admin operational copy can remain English to match existing admin shell.
6. **Audit before mutation:** Admin sees entitlement status, email attempt
   history, and current physical status before resend, revoke, reissue, or ship.
7. **No color-only status:** Status is always text plus icon or structured label.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn/ui initialized |
| Preset | `new-york`, Radix base, RSC enabled, CSS variables |
| Component library | Existing local shadcn/Radix primitives plus project components |
| Styling | Tailwind CSS 4 with semantic CSS variables in `src/app/globals.css` |
| Icon library | Lucide React only |
| Font | Existing storefront font stack; use Phase 04 convention `Be Vietnam Pro` if configured |
| Radius | 8px control, 12px card, 16px large surface |
| Current installed UI | `alert`, `button`, `card`, `separator`, `sheet`, `skeleton` |

Reuse existing `Alert`, `Button`, `Card`, `Separator`, `Sheet`, `Skeleton`,
`PaymentStatePanel`, admin order detail patterns, and `formatMoney`. New
components should be local compositions first. Additional official shadcn
components are allowed only when they solve a real control need listed in
Component Inventory.

Do not create a new design-system directory, brand palette, decorative gradient
theme, or third-party registry dependency in this phase.

---

## Spacing Scale

Declared values must remain multiples of 4.

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Icon-label gaps, metadata separators, compact badge inner gap |
| `sm` | 8px | Related field gaps, compact admin queue rows, inline action spacing |
| `md` | 16px | Default component gap, mobile card padding, form field gap |
| `lg` | 24px | Card padding, section spacing, admin form groups |
| `xl` | 32px | Desktop page column gap, major panel grouping |
| `2xl` | 48px | Major page sections and empty-state vertical spacing |
| `3xl` | 64px | Page-level spacing above/below large account sections |

Exceptions:

- Interactive target minimum is 44x44px.
- Text input, select, textarea, and action button height is at least 44px;
  use 48px for admin forms that carry tracking or email-resend evidence.
- Icon visual size may be 16px in badges and 20px in buttons/status headers,
  but icon-only controls still keep a 44px hit area and accessible name.
- Border width is 1px; focus ring is 2px with 2px offset.
- Sticky mobile action areas use `padding-bottom: max(16px, env(safe-area-inset-bottom))`.
- Admin tables switch to cards before requiring horizontal scroll.

---

## Typography

Use exactly four sizes and two weights in Phase 05 UI.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Label / Meta | 14px | 600 | 1.4 |
| Body / Control | 16px | 400 | 1.5 |
| Section Heading | 20px | 600 | 1.3 |
| Page Heading / Status | 28px | 600 | 1.2 |

Rules:

- Only weights 400 and 600 are allowed.
- Body text is 16px on mobile; no viewport-scaled font sizes.
- Amounts, order numbers, download expiry times, tracking numbers, attempt
  counts, and timestamps use `tabular-nums`.
- Tracking numbers, provider message IDs, and token-safe admin references use
  `break-all` or wrapping, never horizontal scroll.
- Customer headings, status labels, and CTA labels are never truncated.
- Vietnamese and English copy may wrap; containers must reserve enough width and
  height for translation expansion.

---

## Color

Use the existing semantic tokens from `src/app/globals.css`.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--background: #FFF9F2` | Page background and calm customer account surfaces |
| Secondary (30%) | `--surface: #FFFFFF`, `--surface-muted: #F5EDE3` | Cards, admin queue rows, status panels, side rails |
| Accent (10%) | `--accent: #A6472D`, hover `#843823` | Primary CTA, selected tab/filter, focus ring, inline action link |
| Text | `--foreground: #2E2926`, `--muted-foreground: #6F655E` | Primary and secondary text |
| Border | `--border: #DCCFC2` | Cards, inputs, dividers, table rows, timeline rail |
| Success | `--success: #2F6B4F`, `--success-surface: #E9F4ED` | Download ready, entitlement active, shipped/delivered confirmation |
| Warning | `--warning: #8A5A16`, `--warning-surface: #FFF4D6` | Email retry pending, physical in progress, expiring link |
| Destructive | `--destructive: #B42318`, `--destructive-surface: #FDECEC` | Revoked access, failed email, blocked/expired token, destructive actions |
| Admin shell | `--admin-nav: #292623` | Existing protected admin navigation boundary |

Accent reserved for:

- One primary CTA in a screen or panel.
- Selected account/admin tab or filter.
- Focus ring.
- Inline navigation/action links.
- Download button only when entitlement is active and authorized.

Accent is not a fulfillment status color. Digital and physical statuses use
semantic surfaces with text and icons. Destructive red is reserved for revoke,
blocked access, failed email, invalid token, expired link, and irreversible
admin decisions.

---

## Icon Contract

Use Lucide React only.

| State / action | Icon |
|----------------|------|
| Digital pattern / PDF | `FileText` |
| Download ready | `Download` or `CircleCheck` |
| Download expired | `TimerOff` |
| Access locked | `LockKeyhole` |
| Request fresh link | `RefreshCw` |
| Email queued/sent | `Mail` |
| Email failed | `MailWarning` or `CircleX` |
| Resend email | `Send` |
| Revoke access | `Ban` |
| Reissue access | `RotateCcw` |
| Physical fulfillment | `Package` |
| Packing | `PackageOpen` |
| Shipped | `Truck` |
| Delivered | `PackageCheck` |
| Tracking link | `ExternalLink` |
| Guest claim/account | `UserPlus` |
| Audit/history | `History` |

Icon-only controls require an accessible name and tooltip. Decorative icons use
`aria-hidden="true"`.

---

## Information Architecture and Routes

### Customer Routes

| Route | Contract |
|-------|----------|
| `/[locale]/orders/[orderNumber]` and `/[locale]/don-hang/[orderNumber]` | Extend existing authorized order detail with digital downloads and physical tracking sections. |
| `/[locale]/account/orders` and `/[locale]/tai-khoan/don-hang` | Signed-in order history; owner-only, localized, not available to guests. |
| `/[locale]/account/patterns` and `/[locale]/tai-khoan/mau-pdf` | Pattern library grouping repeated purchases by pattern while preserving order/entitlement detail. |
| `/[locale]/guest-order` and `/[locale]/don-hang-khach` | Guest enters email/order context to request a magic reopen link; generic response regardless of match. |
| `/[locale]/orders/[orderNumber]/claim` | Signed-in same-email order claim flow after email-token proof. |
| `/api/downloads` | Server-only entitlement-checked redirect; never linked as a raw storage URL in visible UI. |

If localized route helpers do not yet include the Vietnamese slugs above, the
planner may choose equivalent existing route names, but the UX contract stays
the same.

### Admin Routes

| Route | Contract |
|-------|----------|
| `/admin/orders` | Existing queue extended with fulfillment filters and failed email indicators. |
| `/admin/orders/[orderNumber]` | Order detail gains digital access actions, outbox/email attempts, physical status form, tracking, and audit. |
| `/admin/operations/emails` or `/admin/orders?queue=email-failures` | Compact failed transactional email queue; implementation may choose location, but it must be reachable from admin orders. |

Admin routes remain non-localized and English operational labels are acceptable.

---

## Customer Order Detail

### Layout

- Keep Phase 04 max width 1200px and desktop grid `minmax(0, 1fr) 380px`.
- Main column order: payment status, split fulfillment summary, digital
  downloads, physical tracking, immutable order lines.
- Side column order: order summary, shipping address if physical/mixed, support
  and access guidance.
- Mobile order: status, digital access, physical tracking, summary, lines, help.
- Do not hide digital access below physical tracking in mixed orders; paid PDF
  access is often the immediate customer goal.

### Split Fulfillment Summary

Show two rows/cards when the order contains both product types:

| Track | Customer text | Surface |
|-------|---------------|---------|
| Digital blocked | `PDF access is locked until payment is confirmed.` | warning |
| Digital ready | `PDF access is ready.` | success |
| Digital email queued | `Download email is queued. You can also request a fresh link here.` | warning |
| Digital revoked | `PDF access is no longer available for this order.` | destructive |
| Physical not required | `No physical shipment for this order.` | muted |
| Physical awaiting fulfillment | `Physical items are waiting to be packed.` | warning |
| Physical packing | `Physical items are being packed.` | warning |
| Physical shipped | `Physical items have shipped.` | success |
| Physical delivered | `Physical items were marked delivered.` | success |

Never say "order complete" while either digital or physical track still requires
work.

### Digital Download Section

Each digital entitlement row shows:

1. Pattern title snapshot.
2. Product type label `PDF pattern`.
3. Order number and purchase date.
4. Entitlement state: active, revoked, expired-link, or unavailable.
5. Link expiry when a token/link was just issued.
6. Primary action when active: `Download PDF`.
7. Secondary action: `Request fresh link` when the current link expired or email
   needs regeneration.

Download button behavior:

- Clicking `Download PDF` calls the app download route, which revalidates active
  entitlement before issuing a short-lived Storage signed URL.
- Button enters pending state with stable width and `aria-busy`.
- If authorization fails, show generic non-enumerating error; do not confirm PDF
  existence or order ownership.
- Do not render bucket name, object path, raw token, signed URL, or entitlement ID.
- Expired email links show `This download link expired. Request a fresh link.`

### Physical Tracking Section

For physical or mixed orders show:

- Current status using the locked flow: awaiting fulfillment, packing, shipped,
  delivered.
- Shipping address snapshot from Phase 04.
- Carrier and tracking number when present.
- Tracking URL only if safe and configured; label is `Track shipment`, opens in
  a new tab with accessible text.
- If shipped without tracking: `The seller marked this order shipped. Tracking
  is not available for this shipment.`
- Delivered status is read-only; no customer confirmation action in Phase 05.

### Guest Access and Claim

- Guest reopen entry screen asks for email and order number or explains that the
  store will send a secure access link if the details match.
- Success response is generic: `If we can verify the order, we will send a secure
  link to that email.`
- Magic token expiry copy: `This secure link expires in 24 hours.`
- Expired token page: `This secure link is expired or invalid. Request a new
  access link.`
- Claim flow requires the customer to sign in with the same order email and
  verify through email token. The CTA is `Claim order`.
- After claim success: `This order is now in your account. Future access is
  through your signed-in account.`
- Do not show whether another user's account owns an order.

---

## Pattern Library

### Layout

- Route belongs under account and requires signed-in customer ownership.
- Header: H1 `Pattern library`; short body explains that purchased patterns are
  available here after payment confirmation.
- Group repeated purchases by pattern. One pattern card can expand or link to
  show purchase/order history.
- Use a responsive grid: one column at 375px, two columns at 768px, three max at
  1024px+ only if text remains readable.

### Pattern Card

Each card shows:

- Product image if already available; otherwise stable placeholder using
  existing surface-muted styling.
- Pattern title.
- Latest purchase date.
- Available file language/format metadata if present.
- Entitlement count or order count only when useful: `Purchased 2 times`.
- Primary action `Download PDF`.
- Secondary text link `View purchase history`.

Empty state:

- Heading: `No patterns yet`
- Body: `Paid PDF patterns will appear here after payment is confirmed.`
- Action: `Browse PDF patterns`

Error state:

- `We could not load your pattern library. Refresh the page or try again later.`

---

## Admin Digital Access

### Order Detail Section

Add a `Digital access` section after payment/fulfillment state and before email
attempts.

For each entitlement show:

- Order line title snapshot.
- Customer email, masked in list views and full only on authorized detail.
- Entitlement status: active, revoked, reissued, pending email.
- Last download requested timestamp if available.
- Last email status.
- Audit summary of latest admin action.

Actions:

| Action | Variant | Confirmation |
|--------|---------|--------------|
| Resend download email | secondary | No destructive dialog; pending state plus audit note after success. |
| Reissue access | secondary | Confirm that a fresh entitlement/link will be created and audited. |
| Revoke access | destructive | Dialog required: `Revoke PDF access for this order line? The customer will not be able to download this pattern unless access is reissued.` |

Rules:

- Resend always creates a new email request and fresh token/link.
- Revoke and reissue require `requireAdmin` server authorization before render
  or mutation.
- Admin never edits raw token values.
- Show stale-state error if another admin changed entitlement before submit.

---

## Admin Physical Fulfillment

### Status Flow

Use the locked manual flow:

```text
awaiting_fulfillment -> packing -> shipped -> delivered
```

The UI must not allow skipping backward. It may allow moving directly from
`awaiting_fulfillment` to `shipped` for a small seller workflow, but the submit
copy must still show the current and next state.

### Form Contract

Fields:

- Status select with visible label.
- Carrier input, optional.
- Tracking number input, optional.
- Tracking URL input, optional and validated if present.
- Admin note textarea, optional, not customer-facing unless explicitly labeled.

When status becomes `shipped`:

- Carrier/tracking are encouraged with helper text, not required.
- Shipping update email is required and should show outbox state after submit.
- CTA: `Mark as shipped`.
- Success copy: `Shipment status updated and shipping email queued.`

When status becomes `delivered`:

- CTA: `Mark as delivered`.
- Delivered email is optional; show whether it will be sent.

Validation:

- Tracking URL must be `https://` if provided.
- Tracking number wraps and uses tabular/monospace-safe display, but no new font
  size or weight.
- Pending submit disables all fulfillment controls and preserves field geometry.

---

## Transactional Email Queue

### Admin Queue

Failed email queue must show:

| Column / field | Contract |
|----------------|----------|
| Order | Public order number link |
| Email type | Download link, shipping update, delivered notice, claim/reopen link |
| Recipient | Masked email in queue |
| Attempts | Count, tabular figures |
| Last error | Sanitized summary, no provider raw payload |
| Next retry | Timestamp or `Manual review required` |
| Action | `Retry send` or `Open order` |

Desktop can be table; mobile must become cards. No horizontal scroll.

Empty state:

- Heading: `No failed emails`
- Body: `Failed transactional emails will appear here after safe retry attempts.`

Error state:

- `Failed email queue could not be loaded. Refresh before retrying any send.`

### Email Status Surfaces

| State | Surface | Copy |
|-------|---------|------|
| queued | warning | `Email is queued.` |
| sending | warning | `Email is being sent.` |
| sent | success | `Email sent.` |
| retry_scheduled | warning | `Email failed and will retry at {time}.` |
| failed | destructive | `Email failed. Review the sanitized error before retrying.` |
| cancelled | muted | `Email request was cancelled.` |

Do not use toast as the only feedback for resend/retry. Use persistent inline
state in the queue/order detail.

---

## Component Inventory

| Component | Source | Contract |
|-----------|--------|----------|
| `Button` | existing | 44px min height, stable pending width, primary/secondary/ghost/destructive |
| `Alert` | existing | Blocking status, success/warning/destructive surfaces, icon + recovery |
| `Card` | existing | Order sections, pattern cards, admin panels |
| `Separator` | existing | Totals, form grouping, timeline grouping |
| `Skeleton` | existing | Same geometry as final content; no layout shift |
| `Badge` | official shadcn or local | Text + icon; never color-only |
| `Dialog` / `AlertDialog` | official shadcn allowed | Revoke/reissue confirmation and unsaved admin actions |
| `Input` / `Textarea` | official shadcn or local | Visible label, helper/error text, 44px+ height |
| `Select` | official shadcn or native | Fulfillment status and admin filters |
| `Table` | official shadcn or local | Admin desktop only; card fallback on mobile |
| `Tooltip` | official shadcn allowed | Icon-only admin metadata controls |
| `Tabs` | official shadcn allowed | Account orders vs pattern library if URL-synced |
| `DownloadPanel` | local | Entitlement rows, fresh-link request, pending/error/success states |
| `PatternLibraryCard` | local | Grouped pattern access with purchase history |
| `GuestReopenForm` | local | Email/order input and generic success |
| `OrderClaimPanel` | local | Same-email claim and token status |
| `FulfillmentTrackSummary` | local | Separate digital and physical progress |
| `PhysicalFulfillmentForm` | local | Status, carrier, tracking, note |
| `EmailOutboxQueue` | local | Failed queue and retry/resend actions |
| `EntitlementAuditList` | local | Admin-only access changes |

Navigation uses links. Mutations use buttons or form submit buttons. No
third-party UI blocks.

---

## Interaction States

| State | Contract |
|-------|----------|
| Loading | Skeleton after 300ms, final geometry reserved, `aria-busy` on region |
| Empty | Heading, one-sentence reason, one next action |
| Pending mutation | Disable duplicate submit, keep button width stable, show progress text |
| Success | Persistent inline confirmation with next step, `aria-live="polite"` |
| Validation error | Error under field, linked by `aria-describedby`; focus first invalid field after submit |
| Server error | Persistent alert with recovery path; no raw provider/RPC/storage error |
| Unauthorized | Generic non-enumerating page; no order/email/PDF existence leak |
| Expired token | Explain expired/invalid and offer request-new-link flow |
| Revoked access | Destructive surface with no download action; admin reissue only |
| Stale admin state | Refresh current order state before another mutation |
| Offline | Keep last server-rendered facts; label actions unavailable or retry later |
| Duplicate resend/retry | Neutral no-op copy; no duplicate success flash |

---

## Copywriting Contract

Customer tone: calm, specific, plain. Do not use playful craft metaphors in
payment, access, fulfillment, error, or audit copy.

| Element | English | Vietnamese ASCII |
|---------|---------|------------------|
| Primary download CTA | `Download PDF` | `Tai PDF` |
| Fresh link CTA | `Request fresh link` | `Yeu cau lien ket moi` |
| Pattern library CTA | `Browse PDF patterns` | `Xem mau PDF` |
| Guest reopen CTA | `Send secure link` | `Gui lien ket an toan` |
| Claim CTA | `Claim order` | `Nhan don hang vao tai khoan` |
| Shipping CTA | `Track shipment` | `Theo doi van chuyen` |
| Admin shipped CTA | `Mark as shipped` | Admin English only |
| Admin delivered CTA | `Mark as delivered` | Admin English only |
| Admin resend CTA | `Resend download email` | Admin English only |
| Admin retry CTA | `Retry send` | Admin English only |
| Empty pattern library heading | `No patterns yet` | `Chua co mau PDF` |
| Empty pattern library body | `Paid PDF patterns will appear here after payment is confirmed.` | `Mau PDF da mua se hien thi tai day sau khi thanh toan duoc xac nhan.` |
| Guest generic success | `If we can verify the order, we will send a secure link to that email.` | `Neu chung toi xac minh duoc don hang, lien ket an toan se duoc gui den email do.` |
| Download error | `We could not create a download link. Refresh this page or request a fresh link.` | `Chung toi chua tao duoc lien ket tai. Hay tai lai trang hoac yeu cau lien ket moi.` |
| Unauthorized | `This link is invalid, expired, or you do not have access.` | `Lien ket khong hop le, da het han hoac ban khong co quyen truy cap.` |
| Failed email empty | `No failed emails` | Admin English only |
| Failed email body | `Failed transactional emails will appear here after safe retry attempts.` | Admin English only |

Destructive confirmations:

| Action | Confirmation copy |
|--------|-------------------|
| Revoke PDF access | `Revoke PDF access for this order line? The customer will not be able to download this pattern unless access is reissued.` |
| Reissue PDF access | `Create a fresh access record and audit entry for this order line?` |
| Cancel failed email request, if implemented | `Cancel this email request? It will not be retried automatically.` |

Primary CTA for the phase: `Download PDF`.

---

## Accessibility

- WCAG 2.2 AA target.
- Normal text contrast at least 4.5:1; large text/icons at least 3:1.
- Focus ring is visible on all controls and links.
- Every icon-only button has accessible name and tooltip.
- All form fields have visible labels.
- Download, resend, retry, revoke, reissue, shipped, and delivered mutations are
  keyboard accessible.
- Dialogs trap focus, restore focus on close, and do not close while pending.
- `aria-live="polite"` announces copy success, email queued/sent, download link
  generated, and status changes.
- Do not announce polling/retry counters repeatedly.
- Customer order detail and pattern library keep logical heading order.
- Admin tables have a caption or section heading; mobile cards preserve the same
  reading order.
- Status is never color-only.
- 200% zoom must not hide download buttons, claim controls, tracking fields, or
  admin destructive confirmations.

---

## Motion and Reduced Motion

- Color, border, and opacity transitions: 150ms ease-out.
- Dialog enter: 200ms ease-out; exit: 150ms ease-in.
- Status replacement may crossfade up to 150ms.
- Do not animate money, tracking numbers, tokens, order numbers, or table row
  geometry.
- No confetti, celebratory bursts, parallax, gradient motion, or decorative
  ambient animation.
- `prefers-reduced-motion` disables skeleton pulse and removes transforms.

---

## Responsive Contract

| Viewport | Contract |
|----------|----------|
| 375px | Single column, 16px gutter, full-width primary actions, admin queues as cards |
| 768px | 24px gutter, two-column pattern cards allowed if labels fit, filters wrap |
| 1024px | Customer order detail two-column layout, sticky side rail, admin desktop table allowed |
| 1440px | Max width 1200px, 48px outer gutter, rail remains 360-380px |

Rules:

- No horizontal scroll.
- Customer primary action is full width below 768px.
- Admin table becomes card list before columns become cramped.
- Long order numbers, tracking numbers, email addresses, and provider IDs wrap.
- Sticky side rail never covers footer, form errors, or mobile safe area.
- Pattern cards keep stable image/aspect-ratio placeholders to prevent layout
  shift.

---

## Security-Sensitive UI Boundaries

- Never render raw guest token, download token, Storage signed URL, bucket name,
  object path, service-role result, provider payload, webhook header, or raw
  Resend response.
- Do not store authoritative fulfillment state, tokens, PDF paths, or admin
  evidence in `localStorage`.
- Do not render admin controls for non-admin users and then merely disable them.
  Server authorization must happen before privileged UI renders.
- Unauthorized customer states use generic copy and do not reveal order, email,
  or PDF existence.
- Download buttons call an app route that revalidates entitlement on every
  request.
- Guest order claim success revokes old guest access; UI must stop offering
  guest-link workflows for claimed orders.
- Admin failed-email errors are sanitized summaries only.
- Customer pages do not show internal entitlement IDs, outbox IDs, audit IDs, or
  provider message IDs.

---

## Registry Safety

| Registry | Blocks/components used | Safety Gate |
|----------|------------------------|-------------|
| `@shadcn` official | Existing: `alert`, `button`, `card`, `separator`, `sheet`, `skeleton`. Allowed additions: `badge`, `dialog`, `alert-dialog`, `input`, `textarea`, `select`, `table`, `tabs`, `tooltip`. | `npx shadcn info` confirmed official registry `https://ui.shadcn.com/r/styles/{style}/{name}.json`, preset `new-york`, Radix base, Lucide, Tailwind v4 on 2026-06-19. |
| Third-party registries | None | Not applicable; third-party blocks are not allowed in Phase 05 without a new safety gate. |

---

## Acceptance Checks

### Customer Access

- [ ] Paid digital order shows `Download PDF` only after active entitlement is
      server-authorized.
- [ ] Expired email link offers `Request fresh link` and does not expose Storage
      URL details.
- [ ] Guest reopen returns generic success regardless of match.
- [ ] Guest token expired/invalid state does not leak order existence.
- [ ] Claimed order appears in signed-in order history and pattern library.
- [ ] Old guest access path is no longer presented after claim.
- [ ] Pattern library groups repeated purchases by pattern while preserving
      purchase history access.

### Mixed Fulfillment

- [ ] Mixed order displays separate digital and physical tracks.
- [ ] Digital ready does not imply physical shipped or delivered.
- [ ] Physical awaiting, packing, shipped, and delivered states use the locked
      status flow.
- [ ] Shipped without tracking is allowed and clearly explained.
- [ ] Tracking link, when present, is accessible and safely labeled.

### Admin Operations

- [ ] Admin order detail shows entitlement status before resend/revoke/reissue.
- [ ] Resend creates fresh email request/link and persistent inline feedback.
- [ ] Revoke uses destructive confirmation and explains consequence.
- [ ] Physical fulfillment form validates optional tracking URL and preserves
      pending geometry.
- [ ] Shipped action queues required shipping update email.
- [ ] Failed email queue shows order, type, attempts, sanitized error, next
      retry, and controlled retry/open-order action.
- [ ] Stale admin actions refresh current state before retrying.

### UI Quality

- [ ] Only four font sizes and two font weights are used.
- [ ] Spacing follows 4/8px scale and 44px touch target minimum.
- [ ] Status uses icon + text, not color alone.
- [ ] Layout works at 375, 768, 1024, and 1440px without horizontal scroll.
- [ ] 200% zoom keeps download, claim, tracking, and admin controls usable.
- [ ] Reduced motion disables nonessential pulse/transform.
- [ ] No third-party registry or decorative visual system is introduced.

---

## Sources of Decisions

| Source | Decisions used |
|--------|----------------|
| `05-CONTEXT.md` | D-01 through D-17: entitlement granularity, grouped library, 24-hour links/tokens, guest reopen, claim, outbox, resend, physical status flow, mixed-order separation. |
| `05-RESEARCH.md` | Standard stack, route/component integration points, existing payment/admin components, outbox and secure download architecture. |
| `.planning/REQUIREMENTS.md` | DIG-02 through DIG-07, FUL-01 through FUL-03, ACC-02, ACC-05, OPS-01, OPS-02. |
| `04-UI-SPEC.md` | Approved tokens, typography scale, spacing, customer/admin layout patterns, security-sensitive UI boundaries. |
| `components.json` and `npx shadcn info` | shadcn `new-york`, Radix base, Tailwind v4, Lucide, official registry, installed component list. |
| Existing code | `globals.css`, `OrderPaymentPage`, `OrderDetail`, `OrderQueue`, and local UI primitives. |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
