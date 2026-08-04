# Phase 10: Checkout and payment UX stabilization - Pattern Map

**Mapped:** 2026-08-04
**Basis:** Current source and tests (authoritative), approved `10-CONTEXT.md`, `10-UI-SPEC.md`, `10-RESEARCH.md`, and `10-VALIDATION.md`
**Files classified:** 45 implementation/test ownership targets
**Analogs found:** 45 / 45 (some new utilities use a strict-but-separate same-role analog)

## Non-negotiable authority map

Phase 10 is presentation and validation stabilization around existing authority. Copy the seams below; do not create parallel client authority.

```text
browser intent -> server address parse/VN pair validation -> destination resolution
               -> authoritative requote/inventory check -> idempotent checkout RPC
               -> atomic reservation + immutable order snapshots

vn + VND -> VietQR                    intl + USD -> PayPal
declaration is reconciliation only    return/capture UI is not verified-paid
                    \                /
                     verified server projection
                       | paid only after verified provider/admin transition
                       | entitlement/private download only after paid gate
                       | terminal recovery restores intent into a NEW order
```

Preserve exact `vn + VND -> VietQR` and `intl + USD -> PayPal` pairing, server requote, idempotency, reservation/finalization/release, immutable evidence, verified-paid transitions, and private-entitlement authority. `sameOrderRetryAllowed` stays `false` for every terminal state. No package, database migration, new payment state, provider, or RLS policy is needed.

## File Classification

| New/modified file(s) | Role | Data flow | Closest current analog | Match |
|---|---|---|---|---|
| `src/components/catalog/add-to-cart.tsx` | component | event-driven | itself: canonical `blockedReason`, durable success | exact |
| `src/components/cart/{cart-page,cart-line,mini-cart}.tsx` | components | event-driven | `cart-page.tsx` + shared `CartLine` | exact |
| `src/messages/{en,vi}.json` cart keys | config | transform | existing `Payments`/order namespaces | role-match |
| `src/checkout/data/vietnam-administrative-units-2025-07-01.json` | config/data | transform | `shipping-address-ui.ts` static option metadata | role-match |
| `src/checkout/vietnam-address.ts` | utility | transform | `shipping-address.ts` | exact-role |
| `src/checkout/vietnam-phone.ts` | utility | transform | `shipping-address.ts` | exact-role |
| `src/checkout/{shipping-address,shipping-address-ui}.ts` | model/utility | transform | themselves | exact |
| `src/components/ui/searchable-select.tsx` | component | event-driven | `ui/popover.tsx`, `ui/input.tsx`, `ui/select.tsx` | composition |
| `src/checkout/editable-draft.ts` | utility | browser file-like storage | `checkout/idempotency.ts` | strict separate analog |
| `src/components/checkout/destination-form.tsx` | component | event-driven | `contact-form.tsx` on-blur validation | role-match |
| `src/components/checkout/checkout-page.tsx` | component/controller | request-response | itself: quote/submit/idempotency/router flow | exact |
| authenticated checkout address-save action | service/action | request-response | `account/address-actions.ts` | exact |
| `src/components/checkout/order-summary.tsx` | component | transform | itself + shared-state desktop/mobile rendering | exact |
| checkout message keys/parity test | config/test | transform | current `next-intl` Payments keys | exact-role |
| `src/support/config.ts` | server utility | transform | `lib/env/server.ts` | exact-role |
| `src/components/support/incident-reference.tsx` | component | event-driven | durable inline cart recovery feedback | role-match |
| `src/app/[locale]/contact/page.tsx` | route/component | request-response | localized `guest-order/page.tsx` route pattern | exact-role |
| `src/i18n/routing.ts`, `.env.example`, `src/lib/env/server.ts` | config | transform | existing localized path/env schemas | exact |
| `src/payments/status.ts` | model/utility | transform | itself | exact |
| `src/components/payments/{order-payment-page,payment-state-panel}.tsx` | components | request-response | current server-projection composition | exact |
| `src/payments/recheck-model.ts` | model/utility | event-driven | `reservation-countdown-model.ts` + current recheck component | exact-role |
| `src/components/payments/payment-status-recheck.tsx` | component | polling/event-driven | itself | exact |
| `src/payments/order-recovery.ts` | utility | transform | `cart/order-snapshot.ts` + recovery banner | role-match |
| `src/components/payments/order-recovery-banner.tsx` | component | event-driven | itself | exact |
| `src/payments/vietqr/instructions.ts` | service/utility | transform | itself | exact |
| `src/components/payments/vietqr-instructions.tsx` | component | request-response | itself | exact |
| `src/app/[locale]/orders/[orderNumber]/qr/route.ts` | route | streaming/request-response | `api/orders/access/route.ts` + `api/downloads/route.ts` | composition |
| paid-success composition/download panels | components | request-response | current authorized order page and fulfillment panels | exact |
| new unit tests | tests | transform | adjacent checkout/payment Vitest suites | exact |
| `tests/e2e/{checkout-ux,payment-ux}.spec.ts` | tests | request-response | `checkout.spec.ts`, phase-6 seed fixture, `order-status.spec.ts` | exact-role |
| security suite extensions | tests | batch/source scan | current checkout/payment boundary suites | exact |

