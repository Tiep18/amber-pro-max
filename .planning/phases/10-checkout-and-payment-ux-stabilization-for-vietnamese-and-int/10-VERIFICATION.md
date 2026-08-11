---
phase: 10-checkout-and-payment-ux-stabilization-for-vietnamese-and-int
verified: 2026-08-11T10:08:36Z
status: human_needed
score: 35/35 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Draft checkout khi đổi danh tính trong cùng tab"
    expected: "Draft của tài khoản A hoặc guest không xuất hiện cho tài khoản B; draft hợp lệ không bị xóa chỉ vì notifier chạy khi danh tính thực tế chưa đổi."
    why_human: "Luồng auth/draft đã thay đổi sau UAT ngày 2026-08-11; cần xác nhận cảm nhận khôi phục dữ liệu và chuyển phiên thực tế."
  - test: "Copy và accessible name tiếng Việt sau review-fix"
    expected: "Trang /vi/lien-he hiển thị cảnh báo bảo mật tiếng Việt đúng Unicode; icon hoàn tất checkout được công nghệ hỗ trợ đọc bằng tên tiếng Việt, không phải Complete."
    why_human: "Đây là copy và trải nghiệm assistive user-visible được sửa sau lần UAT đã duyệt."
  - test: "VietQR hết hạn và link QR cũ"
    expected: "Order hết hạn không còn hướng dẫn/tải QR để thanh toán; mở link tải QR cũ bị từ chối chung, không làm lộ order và không khuyến khích chuyển khoản sau hạn."
    why_human: "Deadline guard đã được thêm sau UAT; unit/runtime/security đều pass nhưng hành trình khách hàng ở ranh giới hết hạn chưa được người dùng tái duyệt."
  - test: "Recovery của VietQR rejected ở cả hai locale"
    expected: "Order rejected hiển thị copy recovery hoàn chỉnh ở /vi và /en, không hiện literal key/MISSING_MESSAGE, không giả định có support; hành động chính là khôi phục giỏ hoặc xem catalog, không retry cùng order."
    why_human: "Nhánh chọn message rejected là thay đổi user-visible cuối cùng sau UAT và là finding iteration 3."
next_action: "Thực hiện 4 kiểm tra UAT hẹp ở trên; nếu đạt, cập nhật xác nhận human để Phase 10 có thể chuyển từ human_needed sang passed."
---

# Phase 10: Checkout and payment UX stabilization Verification Report

**Phase Goal:** Làm hành trình cart, checkout và payment song ngữ rõ ràng, accessible, recovery-safe và phù hợp khách Việt Nam mà không làm yếu pricing, shipping, inventory, payment hoặc entitlement authority ở server.

**Verified:** 2026-08-11T10:08:36Z  
**Status:** human_needed  
**Re-verification:** Không — đây là verification đầu tiên; không có `10-VERIFICATION.md` trước đó.  
**Kết luận:** Không có gap kỹ thuật. Toàn bộ must-have được xác minh, nhưng UAT ngày 2026-08-11 không tự động bao phủ các thay đổi user-visible thực hiện sau đó trong ba vòng review-fix.

## Goal Achievement

### Roadmap Success Criteria

