---
phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
plan: "05"
subsystem: storefront-context
tags: [react, lifecycle, abort-controller, broadcast-channel, market-resolution]

requires:
  - phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
    provides: Locale/market precedence and private storefront context boundary from Plans 09-01 and 09-04
  - phase: 03-mixed-cart-and-checkout
    provides: Latest-request-wins lifecycle pattern with stale object-identity no-ops
provides:
  - Fail-closed storefront context state machine with monotonic generations and bounded errors
  - Server-authoritative provider with abort, retry, market-mutation rollback, and focus/visibility refresh
  - Invalidation-only BroadcastChannel and storage convergence with sanitized payloads
affects: [09-10, 09-12, 09-13, phase-09-verification]

tech-stack:
  added: []
  patterns:
    - Ref-backed React orchestration over a pure generation-guarded lifecycle
    - Server-confirmed market commits with invalidation-before-refetch convergence
    - Invalidation-only cross-tab messages with authoritative private API refetch

key-files:
  created:
    - src/storefront/context-lifecycle.ts
  modified:
    - src/components/storefront-context.tsx
    - src/components/storefront-context-policy.ts
    - src/components/header-market.tsx
    - tests/unit/storefront-context-lifecycle.test.ts
    - tests/unit/components/storefront-context-policy.test.ts

key-decisions:
  - "Storefront context begins resolving with a null market; locale never supplies a temporary commerce authority."
  - "Market mutation keeps the committed label until the strict server action succeeds, then invalidates and refetches the private context."
  - "Legacy auth/context notifications retain their event semantics but their caller detail is ignored and replaced by authoritative refetch."

patterns-established:
  - "Only the active generation may settle or fail; stale completions return the identical state object."
  - "Focus refresh may preserve a ready snapshot without loader flash, while explicit invalidation fails closed before refetch."
  - "Cross-tab transport carries only schemaVersion and invalidationVersion; market, user, price, quote, and projection facts are discarded."

requirements-completed: [MKT-01, MKT-05, OPS-04]

duration: 10min
completed: 2026-07-23
---

# Phase 09 Plan 05: Race-safe Storefront Context Lifecycle Summary

**A fail-closed browser commerce context with abortable latest-request-wins resolution, server-confirmed market rollback, and invalidation-only multi-tab convergence**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-23T12:49:25Z
- **Completed:** 2026-07-23T12:59:13Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Replaced locale-derived ready market state with an explicit resolving/ready/error/retrying lifecycle whose committed facts survive failures but remain purchase-unsafe.
- Added abort-per-generation provider orchestration so stale fetches, mutations, focus events, visibility events, and tab messages cannot overwrite newer context.
- Kept market labels on the prior committed value during mutation, accepted only the strict server action result, and exposed retry after bounded failure.
- Preserved auth and wishlist notification behavior through a deprecated adapter while refusing all caller-supplied context detail.
- Added BroadcastChannel plus storage fallback messages containing only invalidation version facts, followed by a private no-store server refetch.

## Task Commits

Each TDD task was committed with RED then GREEN gates:

1. **Task 1 RED: Promote lifecycle and freshness contracts** - `61def45` (test)
2. **Task 1 GREEN: Implement pure lifecycle and visibility policy** - `85eaa71` (feat)
3. **Task 2 RED: Add provider authority and signal contracts** - `a3d93b6` (test)
4. **Task 2 GREEN: Wire authoritative provider convergence** - `6bb5a66` (feat)

## Files Created/Modified

- `src/storefront/context-lifecycle.ts` - Pure context state, generation guards, bounded failure, invalidation sanitation, and purchase-safety predicate.
- `src/components/storefront-context.tsx` - Private fetch orchestration, strict mutation API, retry, abort, auth compatibility, and tab/focus/visibility convergence.
- `src/components/storefront-context-policy.ts` - Deterministic TTL policy gated by document visibility.
- `src/components/header-market.tsx` - Suppresses the legacy control while no authoritative market is committed.
- `tests/unit/storefront-context-lifecycle.test.ts` - Promoted Wave 0 contracts plus provider security/source contracts.
- `tests/unit/components/storefront-context-policy.test.ts` - Visible-only stale revalidation coverage.

## Decisions Made

- Kept `retrying` as a transient recovery status inside the single storefront lifecycle so recovery can be rendered distinctly without introducing a second state authority.
- Refetch responses may advance `contextVersion` when the server market changed, but the version remains presentation invalidation state and never enters quote or checkout authority.
- Used a bounded set of recently observed invalidation versions to deduplicate dual BroadcastChannel/storage delivery.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Hid the legacy market control before context resolution**
- **Found during:** Task 2 (provider integration)
- **Issue:** Changing the provider market to `null` would leave the legacy switcher falling back visually to VN, contradicting the fail-closed no-guessed-market requirement.
- **Fix:** Updated `HeaderMarket` to render no market control until the provider has a server-confirmed market.
- **Files modified:** `src/components/header-market.tsx`
- **Verification:** Typecheck and the provider source contract pass; no locale-derived market remains.
- **Committed in:** `6bb5a66`

---

**Total deviations:** 1 auto-fixed (1 missing critical functionality)
**Impact on plan:** The compatibility adjustment is limited to preventing misleading commerce UI during initial resolution; Plan 09-13 still owns the final independent controls.

## Issues Encountered

- Full lint completed with zero errors and two pre-existing unused-parameter warnings in Plan 09-06's projection tests. Recorded in `deferred-items.md`; no out-of-scope source was changed.

## Verification

- `npm run test:unit` - 80 files passed, 641 tests passed, 10 expected failures owned by future plans.
- Targeted lifecycle/component suite - 13 tests passed.
- `npm run typecheck` - passed.
- `npm run lint` - passed with zero errors and two pre-existing warnings.
- `npm run test:security` - 47 tests passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Product/catalog projections and cart synchronization can gate their work on provider `status`, `market`, `generation`, and `contextVersion`.
- Plan 09-13 can migrate legacy controls to `requestMarketChange` and remove the deprecated notification adapter without changing authority rules.

## Self-Check: PASSED

- All six implementation/test files and this summary exist.
- RED/GREEN commits `61def45`, `85eaa71`, `a3d93b6`, and `6bb5a66` are present in git history.

---
*Phase: 09-independent-locale-and-market-commerce-projection-with-seo-s*
*Completed: 2026-07-23*