## Pattern Assignments

### Plan 10-01: PDP, cart, mini-cart accessibility and feedback

**Own:** `add-to-cart.tsx`, `cart-page.tsx`, `cart-line.tsx`, `mini-cart.tsx`, cart-only message keys, `add-to-cart.test.ts`, `cart.spec.ts`.

Use the single PDP eligibility result already derived at `add-to-cart.tsx:205`; both main and sticky actions consume `blockedReason`. The main button already links the durable reason (`333-344`):

```tsx
{blockedReason ? <p id="add-to-cart-reason">{blockedReason}</p> : null}
<button aria-describedby={blockedReason ? 'add-to-cart-reason' : undefined} />
```

Keep durable inline success and its View cart/Continue shopping actions. For the sticky control, fix the existing mounted-offscreen pattern at `372-386`: conditionally unmount the inactive subtree (preferred) or make the entire subtree inert; `aria-hidden` alone does not remove descendants from tab order.

Copy cart undo ownership from `cart-page.tsx:85-87,134-136`: removal stays in the cart provider and the page invokes `undoRemove`; mini-cart must consume the same state rather than inventing a second undo stack. `CartLine` remains the single quantity/remove control (`cart-line.tsx:114-139,206-231`), with accessible item-specific decrease/increase labels. Raise touched controls from `h-10`/`min-h-10` to at least 44px.

Link disabled checkout controls to one complete blocker element with `aria-describedby`. Derive exact blocked-item count/names from the authoritative display/quote lines already used by the page; do not re-evaluate stock or price in JSX. Remove `truncate` from availability and other essential strings.

### Plan 10-02: Vietnam address, phone, editable draft, save consent

**Own:** the VN JSON snapshot; `vietnam-address.ts`, `vietnam-phone.ts`, `shipping-address.ts`, `shipping-address-ui.ts`, `searchable-select.tsx`, `editable-draft.ts`, address behavior in `destination-form.tsx`, checkout draft/save integration, address/draft unit tests and checkout security assertions.

