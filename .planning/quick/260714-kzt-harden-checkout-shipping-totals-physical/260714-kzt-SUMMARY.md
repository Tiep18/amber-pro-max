---
quick_id: 260714-kzt
status: complete
completed: 2026-07-14
code_commits:
  - 5abf9b4b
  - 2d06db21
  - a1f123d8
  - 68d700c0
---

# Checkout shipping submit hardening summary

Checkout submit now treats browser data as purchase intent only. The database rebuilds commercial and shipping evidence from authoritative rows before creating the immutable order and payment graph, while preserving the existing package-grouping algorithm.

## Delivered

- Normalized resolver regions by country: US uses a controlled two-letter subdivision; every non-US destination sends `null` to the US-only adjustment resolver while retaining the free-form region in the shipping-address snapshot.
- Revalidated current catalog offers, availability, discounts, shipping configuration, integer arithmetic, and canonical snapshots inside the submit transaction.
- Rejected tampered totals and stale price, discount, or shipping evidence before creating any order, payment, inventory reservation, or allocation row.
- Moved actor/idempotency lookup ahead of commercial and shipping persistence so a physical retry returns the original order graph without duplicates.
- Persisted matching per-line shipping allocation in both immutable representations and enforced order total arithmetic at the database boundary.
- Built order and line quote snapshots from database-owned product, variant, offer, discount, and shipping facts; no internal allocation marker is persisted.
- Added appropriate catalog, offer, inventory, discount, and shipping-row locking around verification and persistence.
- Regenerated Supabase types from the resulting local schema.

## Verification

- `npm run db:reset` — passed.
- Full database suite — 27 files and 691 assertions passed.
- Checkout hardening pgTAP — all 35 assertions passed, including real physical submit/retry, canonical evidence, non-US region, stale/tampered rejection, graph counts, and allocation equality.
- Checkout/payment unit suite — 127 tests passed.
- Checkout security boundary suite — 3 tests passed.
- ESLint, TypeScript, production build, and application-schema database lint — passed.
- Generated Supabase types match the local schema exactly: 3,984 lines with zero drift.

## Scope preserved

- Finding 4 remains deferred: winner selection and highest-first-once/additional-item package grouping are unchanged.
- Payment provider state machines, reservation durations, shipping precedence, and guest ownership semantics are unchanged.
- The user's existing `.gitignore` modification remains unstaged and uncommitted.

## Baseline observations

- The full security script retains two pre-existing catalog/newsletter source-regex failures outside this checkout task.
- Unscoped database lint reports pgTAP extension diagnostics; the `private` and `public` application schemas are clean.
