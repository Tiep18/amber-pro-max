---
quick_id: 260727-fmw
status: passed
completed_at: '2026-07-27T11:33:15+07:00'
commits:
  - 45816bc3
---

# Quick task 260727-fmw summary

## Outcome

Checkout is now a compact single-page workspace. Contact and delivery details share one quiet surface, while products, discount, authoritative totals, payment, destination, policies, blockers, and the primary action live in a sticky order rail. Mobile uses a safe-area total/action dock and empty carts use a dedicated recovery state.

Authenticated customers receive an editable email prefill sourced from the server-authenticated user. Destination initialization follows a deterministic order: default saved address, first saved address, an already quoted destination, then Vietnam for a Vietnam-market physical cart. Any prefilled country/state runs through the existing authoritative shipping quote action immediately.

Payment remains derived from the accepted quote. Destination-driven market authority, material-change review, latest-request-wins, server-side total reconstruction, inventory reservation, payment confirmation, and fulfillment boundaries were not weakened.

## UI/UX changes

- Replaced repeated checkout cards with one compact details card and a fuller 400px sticky order rail.
- Moved order lines, discount, totals, payment, destination, policy links, blockers, and CTA into the order rail.
- Collapsed the discount form behind a disclosure and made saved-address selection apply immediately.
- Revealed address fields only after country selection and added semantic browser autofill metadata.
- Added localized, payment-specific action labels and a mobile total/action dock.
- Added a dedicated empty-cart state.
- Normalized Vietnamese checkout copy.

## Prefill behavior

- Email: `auth.getUser()` on the server route, trimmed and still editable.
- Address: default saved address, then first saved address, then quoted destination.
- Vietnam fallback: physical `vn` quotes default to `VN` when no stronger destination exists.
- Shipping: every initialized country/state uses the same server quote action as a manual destination change.
- Review: same-market initialization accepts the shipping refresh directly; a cross-market commercial change still requires the existing confirmation dialog.

## Implementation commit

- `45816bc3` implements the compact checkout, deterministic prefill, tests, and browser-regression updates.

## Verification

- ESLint: passed.
- TypeScript: passed.
- Full Vitest suite: 85 files / 732 tests passed.
- Security suite: 51 / 51 tests passed.
- `git diff --check`: passed.
- Live browser journey: passed on the running development server at 1440px and 390px.
- Vietnam-market physical cart: country defaulted to Vietnam, shipping recalculated to 30,000 VND, total updated to 550,000 VND, and payment updated to VietQR.
- Browser console: no runtime errors.
- Focused Playwright command could not start its second Next.js server because the active dev server held the shared `.next` Turbopack cache; this was an environment lock before test execution, not an application assertion failure.
