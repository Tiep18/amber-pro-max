# Apply vetted improve fixes for downloads, admin newsletter dashboard, and stale README

## Goal

Apply only the improve findings that were manually verified against the live codebase and current Phase 7 GSD state.

## Accepted findings

- Fix multi-entitlement digital downloads so one paid order with multiple digital products does not fail on `.maybeSingle()` cardinality.
- Fix the admin dashboard newsletter count and filter link so they use the real `newsletter_subscribers.status` values.
- Update the stale root `README.md` so it no longer claims later phases are unimplemented.

## Rejected findings

- Add `digital_entitlements` owner index: rejected for now because launch work is still in Phase 7 verification and no measured hotspot or failing query evidence was found.
- Add `wishlist_items.product_id` index: rejected for now because no current launch path shows this as a demonstrated bottleneck.

## Scope

- `src/fulfillment/downloads.ts`
- `src/fulfillment/downloads.server.ts`
- `src/app/api/downloads/route.ts`
- `src/components/fulfillment/pattern-library-card.tsx`
- `src/components/fulfillment/download-panel.tsx`
- `src/components/payments/order-payment-page.tsx`
- `tests/unit/fulfillment/downloads.test.ts`
- `src/admin/dashboard-queries.ts`
- `src/admin/dashboard-model.ts`
- `tests/unit/operations/admin-dashboard.test.ts`
- `README.md`

## Verification

- `npm run typecheck`
- `npm run test:unit`
- `npm run lint`