| # | Truth | Status | Evidence |
|---|---|---|---|
| R1 | VN checkout yêu cầu Province/City → Ward/Commune/Special zone chính thức và mobile chuẩn hóa; US/international và destination requote vẫn hoạt động | ✓ VERIFIED | Snapshot 34/3.321 tại `src/checkout/data/vietnam-administrative-units-2025-07-01.json`; lookup/normalize tại `src/checkout/vietnam-address.ts`, `vietnam-phone.ts`, `shipping-address.ts:96-128`; final submit tại `schemas.ts:16-75`; fresh unit 167/167. |
| R2 | Cart/checkout giữ intent an toàn, có blocker song ngữ đầy đủ, đạt keyboard/touch/reflow và khóa xung đột/duplicate submit | ✓ VERIFIED | `add-to-cart.tsx:227-410`, `cart-page.tsx:105-273`, `mini-cart.tsx:214-305`, `checkout-page.tsx:736-850,900-1145`; Playwright inventory có đủ 10 locale×viewport cases, keyboard, field focus, auth transition; không có skip/fixme. |
| R3 | Address save, draft, support, incident và guest recovery tuân consent/PII/auth/non-enumeration | ✓ VERIFIED | Draft v2 TTL 12h/16KiB/HMAC scope tại `editable-draft.ts` và `editable-draft-scope.server.ts`; server-derived address identity tại `address-actions.ts:282-300`; validated support DTO tại `support/config.ts`; generic denial tại `order-payment-page.tsx:74-94`. |
| R4 | Mỗi payment state có next action đúng; terminal phục hồi qua cart mới; paid/terminal không có deadline; same-order retry bị cấm | ✓ VERIFIED | Pure mapping `payments/status.ts:119-178`, `sameOrderRetryAllowed:false`; recovery model `order-recovery.ts`; composition `order-payment-page.tsx:133-240`; status/recovery/recheck tests pass. |
| R5 | VietQR có hướng dẫn đánh số, QR download bounded/authorized, manual fallback; verified paid bắt đầu bằng xác nhận và giữ entitlement private | ✓ VERIFIED | `vietqr-instructions.tsx`; authorization-first QR route `orders/[orderNumber]/qr/route.ts`; deadline helper `payments/vietqr/instructions.ts:99-125`; paid projection/download gating `order-payment-page.tsx:156-197,344-385` và `/api/downloads`. |
| R6 | Có bằng chứng unit/security/Playwright/responsive/payment/full CI song ngữ mà không mở lại Phase 09 UAT | ✓ VERIFIED | Verifier chạy full unit 989/989, focused 167/167, security 77/77, lint/typecheck/diacritics pass; 22 Phase 10 Playwright tests được enumerate, 0 skip/fixme. Post-fix evidence ghi nhận payment E2E 4/4 và release prefix/suffix/full-E2E; Phase 09 geo/SEO được loại đúng phạm vi. |

### PLAN Frontmatter Truths

