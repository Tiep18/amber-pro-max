# Phase 10: Checkout and payment UX stabilization for Vietnamese and international customers - Research

**Researched:** 2026-08-04
**Domain:** Bilingual mixed-cart checkout, Vietnam address capture, payment-state presentation, recovery, accessibility, and trust-boundary preservation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Scope and plan shape
- **D-01:** Phase 10 must contain exactly seven executable plans. The intended slices are: cart/PDP; Vietnamese address and checkout draft; checkout/mobile/copy; submit/error/support; payment/recovery; VietQR/success; final regression and UAT.
- **D-02:** Treat the validated checkout/payment UX audit supplied for this phase as the problem inventory, but re-check every item against current code before planning or changing it. Later code and legitimate locked decisions supersede stale line numbers or assumptions.
- **D-03:** P0 and P1 issues plus low-risk P2 presentation work belong in this phase. New payment providers, carrier-rate capabilities, analytics platforms, and payment-state-machine redesign do not.

### Vietnamese address and customer data
- **D-04:** Vietnam checkout uses the current two-level administrative model: required Province/City followed by required Ward/Commune/Special zone, plus detailed street address. District is legacy-only and optional when retained for carrier compatibility; it is not authoritative or required.
- **D-05:** Administrative options must come from a versioned, repository-owned snapshot of official data. Checkout must not depend on a third-party address API at runtime.
- **D-06:** Vietnam phone input accepts common `0...` and `+84...` forms, normalizes before persistence, and is revalidated server-side. Existing international and US destination rules remain supported.
- **D-07:** Country selection is searchable using the existing normalized search text. US state/territory choices show localized names with codes rather than code-only rows.
- **D-08:** Draft email and address data may persist in tab-scoped `sessionStorage` with schema version, bounded lifetime, and explicit clearing after successful order creation. Never persist guest proof, payment evidence, authoritative quote data, or secrets in the draft.
- **D-09:** Signed-in customers see an opt-in “save this address” control that is unchecked by default. Saving is explicit and occurs only after validation; guest checkout remains account-free.

### Checkout interaction and language
- **D-10:** Validation state is field-scoped. A field may reveal its own error after blur; untouched unrelated fields must not turn red together. Submit still focuses and scrolls to the first blocking field.
- **D-11:** A disabled primary checkout action always exposes a complete, non-truncated reason on desktop and mobile. During order creation the editable form is locked and exposes `aria-busy` without removing already-entered values.
- **D-12:** Mobile checkout places a collapsible order summary near the top while preserving the current desktop sticky summary. Essential errors, destination text, and blocking guidance must wrap or expand rather than truncate.
- **D-13:** Cart, checkout, payment, recovery, and success copy uses customer language rather than internal terms such as quote, market, gate, entitlement, or fulfillment lock. New or migrated copy uses bounded `next-intl` namespaces so Vietnamese and English stay aligned.
- **D-14:** All interactive controls in this journey meet a 44px minimum target, hidden sticky controls are removed from keyboard interaction, and accessible names follow the active locale.

### Support and error recovery
- **D-15:** Add a bilingual `/contact` surface backed by centralized support configuration. Email and Zalo channels render only when configured; no placeholder address or invented channel is shown.
- **D-16:** Error states and incident references offer contextual support navigation when at least one channel is configured. Incident IDs include a copy action. Access-denied order views link to the localized guest-order recovery route.
- **D-17:** Recoverable terminal payment states make cart restoration the primary action and use status-specific truthful copy. Unavailable recovery offers a catalog route instead of a dead end.

### Payment and success presentation
- **D-18:** The order page renders information according to the current state and emphasizes one next action. Pending VietQR/PayPal views do not repeat locked/downstream fulfillment messages or duplicate reservation countdowns.
- **D-19:** Reservation deadlines render only while payment or verification is genuinely pending. Recheck cooldowns wake at the actual deadline, polling termination is announced, and locale controls time formatting.
- **D-20:** VietQR presents a clear numbered sequence and safe QR download affordance while retaining manual account/amount/content fallbacks. Transaction receipt image upload is not part of this phase.
- **D-21:** Paid state begins with a clear celebratory confirmation, masked-email acknowledgement, and state-relevant next steps. Guest proof and private download authorization remain unchanged.

### Locked commerce and payment boundaries
- **D-22:** Preserve the canonical pair `vn + VND -> VietQR` and `intl + USD -> PayPal`; the browser cannot override it.
- **D-23:** Preserve authoritative requote, accepted material-change evidence, atomic reservation, verified-paid transition, inventory finalization/release, private entitlement, and immutable order snapshots.
- **D-24:** Same-order retry after failed/cancelled/rejected/expired remains disallowed under Phase 04 decision D-08. Reversing that decision requires a separate payment/inventory design phase.

### the agent's Discretion
- Exact component boundaries, address dataset module shape, draft TTL within a reasonable session-scale window, animation details, icon choices, and migration order may be selected during research/planning.
- The seven plans may adjust file ownership to avoid overlap, but may not expand beyond seven or collapse final regression/UAT coverage.

### Deferred Ideas (OUT OF SCOPE)
- Same-order payment retry after terminal failure.
- COD, VNPay, MoMo, ZaloPay, or customer-selected provider expansion.
- Carrier/API shipping estimate and delivery ETA in cart.
- Receipt-image upload and its private-storage/RLS/retention workflow.
- Purchase analytics or conversion-provider integration.
- Vercel geo and external SEO UAT already recorded as Phase 09 verification debt.
</user_constraints>

<phase_requirements>
## Phase Requirements

These requirements are already marked complete in the milestone; Phase 10 must preserve their authority while improving the customer experience. [VERIFIED: `.planning/REQUIREMENTS.md`; `10-UI-SPEC.md` Source Traceability]

| ID | Description | Research Support |
|----|-------------|------------------|
| MKT-01 | Customer can browse storefront content in Vietnamese or English using localized URLs. | Bounded `next-intl` namespaces, localized `/contact` and guest-order recovery, and bilingual Playwright coverage preserve this behavior. [VERIFIED: routing/messages audit] |
| MKT-02 | Customer sees VND prices in the Vietnam market and USD prices in the international market. | Plans preserve the canonical market/currency/provider projection and reuse authoritative totals. [VERIFIED: D-22/D-23] |
| MKT-06 | Checkout validates physical-product eligibility against the shipping country and requires confirmation before applying any market-driven cart change. | Existing destination requote/material-change flow remains authoritative; new address UI feeds it without bypass. [VERIFIED: checkout audit] |
| CART-01 | Customer can add digital and physical products to one cart. | Cart/PDP work extends the current mixed-cart UI without changing line semantics. [VERIFIED: cart audit] |
| CART-02 | Customer can update quantities, variants, and remove cart items. | Cart controls remain intact and gain 44px targets and clearer blocked feedback. [VERIFIED: cart audit] |
| CART-03 | Server recalculates product prices, discounts, shipping fees, and order totals from authoritative records. | Phase 10 retains server quote/pre-submit reconstruction and treats drafts as editable intent only. [VERIFIED: D-08/D-23] |
| CART-04 | Customer can check out as a guest or while signed in. | Draft is account-independent; save-address is signed-in-only and unchecked; guest proof remains unchanged. [VERIFIED: D-08/D-09/D-21] |
| CART-05 | System stores an immutable snapshot of product, variant, market, currency, price, discount, and shipping data on each order line. | No migration or submit transaction redesign; immutable evidence remains server-owned. [VERIFIED: D-23] |
| SHIP-03 | Checkout calculates shipping only for physical order lines using the selected destination and attached profiles. | Vietnam address mapping feeds the existing physical-line shipping resolver. [VERIFIED: checkout/shipping audit] |
| SHIP-09 | Checkout resolves shipping deterministically through variant, product, and store-default profiles and fails closed only when no eligible exact or fallback rule exists. | The plan extends destination collection only and preserves the existing resolver/fallback hierarchy. [VERIFIED: D-23 and current shipping code] |
| SHIP-10 | Admin can configure normalized region-level shipping adjustments that either add to or replace a country rule, with US state and territory support in v1. | US selections become localized-name-plus-code while still submitting the normalized two-letter code. [VERIFIED: D-07] |
| SHIP-11 | Checkout recalculates server-authoritative shipping when country or applicable region changes and requires confirmation before applying any material total, market, currency, or eligibility change. | Province/country changes continue through the current requote lifecycle; mobile disclosure shares the same state. [VERIFIED: checkout audit] |
| SHIP-12 | Submitted physical orders preserve immutable evidence of the selected shipping profile, destination rule, region adjustment, and final shipping allocation. | Existing snapshot/RPC storage remains unchanged; new Vietnam names map into existing address fields. [VERIFIED: migration decision] |
| SHIP-13 | US physical checkout requires a normalized two-letter state or territory code and postal code before order submission. | Existing server rules remain and UI displays readable localized labels without changing submitted codes. [VERIFIED: shipping-address audit] |
| INV-02 | Checkout atomically reserves available physical inventory for a defined payment window. | Existing checkout transaction and reservation deadline remain unchanged; UI only deduplicates deadline presentation. [VERIFIED: D-23] |
| INV-03 | System prevents checkout when requested inventory is unavailable or the variant combination is invalid. | PDP/cart blockers continue consuming the authoritative agreement/quote state and gain clearer reasons. [VERIFIED: cart/PDP audit] |
| INV-04 | System finalizes reserved inventory exactly once when payment is confirmed. | Paid UI continues to depend exclusively on verified server projection. [VERIFIED: D-21/D-23] |
| INV-05 | System releases inventory when an order is cancelled, payment fails, or the reservation expires. | Terminal UI retains no same-order retry and restores eligible intent into a fresh cart/order path. [VERIFIED: D-17/D-24] |
| ORD-01 | Customer receives an order number and can view a clear order summary after checkout. | Order status composition becomes state-specific and preserves the authorized immutable summary. [VERIFIED: payment audit] |
| ORD-02 | System tracks order, payment, digital fulfillment, and physical fulfillment states separately. | Presentation consumes existing separate state families and removes repeated generic lock copy without collapsing states. [VERIFIED: status audit] |
| ORD-03 | Admin can view order history, status transitions, payment records, fulfillment records, and customer details. | Phase 10 does not alter admin records, audit, or payment transitions. [VERIFIED: scope D-03/D-23] |
| PAY-01 | International customer can pay an eligible USD order using PayPal. | Preserve provider-owned PayPal action and existing uncertainty/reconciliation behavior. [VERIFIED: payment audit] |
| PAY-02 | System creates and captures PayPal orders server-side using the authoritative order total. | No PayPal API or capture mutation changes are proposed. [VERIFIED: D-22/D-23] |
| PAY-03 | System verifies PayPal webhook authenticity and validates related order, merchant, amount, and currency. | Existing webhook/security boundaries remain mandatory regression gates. [VERIFIED: security architecture] |
| PAY-04 | System processes each PayPal event and paid transition idempotently. | Presentation and recheck changes never create a paid mutation and retain the idempotent backend. [VERIFIED: payment/security audit] |
| PAY-05 | Vietnam customer can place a VND order and receive VietQR bank-transfer instructions with exact amount, unique reference, and payment deadline. | Numbered steps/download extend the existing exact amount/reference/manual details; deadline is shown once while pending. [VERIFIED: VietQR audit] |
| PAY-06 | Authorized admin can confirm or reject a VietQR payment and the action is recorded in an audit trail. | Customer declaration remains non-authoritative; no admin transition or safe-audit change is proposed. [VERIFIED: D-20/D-23] |
| PAY-07 | System does not grant digital access or begin fulfillment until the entire order is confirmed paid. | Paid/success and QR declaration remain gated by verified server state and existing entitlements. [VERIFIED: D-21/D-23] |
| PAY-08 | Customer and admin can see whether payment is pending, paid, failed, cancelled, partially refunded, or refunded. | Unit/E2E state matrix covers all existing customer states plus verifying/rejected/expired/review-required. [VERIFIED: status mapping audit] |
| ACC-03 | Customer can save, edit, and delete shipping addresses. | Checkout adds explicit signed-in save consent by reusing the existing authenticated address helper/RPC. [VERIFIED: save-address audit] |
| OPS-04 | Critical guest/account checkout, payment, inventory, download, tracking, localization, and authorization flows have automated verification. | Wave 0 and Plan 10-07 add executable bilingual responsive journeys and preserve full CI/security gates. [VERIFIED: validation architecture] |
</phase_requirements>

