# Phase 3: Mixed Cart and Checkout - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-15
**Phase:** 03-Mixed Cart and Checkout
**Areas discussed:** Giỏ hàng và danh tính, Đổi thị trường tại checkout, Phí vận chuyển, Giữ tồn kho và yêu cầu ngoại lệ

---

## Giỏ hàng và danh tính

| Decision | Options considered | Selected |
|----------|--------------------|----------|
| Guest-cart lifetime | Current session; 30 days; 90 days | 30 days |
| Sign-in behavior | Merge; prefer guest cart; prefer account cart | Merge |
| Quantity above stock after merge | Cap and notify; block checkout; remove line | Cap and notify |
| Stale cart data | Refresh and explain; warn only at checkout; confirm each change | Refresh and explain |
| Cross-device behavior | Account synchronization; device-local carts; sync only at checkout | Account synchronization |
| Sign-out behavior | Retain as guest cart; delete; ask every time | Retain as guest cart |
| Different account on same device | Ask before merge; automatic merge; keep separate | Ask before merge |

**User's choice:** Persist minimal guest-cart references for 30 days, merge into synchronized account carts, and always revalidate against server data.

**Notes:** Browser storage contains only product/variant identifiers, quantity, timestamps, and market-at-add. It excludes price, stock, customer, address, discount, and payment data.

---

## Đổi thị trường tại checkout

| Decision | Options considered | Selected |
|----------|--------------------|----------|
| Destination changes market or price | Preview before applying; apply then notify; return to cart | Preview before applying |
| Item unavailable in new market | Keep and allow exception; force manual removal; auto-remove | Keep and allow exception |
| Confirmation granularity | Confirm complete change set; confirm each line; confirm only total | Complete change set |
| Repeated country changes | Recalculate and reconfirm; auto-apply later changes; lock country | Recalculate and reconfirm |

**User's choice:** Checkout pauses for a full old/new preview and requires explicit confirmation whenever destination changes materially affect the order.

**Notes:** Unavailable physical lines remain visible but cannot enter a payable order unless an approved exception applies.

---

## Phí vận chuyển

| Decision | Options considered | Selected |
|----------|--------------------|----------|
| First-item fee within a profile | Highest first fee; first cart item; first fee per line | Highest first fee |
| Multiple shipping profiles | Calculate profiles separately; combine all physical units; use only most expensive profile | Combine all physical units |
| Free shipping | Per eligible product; whole physical cart; defer support | Per eligible product |
| Missing destination rule | Block and allow exception; confirm fee later; default international fee | Block and allow exception |

**User's choice:** Treat all physical units as one shipping group. Charge the highest first-item fee once and each remaining unit's own additional-item fee.

**Notes:** This intentionally differs from calculating each shipping profile separately. Free-shipping units contribute no fee.

---

## Giữ tồn kho và yêu cầu ngoại lệ

| Decision | Options considered | Selected |
|----------|--------------------|----------|
| Reservation start | Submit confirmed checkout; add to cart; open checkout | Submit confirmed checkout |
| Reservation windows | PayPal 15m/VietQR 24h; PayPal 30m/VietQR 12h; 30m for all | PayPal 15m/VietQR 24h |
| Availability during reservations | Subtract active reservations; show on-hand stock; expose held state | Subtract active reservations |
| Approved-exception continuation | Expiring checkout link; unlock old cart; admin-created order | Expiring checkout link |
| Exception-link lifetime | 24 hours; 48 hours; 7 days | 48 hours |

**User's choice:** Reserve atomically only after confirmed checkout submission. Approved exceptions use a narrowly scoped 48-hour checkout link and do not reserve stock by themselves.

**Notes:** Every approved-exception checkout still recalculates price, shipping, market eligibility, and available inventory.

---

## Agent's Discretion

- Exact UI composition, notification wording, secure guest-cart identifier design, and exception-link token mechanics.

## Deferred Ideas

None.