| # | Plan truth | Status | Evidence |
|---|---|---|---|
| P01-1 | Quantity controls theo item đạt 44px và cart/mini-cart dùng cùng remove/Undo contract | ✓ VERIFIED | `cart-line.tsx:113-135,205-227`; `cart-page.tsx:129-159`; `mini-cart.tsx:214-223`; shared provider state `removedLine/undoRemove`. |
| P01-2 | PDP/cart unavailable action có một lý do localized đầy đủ; sticky inactive không vào focus | ✓ VERIFIED | Canonical `blockedReason` và linked IDs trong `add-to-cart.tsx:227,354-410`; sticky subtree chỉ render khi active; cart E2E và add-to-cart unit tồn tại. |
| P01-3 | Cart amount được gọi rõ là product subtotal và money/eligibility đến từ projection/quote | ✓ VERIFIED | Cart/mini-cart chỉ tiêu thụ quote/display lines; security gate cấm client commerce authority; localized cart copy parity pass. |
| P02-1 | Server từ chối VN pair giả/cross-parent, yêu cầu hai cấp chính thức, district không bắt buộc và lưu tên canonical | ✓ VERIFIED | `vietnam-address.ts:63-107`, `shipping-address.ts:96-128`; snapshot counts/metadata; unit exact/cross-parent coverage pass. |
| P02-2 | Mobile VN domestic/+84 được revalidate và lưu +84; international/US vẫn giữ rule | ✓ VERIFIED | `vietnam-phone.ts:1-23`, server transform trong `schemas.ts`; US state/postal superRefine vẫn có tại `schemas.ts:57-73`. |
| P02-3 | Draft allowlist round-trip 12h, xóa malformed/expired/oversized và không chứa authority/credential/consent | ✓ VERIFIED | `editable-draft.ts:6-11,56-234`; fresh draft unit và security source gate pass. |
| P02-4 | Chỉ identity server-authenticated mới save address; không nhận caller user ID; save failure tách khỏi order success | ✓ VERIFIED | `saveCheckoutShippingAddressAction` chỉ nhận locale/address, gọi authenticated client và RPC; checkout bắt lỗi save riêng sau order success tại `checkout-page.tsx:819-838`. |
| P03-1 | Search localized country/VN official pair/US readable label, submit stable normalized values | ✓ VERIFIED | `searchable-select.tsx`, `shipping-address-ui.ts`, `destination-form.tsx:138-219`; keyboard Playwright case và shipping UI unit. |
| P03-2 | Blur chỉ reveal field touched; submit focus blocker đầu; draft hydrate an toàn; save consent mặc định unchecked | ✓ VERIFIED | Field-key touched/error wiring trong `destination-form.tsx`; draft hydrate `checkout-page.tsx:417-441`; `saveAddress=false` tại line 329 và signed-in-only checkbox. |
| P03-3 | Mobile summary gần đầu hiển thị cùng accepted quote/destination/discount/blocker/total như desktop | ✓ VERIFIED | Một `OrderSummaryViewModel` tại `order-summary.tsx:48-135` được dùng cho mobile/desktop từ `checkout-page.tsx:590,900,1126`. |
| P03-4 | Desktop sticky rail và mobile safe-area dock là hai presentation của một state; inactive duplicate không focusable | ✓ VERIFIED | Desktop aside `hidden ... lg:block`; mobile dock/disclosure responsive; 10 viewport E2E cases và order responsive test được enumerate. |
| P03-5 | Essential strings wrap tại 375px/200%; changed journey copy có en/vi parity | ✓ VERIFIED | `whitespace-normal/break-words`, no essential truncate on blocker/CTA; phase-10 message parity unit pass; diacritic scan pass. |
| P03-6 | Discount feedback độc lập, không overwrite submit/destination/incident | ✓ VERIFIED | `discount-code-form.tsx` có request-scoped feedback; checkout state tách `submitResult`, lifecycle issue và address warning; source/security tests pass. |
| P04-1 | Preflight/order creation khóa editable controls dưới một aria-busy region, giữ values và chỉ navigate sau success | ✓ VERIFIED | `submitInFlightRef`, submit stages và `aria-busy` tại `checkout-page.tsx:318-337,736-850,910`; router push chỉ trong success branch. |
| P04-2 | Known failure và unknown outcome có recovery khác nhau; unknown không mời resubmit ngay | ✓ VERIFIED | `submit-error-copy.ts`; unknown route đến orders/guest recovery tại `checkout-page.tsx:1085-1118`; security tests pass. |
| P04-3 | Incident ID opaque/copyable; contact chỉ xuất hiện khi email/Zalo hợp lệ | ✓ VERIFIED | `incident-reference.tsx:11-59`; `support-links.tsx:23`; exact `zalo.me`/email validation trong `support/config.ts`. |
| P04-4 | Order denial generic, non-enumerating, có localized guest recovery và optional support | ✓ VERIFIED | Một branch cho mọi `result.status !== found` tại `order-payment-page.tsx:74-94`; payment security và Playwright unauthorized case. |
| P05-1 | Mọi authorized payment state có một heading/action/deadline owner đúng, không lặp provider/lock | ✓ VERIFIED | `status.ts` presentation + `order-payment-page.tsx`; table-driven status mapping và payment E2E matrix. |
| P05-2 | Failed/cancelled/rejected/expired restore eligible snapshot về cart; nếu không thì catalog; không retry order cũ | ✓ VERIFIED | `order-recovery.ts`, `order-recovery-banner.tsx:61-103`, `sameOrderRetryAllowed:false`; E2E missing-snapshot case. |
| P05-3 | Reservation deadline chỉ có ở pending/verifying, không có ở paid/review/refund/terminal | ✓ VERIFIED | `showPendingDeadline` tại `status.ts:177` và single-owner selection `order-payment-page.tsx:154,203-220`. |
| P05-4 | Cooldown/poll dùng absolute deadline, dừng khi hidden/terminal và announce đúng một lần theo locale/timezone | ✓ VERIFIED | `recheck-model.ts`, `payment-status-recheck.tsx:90-215`, `format.ts`; focused timer/format tests pass. |
| P06-1 | Pending VietQR có ba bước, exact facts/manual fallback/copy/download accessible ngay cả khi image fail | ✓ VERIFIED | `vietqr-instructions.tsx`, download interception giữ page/manual facts; VietQR unit 34 cases trong focused set. |
| P06-2 | QR route authorize order trước fixed HTTPS fetch, chặn redirect/MIME/oversize/timeout, private no-store, không mutation | ✓ VERIFIED | Full route inspection; runtime route boundary test và security tests pass. |
| P06-3 | Transfer declaration chỉ yêu cầu reconciliation, không mark paid/upload/grant access/affect inventory | ✓ VERIFIED | `customer-actions.ts` chỉ RPC `declare_vietqr_transfer`; security source gate cấm paid/order/inventory/fulfillment shortcuts. |
| P06-4 | Verified paid bắt đầu bằng localized confirmation, confirmed facts/masked email và next step đúng loại; entitlement không đổi | ✓ VERIFIED | `showPaidSuccess = status.isPaid && !status.isRefunded`; masked projection and existing DownloadPanel/private route; component/runtime tests pass. |
| P07-1 | `/vi` và `/en` có executable five-viewport/keyboard/200%-reflow/target/focus fixtures | ✓ VERIFIED | `checkout-ux.spec.ts` định nghĩa 5 viewport × 2 locale, reflow, 44px, keyboard; Playwright `--list` cho 22 tests. |
| P07-2 | Tất cả payment states/access/missing snapshot chạy không còn skipped legacy evidence | ✓ VERIFIED | `payment-ux.spec.ts` fixture map đủ 13 state families; `order-status.spec.ts` executable; grep không có skip/fixme. |
| P07-3 | Security gates chứng minh PII/auth/provider/requote/reservation/QR/paid/inventory/entitlement boundaries | ✓ VERIFIED | Fresh `npm run test:security` 77/77, bao gồm ASVS checkout/payment matrices. |
| P07-4 | Full CI xanh trước UAT; Phase 09 geo/SEO bị loại khỏi Phase 10 | ✓ VERIFIED | Recorded release evidence trên final review-fix chain + fresh lint/typecheck/unit/security; không có file Phase 09 geo/SEO bị Phase 10 verifier sửa. |