Copy the pure parse/result style from `shipping-address.ts:37-55,124-181`: Zod parse first, normalize codes, return field-keyed issues, and re-run it at the server boundary. `shipping-address-ui.ts:298-315` already creates localized country options with `searchText: `${label} ${code}`. The searchable control should compose existing Popover/Input primitives and submit stable codes, never display labels.

New VN modules should expose pure functions such as `findVietnamAddressPair`, `validateVietnamAddress`, and `normalizeVietnamPhone`. The JSON snapshot is reviewed repository data with version/effective-date metadata and deterministic 34-province/3,321-ward tests. Map province name -> `region`, ward name -> `locality`, detailed address -> `addressLine1`, optional legacy district/supplement -> `addressLine2`; district is never required. Normalize accepted `0...`/`+84...` mobile input to canonical `+84...`. The final server action must call the same pure validation after parsing; UI acceptance is advisory.

`editable-draft.ts` must copy the lifecycle mechanics—but not the key or contents—from `checkout/idempotency.ts:12` and its sessionStorage helper. It is intentionally a **strict-but-separate analog**:

```ts
const editableDraftV1 = z.object({
  version: z.literal(1),
  savedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().positive(),
  email: z.string().email().max(320),
  shippingAddress: shippingAddressSchema
}).strict();
```

Use a distinct versioned key, 12-hour TTL, byte cap, safe parse, and delete malformed/oversized/expired/unknown records. Persist after user interaction, tab scope only, and clear only after successful order creation. Never include quote/totals, discount validity, provider/payment state, idempotency key, guest proof/token, incident data, or save-address consent. Draft hydration must not blindly overwrite stronger signed-in prefill.

Copy authenticated save behavior from `account/address-actions.ts:85-105`: validate ID/input, create the server Supabase client, derive the user from the authenticated session, then call `save_customer_shipping_address`. Never accept a client user ID or direct client table write. The consent starts unchecked on every load, stays outside the draft, and save happens only after validated order success; save failure is secondary and must not turn an order into a checkout failure. Existing RPC/RLS is the authority; no migration or RLS change.

### Plan 10-03: Checkout responsive hierarchy and bounded copy

**Own:** responsive composition in `checkout-page.tsx`/`order-summary.tsx`, journey message namespaces and parity tests.

Keep `CheckoutPage` as the single state owner. Extract a summary body that is fed the same accepted quote, destination, discount, and blocker props; render it through a controlled near-top mobile disclosure and the desktop sticky rail. Do not create duplicated mobile totals or form state. The bottom dock remains one primary action and must wrap destination/blocker text.

Follow the established `next-intl` route/payment pattern, not component-local bilingual objects. `routing.ts:1,106` uses `defineRouting`; payment components already use namespace-scoped `useTranslations`. Add only bounded cart/checkout/support/payment keys to both `src/messages/en.json` and `vi.json`, retain stable semantic roles/active-locale accessible names, and add key-parity coverage. Do not perform a broad translation migration.

### Plan 10-04: Field interaction, submit lock, incidents, support

**Own:** destination/contact submit coordination, checkout lifecycle, `support/config.ts`, incident component, localized contact route, routing/env/example, related unit/E2E tests.

Replace the contradictory form-wide flag (`destination-form.tsx:43-46`) with a touched field-key set/map. Copy ContactForm's Zod + React Hook Form `mode: 'onBlur'` approach (`contact-form.tsx:44+`) or preserve equivalent explicit state. Give every error a stable ID and connect `aria-invalid`/`aria-describedby`; on submit focus the first invalid control in document order.

Extend the existing strong submit orchestration in `checkout-page.tsx`, including the session storage injection at `201`, accepted destination restoration at `507-519`, and idempotency mint at `527`. During checking-total/creating-order, wrap the entire editable region with `aria-busy="true"` and disable contact, address, discount and submit controls without clearing values. Preserve authoritative preflight requote, material-change acceptance, idempotency reuse for unknown outcomes, and `router.push` only after a known successful order. Known validation failure and unknown/network outcome require different copy.

Copy server config style from `lib/env/server.ts:11-34`: Zod-validate optional support email, Zalo HTTPS URL/allowed host, and explicit store time zone, then expose a narrow public DTO with no secrets or placeholders. Absence is valid and must not block checkout. `incident-reference.tsx` provides durable inline opaque incident ID, copy action, and conditional contact link; never include request/provider/token facts in the URL.

Copy the localized thin route pattern from `app/[locale]/guest-order/page.tsx` plus routing aliases in `i18n/routing.ts`. The contact page is server-rendered and bilingual; it consumes only the safe DTO.

### Plan 10-05: Payment state hierarchy, timers, recovery

**Own:** `payments/status.ts`, payment page/state panel, new recheck/recovery pure models, recheck/recovery components, payment namespaces/unit/E2E/security tests.

`payments/status.ts:95-134` is the canonical pure projection and already fixes `sameOrderRetryAllowed: false`. Extend its presentation mapping; do not add a client payment state machine. Current tests at `status-mapping.test.ts:44-154` prove callback != paid, expiry, verified paid gate, review-required, refunds, and no retry. Change terminal presentation away from `/checkout`: restore snapshot is primary; absent/ineligible snapshot goes to localized catalog.

Keep `order-payment-page.tsx` fed only by the authorized order projection. Compose one dominant heading, one primary action, one downstream explanation, and at most one deadline. Derive `showPendingDeadline` only for `awaiting_payment`/`verifying_payment`; remove deadline props from paid/terminal compositions.

Extract timer logic into a pure `recheck-model.ts`, borrowing pure-time calculation style from `reservation-countdown-model.ts`. The current `payment-status-recheck.tsx:63` interval is only an analog, not sufficient. Model one absolute poll end and exact cooldown timestamp, schedule wake-up, pause network work while hidden, resume against the original deadline, clean up timers/listeners, stop on terminal/navigation, and announce poll-ended once. A render must never extend the window.

Copy recovery execution from `order-recovery-banner.tsx:31,47-49,70-73`: call cart-provider `restoreOrderSnapshot(orderNumber)`, then `router.push(cartHref)` on success. Put status/snapshot eligibility into a pure helper and make catalog fallback explicit. Never render PayPal/VietQR provider controls for failed/cancelled/rejected/expired states and never retry the same order.

Access denial stays generic/non-enumerating and adds only localized guest-order recovery and optional safe support navigation; do not reflect the requested order/provider.

### Plan 10-06: VietQR instructions, safe QR download, verified-paid success

**Own:** VietQR instruction utility/component, authorized QR route, paid composition/deduplication, VietQR/status/security/E2E tests.

Extend `payments/vietqr/instructions.ts`, which already validates printable references (`73`) and derives deadline/details from authorized order data (`103-131`). Render three numbered steps, exact amount/reference, copyable bank details, manual fallback, declaration-as-reconciliation language, and the authorized same-origin download. The declaration must never mutate paid/receipt/entitlement state.

The QR route composes two existing route patterns:

- `api/orders/access/route.ts:10-54`: Zod-parse request, authorize guest/customer order access, return a narrow projection and generic denial.
- `api/downloads/route.ts:14-34`: derive authenticated identity server-side, call an authorization service, reject non-authorized results without leaking details.

After authorization, re-derive the HTTPS VietQR Quick Link from stored safe instruction facts/server config. Never accept an upstream URL. Allowlist exact host/path, use `redirect: 'error'`, timeout, byte cap, and accepted image MIME; sanitize the public order-number filename and return `Content-Disposition: attachment`, `Cache-Control: private, no-store`. Do not log the account-bearing URL. This route cannot update payment/order/inventory/fulfillment.

Paid success renders only from the verified server projection (`status.isPaid`/paid gate), leads with success, shows masked email, then relevant digital download and/or physical next steps. Reuse existing entitlement-gated download panel and private signed-link route. Do not reveal raw contact email or duplicate locked/fulfillment copy across panels.

### Plan 10-07: Regression, fixtures, and UAT gate

**Own:** final fixture/spec coverage and validation evidence only. Feature defects return to their owning plan.

Copy Vitest table-driven style from `tests/unit/payments/status-mapping.test.ts:24-154`. Add focused tests for VN snapshot/pair, phone normalization, draft TTL/allowlist, support DTO, recheck model, order recovery, and VietQR instructions. Tests must assert invariants, not CSS implementation details.

Copy Playwright request mocking and role-first assertions from `tests/e2e/checkout.spec.ts:121-208`; copy deterministic Supabase fixture construction from `tests/e2e/fixtures/phase-6-seed.ts`. Replace skipped order-status evidence with executable authorized fixtures covering pending PayPal, pending VietQR, verifying, review-required, paid, failed, cancelled, rejected, expired, partially refunded, refunded, unauthorized guest, signed-in owner, and missing recovery snapshot. Exercise `/vi` and `/en`, the five required viewports, keyboard interactions, 200% reflow, no overflow, hidden duplicate tab order, and one primary action.

Extend source-boundary tests in place. `checkout-boundaries.test.mjs:109-122` currently permits sessionStorage only through idempotency; update the allowlist to exactly idempotency plus reviewed editable draft and scan the draft for forbidden fields. `payment-boundaries.test.mjs:71-139` already checks secret exposure, sanitized VietQR audit, forbidden paid mutations, authorized RPC projection, and masked email. Add QR route authorization, fixed upstream, redirect rejection, bounds/MIME/filename/no-store/no sensitive logging, and absence of paid mutations.

## Shared Patterns

### Authentication and RLS

- Server derives user (`auth.getUser()`); browser never supplies identity.
- Saved addresses use existing server RPC/RLS.
- Guest order proof remains HttpOnly/order-scoped and never enters URLs/session draft/logs.
- Order status and QR route reuse the existing authorized order projection; generic denial prevents enumeration.
- Private PDFs remain entitlement-gated; signed URLs are short-lived and server-created only after verified paid.

### Validation and errors

- Zod at every public/server boundary, plus pure domain membership/normalization.
- Browser validation improves interaction but never establishes price, market, provider, inventory, paid state or access.
- Durable inline error/status regions; toast-only commerce feedback is insufficient.
- Preserve entered values on failure. Separate field failures, known server rejection/material requote, and unknown network outcome.
- Never log raw guest tokens, signed URLs, QR account-bearing URLs, provider payload secrets, or editable draft PII.

### Navigation and localization

- Use localized route helpers/`router.push`, never string-build token-bearing URLs.
- Namespace touched strings with `next-intl`; both locale JSON files change sequentially with their owning plan.
- Codes remain submitted values; labels are localized presentation (`US state name + code`, VN official names).

## Anti-patterns / explicit prohibitions

- No client totals/provider choice/paid calculation and no direct Supabase client writes.
- No runtime VN address API, required district, new address columns, migration, or RLS rewrite.
- No shared storage key or schema between idempotency and editable draft.
- No authority fields, tokens, consent, or excessive PII in sessionStorage.
- No duplicated desktop/mobile checkout or payment state.
- No form-wide touched boolean, essential-text truncation, hidden focusable sticky subtree, or sub-44px modified controls.
- No unbounded/restarting polling and no `Date.now()`-only disabled button without a wake timer.
- No same-order terminal retry and no provider UI on terminal orders.
- No arbitrary URL QR proxy, redirects, unbounded response, public cache, sensitive filename/logging, or QR-triggered paid mutation.
- No paid/success rendering from PayPal return, VietQR declaration, timer, or client callback.

## Exactly-seven-plan ownership boundaries

| Plan | Exclusive primary ownership | Shared-file rule |
|---|---|---|
| 10-01 | PDP/cart/mini-cart and their tests | owns cart message keys during this plan |
| 10-02 | VN data/schema/phone/draft/searchable input/save consent | may touch checkout page/form only for draft/address integration |
| 10-03 | checkout responsive summary and bounded copy | sole writer of checkout/cart journey message keys in this plan |
| 10-04 | submit lifecycle, field errors, incident/support/config/contact | sole writer of support/routes/env and related message keys |
| 10-05 | payment hierarchy/recheck/recovery | sole writer of payment state/recovery keys |
| 10-06 | VietQR/download/paid-success composition | sole writer of VietQR/success keys and QR route |
| 10-07 | fixture completion, regression, UAT evidence | no feature redesign; route defects back to owner |

Plans are sequential because `checkout-page.tsx`, payment composition, and locale JSON overlap. Do not allow concurrent edits to `src/messages/en.json` and `src/messages/vi.json`.

## No Analog Found

None. The VN administrative dataset is new domain data, but its typed static-data consumption follows `shipping-address-ui.ts`; the QR attachment route deliberately composes existing authorization and private-download route patterns. Research examples remain supplemental, not substitutes for current authority seams.

## Metadata

**Analog search scope:** `src/{app,account,cart,catalog,checkout,components,fulfillment,i18n,lib,payments}`, locale messages, unit/E2E/security tests, existing Supabase RPC usage
**Source priority:** current source/tests > approved phase decisions/spec > research/audit line assumptions
**Pattern extraction date:** 2026-08-04
