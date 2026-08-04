# Phase 10: Checkout and payment UX stabilization for Vietnamese and international customers - Context

**Gathered:** 2026-08-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Stabilize and simplify the existing customer journey from product/cart through checkout, order creation, VietQR or PayPal payment, and terminal success/failure states. This phase improves Vietnamese-market address handling, accessibility, recovery, responsive information hierarchy, customer-facing language, and state-specific guidance without changing server-owned prices, destination-owned market resolution, payment verification, inventory reservation, immutable order evidence, or entitlement gates.

</domain>

<decisions>
## Implementation Decisions

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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and workflow constraints
- `.planning/PROJECT.md` — Guest checkout, bilingual markets, payment confirmation, mixed carts, protected PDFs, inventory, and SEO constraints.
- `.planning/REQUIREMENTS.md` — Existing cart, checkout, shipping, payment, order, fulfillment, account, and accessibility-related requirement traceability.
- `.planning/ROADMAP.md` — Phase 10 boundary, dependency, and the seven-plan limit.
- `AGENTS.md` — Project stack and mandatory GSD workflow enforcement.

### Locked prior decisions
- `.planning/phases/03-mixed-cart-and-checkout/03-CONTEXT.md` — Authoritative mixed-cart, destination quote, discount, reservation, and checkout decisions.
- `.planning/phases/04-trusted-payments-and-orders/04-CONTEXT.md` — Payment lifecycle, same-order retry prohibition, address snapshots, PayPal/VietQR, audit, and inventory outcomes.
- `.planning/phases/08-shipping-profile-fallbacks-destination-zones-and-us-region-s/08-CONTEXT.md` — Shipping fallback, US region, quote lifecycle, and immutable allocation decisions.
- `.planning/phases/09-independent-locale-and-market-commerce-projection-with-seo-s/09-CONTEXT.md` — Independent locale/market, SEO-safe rendering, market-change requote, and destination-owned payment decisions.

### Current implementation surfaces
- `src/components/catalog/add-to-cart.tsx` — PDP add-to-cart and sticky mobile action.
- `src/components/cart/cart-page.tsx` — Cart totals, recovery, checkout entry, and blocked states.
- `src/components/cart/mini-cart.tsx` — Compact cart mutation behavior.
- `src/components/checkout/checkout-page.tsx` — Checkout orchestration, submit lifecycle, feedback, routing, and responsive layout.
- `src/components/checkout/destination-form.tsx` — Destination fields and validation visibility.
- `src/checkout/shipping-address.ts` — Client/server address schema and destination-specific validation.
- `src/checkout/shipping-address-ui.ts` — Country and US region option generation/search metadata.
- `src/components/checkout/order-summary.tsx` — Desktop/mobile totals, disabled reasons, destination summary, and action dock.
- `src/components/payments/order-payment-page.tsx` — State-dependent payment/order presentation.
- `src/components/payments/payment-state-panel.tsx` — Payment status actions and reservation deadline rendering.
- `src/components/payments/payment-status-recheck.tsx` — Polling, cooldown, and locale time behavior.
- `src/components/payments/vietqr-instructions.tsx` — VietQR instructions, copy fallback, declaration, and status checks.
- `src/components/orders/order-recovery-banner.tsx` — Terminal-state cart restoration.
- `src/payments/status.ts` — Payment presentation mapping and locked retry behavior.
- `src/messages/en.json` and `src/messages/vi.json` — Existing `next-intl` payment/order language.

### Verification baseline
- `.planning/phases/09-independent-locale-and-market-commerce-projection-with-seo-s/09-15-SUMMARY.md` — Current green full-CI baseline and checkout authority evidence.
- `tests/e2e/cart.spec.ts` — Cart behavior and market requote coverage.
- `tests/e2e/checkout.spec.ts` and `tests/e2e/checkout-market-change.spec.ts` — Guest/account checkout, destination authority, payment pair, and stale-submit coverage.
- `tests/security/checkout-boundaries.test.mjs` and `tests/security/payment-boundaries.test.mjs` — Client/server trust boundaries.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Existing Radix/shadcn select, dialog, alert, sheet, collapsible, input, and button primitives can support searchable choices, mobile summaries, recovery, and accessible targets.
- Existing `searchText` country metadata, US region options, idempotency storage, saved-address flows, quote-diff dialog, cart snapshot recovery, masked-email presentation, and localized guest-order routing should be extended rather than replaced.
- Existing PayPal uncertainty handling, VietQR manual fallback, polling visibility rules, and incident-ID mapping are strong behavior contracts to preserve.

### Established Patterns
- Browser state is intent-only; server actions and database functions reconstruct authoritative commercial facts.
- Public/customer language is bilingual through `next-intl`, though cart/checkout still contain inline copy that should migrate in bounded slices.
- Payment and inventory transitions are state-machine driven and idempotent; UI changes must not infer paid status.
- Playwright uses real guest/account journeys and security suites assert forbidden imports and server-owned reconstruction.

### Integration Points
- Address UI maps into immutable shipping snapshots without changing historical orders.
- Draft persistence connects only to editable presentation state and clears before/after the existing order-completion lifecycle as appropriate.
- Contact configuration connects to customer error panels and one localized public route without exposing admin-only or secret data.
- Payment page simplification consumes existing status presentation instead of introducing new payment states.

</code_context>

<specifics>
## Specific Ideas

- Preserve the unusually strong honest-error behavior: uncertain PayPal capture must still prevent duplicate payment and tell the customer not to pay again.
- Preserve old totals during requote and explicit old-to-new material confirmation.
- Use plain customer language and one dominant action per payment state.
- A paid order must never display a reservation deadline.

</specifics>

<deferred>
## Deferred Ideas

- Same-order payment retry after terminal failure.
- COD, VNPay, MoMo, ZaloPay, or customer-selected provider expansion.
- Carrier/API shipping estimate and delivery ETA in cart.
- Receipt-image upload and its private-storage/RLS/retention workflow.
- Purchase analytics or conversion-provider integration.
- Vercel geo and external SEO UAT already recorded as Phase 09 verification debt.

</deferred>

---

*Phase: 10-checkout-and-payment-ux-stabilization-for-vietnamese-and-int*
*Context gathered: 2026-08-04*