**Score:** 35/35 truths verified (6 roadmap + 29 PLAN truths). `human_needed` đến từ UAT sau review-fix, không phải truth kỹ thuật thất bại.

## Required Artifacts

| Plan | Artifacts | L1 Exists | L2 Substantive | L3 Wired | L4 Data | Status |
|---|---|---:|---:|---:|---:|---|
| 10-01 | `add-to-cart.tsx`, `cart-line.tsx`, `cart.spec.ts` | 3/3 | 3/3 | 3/3 | quote/projection | ✓ VERIFIED |
| 10-02 | VN snapshot, `vietnam-address.ts`, `editable-draft.ts`, `address-actions.ts` | 4/4 | 4/4 | 4/4 | official snapshot/session/RPC | ✓ VERIFIED |
| 10-03 | `destination-form.tsx`, `order-summary.tsx`, `en.json`, shipping UI test | 4/4 | 4/4 | 4/4 | accepted quote/address model | ✓ VERIFIED |
| 10-04 | checkout server page, support config, incident, contact page, config test | 5/5 | 5/5 | 5/5 | server env → DTO → UI | ✓ VERIFIED |
| 10-05 | recovery/timer/status models and status tests | 4/4 | 4/4 | 4/4 | authorized order projection | ✓ VERIFIED |
| 10-06 | QR route, VietQR UI, order payment page | 3/3 | 3/3 | 3/3 | authorized order/config/private entitlement | ✓ VERIFIED |
| 10-07 | deterministic fixture, checkout/payment E2E, payment security | 4/4 | 4/4 | 4/4 | seeded authorized projections | ✓ VERIFIED |

`gsd-tools query verify.artifacts` trả `all_passed: true` cho cả bảy PLAN (27/27 artifacts).

## Key Link Verification