## Summary

Phase 10 is an in-place stabilization pass, not a checkout rewrite. The current implementation already has the hard commerce foundations this phase must preserve: authoritative cart hydration, destination-owned market/payment pairing, server-side requote before submit, idempotent order creation, server-projected payment status, a robust PayPal uncertainty path, VietQR manual fallbacks, guest/order authorization, and restore-to-cart snapshots. [VERIFIED: codebase `src/components/cart/cart-page.tsx`, `src/components/checkout/checkout-page.tsx`, `src/checkout/actions.ts`, `src/payments/status.ts`, `src/components/payments/paypal-buttons.tsx`, `src/payments/vietqr/instructions.ts`, `src/payments/queries.ts`]

The live audit nevertheless confirms several user-facing contract gaps. Vietnam remains a generic free-form address with weak phone validation; country selection is not searchable; destination validation uses one form-wide touched flag; editable checkout drafts and post-validation save-address consent do not exist; mobile lacks a near-top order-summary disclosure; disabled reasons and essential text are sometimes truncated; the submit lifecycle does not lock the entire editable region; and support configuration/contact recovery is absent. [VERIFIED: codebase `src/checkout/shipping-address.ts`, `src/checkout/shipping-address-ui.ts`, `src/components/checkout/destination-form.tsx`, `src/components/checkout/checkout-page.tsx`, `src/components/checkout/order-summary.tsx`, `src/i18n/routing.ts`, `src/lib/env/server.ts`]

Payment presentation has a stronger behavioral base but contains two direct conflicts with the locked phase decisions: terminal failed/cancelled/rejected/expired presentations currently point to a new checkout rather than making cart restoration primary, and reservation deadlines are passed into generic state/summary regions even for paid or terminal orders. Recheck timing also needs a real deadline wake-up and one-time poll-ended announcement, while VietQR needs three numbered steps plus an authorized same-origin QR download. [VERIFIED: codebase `src/payments/status.ts`, `src/components/payments/order-payment-page.tsx`, `src/components/payments/payment-state-panel.tsx`, `src/components/payments/payment-status-recheck.tsx`, `src/components/payments/order-recovery-banner.tsx`, `src/components/payments/vietqr-instructions.tsx`]

**Primary recommendation:** Execute exactly seven sequential, ownership-isolated plans that extend the current components and existing authority seams; introduce no new package, payment state, provider, or database migration. [VERIFIED: `10-CONTEXT.md` D-01–D-24; `10-UI-SPEC.md` Seven-Plan Contract Slices]

## Project Constraints (from AGENTS.md)

- Customer-facing storefront, product taxonomy, products, blog content, and the Phase 10 journey remain bilingual Vietnamese/English; Vietnam and international markets retain independent availability, pricing, payment, and shipping behavior. [VERIFIED: `AGENTS.md` Project Constraints]
- VND is the Vietnam presentation currency and USD is the international presentation currency; v1 payment remains VietQR manual bank transfer for Vietnam and PayPal for international customers. [VERIFIED: `AGENTS.md` Project Constraints]
- Guest checkout remains available, mixed digital/physical carts remain supported, and physical inventory/variant inventory remains explicit. [VERIFIED: `AGENTS.md` Project Constraints]
- Digital fulfillment must never occur before full payment confirmation; PDFs remain in private storage and are delivered only through entitlement checks and short-lived signed URLs. [VERIFIED: `AGENTS.md` Project Constraints and Stack Patterns]
- Use the existing Next.js 16.2.x / React 19.2.x / TypeScript 5.9.x modular monolith, Supabase services, `next-intl`, Tailwind/shadcn primitives, Zod, Vitest, and Playwright. [VERIFIED: `AGENTS.md` Technology Stack; `package.json`]
- Recalculate prices and totals from server/database records; never trust browser-submitted prices, market/payment pairing, or paid state. Use integer minor units and explicit currency codes. [VERIFIED: `AGENTS.md` Stack Patterns and What NOT to Use]
- Admin authorization remains server-managed; no user-editable metadata or browser state may grant privileged access. [VERIFIED: `AGENTS.md` What NOT to Use]
- Preserve localized indexable metadata for public SEO routes, but Phase 10 does not reopen deferred Phase 09 deployment/SEO UAT. [VERIFIED: `AGENTS.md` Project Constraints; `10-CONTEXT.md` Deferred Ideas]
- The required GSD workflow has already been entered through phase planning; implementation must later run through `/gsd-execute-phase`, not direct ad-hoc source editing. [VERIFIED: `AGENTS.md` GSD Workflow Enforcement]

## Current Implementation Audit

Status meanings: **Already implemented** means the current code meets the phase contract and should be protected by regression tests; **Partial** means a useful seam exists but acceptance behavior is incomplete; **Still missing** means no implementation was found; **Contradicted** means current behavior directly conflicts with a locked decision. [VERIFIED: `10-CONTEXT.md` D-02]

