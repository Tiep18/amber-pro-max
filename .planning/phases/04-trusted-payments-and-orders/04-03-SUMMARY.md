---
phase: 04-trusted-payments-and-orders
plan: "03"
subsystem: payments-security-boundaries
tags: [payments, orders, guest-access, supabase, rls, security, checkout]

requires:
  - phase: 03-mixed-cart-and-checkout
    provides: Pending-payment checkout orders, immutable order lines, active reservations, and guest access token hash storage
  - phase: 04-trusted-payments-and-orders
    provides: Payment authority RPC, order/payment projections, RLS grants, audit trail, and expiry command from Plan 04-02
provides:
  - Server-only Supabase secret client boundary with typed unconfigured state
  - Typed server-only PayPal and VietQR configuration state without exposing values to client bundles
  - Scoped guest order HttpOnly cookie exchange and SHA-256 lookup hash helpers
  - Customer-safe and admin-authorized order/payment projection wrappers
  - Checkout handoff that enforces market/currency/payment-method invariants and does not return raw guest tokens to browser state
  - Payment boundary security checks included in the project security script
affects: [paypal-integration, vietqr-admin-confirmation, order-status-pages, admin-orders, fulfillment-gate]

tech-stack:
  added: []
  patterns:
    - Server actions may consume raw guest order tokens only long enough to set scoped HttpOnly cookies
    - Customer order reads use narrow RPC projections; admin reads require application authorization before projection/timeline queries
    - Secret scanner allows server-only env names only in server boundary files, not literal secret-shaped values

key-files:
  created:
    - src/lib/supabase/admin.ts
    - src/payments/guest-access.ts
    - src/payments/queries.ts
    - tests/unit/payments/guest-access.test.ts
    - tests/unit/payments/order-queries.test.ts
  modified:
    - .env.example
    - src/lib/env/server.ts
    - src/checkout/submit-checkout.ts
    - src/checkout/actions.ts
    - supabase/tests/database/04_payment_rls_audit.test.sql
    - tests/security/payment-boundaries.test.mjs
    - tests/unit/checkout/submit-checkout.test.ts
    - scripts/check-secrets.mjs
    - package.json

key-decisions:
  - "Guest checkout raw tokens are exchanged inside the Server Action into order-scoped HttpOnly cookies; the action returns only order metadata and a localized order path."
  - "Checkout rejects mismatched market/currency/payment intent before calling submit_checkout, while the database constraint remains the authoritative second boundary."
  - "Admin order query helpers require requireAdmin before reading admin projections or timeline RPCs; customer reads stay on get_order_payment_status."
  - "Server-only secret env names are allowed only in server boundary files and .env.example; literal secret-shaped values still fail the security scan."

patterns-established:
  - "New payment/order UI and provider routes should call getAuthorizedOrderPayment or admin projection helpers instead of reading payment/event/audit base tables directly."
  - "Future PayPal/VietQR code can use the typed unconfigured provider states to render setup-disabled behavior without leaking configured values."
  - "Payment security tests now cover guest token handoff, method invariants, direct mutation shortcuts, and Phase 5 scope creep."

requirements-completed: [ORD-01, ORD-03, PAY-06, PAY-07, SEC-03]

duration: 21 min
completed: 2026-06-16
---

# Phase 04 Plan 03: Payment Access Boundary Summary

**Server-only payment configuration, scoped guest order access, role-safe order projections, and checkout handoff without raw token exposure**

## Performance

- **Duration:** 21 min
- **Started:** 2026-06-16T01:38:00Z
- **Completed:** 2026-06-16T01:58:44Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments

- Added `src/lib/supabase/admin.ts` as a server-only privileged Supabase client boundary with typed missing-secret handling.
- Extended server env parsing for PayPal, VietQR, and Supabase secret configuration, returning `configured` or `unconfigured` typed states without exposing values.
- Added guest order access helpers that hash raw tokens with SHA-256 and set order-scoped, HttpOnly, SameSite=Lax cookies that are secure in production.
- Added customer-safe and admin-safe payment/order query wrappers over the existing narrow database projections and timeline RPC.
- Updated checkout submit handling so invalid `intl+USD+vietqr` or `vn+VND+paypal` combinations are rejected before the RPC boundary.
- Updated the checkout Server Action to exchange guest access tokens into a server-set cookie and return only order metadata plus a localized order path.
- Expanded Phase 4 security checks and added them to `npm run test:security`.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Payment access boundary tests** - `4f18f68a` (test)
2. **Task 1 GREEN: Payment access boundaries** - `59fa6185` (feat)
3. **Task 2 RED: Checkout payment boundary checks** - `4b0e3638` (test)
4. **Task 2 GREEN: Secure checkout payment handoff** - `e7b49130` (feat)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `src/lib/supabase/admin.ts` - Server-only Supabase secret client factory and unconfigured state.
- `src/payments/guest-access.ts` - Guest token hashing, scoped cookie naming, set/read helpers.
- `src/payments/queries.ts` - Customer status lookup and admin order queue/detail projection helpers.
- `src/lib/env/server.ts` - Server-only PayPal, VietQR, and Supabase secret config parsing.
- `.env.example` - Names and descriptions for server-only payment/Supabase configuration.
- `src/checkout/submit-checkout.ts` - Market/currency/payment intent invariant before `submit_checkout`.
- `src/checkout/actions.ts` - Raw guest token exchange into server-set cookie and sanitized success result.
- `supabase/tests/database/04_payment_rls_audit.test.sql` - Additional reservation mutation privilege assertions.
- `tests/security/payment-boundaries.test.mjs` - Checkout handoff, method invariant, script coverage, and static boundary assertions.
- `tests/unit/payments/guest-access.test.ts` - Guest token hash and cookie behavior tests.
- `tests/unit/payments/order-queries.test.ts` - Customer/admin projection wrapper tests.
- `tests/unit/checkout/submit-checkout.test.ts` - Updated checkout fixture for method invariant.
- `scripts/check-secrets.mjs` - Narrow allowlist for safe server-only secret env names.
- `package.json` - Adds payment boundary harness to `test:security`.