| Plan | Critical links | Status | Details |
|---|---|---|---|
| 10-01 | PDP → exact eligibility; mini-cart → shared provider Undo | ✓ 2/2 WIRED | Pattern và usage đều có. |
| 10-02 | submit schema → VN normalizer; security → draft; address action → RPC/RLS | ✓ 3/3 WIRED | Server revalidation và identity derivation được trace. |
| 10-03 | CheckoutPage → shared OrderSummary; CheckoutPage → draft/save contracts | ✓ 2/2 WIRED | Một state owner, không hollow props. |
| 10-04 | server page → support resolver → client DTO; checkout → error/support | ✓ 4/4 WIRED | Client không import env/server config. |
| 10-05 | authorized projection → status mapping; recovery banner → cart restore | ✓ 2/2 WIRED | Same-order retry không tồn tại. |
| 10-06 | QR route → authorized query; paid page → entitlement-gated download | ✓ 2/2 WIRED | Authorization xảy ra trước external fetch. |
| 10-07 | deterministic fixture → payment UX; security → draft source | ✓ 2/2 WIRED | Tests chạy trên real authorized projection shape. |

`gsd-tools query verify.key-links` trả `all_verified: true` cho cả bảy PLAN (17/17 links).

## Data-Flow Trace (Level 4)

| Artifact | Data variable | Source | Produces real data | Status |
|---|---|---|---:|---|
| PDP/cart | projection/quote display lines | catalog agreement + server cart quote | Yes | ✓ FLOWING |
| Checkout summary | `acceptedQuote`, destination, discount, blockers | `refreshCheckoutQuoteAction` + lifecycle acceptance | Yes | ✓ FLOWING |
| VN address | province/ward/mobile intent | checked-in official snapshot → shared normalizer → final server schema | Yes | ✓ FLOWING |
| Draft/address save | email/address + `draftScope` | bounded sessionStorage; authenticated server action/RPC | Yes | ✓ FLOWING |
| Support/contact | `PublicSupportConfig` | validated server env → server page → narrow DTO | Yes; safe empty is intentional | ✓ FLOWING |
| Payment page | `result.order`, mapped status | `getAuthorizedOrderPayment` server projection | Yes | ✓ FLOWING |
| QR/private download | authorized order/config/entitlement | guest/user auth → fixed VietQR fetch; paid entitlement route | Yes | ✓ FLOWING |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Full unit regression | `npm run test:unit` | 112 files, 989/989 tests | ✓ PASS |
| Focused Phase 10 models/runtime/messages | `npm run test:unit -- <16 Phase 10 files>` | 16 files, 167/167 tests | ✓ PASS |
| Security/authority matrix | `npm run test:security` | 77/77, 0 skipped/todo | ✓ PASS |
| Types | `npm run typecheck` | exit 0 | ✓ PASS |
| Lint | `npm run lint` | exit 0 | ✓ PASS |
| Vietnamese text | `npm run check:vi-diacritics` | no obviously unaccented strings | ✓ PASS |
| Phase 10 browser evidence exists | `npx playwright test ... --list` | 22 tests across checkout/payment/order-status | ✓ PASS |
| Phase 10 skip/fixme scan | `rg test.skip/test.fixme/...` | no matches | ✓ PASS |

Không chạy lại full browser/CI trong verifier. Post-review evidence trên final chain ghi nhận payment E2E 4/4, prior-phase regression E2E 29/29, iteration-2 release prefix/suffix và full-E2E; verifier đã chạy lại toàn bộ unit và security trên HEAD hiện tại.

## Probe Execution

Step 7c: **SKIPPED** — Phase 10 không khai báo probe và không có `scripts/**/tests/probe-*.sh`.

## Requirements Coverage