| Audit item | Current status | Evidence and planning consequence |
|------------|----------------|-----------------------------------|
| PDP desktop/mobile add-to-cart share one eligibility predicate and full inline reason | Already implemented | `blockedReason` is canonical for the main and sticky actions, and the main control links the reason through `aria-describedby`; preserve this predicate rather than duplicating it. [VERIFIED: codebase `src/components/catalog/add-to-cart.tsx`] |
| Hidden sticky add-to-cart is absent from keyboard interaction | Partial | The translated-offscreen sticky container remains mounted and only receives `aria-hidden`; its child button is not inert/unmounted. Conditionally render it or make the whole subtree inert, then test tab order. [VERIFIED: codebase `src/components/catalog/add-to-cart.tsx`; `10-UI-SPEC.md` Product detail and cart] |
| Add-to-cart success is durable and offers recovery/navigation | Already implemented | Inline success includes View cart and Continue shopping; keep it inline and localized rather than replacing it with toast-only feedback. [VERIFIED: codebase `src/components/catalog/add-to-cart.tsx`] |
| Cart hydrates/reconciles with authoritative quote and handles pending/refresh/empty states | Already implemented | Cart server hydration, retry, empty recovery, mutation, and disabled checkout foundations exist. Preserve old totals during requote and explicit material-change confirmation. [VERIFIED: codebase `src/components/cart/cart-page.tsx`, `src/cart/guest-storage.ts`, `src/cart/quote-cache.ts`; `10-CONTEXT.md` Specific Ideas] |
| Cart/mini-cart disabled reasons name the exact blocker and are programmatically linked | Partial | The main cart has a generic alert and disabled action, but does not consistently name/count affected items or link the action to the reason; the mini-cart truncates availability text. Extend the existing state, do not create a second eligibility model. [VERIFIED: codebase `src/components/cart/cart-page.tsx`, `src/components/cart/mini-cart.tsx`] |
| Journey controls meet the 44px target and essential text wraps | Partial | Several cart quantity/remove controls are 40px (`h-10`, `min-h-10`), and sticky/blocker/destination strings use `truncate`. Raise modified controls to 44px minimum and remove truncation from blocker, destination, status, incident, and CTA text. [VERIFIED: codebase `src/components/cart/cart-line.tsx`, `src/components/catalog/add-to-cart.tsx`, `src/components/checkout/order-summary.tsx`] |
| Vietnam uses required Province/City -> Ward/Commune/Special zone -> detailed address | Still missing | The shared schema exposes generic `region`, `locality`, and address lines; Vietnam-specific hierarchy, pair validation, and labels do not exist. Add a repository snapshot and map province name to `region`, ward name to `locality`, detailed street to `addressLine1`, and optional legacy district/supplemental text to `addressLine2`. [VERIFIED: codebase `src/checkout/shipping-address.ts`, `src/components/checkout/destination-form.tsx`] |
| Vietnam phone accepts `0...` / `+84...`, normalizes, and revalidates server-side | Still missing | The current schema only applies generic length bounds. Implement one shared pure normalizer/validator used by browser presentation and the server action schema; store canonical `+84` form. [VERIFIED: codebase `src/checkout/shipping-address.ts`, `src/checkout/actions.ts`] |
| Country is searchable and US choices show localized name plus code | Still missing | `buildCountryOptions` already supplies localized labels and `searchText`, but the form renders a non-searchable Select; US rows render codes although label metadata exists. Reuse the metadata with a project-owned searchable select built on existing primitives. [VERIFIED: codebase `src/checkout/shipping-address-ui.ts`, `src/components/checkout/destination-form.tsx`, `src/components/ui/popover.tsx`, `src/components/ui/input.tsx`] |
| Validation is per-field after blur and submit focuses the first blocker | Contradicted | DestinationForm has one boolean `touched`; blurring a text field reveals unrelated address errors. Replace it with a field-key set/map, stable error IDs, `aria-invalid`/`aria-describedby`, and a deterministic first-blocker focus registry. Contact email already uses React Hook Form `mode: onBlur` and can remain. [VERIFIED: codebase `src/components/checkout/destination-form.tsx`, `src/components/checkout/contact-form.tsx`, `src/components/checkout/checkout-page.tsx`] |
| Editable email/address draft is versioned, tab-scoped, bounded, and cleared on success | Still missing | Checkout uses `sessionStorage` only for its reviewed idempotency helper. Add an independent editable-draft module with v1 schema, 12-hour TTL, byte cap, safe parsing, explicit allowlist, and removal of malformed/expired/unknown versions. Never store quote, discount validity, guest proof, tokens, incident/provider data, or save consent. [VERIFIED: codebase `src/checkout/idempotency.ts`, `src/components/checkout/checkout-page.tsx`; `10-UI-SPEC.md` assertion 5] |
| Signed-in save-address opt-in is unchecked and only saves after validation | Still missing | Saved-address selection/prefill and a secured address action/RPC already exist, but checkout exposes no consent checkbox or post-validation save call. Reuse the server-side save helper, force a fresh unchecked state, keep it out of the draft, and treat a save failure as non-blocking after order success. [VERIFIED: codebase `src/account/address-actions.ts`, `src/components/checkout/checkout-page.tsx`, Supabase migrations containing `save_customer_shipping_address`] |
| Mobile order summary appears near the top without duplicating state | Still missing | The summary is a desktop sticky aside and a bottom mobile action dock; the full summary appears later in document flow and has no near-top disclosure. Extract one presentation body fed by the same state and render it through a controlled mobile disclosure without duplicating totals/quote state. [VERIFIED: codebase `src/components/checkout/checkout-page.tsx`, `src/components/checkout/order-summary.tsx`] |
| Disabled checkout reason is complete/visible and order creation locks the editable region with `aria-busy` | Partial | Submit buttons disable during submission, preflight requote/idempotency/unknown-outcome handling is strong, but contact/address/discount controls remain editable, `aria-busy` is absent, blocker copy is conditional/truncated, and the action can stay enabled until submit discovers invalid contact/address. Add a derived blocker model and a submit stage such as checking-total/creating-order without altering entered values. [VERIFIED: codebase `src/components/checkout/checkout-page.tsx`, `src/components/checkout/order-summary.tsx`] |
| Incident references are copyable and contextual support/contact exists only when configured | Still missing | Incident text exists, but there is no copy control, centralized support config, `/contact` route, routing entry, email setting, or Zalo setting. Add sanitized server configuration and render contextual contact only when at least one channel is valid. [VERIFIED: codebase `src/components/checkout/checkout-page.tsx`, `src/i18n/routing.ts`, `src/lib/env/server.ts`, `.env.example`] |
| Cart/checkout/payment/recovery/success copy is bounded in `next-intl` and avoids internal terms | Partial | Payment/order namespaces exist with Vietnamese/English parity, while cart/checkout retain component-local bilingual objects and customer-visible terms such as “quote,” “market,” and fulfillment-lock language. Migrate only touched journey strings into bounded namespaces; do not translate unrelated site areas. [VERIFIED: codebase `src/messages/en.json`, `src/messages/vi.json`, cart/checkout/payment components] |
| Terminal failed/cancelled/rejected/expired states make restore-to-cart primary and never same-order retry | Contradicted | `sameOrderRetryAllowed` is correctly false and recovery snapshots exist, but status presentation points terminal states to a fresh checkout while the recovery banner separately offers restore. Remove the conflicting checkout CTA; one restore action owns recovery, and missing snapshot falls back to catalog. [VERIFIED: codebase `src/payments/status.ts`, `src/components/payments/order-recovery-banner.tsx`, `tests/unit/payments/status-mapping.test.ts`] |
| Access-denied order view offers localized guest recovery without enumeration | Partial | The denial is generic and non-enumerating, but it lacks the localized guest-order route and optional support path. Add those safe navigation actions without reflecting the requested order number or provider facts. [VERIFIED: codebase `src/components/payments/order-payment-page.tsx`, `src/i18n/routing.ts`, `tests/e2e/order-status.spec.ts`] |
| Payment page has one state hierarchy, one next action, and no repeated locked/downstream messaging | Partial | Server-projected status and provider gating are correct, but a generic state panel, VietQR card, fulfillment track, download panel, and summary repeat downstream/locked guidance. Compose the page by state and provider so each state gets one dominant heading/action and one downstream explanation. [VERIFIED: codebase `src/components/payments/order-payment-page.tsx`, `src/components/payments/payment-state-panel.tsx`, `src/components/payments/vietqr-instructions.tsx`] |
| Reservation deadline appears exactly once only while genuinely pending/verifying | Contradicted | A deadline is supplied to both the state panel and summary, and the state panel can display it for paid/terminal statuses. Derive `showPendingDeadline = awaiting_payment || verifying_payment`, choose one owner region, and render none for paid/terminal/review/refund states. [VERIFIED: codebase `src/components/payments/order-payment-page.tsx`, `src/components/payments/payment-state-panel.tsx`; `10-CONTEXT.md` Specific Ideas] |
| Recheck cooldown wakes at its deadline, locale controls time, and polling termination is announced once | Partial | PayPal and VietQR cadences, visibility checks, and bounded polling exist. The disabled button has no deadline wake-up, browser-default time formatting has no explicit locale/time zone, and callback dependencies can restart the polling window. Move timing into a stable deadline model with explicit timers, locale/time-zone formatting, cleanup, and one live-region terminal announcement. [VERIFIED: codebase `src/components/payments/payment-status-recheck.tsx`, `src/payments/format.ts`] |
| VietQR has three numbered steps, QR download, persistent manual fallback, safe copy, and no paid mutation | Partial | Manual account/amount/reference details, accessible copy fallbacks, truthful declaration feedback, and slow recheck already exist; numbered sequencing and QR download do not. Keep the existing “I transferred” declaration non-authoritative and add an authorized same-origin image-download route. [VERIFIED: codebase `src/components/payments/vietqr-instructions.tsx`, `src/payments/vietqr/customer-actions.ts`, `src/payments/vietqr/instructions.ts`] |
| Paid begins with confirmation, masked email, relevant next steps, and no deadline | Partial | Paid state is derived from server projection and masked email/next-step data exist, but the page is still generic and can show a deadline. Promote success facts to the first state region; do not change guest proof or private entitlement/download authorization. [VERIFIED: codebase `src/components/payments/order-payment-page.tsx`, `src/payments/status.ts`, `src/fulfillment/account-queries.ts`, `src/fulfillment/downloads.server.ts`] |
| Existing authority/security regressions cover provider pairs, server reconstruction, idempotency, snapshots, inventory, and private access | Already implemented | The targeted unit baseline is 70/70 green and checkout/payment security baseline is 20/20 green on 2026-08-04. Extend these suites; do not weaken existing assertions. [VERIFIED: executed `npm run test:unit -- ...` and `node --test tests/security/checkout-boundaries.test.mjs tests/security/payment-boundaries.test.mjs`] |
| Browser tests execute the required responsive bilingual payment-state matrix | Still missing | Current Playwright uses one Desktop Chrome project and `tests/e2e/order-status.spec.ts` contains skipped payment fixture scenarios. Phase 10 must make the relevant journeys executable and set the five required viewports explicitly. [VERIFIED: codebase `playwright.config.ts`, `tests/e2e/order-status.spec.ts`, `10-UI-SPEC.md` Testable Responsive and Interaction Matrix] |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| PDP/cart eligibility feedback and 44px/a11y behavior | Browser / Client | API / Backend | Client presents the server/cart agreement state and accessible controls; it must not independently decide commercial eligibility. [VERIFIED: codebase `src/components/catalog/add-to-cart.tsx`, `src/components/cart/cart-page.tsx`] |
| Vietnam administrative snapshot and pair lookup | Browser / Client | API / Backend | A checked-in dataset supports responsive selection; the identical pure lookup/validation runs again inside the server submit boundary. [VERIFIED: `10-CONTEXT.md` D-04–D-06] |
| Address persistence and saved-address consent | API / Backend | Database / Storage | The client supplies explicit intent; an authenticated server action invokes the existing RLS/RPC-backed address save after validation. [VERIFIED: codebase `src/account/address-actions.ts`; `10-CONTEXT.md` D-09] |
| Editable checkout draft | Browser / Client | — | It is tab-scoped presentation state only; it must never become quote, guest-access, payment, or order authority. [VERIFIED: `10-CONTEXT.md` D-08] |
| Quote refresh, order creation, provider pair, reservation | API / Backend | Database / Storage | Existing server action/database functions reconstruct facts and commit atomically; Phase 10 only refines UI orchestration around them. [VERIFIED: codebase `src/checkout/actions.ts`, `src/checkout/submit-checkout.ts`, Supabase migrations] |
| Support channel configuration | Frontend Server (SSR) | Browser / Client | Server code validates optional config and passes a minimal public DTO; clients render only configured safe channels. [VERIFIED: codebase pattern `src/lib/env/server.ts`; `10-CONTEXT.md` D-15–D-16] |
| Payment status and recovery eligibility | API / Backend | Browser / Client | Server-authorized order projection owns status; the client renders one truthful next action and may restore only the existing intent snapshot to cart. [VERIFIED: codebase `src/payments/queries.ts`, `src/payments/status.ts`, `src/components/payments/order-recovery-banner.tsx`] |
| VietQR QR image download | API / Backend | External VietQR image service | An authorized same-origin route re-derives/allowlists the upstream image and returns a bounded attachment; the browser never treats an arbitrary URL as trusted. [CITED: https://vietqr.io/danh-sach-api/link-tao-ma-nhanh/] |
| Paid success and private download access | API / Backend | Database / Storage | Verified server state opens the paid presentation; existing entitlement and signed-URL gates remain authoritative. [VERIFIED: `AGENTS.md` Digital security; codebase `src/fulfillment/account-queries.ts`, `src/fulfillment/downloads.server.ts`] |

## Standard Stack

No new dependency is required. Use installed packages and project-owned primitives only. Version and publish-time checks were run against the npm registry on 2026-08-04; package legitimacy is inherited from the locked project stack and no install is proposed. [VERIFIED: `AGENTS.md` Technology Stack; `package.json`; npm registry]

### Core

| Library | Version / publish date | Purpose | Why Standard for This Phase |
|---------|------------------------|---------|-----------------------------|
| Next.js | 16.2.9 / 2026-06-09 | Localized routes, server actions, authorized route handlers, SSR contact/order pages | Existing application framework and correct server/client trust boundary. [VERIFIED: `package.json`; npm registry] |
| React | 19.2.7 / 2026-06-01 | Existing form, disclosure, live-region, and state composition | Retain the current component tree; no parallel checkout app. [VERIFIED: `package.json`; npm registry] |
| TypeScript | 5.9.3 / installed | Discriminated payment states, draft schema, address option types | Prevents status/provider/address-shape drift across the seven slices. [VERIFIED: `package.json`] |
| Supabase Postgres/Auth | existing managed stack | Authoritative checkout, saved addresses, order/payment access, RLS | Existing functions/policies already own commerce and identity. [VERIFIED: `AGENTS.md`; Supabase migrations; `src/account/address-actions.ts`] |

### Supporting

| Library | Version / publish date | Purpose | When to Use |
|---------|------------------------|---------|-------------|
| `next-intl` | 4.13.0 / 2026-05-28 | Bounded bilingual cart/checkout/payment/support namespaces and locale formatting | Use for every new/migrated customer string and accessible name. [VERIFIED: `package.json`; npm registry; `src/i18n/routing.ts`] |
| Zod | 4.4.3 / 2026-05-04 | Draft/config/address/phone/route input validation | Reuse at every browser/server/external boundary; do not create ad-hoc type-only validation. [VERIFIED: `package.json`; npm registry; current env/address schemas] |
| React Hook Form | 7.80.0 / 2026-06-20 | Existing contact field on-blur validation | Keep for ContactForm; do not migrate the entire checkout just to solve destination touched state. [VERIFIED: `package.json`; npm registry; `src/components/checkout/contact-form.tsx`] |
| Existing Radix/shadcn primitives | installed/project-owned | Popover, Select, Input, Checkbox, Sheet, Alert, Button | Compose searchable selection, disclosure, 44px controls, and feedback without a new UI dependency. [VERIFIED: `src/components/ui/*`; `10-UI-SPEC.md` Design System] |
| Vitest | 4.1.8 / 2026-06-01 | Pure address/draft/timing/status/config unit tests | Fast per-task contract tests under the existing Node environment. [VERIFIED: `package.json`; npm registry; `vitest.config.ts`] |
| Playwright | 1.60.0 / 2026-05-11 | Bilingual/responsive/keyboard/real-flow verification | Required for tab order, viewport, disclosure, focus, and payment-state journeys. [VERIFIED: `package.json`; npm registry; `playwright.config.ts`] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Repository-owned Vietnam snapshot | Runtime address API | Rejected: contradicts D-05, adds availability/privacy risk, and makes checkout correctness depend on a third party. [VERIFIED: `10-CONTEXT.md` D-05] |
| Existing primitives and a small owned searchable-select abstraction | New command/combobox package | Rejected: approved UI contract forbids a new UI/state dependency for this stabilization phase. [VERIFIED: `10-UI-SPEC.md` Design System] |
| `sessionStorage` editable draft | `localStorage` or server draft table | Rejected: localStorage outlives the tab and server persistence would expand privacy/schema/account scope; D-08 specifically permits tab-scoped session storage. [VERIFIED: `10-CONTEXT.md` D-08; `10-UI-SPEC.md` Explicit Anti-Patterns] |
| Existing saved-address RPC | New checkout-address table/RPC | Rejected: duplicates a secured capability and creates unnecessary migration/RLS work. [VERIFIED: codebase `src/account/address-actions.ts`, Supabase migrations] |
| Same-origin QR download route | Direct cross-origin download link | The route can enforce order authorization, upstream allowlisting, content type/size, safe filename, and logging rules; a plain link cannot enforce those server controls. [VERIFIED: existing order authorization pattern; CITED: https://vietqr.io/danh-sach-api/link-tao-ma-nhanh/] |

**Installation:** None. Do not modify `package.json` or the lockfile in Phase 10 unless a later human-approved scope change supersedes the UI contract. [VERIFIED: `10-UI-SPEC.md` Design System and Registry Safety]

## Package Legitimacy Audit

Not applicable: the recommended plan installs no external package. All listed libraries are already project dependencies and were selected by the locked project stack. [VERIFIED: `package.json`; `AGENTS.md` Technology Stack]

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.

## Official Vietnam Data and Phone Contract

Vietnam's current administrative list is governed by Decision 19/2025/QĐ-TTg, effective 2025-07-01. The official government publication describes 34 province-level units and 3,321 commune-level units; province codes are two digits and commune codes are five digits. [CITED: https://chinhphu.vn/?classid=0&docid=214409&pageid=27160] [CITED: https://xaydungchinhsach.chinhphu.vn/bang-danh-muc-va-ma-so-cua-34-tinh-thanh-moi-cac-don-vi-hanh-chinh-cap-xa-moi-11925070418263625.htm]

Check in one immutable snapshot such as `src/checkout/data/vietnam-administrative-units-2025-07-01.json` with metadata containing the decision number, effective date, official source URL, extraction date, and a SHA-256 checksum of the reviewed source artifact. Tests must assert the 34/3,321 counts, code shapes, unique codes, every ward's parent, and exact pair lookup; production checkout performs no network call. [VERIFIED: `10-CONTEXT.md` D-04–D-05; official counts cited above]

For `country === 'VN'`, require the selected official province and a ward belonging to that province, require detailed address, and treat district only as an optional legacy/supplemental string. Persist display names through existing `region`, `locality`, `addressLine1`, and optional `addressLine2` fields; do not add authoritative district or code columns in this phase. [VERIFIED: codebase existing shipping-address shape; `10-CONTEXT.md` D-04]

The Ministry of Science and Technology's official portal confirms that Vietnamese mobile subscribers transitioned to ten-digit domestic numbers. Normalize common separators, accept `0` followed by nine digits or `+84` followed by nine digits, and persist `+84` plus the nine national digits; avoid a hard-coded carrier-prefix allowlist that would age independently of the official dataset. [CITED: https://english.mst.gov.vn/ten-digit-mobile-numbers-not-affected-by-network-code-shift-197137554.htm] The mobile-only scope of this exact length rule is an implementation recommendation and is recorded as assumption A1 below. [ASSUMED]

## Architecture Patterns

### System Architecture Diagram

```text
Product / Cart interaction
        |
        v
authoritative cart quote + agreement gate (existing server/cart authority)
        |
        v
Checkout client ---------------------------------------------------+
  | country/province/ward/street/phone/email                       |
  | field-scoped validation + 12h editable session draft           |
  | optional signed-in save-address consent                        |
  +--------------------------+-------------------------------------+
                             |
                             v
Checkout server action
  | re-parse address/phone -> verify VN province/ward pair
  | re-resolve destination -> canonical market/currency/provider
  | requote/recheck inventory -> compare material change
  | idempotent submit -> atomic reservation + immutable order
  +--------------------------+-------------------------------------+
                             |
              +--------------+---------------+
              |                              |
              v                              v
     vn + VND + VietQR              intl + USD + PayPal
     manual details/declaration     provider buttons/webhook
              |                              |
              +--------------+---------------+
                             v
                authorized order projection
                             |
          +------------------+-------------------+
          |                  |                   |
       pending           verified paid      terminal/review
   one deadline/action   success/next steps  restore cart/support
          |                  |                   |
          v                  v                   v
   bounded recheck     existing entitlement   new cart/order only
                      and shipping gates      (never same-order retry)

External boundary: authorized QR download route -> allowlisted img.vietqr.io
Database boundary: existing checkout/payment/address RPCs + RLS; no Phase 10 migration
```

[VERIFIED: codebase checkout/payment flow; `10-CONTEXT.md` D-22–D-24; `10-UI-SPEC.md` Authority boundary]

### Recommended Project Structure

```text
src/
├── checkout/
│   ├── shipping-address.ts                 # shared schema and server validation
│   ├── shipping-address-ui.ts              # localized/searchable display options
│   ├── vietnam-address.ts                  # pair lookup and VN address rules
│   ├── vietnam-phone.ts                    # pure normalization/validation
│   ├── editable-draft.ts                   # v1 session draft + TTL/size allowlist
│   └── data/
│       └── vietnam-administrative-units-2025-07-01.json
├── support/
│   └── config.ts                           # server-validated public support DTO
├── components/
│   ├── checkout/                           # extend existing forms/page/summary
│   ├── payments/                           # extend existing status/recheck/VietQR/recovery
│   ├── support/incident-reference.tsx      # copy + conditional contact action
│   └── ui/searchable-select.tsx            # one project-owned accessible abstraction
├── app/[locale]/contact/page.tsx           # localized public contact surface
└── app/[locale]/orders/[orderNumber]/qr/route.ts # authorized image attachment

tests/
├── unit/checkout/                          # VN data/phone/draft/address UI
├── unit/payments/                          # state/deadline/recheck/VietQR
├── unit/support/config.test.ts
├── e2e/checkout-ux.spec.ts
├── e2e/payment-ux.spec.ts
└── security/                               # extend checkout/payment boundary suites
```

File names may adapt to the existing route layout, but ownership must remain with these existing domains; do not create a second checkout or payment tree. [VERIFIED: `10-UI-SPEC.md` Design System; current code structure]

### Pattern 1: Presentation state is derived from authority, never authority itself

**What:** Keep a single pure projection from server-provided order/payment facts to customer-visible state, and let rendering choose one heading, one dominant action, and at most one pending deadline. [VERIFIED: codebase `src/payments/status.ts`; `10-CONTEXT.md` D-18–D-24]

**When to use:** Every payment/order render and after every recheck refresh.

```typescript
// Source: locked Phase 10 payment contract and current src/payments/status.ts
const isPending = status === 'awaiting_payment' || status === 'verifying_payment';
const deadline = isPending ? order.reservationExpiresAt : null;

const primaryAction = isRecoverableTerminal(status)
  ? recoverySnapshotAvailable
    ? {kind: 'restore_cart'}
    : {kind: 'catalog'}
  : stateSpecificAction(status, provider);
```

### Pattern 2: Editable drafts are allowlisted, versioned, and disposable

**What:** Persist only user-editable email/address fields after interaction, with version, saved time, expiry, maximum serialized bytes, and strict parsing. Remove any malformed, oversized, expired, or unknown-version record. [VERIFIED: `10-CONTEXT.md` D-08; `10-UI-SPEC.md` Draft behavior]

**When to use:** Client hydration and debounced checkout edits; never in server commerce decisions.

```typescript
// Source: locked Phase 10 draft contract
const editableDraftV1 = z.object({
  version: z.literal(1),
  savedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().positive(),
  email: z.string().email().max(320),
  shippingAddress: shippingAddressSchema
}).strict();

// TTL: 12 hours. Never add quote/payment/guest proof/save consent fields.
```

### Pattern 3: Browser/server reuse one pure VN normalization core

**What:** UI option generation remains presentation-only; a pure module owns phone normalization and province/ward membership checks, and the server action calls the same module after parsing. [VERIFIED: existing shared `src/checkout/shipping-address.ts` pattern; `10-CONTEXT.md` D-04–D-07]

**When to use:** Field feedback, quote request, final submit, and signed-in address save.

```typescript
// Source: Decision 19/2025/QD-TTg data contract and Phase 10 D-04/D-06
const normalizedPhone = normalizeVietnamPhone(input.phone);
const pair = findVietnamAddressPair(input.region, input.locality);

if (input.country === 'VN' && (!normalizedPhone || !pair)) {
  return fieldErrorsForVietnamAddress();
}
```

### Pattern 4: Successful commerce is not downgraded by optional post-success work

**What:** Order creation remains the primary transaction. When a signed-in customer explicitly opted in, invoke the existing secured address-save seam only with the already validated normalized address; a save failure produces non-blocking feedback and must not turn the order success into a checkout failure. [VERIFIED: `10-CONTEXT.md` D-09; existing `src/account/address-actions.ts`]

**When to use:** Immediately after confirmed order creation and before/around navigation, with save consent kept out of the draft.

### Pattern 5: Same-origin proxy for downloadable external QR imagery

**What:** Authorize order access first, re-derive the VietQR URL from the stored safe instruction snapshot/server configuration, allowlist HTTPS host/path, cap response bytes, require `image/png` or another explicitly accepted image type, and return `Content-Disposition: attachment` with a sanitized public order-number filename. Do not accept an arbitrary upstream URL from the browser and do not log the full account-bearing Quick Link. [VERIFIED: existing authorization and sanitized-audit patterns; CITED: https://vietqr.io/danh-sach-api/link-tao-ma-nhanh/]

**When to use:** The VietQR Download QR action only.

### Anti-Patterns to Avoid

- **Parallel authority:** Do not calculate payable totals, provider pairing, paid status, reservation release, or entitlement eligibility in the browser. [VERIFIED: `10-CONTEXT.md` D-22–D-23]
- **Required Vietnam district:** It conflicts with the current two-level model and the approved phase contract. [VERIFIED: `10-CONTEXT.md` D-04]
- **Runtime address API:** It conflicts with the repository-snapshot decision and introduces an avoidable checkout dependency. [VERIFIED: `10-CONTEXT.md` D-05]
- **Form-wide touched boolean:** It creates premature unrelated errors; track touched/submitted status per field. [VERIFIED: current contradictory implementation and `10-CONTEXT.md` D-10]
- **Drafting authority or consent:** Never put quote, discount validity, payment/provider state, guest proof/token, incident payload, or save-address checkbox into session storage. [VERIFIED: `10-CONTEXT.md` D-08–D-09]
- **Duplicated desktop/mobile state:** Present the same state model in responsive containers; do not maintain two totals, discount, address, deadline, or submit models. [VERIFIED: `10-CONTEXT.md` D-12; `10-UI-SPEC.md` Checkout mobile]
- **Generic terminal checkout CTA:** It bypasses restore-to-cart as the truthful recovery and risks implying same-order retry. [VERIFIED: `10-CONTEXT.md` D-17/D-24]
- **Unbounded polling or `Date.now()`-only disable:** Timers need absolute deadlines, wake-up scheduling, visibility handling, cleanup, and a single terminal announcement. [VERIFIED: `10-CONTEXT.md` D-19]
- **Public arbitrary-image proxy:** It creates IDOR/SSRF/data-exfiltration risk; derive the upstream URL after order authorization. [VERIFIED: existing order access model and ASVS V4/V5 requirements]
- **Toast-only commerce feedback:** Durable inline state is needed for screen readers, slow recovery, and customer confidence. [VERIFIED: `10-UI-SPEC.md` Explicit Anti-Patterns]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Money/provider/market decisions | Client total calculator or payment-method selector | Existing quote/submit/status projections | Browser facts are advisory; existing server and database seams enforce the pair and atomic outcomes. [VERIFIED: current checkout/payment code; `10-CONTEXT.md` D-22–D-23] |
| Vietnam administrative source | Scraper or live third-party lookup at checkout time | Reviewed repository snapshot of Decision 19/2025 data | Versioning, deterministic tests, runtime independence, and historical clarity. [CITED: https://chinhphu.vn/?classid=0&docid=214409&pageid=27160] |
| Draft schema parser | Unchecked `JSON.parse` scattered in components | One Zod-backed `editable-draft.ts` module | Handles corruption, expiry, version drift, and field allowlisting centrally. [VERIFIED: current Zod project pattern] |
| Saved-address persistence | New table/RPC or client Supabase write | Existing authenticated server helper/RPC/RLS path | Avoids duplicate authorization and schema policy. [VERIFIED: `src/account/address-actions.ts`, Supabase migrations] |
| Payment state machine | New client state enum or retry transition | Existing `mapCustomerPaymentStatus` plus corrected presentation | Current state model already covers all customer-visible lifecycle states and locked retry rules. [VERIFIED: `src/payments/status.ts`, `tests/unit/payments/status-mapping.test.ts`] |
| Guest order access | Query-string token or public order-number fetch | Existing HttpOnly/order-scoped guest access and authorized query | Prevents enumeration and secret leakage. [VERIFIED: checkout/payment security suites] |
| Paid/fulfillment gating | Client callback, timer, VietQR declaration, or success URL | Verified provider/webhook/database projection and existing entitlement gates | Presentation must not create financial truth. [VERIFIED: `10-CONTEXT.md` D-21–D-23] |
| QR download trust | Browser-provided external URL | Authorized server route that re-derives a VietQR Quick Link | Prevents arbitrary fetches and keeps receiving-account URLs out of logs/audit. [VERIFIED: current VietQR safe audit; CITED: https://vietqr.io/danh-sach-api/link-tao-ma-nhanh/] |

**Key insight:** Most Phase 10 work is presentation orchestration around already-correct authority. Reusing the existing state, action, RPC, RLS, and authorization seams is safer and faster than introducing replacement subsystems. [VERIFIED: live implementation audit]

## Seven-Plan Delivery Architecture

Planning must emit exactly these seven executable plans. Keep them sequential because adjacent slices necessarily touch shared message files and checkout/payment composition; sequential ownership costs less than merge/reconciliation risk. [VERIFIED: `10-CONTEXT.md` D-01 and agent discretion; live file-overlap audit]

| Plan | Wave | Depends on | Primary file ownership | Required outcome |
|------|------|------------|------------------------|------------------|
| **10-01 Cart/PDP accessibility and feedback** | 1 | — | `add-to-cart.tsx`, cart page/line/mini-cart, cart-specific message keys, cart unit/E2E | Complete linked blockers, hidden sticky removal from tab order, 44px controls, durable inline feedback, no essential truncation. [VERIFIED: `10-UI-SPEC.md` slice 1] |
| **10-02 Vietnam address, phone, draft, and save consent** | 2 | 10-01 | address schema/UI/data modules, DestinationForm address behavior, editable draft module, authenticated checkout save action, address/draft/security tests | Official 34/3,321 snapshot, pair validation, VN normalization, searchable country and readable US choices, 12-hour draft, unchecked signed-in save consent, no migration. [VERIFIED: `10-UI-SPEC.md` slice 2; official data citations] |
| **10-03 Checkout mobile hierarchy and bounded copy** | 3 | 10-02 | CheckoutPage/OrderSummary responsive composition, checkout/cart journey namespaces and parity tests | One shared summary state, top mobile disclosure, preserved desktop rail, wrapping dock/destination, customer language in bounded namespaces. [VERIFIED: `10-UI-SPEC.md` slice 3] |
| **10-04 Submit, field errors, incident copy, and support** | 4 | 10-03 | Destination/Contact submit coordination, CheckoutPage lifecycle, support config/component/route/routing/env, related tests | Field-scoped blur, first-blocker focus, entire editable region locked with `aria-busy`, honest known-vs-unknown failure, copyable incident, conditional bilingual email/Zalo contact. [VERIFIED: `10-UI-SPEC.md` slice 4] |
| **10-05 Payment state hierarchy and recovery** | 5 | 10-04 | status presentation, order page, state panel, recheck timing, recovery banner, payment namespaces/tests | One state/action/deadline, no paid/terminal deadline, stable cooldown/poll deadline and announcement, guest recovery, restore-to-cart primary, catalog fallback, no terminal retry. [VERIFIED: `10-UI-SPEC.md` slice 5] |
| **10-06 VietQR instructions, safe download, and paid success** | 6 | 10-05 | VietQR instructions/action/download route, paid composition, fulfillment-message deduplication, tests/security | Three numbered steps, manual/copy fallback, authorized QR attachment, truthful declaration, success-first masked-email next steps, verified state only. [VERIFIED: `10-UI-SPEC.md` slice 6] |
| **10-07 Regression and UAT gate** | 7 | 10-01…10-06 | test fixtures/specs, validation artifact, no feature redesign | Green full CI/security, executable bilingual state matrix, five viewports, keyboard/zoom/manual UAT, and authority checks without Phase 09 SEO deployment scope. [VERIFIED: `10-UI-SPEC.md` slice 7] |

The planner should assign `src/messages/en.json` and `src/messages/vi.json` sequentially to the active plan, rather than allowing two plans to edit them concurrently. Plan 10-07 may add test coverage but should return implementation defects to the owning slice rather than silently redesigning behavior. [VERIFIED: live shared-file overlap; `10-CONTEXT.md` agent discretion]

## Database and Migration Decision

**Recommendation: no Supabase migration in Phase 10.** The current shipping snapshot and saved-address models already store `region`, `locality`, `address_line_1`, and `address_line_2`; the Vietnam UI can store official province/ward display names in those fields and retain an optional legacy district/supplemental line without changing immutable historical orders. [VERIFIED: codebase `src/checkout/shipping-address.ts`, `src/account/address-actions.ts`, relevant checkout/address migrations]

The official administrative codes should remain dataset/UI validation identities in this phase, not new authoritative database columns. A future need to persist codes, carrier-specific district identifiers, address-version provenance per order, or multiple support records would be a separate migration decision and scope expansion. [VERIFIED: `10-CONTEXT.md` D-03–D-05]

No RLS policy change is required when checkout address saving reuses the existing authenticated server action/RPC. Any implementation that directly writes the address table from a client, creates a public QR download endpoint, or adds a support table would invalidate this recommendation and require a new security/migration review. [VERIFIED: existing account/address authorization and order-access patterns]

## Runtime State Inventory

Although this is not a rename, Phase 10 refactors browser persistence and customer-facing configuration, so all five runtime-state categories were checked. [VERIFIED: phase scope and runtime inventory audit 2026-08-04]

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | Existing browser state includes localStorage guest cart `amigurumi.guestCart.v1`, localStorage recovery snapshot `amigurumi.orderSnapshot.v1`, sessionStorage quote cache `amigurumi.cartQuote.v2`, and sessionStorage idempotency `atb_checkout_idempotency`; existing orders and saved addresses remain in Supabase. [VERIFIED: `src/cart/guest-storage.ts`, `src/cart/order-snapshot.ts`, `src/cart/quote-cache.ts`, `src/checkout/idempotency.ts`] | Do not rename or migrate existing keys. Add a distinct versioned editable-draft key, treat old/unknown draft versions as disposable, and clear only that draft on successful order creation. Existing database rows require no data migration. |
| Live service config | Existing PayPal/VietQR/Resend/Supabase configuration remains server-owned. Support email, Zalo URL, and explicit store time zone are not present in the current env schema/example or deployment config represented in git. [VERIFIED: `src/lib/env/server.ts`, `.env.example`] | Extend the server schema and `.env.example`; configure optional support channels and the selected time zone in deployed environment management. Absence must render a safe neutral state, not block checkout. |
| OS-registered state | None — no Windows Task Scheduler entry matching Ambertinybear, the workspace, checkout, VietQR, or PayPal was found, and this phase changes no service/process registration. [VERIFIED: read-only `schtasks /Query` audit 2026-08-04] | None. |
| Secrets/env vars | No secret or environment-variable rename is required. Existing receiving-bank and PayPal secrets must remain server-only; proposed support values/time zone are public configuration but should still be validated server-side before projection. [VERIFIED: `.env.example`, `src/lib/env/server.ts`, security boundary tests] | Add only optional `SUPPORT_EMAIL`, `SUPPORT_ZALO_URL`, and `STORE_TIME_ZONE` (or equivalently named centralized fields); never prefix existing payment/Supabase secrets with `NEXT_PUBLIC_`. |
| Build artifacts / installed packages | `.next` and generated Supabase types are reproducible; no package addition, rename, Docker image tag change, or installed binary change is planned. [VERIFIED: `package.json`, `.gitignore`, package scripts] | Normal clean build/full CI regenerates artifacts and types. No reinstall or artifact migration is needed. |

## Common Pitfalls

### Pitfall 1: Treating the official administrative list as a UI-only suggestion
**What goes wrong:** A forged ward/province pair passes the browser and reaches the immutable order snapshot. [VERIFIED: current generic server schema]
**Why it happens:** The dataset is added only to a dropdown, while server submit keeps generic string validation. [VERIFIED: common failure against D-04/D-06]
**How to avoid:** Reuse one pure pair lookup in browser feedback and server-side schema refinement; reset ward when province changes. [VERIFIED: `10-CONTEXT.md` D-04–D-06]
**Warning signs:** A request can submit an arbitrary `locality` for VN, or changing province leaves the prior ward selected.

### Pitfall 2: Draft hydration overwrites stronger server prefill
**What goes wrong:** An old tab draft replaces a newer signed-in saved address/email or flashes between values. [VERIFIED: architecture risk from existing server prefill plus new draft]
**Why it happens:** Client hydration applies unconditionally after first render.
**How to avoid:** Define deterministic precedence: valid unexpired draft wins only when it is newer than the current tab's edit baseline; otherwise server-provided account/default-address data wins. Persist only after user interaction and clear only after confirmed order creation. [VERIFIED: `10-CONTEXT.md` D-08; `10-UI-SPEC.md` draft assertions]
**Warning signs:** First paint and hydrated values differ without user action, or a failed submit deletes the draft.

### Pitfall 3: Making optional address save part of order success
**What goes wrong:** A valid order is shown as failed because the optional address save failed or timed out. [VERIFIED: architecture risk]
**Why it happens:** Both operations are awaited under one catch/error state.
**How to avoid:** Confirm order success first; save only after explicit consent with the validated normalized address, and report save failure as secondary/non-blocking. [VERIFIED: `10-CONTEXT.md` D-09]
**Warning signs:** Retrying checkout after a save-address failure can create confusion or duplicate work.

### Pitfall 4: Duplicating responsive checkout state
**What goes wrong:** Mobile disclosure, desktop rail, and bottom dock show different totals, blockers, or destinations. [VERIFIED: current multiple presentation regions]
**Why it happens:** Each region owns its own derived state or form instance.
**How to avoid:** Extract presentation-only summary content and pass one immutable view model to all responsive shells; inactive duplicate submit controls must be `display:none`/unmounted and untabbable. [VERIFIED: `10-UI-SPEC.md` responsive contract]
**Warning signs:** Expanding summary changes form state, there are two tabbable submit buttons, or one blocker truncates.

### Pitfall 5: Restarting or extending the payment poll window on render
**What goes wrong:** Polling continues longer than intended, cooldown never visibly expires, or “polling ended” is announced repeatedly. [VERIFIED: current callback/effect structure risk]
**Why it happens:** The effect depends on a callback that changes with cooldown state and resets `startedAtRef`.
**How to avoid:** Capture one absolute `pollEndsAt`, schedule exact next/cooldown wake-ups, pause network calls while hidden without extending the deadline, and gate the live announcement with a ref. [VERIFIED: `10-CONTEXT.md` D-19]
**Warning signs:** The recheck button remains disabled after its timestamp, or DevTools shows polling after terminal state/navigation.

### Pitfall 6: Letting a QR image proxy become SSRF or an order oracle
**What goes wrong:** Attackers make the server fetch arbitrary URLs or infer another order's payment details. [VERIFIED: ASVS V4/V5 threat analysis]
**Why it happens:** The client sends the upstream QR URL or the route authorizes only by public order number.
**How to avoid:** Reuse the same guest/customer order authorization as the order page, re-derive the Quick Link server-side, allowlist HTTPS `img.vietqr.io`, cap bytes, validate MIME, and return generic denial. [VERIFIED: existing order authorization; CITED: https://vietqr.io/danh-sach-api/link-tao-ma-nhanh/]
**Warning signs:** A `url=` query parameter, raw account URL in logs, redirects to unvalidated hosts, or distinguishable not-found/forbidden responses.

### Pitfall 7: “Fixing” terminal recovery by enabling provider retry
**What goes wrong:** Payment and inventory decisions from Phase 04 are violated and the same expired/failed order becomes payable again. [VERIFIED: `10-CONTEXT.md` D-24]
**Why it happens:** A generic Pay again button is easier than restore-to-cart/new-order recovery.
**How to avoid:** Keep `sameOrderRetryAllowed=false`; restore eligible intent to the authoritative cart, then start a fresh checkout/order. [VERIFIED: codebase status mapping; `10-CONTEXT.md` D-17/D-24]
**Warning signs:** Terminal state renders PayPal/VietQR controls or links directly to an order-specific provider action.

### Pitfall 8: Broad translation migration hides functional regressions
**What goes wrong:** A stabilization phase rewrites unrelated copy, produces key drift, or loses accessible names in one locale. [VERIFIED: current mixed inline/namespace architecture]
**Why it happens:** Teams attempt to “finish i18n” globally while touching checkout.
**How to avoid:** Add bounded cart/checkout/support/payment keys owned by the relevant plan, assert key parity, and run the Vietnamese-diacritic checker after each slice. [VERIFIED: `10-CONTEXT.md` D-13; package scripts]
**Warning signs:** Large unrelated message diffs, raw key rendering, or English `aria-label` under `/vi`.

## Code Examples

Verified/recommended patterns for planning actions:

### Field-scoped touched state

```typescript
// Source: Phase 10 D-10 and approved UI-SPEC validation contract
type AddressField = keyof ShippingAddressInput;

const [touched, setTouched] = useState<Partial<Record<AddressField, true>>>({});
const reveal = (field: AddressField) =>
  setTouched((current) => ({...current, [field]: true}));

const visibleError = (field: AddressField) =>
  Boolean(touched[field] || submitAttempted) ? errors[field] : undefined;
```

### Locale- and time-zone-controlled deadline formatting

```typescript
// Source: existing Intl formatting pattern in src/payments/format.ts + Phase 10 D-19
export function formatPaymentDeadline(
  value: string,
  locale: 'vi' | 'en',
  timeZone: string
) {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
    timeZoneName: 'short'
  }).format(new Date(value));
}
```

### Safe support projection

```typescript
// Source: existing Zod server-env pattern in src/lib/env/server.ts + Phase 10 D-15/D-16
const publicSupportSchema = z.object({
  email: z.email().optional(),
  zaloUrl: z.url().refine((url) => new URL(url).hostname === 'zalo.me').optional()
});

export type PublicSupport = {
  emailHref: string | null;
  zaloHref: string | null;
  hasChannels: boolean;
};
```

### Authorized QR attachment response

```typescript
// Source: official VietQR Quick Link format + existing authorized order route pattern
const image = await fetch(rederivedAllowlistedQuickLink, {
  redirect: 'error',
  cache: 'no-store'
});

if (!image.ok || image.headers.get('content-type') !== 'image/png') {
  return genericDownloadFailure();
}

return new Response(await readBoundedBody(image.body, MAX_QR_BYTES), {
  headers: {
    'Content-Type': 'image/png',
    'Content-Disposition': `attachment; filename="vietqr-${safeOrderNumber}.png"`,
    'Cache-Control': 'private, no-store'
  }
});
```

[CITED: https://vietqr.io/danh-sach-api/link-tao-ma-nhanh/]

## State of the Art

| Old/current approach | Required Phase 10 approach | When changed / authority | Impact |
|----------------------|----------------------------|--------------------------|--------|
| Vietnam province/district/ward assumptions | Current province -> commune-level two-tier list with district optional/legacy | Decision 19/2025/QĐ-TTg, effective 2025-07-01 | Checkout data and tests must reflect 34 province-level and 3,321 commune-level units. [CITED: official government sources above] |
| Generic free-form VN region/locality | Versioned official snapshot plus exact parent/child validation | Phase 10 D-04/D-05 | Prevents invalid pairs without a runtime API. [VERIFIED: `10-CONTEXT.md`] |
| Component-local bilingual objects | Bounded `next-intl` namespaces | Existing project i18n pattern and Phase 10 D-13 | Keeps visible copy and accessible names aligned across vi/en. [VERIFIED: message files and routing] |
| Generic payment panel with repeated countdown/lock copy | Server-state-specific composition with one action and one pending deadline | Phase 10 D-18/D-19 | Reduces contradictory instructions without changing payment states. [VERIFIED: `10-CONTEXT.md`] |
| Terminal “new checkout” CTA | Restore eligible snapshot to cart; catalog if unavailable | Phase 10 D-17/D-24 | Preserves the no-same-order-retry rule and offers truthful recovery. [VERIFIED: `10-CONTEXT.md`] |
| Direct QR display only | Manual details plus authorized same-origin download | Phase 10 D-20 | Adds a useful download while preserving manual fallback and order access. [VERIFIED: `10-CONTEXT.md`; CITED: VietQR Quick Link docs] |

**Deprecated/outdated:**
- Required district for Vietnam: do not introduce it; current official/locked model is two-level. [VERIFIED: `10-CONTEXT.md` D-04; official decision citations]
- Legacy code-only US choice rows: render localized name plus code while submitting the normalized code. [VERIFIED: `10-CONTEXT.md` D-07]
- Generic terminal checkout action: remove it in favor of snapshot recovery/catalog. [VERIFIED: `10-CONTEXT.md` D-17/D-24]
- Browser-default deadline time zone: replace with a single explicit store time-zone policy passed to formatters and recheck UI. [VERIFIED: `10-CONTEXT.md` D-19; current `src/payments/format.ts` gap]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | VN checkout contact accepts current ten-digit Vietnamese mobile numbers (`0` + 9 digits / `+84` + 9 digits), rejects fixed-line numbers, and persists the canonical `+84` form. [RESOLVED] | Official Vietnam Data and Phone Contract | Locked for Phase 10 under the phase's implementation discretion because shipping/order communication requires a mobile contact. |
| A2 | `STORE_TIME_ZONE` remains configurable and falls back to `Asia/Ho_Chi_Minh`; formatting labels the zone and stored UTC instants remain unchanged. [RESOLVED] | Environment / payment formatting | Locked for Phase 10 under the phase's implementation discretion; changing the fallback later does not change persisted timestamps. |

## Open Questions (RESOLVED)

1. **Vietnam shipping contact accepts mobile numbers only.**
   - What we know: The locked contract requires common `0...` and `+84...` forms, and the official Ministry source confirms current mobile numbers are ten domestic digits. [CITED: https://english.mst.gov.vn/ten-digit-mobile-numbers-not-affected-by-network-code-shift-197137554.htm]
   - Resolution: Accept current ten-digit Vietnamese mobile numbers in common domestic/international forms, normalize to canonical `+84`, and reject fixed-line shapes. [RESOLVED: Phase 10 implementation discretion, 2026-08-04]

2. **Customer deadlines use a configurable store time zone with a Vietnam fallback.**
   - What we know: The current formatter does not pass a `timeZone`, and D-19 requires locale-controlled formatting. [VERIFIED: `src/payments/format.ts`; `10-CONTEXT.md` D-19]
   - Resolution: Add validated `STORE_TIME_ZONE`, fall back to and visibly label `Asia/Ho_Chi_Minh`, and keep all stored instants unchanged. [RESOLVED: Phase 10 implementation discretion, 2026-08-04]

Both questions are resolved for Phase 10. They remain narrow, reversible validation/configuration choices and do not alter commerce authority or schema. [VERIFIED: scope analysis]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Next.js, Vitest, scripts | ✓ | 20.19.4 | — [VERIFIED: local command 2026-08-04] |
| npm | Existing dependency/test scripts | ✓ | 10.8.1 | — [VERIFIED: local command 2026-08-04] |
| Supabase CLI | Database reset/lint/test/type generation | ✓ | 2.107.0 | No fallback needed. [VERIFIED: local command 2026-08-04] |
| Docker CLI + engine | Local Supabase and full CI | ✓ | 28.5.1 client/server | — [VERIFIED: `docker info` 2026-08-04] |
| Git | Atomic plan execution/commits | ✓ | 2.45.1.windows.1 | — [VERIFIED: local command 2026-08-04] |
| VietQR Quick Link image service | Existing QR rendering and new download | External | Official URL contract reviewed | Manual bank details remain the required fallback if image fetch fails. [CITED: https://vietqr.io/danh-sach-api/link-tao-ma-nhanh/] |
| PayPal sandbox credentials | End-to-end provider flow | Config-dependent | Not probed/exposed during research | Existing provider unit/security tests; executable sandbox UAT requires configured secrets. [VERIFIED: `.env.example`, `src/lib/env/server.ts`] |
| Support email/Zalo | Contact/error recovery | Optional config, currently absent from schema/example | — | Render neutral contact page/navigation and no contextual contact link when no channel is configured. [VERIFIED: codebase config audit; `10-CONTEXT.md` D-15] |

**Missing dependencies with no fallback:** none for implementation and local automated tests. [VERIFIED: local environment audit]

**Missing dependencies with fallback:** PayPal sandbox configuration and support channels are environment/configuration-dependent; plans must keep provider fixture tests and conditional empty states executable without inventing credentials or contact values. [VERIFIED: `.env.example`; `10-CONTEXT.md` D-15]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Unit framework | Vitest 4.1.8, Node environment, `tests/unit/**/*.test.ts`. [VERIFIED: `vitest.config.ts`, `package.json`] |
| Browser framework | Playwright 1.60.0, Chromium, serial single worker, local Next server on port 3210. [VERIFIED: `playwright.config.ts`, `package.json`] |
| Security framework | Node test boundary suites invoked by `npm run test:security`. [VERIFIED: `package.json`] |
| Database framework | Supabase reset, lint, pgTAP database tests, generated-type diff. [VERIFIED: package scripts] |
| Quick run command | `npm run test:unit -- <owned test files>` |
| Security quick command | `node --test tests/security/checkout-boundaries.test.mjs tests/security/payment-boundaries.test.mjs` |
| Full suite command | `npm run ci` |

### Phase Requirements -> Test Map

| Requirement / decision | Behavior | Test type | Automated command | File exists? |
|------------------------|----------|-----------|-------------------|--------------|
| CART-01–05, D-11/D-14 | Full linked blockers, authoritative cart state, 44px targets, hidden sticky not tabbable | unit + E2E | `npm run test:unit -- tests/unit/catalog/add-to-cart.test.ts && npm run test:e2e -- tests/e2e/cart.spec.ts tests/e2e/checkout-ux.spec.ts` | Partial; extend existing + ❌ Wave 0 |
| MKT-06, SHIP-03/09/11/12/13, D-04–D-07 | Official VN pair, district optional, VN phone normalization, country search, localized US labels/code submission | unit + integration + E2E | `npm run test:unit -- tests/unit/checkout/vietnam-address.test.ts tests/unit/checkout/vietnam-phone.test.ts tests/unit/checkout/shipping-address-ui.test.ts` | ❌ Wave 0 except existing shipping UI test |
| D-08/D-09 | 12-hour tab draft allowlist/removal/clear and unchecked signed-in address save | unit + E2E + security | `npm run test:unit -- tests/unit/checkout/editable-draft.test.ts && node --test tests/security/checkout-boundaries.test.mjs` | ❌ Wave 0 + extend security |
| D-10–D-12 | Per-field blur, first-error focus, single responsive summary state, wrapping blocker | E2E | `npm run test:e2e -- tests/e2e/checkout-ux.spec.ts` | ❌ Wave 0 |
| ORD-01/02, INV-02–05, D-11/D-23 | Locked `aria-busy` submit, preflight requote, dedupe/idempotency, known vs unknown outcome, immutable order/reservation | unit + E2E + security + DB | `npm run test:unit -- tests/unit/checkout/actions.test.ts tests/unit/checkout/submit-checkout.test.ts tests/unit/checkout/idempotency.test.ts && npm run test:security && npm run db:test` | Existing; extend assertions |
| D-13–D-16 | Bounded copy parity, Vietnamese diacritics, incident copy, conditional support/contact and guest recovery | unit + E2E | `npm run check:vi-diacritics && npm run test:unit -- tests/unit/support/config.test.ts && npm run test:e2e -- tests/e2e/checkout-ux.spec.ts tests/e2e/payment-ux.spec.ts` | ❌ support/payment UX Wave 0 |
| PAY-01–08, D-17/D-18/D-24 | Every state has truthful hierarchy/action, restore-to-cart terminal recovery, catalog fallback, no same-order retry | unit + E2E + security | `npm run test:unit -- tests/unit/payments/status-mapping.test.ts tests/unit/payments/order-recovery.test.ts && npm run test:e2e -- tests/e2e/payment-ux.spec.ts` | Partial; payment E2E currently skipped |
| D-19 | One pending deadline, no paid/terminal deadline, exact cooldown wake, stable poll end/announcement, locale/time zone | unit + E2E | `npm run test:unit -- tests/unit/payments/recheck-model.test.ts tests/unit/payments/format.test.ts && npm run test:e2e -- tests/e2e/payment-ux.spec.ts` | ❌ timing model/UX Wave 0; format exists |
| D-20 | Three numbered VietQR steps, manual/copy fallback, authorized download, no receipt/paid mutation | unit + E2E + security | `npm run test:unit -- tests/unit/payments/vietqr.test.ts && node --test tests/security/payment-boundaries.test.mjs && npm run test:e2e -- tests/e2e/payment-ux.spec.ts` | Partial; extend all |
| PAY-07/08, ACC-03, D-21 | Verified paid success only, masked email, relevant digital/physical next steps, private entitlement unchanged | unit + E2E + security | `npm run test:unit -- tests/unit/payments/status-mapping.test.ts && npm run test:security && npm run test:e2e -- tests/e2e/payment-ux.spec.ts` | Partial; browser states currently skipped |

### Required Responsive/State Matrix

Use semantic roles and localized accessible names in both `/vi` and `/en`. Explicitly exercise `375x812`, `390x844`, `768x1024`, `1024x768`, and `1440x900`; include 200% zoom/reflow, no horizontal overflow, mobile safe-area dock, hidden duplicate tab order, keyboard country/province/ward selection, and one primary action. [VERIFIED: `10-UI-SPEC.md` Testable Responsive and Interaction Matrix]

Payment fixtures must cover pending PayPal, pending VietQR, verifying, review-required, paid, failed, cancelled, rejected, expired, partially refunded, refunded, unauthorized guest, signed-in owner, and missing recovery snapshot. The existing skipped `tests/e2e/order-status.spec.ts` is not sufficient evidence until seeded fixtures/helpers make the relevant cases executable. [VERIFIED: `tests/e2e/order-status.spec.ts`, `tests/unit/payments/status-mapping.test.ts`, `10-UI-SPEC.md` assertions 10–15]

### Sampling Rate

- **Per task commit:** Run the exact owned Vitest file(s), `npm run typecheck`, and the relevant checkout/payment security file when a trust boundary changes. [VERIFIED: existing scripts]
- **Per wave merge:** `npm run lint && npm run typecheck && npm run check:vi-diacritics && npm run test:unit && npm run test:security`. [VERIFIED: package scripts]
- **After any migration:** Not applicable under the recommended no-migration design; if scope changes, run `npm run db:reset && npm run db:lint && npm run db:test && npm run db:types` and require a clean generated-type diff. [VERIFIED: package scripts]
- **Phase gate:** `npm run ci`, then manual bilingual keyboard/200%-zoom/payment-provider UAT before `$gsd-verify-work`. [VERIFIED: project workflow and UI-SPEC]

### Wave 0 Gaps

- [ ] `tests/unit/checkout/vietnam-address.test.ts` — snapshot metadata/counts/codes/parent-child validation and district-optional mapping.
- [ ] `tests/unit/checkout/vietnam-phone.test.ts` — accepted forms, separator cleanup, canonical persistence form, invalid boundaries.
- [ ] `tests/unit/checkout/editable-draft.test.ts` — v1 allowlist, 12-hour TTL, size cap, malformed/expired/unknown removal, clear-on-success contract.
- [ ] `tests/unit/support/config.test.ts` — valid/absent/malformed email and Zalo configuration, safe public DTO, no placeholder.
- [ ] `tests/unit/payments/recheck-model.test.ts` — exact cooldown wake, one absolute polling deadline, hidden-tab behavior, terminal announcement once.
- [ ] `tests/unit/payments/order-recovery.test.ts` — terminal restore primary/catalog fallback/no same-order provider action.
- [ ] `tests/e2e/checkout-ux.spec.ts` — bilingual address/draft/touched/mobile/disclosure/submit/support/a11y matrix.
- [ ] `tests/e2e/payment-ux.spec.ts` — executable authorized state fixtures, access recovery, deadline/recheck, VietQR/download, paid hierarchy.
- [ ] Extend `tests/security/checkout-boundaries.test.mjs` so `sessionStorage` is permitted only in the reviewed idempotency and editable-draft modules and forbidden fields cannot enter the draft.
- [ ] Extend `tests/security/payment-boundaries.test.mjs` for QR route authorization, fixed allowlisted upstream, no arbitrary URL/redirect, bounded image response, sanitized filename/logging, and no paid mutation.
- [ ] Add message-key parity assertions for the bounded Phase 10 namespaces if the existing test suite lacks an equivalent.

No testing package installation or new test runner configuration is needed. [VERIFIED: existing Vitest/Playwright/Node infrastructure]

## Security Domain

Security enforcement is enabled at ASVS Level 1. [VERIFIED: `.planning/config.json`]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Guest checkout remains unauthenticated; saved-address action requires the existing authenticated server identity, never a client user ID. [VERIFIED: `src/account/address-actions.ts`; `10-CONTEXT.md` D-09] |
| V3 Session Management | yes | Existing guest order proof remains HttpOnly/order-scoped; editable draft is tab-scoped PII intent with 12-hour TTL and explicitly excludes proof/token/payment data. [VERIFIED: checkout/payment security suites; `10-CONTEXT.md` D-08] |
| V4 Access Control | yes | Reuse authorized order projection for payment page and QR download; generic non-enumerating denial; RLS/RPC for saved addresses and entitlements. [VERIFIED: current order/address/fulfillment boundaries] |
| V5 Input Validation | yes | Zod plus official VN pair lookup, server phone normalization, safe support URL/email parsing, fixed QR upstream, MIME/size checks, and sanitized filenames. [VERIFIED: project Zod pattern; official data sources] |
| V6 Cryptography | yes | Do not add crypto; preserve existing guest-token hashing, webhook verification, server secrets, and short-lived signed download URLs. [VERIFIED: current security suites; `AGENTS.md` Digital security] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged province/ward/phone payload bypasses UI | Tampering | Re-parse and validate the official pair/normalized phone inside server actions. [VERIFIED: D-04/D-06 authority requirement] |
| Session draft stores proof, payment, quote, or excessive PII | Information Disclosure / Tampering | Strict field allowlist, 12-hour TTL, byte cap, same-tab storage, clear on success, security source scan, never log contents. [VERIFIED: D-08 and UI-SPEC assertion 16] |
| Save-address action targets another user | Elevation of Privilege | Derive user from authenticated server session and use existing RLS/RPC; ignore any client identity. [VERIFIED: existing address action pattern] |
| QR download fetches arbitrary network target | Spoofing / Information Disclosure | Do not accept URL input; server re-derives HTTPS VietQR URL, rejects redirects, caps bytes, validates MIME. [VERIFIED: security analysis; official fixed host contract] |
| QR/order route reveals existence or bank details | Information Disclosure | Existing guest/customer authorization, generic denial, private/no-store response, no account-bearing URL in logs/audit. [VERIFIED: current order authorization and VietQR sanitized audit] |
| Client marks payment paid from callback/declaration/timer | Tampering | Render paid only from verified server projection; declarations only request reconciliation. [VERIFIED: D-21–D-23 and existing payment actions] |
| Duplicate checkout during slow/unknown response | Tampering / Repudiation | Preserve idempotency storage, entire-form lock, `aria-busy`, server dedupe, and distinct known vs unknown outcome copy. [VERIFIED: current checkout implementation and security suite] |
| Support URL or incident identifier leaks sensitive values | Information Disclosure / Spoofing | Validate configured channel schemes/hosts server-side; display only opaque incident IDs already mapped for customers; no sensitive query parameters. [VERIFIED: D-15/D-16 and UI-SPEC anti-patterns] |
| Terminal UI enables same-order payment retry | Tampering / Repudiation | Keep `sameOrderRetryAllowed=false`; restore cart intent and create a fresh order. [VERIFIED: D-24 and status tests] |

Security tests must continue proving exact `vn+VND+vietqr` and `intl+USD+paypal` pairing, authoritative submit reconstruction, immutable order evidence, verified-paid transition, reservation/inventory outcomes, private entitlement, and no raw guest/provider secrets in browser code. [VERIFIED: current checkout/payment security suites; `10-CONTEXT.md` D-22–D-23]

## Sources

### Primary (HIGH confidence)

- Current repository source and tests listed throughout this document — implementation behavior, existing seams, gaps, and green targeted baseline. [VERIFIED: codebase and executed tests 2026-08-04]
- `10-CONTEXT.md` — locked D-01–D-24, discretion, and deferred scope. [VERIFIED: phase context]
- `10-UI-SPEC.md` — approved responsive, interaction, test, anti-pattern, and exact seven-slice contract. [VERIFIED: approved phase UI specification]
- `AGENTS.md`, `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, and prior Phase 03/04/08/09 contexts — stack, commerce, security, and authority constraints. [VERIFIED: project planning artifacts]
- [Vietnam Government Decision 19/2025/QĐ-TTg](https://chinhphu.vn/?classid=0&docid=214409&pageid=27160) — official current administrative list, effective date, code structure. [CITED: official government]
- [Government policy publication of the 34/3,321 list](https://xaydungchinhsach.chinhphu.vn/bang-danh-muc-va-ma-so-cua-34-tinh-thanh-moi-cac-don-vi-hanh-chinh-cap-xa-moi-11925070418263625.htm) — official counts and attached administrative list. [CITED: official government]
- [Ministry portal: ten-digit mobile numbers](https://english.mst.gov.vn/ten-digit-mobile-numbers-not-affected-by-network-code-shift-197137554.htm) — official mobile-number length transition. [CITED: official ministry]
- [VietQR Quick Link documentation](https://vietqr.io/danh-sach-api/link-tao-ma-nhanh/) — official QR image URL parameters/templates used by the existing integration. [CITED: official VietQR]

### Secondary (MEDIUM confidence)

- npm registry version/publish-time lookups for the already installed stack, checked 2026-08-04. [VERIFIED: npm registry]

### Tertiary (LOW confidence)

- Assumptions A1–A2 only; both are isolated, reversible configuration/validation choices and require explicit confirmation before locking. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages are installed, locked by project instructions, and registry versions/publish times were checked; no new package is proposed. [VERIFIED: `package.json`, npm registry]
- Architecture: HIGH — recommendations extend live server/client/RPC/RLS seams and approved Phase 10 decisions rather than inventing new subsystems. [VERIFIED: codebase and phase artifacts]
- Current implementation audit: HIGH — every row was re-checked against current source/tests; targeted baseline is green. [VERIFIED: codebase and executed tests]
- Vietnam administrative data: HIGH for the official two-level counts/codes/effective date; the checked-in extraction still requires implementation-time review/checksum tests. [CITED: official government sources]
- Phone rule: MEDIUM — common mobile normalization is supported by an official source, but fixed-line acceptance is not locked. [CITED: official ministry] [ASSUMED]
- Pitfalls/security: HIGH — derived from current code paths, locked boundaries, and existing security harnesses. [VERIFIED: codebase and phase artifacts]

**Research date:** 2026-08-04
**Valid until:** 2026-09-03 for codebase findings; re-check the official Vietnam list and package patches if planning/execution begins after that date.