## Decisions Made

- Kept raw guest access token exposure confined to the Server Action after the database RPC returns it; browser-visible state receives no `guestAccessToken`.
- Used a per-order cookie name for guest access scoping so an order lookup hashes only the token attached to that order number.
- Kept deadline expiry invocation out of the default customer query wrapper for now because `expire_due_payments` requires the server secret boundary; later provider/status pages can call it through configured server routes.
- Did not add new package dependencies or provider SDKs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added focused TDD unit tests not listed in plan files**
- **Found during:** Task 1
- **Issue:** Task 1 was marked `tdd="true"` but the plan-declared file list contained only production/config files.
- **Fix:** Added focused RED tests for guest token hashing/cookie behavior and projection wrapper authorization.
- **Files modified:** `tests/unit/payments/guest-access.test.ts`, `tests/unit/payments/order-queries.test.ts`
- **Verification:** RED failed on missing modules, GREEN passed `npx vitest run tests/unit/payments/guest-access.test.ts tests/unit/payments/order-queries.test.ts`.
- **Committed in:** `4f18f68a`, `59fa6185`

**2. [Rule 1 - Bug] Corrected the expected SHA-256 digest in the new RED test**
- **Found during:** Task 1 GREEN
- **Issue:** The initial RED test expected the wrong digest for `raw-guest-token`.
- **Fix:** Updated the expected digest to the actual SHA-256 value used by the helper and database-compatible hash comparison.
- **Files modified:** `tests/unit/payments/guest-access.test.ts`
- **Verification:** Focused payment unit tests passed.
- **Committed in:** `59fa6185`

**3. [Rule 1 - Bug] Narrowed secret scan behavior for intentional server-only env names**
- **Found during:** Task 2 full security verification
- **Issue:** Adding required server-only env names caused the existing secret scanner to flag safe variable names in server boundary files and `.env.example`.
- **Fix:** Allowed only secret-name references in `src/lib/env/server.ts`, `src/lib/supabase/admin.ts`, and `.env.example`, while still flagging literal secret-shaped values such as nonempty Supabase secret keys.
- **Files modified:** `scripts/check-secrets.mjs`
- **Verification:** `npm run test:security` passed.
- **Committed in:** `e7b49130`

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 missing critical verification).  
**Impact on plan:** All deviations tighten verification or security boundaries and do not add new product scope.

## Issues Encountered

- Project-specific `docs/ai/...` files referenced by local ambertinybear skills are not present in this workspace, so AGENTS.md and Phase 4 planning artifacts remained the source of truth.
- `npm run db:test` could not run because local Supabase Postgres was not listening on `127.0.0.1:55432`.
- `npm run db:reset` did not bring Supabase up, and `supabase start` left `supabase_db_Test_GSD` unhealthy with `could not open configuration directory "/etc/postgresql-custom/conf.d"` in the container logs. No Docker volume or destructive reset was performed.

## Verification

- `npx vitest run tests/unit/payments/guest-access.test.ts tests/unit/payments/order-queries.test.ts` - passed.
- `npm run typecheck` - passed.
- `node --test tests/security/payment-boundaries.test.mjs` - passed.
- `npx vitest run tests/unit/checkout/submit-checkout.test.ts tests/unit/payments/guest-access.test.ts tests/unit/payments/order-queries.test.ts` - passed.
- `npm run test:security` - passed.
- `npm run db:test` - attempted but blocked by local Supabase container health, not by SQL assertion output.

## Known Stubs

None. `.env.example` contains intentionally empty configuration names only; runtime config returns typed `unconfigured` states until seller/provider values are supplied in later provider readiness plans.

## Threat Flags

None open. The plan-intended server-secret and guest-order trust boundaries were added with `server-only` admin client isolation, HttpOnly scoped cookies, hash-only lookup, customer/admin projection separation, and static secret/token scans.

## User Setup Required

None for this plan. Real PayPal and VietQR seller values remain later provider readiness work.

## Next Phase Readiness

Ready for Plan 04-04. PayPal create/capture routes can now rely on server-only config state, safe order projections, and checkout handoff that no longer exposes raw guest order tokens.

## Self-Check: PASSED

- Created files exist: `src/lib/supabase/admin.ts`, `src/payments/guest-access.ts`, `src/payments/queries.ts`, `tests/unit/payments/guest-access.test.ts`, and `tests/unit/payments/order-queries.test.ts`.
- Task commits exist: `4f18f68a`, `59fa6185`, `4b0e3638`, `e7b49130`.
- Fresh quick verification passed: typecheck, focused payment security, focused checkout/payment unit tests, and full security suite.

---
*Phase: 04-trusted-payments-and-orders*
*Completed: 2026-06-16*