| Requirement | Source plan(s) | Status | Live evidence |
|---|---|---|---|
| MKT-01 | 10-03, 10-04, 10-07 | ✓ SATISFIED | Localized routing/messages/contact and bilingual E2E. |
| MKT-02 | 10-03, 10-07 | ✓ SATISFIED | Quote projection displays VND/USD; exact pair gate. |
| MKT-06 | 10-02, 10-03, 10-07 | ✓ SATISFIED | Address/accepted-quote country match and material requote flow. |
| CART-01 | 10-01, 10-07 | ✓ SATISFIED | Mixed cart semantics preserved and browser regression exists. |
| CART-02 | 10-01, 10-07 | ✓ SATISFIED | Quantity/remove/Undo controls wired. |
| CART-03 | 10-01..10-04, 10-07 | ✓ SATISFIED | Server requote immediately before submit; browser values remain intent. |
| CART-04 | 10-02..10-04, 10-07 | ✓ SATISFIED | Guest and signed-in flows; save option signed-in-only. |
| CART-05 | 10-01, 10-02, 10-04, 10-07 | ✓ SATISFIED | Accepted quote/snapshot persistence authority unchanged. |
| SHIP-03 | 10-02, 10-03, 10-07 | ✓ SATISFIED | Physical-only address/shipping calculation. |
| SHIP-09 | 10-02, 10-03, 10-07 | ✓ SATISFIED | Existing deterministic resolver/fallback retained; security gate pass. |
| SHIP-10 | 10-03, 10-07 | ✓ SATISFIED | Readable US label submits normalized region code. |
| SHIP-11 | 10-02, 10-03, 10-07 | ✓ SATISFIED | Destination change requotes and requires material acceptance. |
| SHIP-12 | 10-02, 10-03, 10-07 | ✓ SATISFIED | Immutable shipping allocation evidence preserved; no schema drift. |
| SHIP-13 | 10-02, 10-03, 10-07 | ✓ SATISFIED | Final server schema requires two-letter US region and postal. |
| INV-02 | 10-05, 10-07 | ✓ SATISFIED | Atomic reservation boundary remains in checkout RPC/security matrix. |
| INV-03 | 10-01, 10-05, 10-07 | ✓ SATISFIED | Authoritative availability/variant blocker prevents submit. |
| INV-04 | 10-05, 10-06, 10-07 | ✓ SATISFIED | Verified-paid transition/finalization security tests. |
| INV-05 | 10-05, 10-07 | ✓ SATISFIED | Terminal release outcomes retained; no same-order retry. |
| ORD-01 | 10-05, 10-06, 10-07 | ✓ SATISFIED | Authorized order number/summary and state-first composition. |
| ORD-02 | 10-05, 10-06, 10-07 | ✓ SATISFIED | Order/payment/digital/physical states remain distinct. |
| PAY-01 | 10-05, 10-07 | ✓ SATISFIED | Eligible intl/USD page renders PayPal control. |
| PAY-02 | 10-05, 10-07 | ✓ SATISFIED | PayPal create/capture routes use server order/amount. |
| PAY-03 | 10-05, 10-07 | ✓ SATISFIED | Webhook signature, order, merchant, amount, currency verification retained. |
| PAY-04 | 10-05, 10-07 | ✓ SATISFIED | Event/transition keys and idempotent paid transition security gate. |
| PAY-05 | 10-05, 10-06, 10-07 | ✓ SATISFIED | Pending VN/VND instructions expose exact amount/reference/deadline. |
| PAY-06 | 10-06, 10-07 | ✓ SATISFIED | Customer declaration is non-paid; authorized admin transition/audit unchanged. |
| PAY-07 | 10-05, 10-06, 10-07 | ✓ SATISFIED | Paid projection is sole success trigger; private entitlement remains gated. |
| PAY-08 | 10-05, 10-06, 10-07 | ✓ SATISFIED | State matrix covers pending/paid/failed/cancelled/refunds plus review/rejected/expired. |
| ACC-03 | 10-02, 10-03, 10-04, 10-07 | ✓ SATISFIED | Authenticated address RPC reused; checkout consent optional/unchecked. |
| OPS-04 | 10-01..10-07 | ✓ SATISFIED | Fresh unit/security plus executable bilingual E2E inventory and recorded release evidence. |

Không có requirement nào mapped tới Phase 10 nhưng không xuất hiện trong ít nhất một PLAN; không có orphaned requirement.

## Decision Coverage D-01..D-24

| Decision | Status | Evidence |
|---|---|---|
| D-01 | ✓ | Đúng 7 PLAN/SUMMARY. |
| D-02 | ✓ | Verification dùng code hiện tại; không lấy SUMMARY làm bằng chứng. |
| D-03 | ✓ | Không thêm provider/carrier/analytics/state machine. |
| D-04 | ✓ | VN two-level pair, district optional. |
| D-05 | ✓ | Repo snapshot, không runtime address API. |
| D-06 | ✓ | `0...`/`+84...` → canonical +84, server revalidation. |
| D-07 | ✓ | Searchable localized country và US name+code. |
| D-08 | ✓ | Draft v2 scoped, 12h, 16KiB, strict allowlist. |
| D-09 | ✓ | Signed-in-only unchecked consent; save sau validation/success. |
| D-10 | ✓ | Field-scoped blur và first-blocker focus. |
| D-11 | ✓ | Complete blockers; two-stage locked `aria-busy` submit. |
| D-12 | ✓ | Shared mobile disclosure/desktop rail model. |
| D-13 | ✓ | Bounded message parity, forbidden customer terms tests. |
| D-14 | ✓ | 44px/active locale/focus/reflow automated matrix. |
| D-15 | ✓ | Optional centralized email/Zalo/contact route. |
| D-16 | ✓ | Copyable incident, conditional support, generic guest recovery. |
| D-17 | ✓ | Restore cart primary/catalog fallback. |
| D-18 | ✓ | State-driven one action/deadline composition. |
| D-19 | ✓ | Pending-only deadline, absolute timers, locale/timezone. |
| D-20 | ✓ | Three-step VietQR, bounded download, no receipt upload. |
| D-21 | ✓ | Verified-paid success/masked email/relevant next steps. |
| D-22 | ✓ | Exact `vn+VND→VietQR`, `intl+USD→PayPal` server pair. |
| D-23 | ✓ | Requote/material evidence/reservation/inventory/snapshot/private entitlement preserved. |
| D-24 | ✓ | `sameOrderRetryAllowed:false`; terminal provider controls absent. |

## UI-SPEC Assertions

| Assertion | Status | Evidence |
|---:|---|---|
| 1 | ✓ | Linked PDP/cart blockers; inactive sticky not rendered/focusable. |
| 2 | ✓ | VN pair/mobile/no runtime API tests. |
| 3 | ✓ | Searchable country + US labels/stable codes. |
| 4 | ✓ | Isolated blur/first focus wiring and E2E. |
| 5 | ✓ | Draft lifecycle/scope/clear/forbidden fields. |
| 6 | ✓ | Signed-in unchecked save/no unchecked call. |
| 7 | ✓ | Shared summary and responsive/reflow matrix. |
| 8 | ✓ | Submit lock/idempotency/known-vs-unknown recovery. |
| 9 | ✓ | Incident copy/conditional support. |
| 10 | ✓ | Non-enumerating denial/localized guest recovery. |
| 11 | ✓ | All payment state hierarchy/action/deadline mappings. |
| 12 | ✓ | Exact cooldown/locale/poll-stop tests. |
| 13 | ✓ | Terminal restore/catalog/no retry. |
| 14 | ✓ | VietQR steps/download/fallback/no paid mutation. |
| 15 | ✓ | Verified-paid/masked email/relevant next step. |
| 16 | ✓ | Fresh security matrix proves provider/requote/reservation/snapshot/inventory/private authority. |

## Supply-Chain, Schema and Authority Drift

| Check | Result |
|---|---|
| Baseline | `a7f51be6` (parent of first Phase 10 implementation commit) |
| Verified HEAD | `58d4fb1e` |
| `package.json` / `package-lock.json` | No diff |
| `supabase/migrations/**` | No diff |
| DB schema/generated types/RLS | No Phase 10 diff |
| New provider/payment state | None |
| Payment authority | Server pair/requote/webhook/admin/transition boundaries unchanged and security-tested |
| Working tree | Pre-existing `next-env.d.ts` line-ending-only modification left untouched; not part of Phase 10 verification |

## Anti-Patterns Found

| Scan | Result | Severity |
|---|---|---|
| `TBD|FIXME|XXX` in Phase 10 changed source/tests | No matches | None |
| `TODO|HACK|PLACEHOLDER|coming soon|not yet implemented` | No matches | None |
| `console.log`-only implementations | No matches | None |
| Phase 10 `skip/fixme` tests | No matches | None |
| `return null` matches | Conditional rendering/parsers/stream failure helpers only; none is a user-visible stub | ℹ️ Info |

### Disconfirmation Pass

- **Một requirement dễ bị chỉ đáp ứng một phần:** D-08 ban đầu chỉ hash identity bằng SHA-256 công khai; review-fix đã thay bằng server-only HMAC v2. Source và test hiện tại chứng minh gap đã đóng.
- **Một test từng gây hiểu lầm:** deadline QR ban đầu chỉ source-scan helper mà chưa thực thi route. `vietqr-download-route.test.ts` hiện gọi route với fake clock và chứng minh unauthorized/missing/invalid/expired/exact-boundary không gọi builder/fetch.
- **Một error path từng thiếu coverage:** VietQR rejected chọn key không tồn tại. Runtime component test mới dùng translator/catalog thật cho en/vi và hiện pass; vẫn yêu cầu human regression vì copy user-visible được đổi sau UAT.

## Human Verification Required

UAT tổng thể đã được user duyệt ngày 2026-08-11, nhưng approval đó xảy ra trước các commit review-fix `fdf88d1c`…`b2747fcc`. Chỉ cần tái kiểm tra bốn vùng thay đổi sau; không cần chạy lại toàn bộ ma trận Phase 10.

### 1. Draft checkout khi đổi danh tính trong cùng tab

**Test:** Tài khoản A nhập email/address rồi sign out; sign in tài khoản B trong cùng tab; lặp guest → account. Đồng thời thử một auth action thất bại/không đổi identity.  
**Expected:** B/owner mới chỉ thấy prefill của mình; không thấy PII của A/guest. Draft hợp lệ không bị xóa chỉ vì notifier chạy khi scope thực tế chưa đổi.  
**Why human:** Identity scoping và notifier behavior được sửa sau approval; automation pass nhưng restoration experience chưa được user duyệt lại.

### 2. Copy và accessible name tiếng Việt

**Test:** Mở `/vi/lien-he` và một `/vi/checkout` có contact/destination hoàn tất; dùng screen reader/accessibility tree kiểm tra icon hoàn tất.  
**Expected:** Cảnh báo bảo mật hiển thị Unicode tiếng Việt đúng; icon được đọc bằng tên localized, không phải `Complete`; không có mojibake.  
**Why human:** Visual text và assistive announcement luôn cần người dùng/AT xác nhận, và cả hai thay đổi sau UAT.

### 3. VietQR hết hạn và link QR cũ

**Test:** Dùng fixture/order VietQR chuyển sang expired; mở order và thử lại URL QR download đã lưu trước đó.  
**Expected:** Không còn UI chuyển khoản/QR trên expired state; link cũ trả denial chung, không lộ order/bank fact, không gợi ý thanh toán sau hạn; recovery dẫn về cart/catalog.  
**Why human:** Server guard có runtime tests nhưng khách hàng cần thấy hành trình hết hạn rõ và không mâu thuẫn.

### 4. VietQR rejected recovery ở `/vi` và `/en`

**Test:** Mở seeded rejected VietQR order ở hai locale.  
**Expected:** Body recovery hiển thị bình thường, không literal key/MISSING_MESSAGE, không yêu cầu contact support khi chưa cấu hình; primary recovery là restore cart hoặc catalog và không có provider retry.  
**Why human:** Đây là finding user-visible cuối cùng được sửa sau UAT.

## Gaps Summary

Không có blocker hoặc warning kỹ thuật. Không có item nào cần defer sang phase sau. Phase 09 Vercel geo/external SEO UAT là debt đã được ghi ở Phase 09 và **không** phải gap của Phase 10.

Overall status là `human_needed` theo decision tree: 35/35 truths verified, artifacts/links/data-flow/authority đều pass, nhưng danh sách human verification sau review-fix không rỗng.

## Next Action

Thực hiện bốn UAT hẹp ở trên. Nếu cả bốn đạt, ghi nhận approval sau review-fix và re-run verifier để đổi status sang `passed`; nếu có lỗi, báo chính xác locale/state/step để tạo gap plan có phạm vi nhỏ.

---

_Verified: 2026-08-11T10:08:36Z_  
_Verifier: the agent (gsd-verifier)_
