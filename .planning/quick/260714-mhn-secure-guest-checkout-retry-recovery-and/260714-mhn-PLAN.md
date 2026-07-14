---
quick_id: 260714-mhn
status: complete
created_at: '2026-07-14T16:14:00+07:00'
description: Secure guest checkout retry recovery and make zero-discount allocation validation explicit
must_haves:
  truths:
    - Before an anonymous order can be committed, a preparation Server Action has delivered a server-generated 256-bit proof and independent high-entropy attempt id in an HttpOnly cookie; browser JavaScript never receives either credential.
    - Losing the first submit response after database commit remains recoverable whether no response headers arrived or the order-cookie headers arrived but the response body/navigation was lost.
    - The recovery cookie is not cleared by submitCheckoutAction; it is cleared only after the authorized order page acknowledges that its order-scoped access cookie works, or by an equally strong post-navigation acknowledgement.
    - One guest attempt id can claim at most one order under concurrency, independently of proof/actor. The raw attempt id is transient input only: the database stores and compares only SHA-256(attemptId), and missing, malformed, or different proofs cannot recover the order or create a second order for the same attempt.
    - public.submit_checkout never returns the raw proof or guestAccessToken. It returns order handoff metadata only; the Server Action already holds the HttpOnly proof and uses it to set the order-scoped cookie after database success.
    - New guest orders store only SHA-256 proof evidence, and guest attempt identity is represented only by a namespaced attempt hash in order/payment idempotency evidence; raw proof/attempt-cookie content never enters claims, checkout_orders.idempotency_key, payments.request_id, RPC responses, snapshots, logs, errors, browser storage, URLs, or rendered state.
    - Signed-in checkout retains auth.uid ownership, current idempotency and payment handoff, and does not require or consume guest recovery credentials.
    - When expected discount is zero, every line discountAllocationMinor must explicitly be zero; proportional largest-remainder allocation runs only for a positive discount with a concrete rule.
  artifacts:
    - supabase/migrations/20260714162000_secure_guest_checkout_retry_recovery.sql
    - supabase/tests/database/08_checkout_guest_retry_recovery.test.sql
    - supabase/tests/database/08_checkout_shipping_submit_hardening.test.sql
    - src/payments/guest-access.ts
    - src/checkout/actions.ts
    - src/checkout/schemas.ts
    - src/checkout/submit-checkout.ts
    - src/components/checkout/checkout-page.tsx
    - src/components/payments/guest-recovery-acknowledger.tsx
    - src/components/payments/order-payment-page.tsx
    - src/types/supabase.ts
    - tests/unit/payments/guest-access.test.ts
    - tests/unit/checkout/actions.test.ts
    - tests/unit/checkout/submit-checkout.test.ts
    - tests/security/checkout-boundaries.test.mjs
  key_links:
    - CheckoutPage awaits prepareGuestCheckoutRecoveryAction before submitCheckoutAction, so failure to deliver the preparation cookie prevents order persistence.
    - The preparation cookie carries an independent random attempt id and proof; submitCheckoutAction ignores browser guest identity/idempotency values and injects the server-cookie values for anonymous RPC calls.
    - public.submit_checkout hashes the transient attempt id immediately; a database attempt-claim row uniquely keyed by attempt_id_hash is inserted/locked before order work, and its proof hash plus eventual order id serialize same-attempt calls even when they present different proofs.
    - Guest order idempotency_key is derived as a fixed namespace plus SHA-256(attemptId), so downstream payments.request_id and other idempotency evidence never contain the raw attempt id.
    - public.submit_checkout uses proof hash for guest ownership/access evidence but never echoes the proof. submitCheckoutAction sets the order cookie from its already-held proof only after a successful metadata-only RPC result.
    - The successful submit response leaves the recovery cookie intact. The authorized order page renders a client acknowledger that revalidates the order cookie server-side and only then clears recovery state.
    - private.checkout_commercial_quote_is_current uses a dedicated zero-discount validation branch and enters the existing proportional allocation CTE only for a verified positive discount.
---

# Quick Task 260714-mhn: Secure guest checkout retry recovery and clarify discount allocation

## Task 1 - Lock behavioral contracts for recovery, concurrency, secrecy, and zero discount

**Files**

- `supabase/tests/database/08_checkout_guest_retry_recovery.test.sql`
- `supabase/tests/database/08_checkout_shipping_submit_hardening.test.sql`
- `tests/unit/payments/guest-access.test.ts`
- `tests/unit/checkout/actions.test.ts`
- `tests/unit/checkout/submit-checkout.test.ts`
- `tests/security/checkout-boundaries.test.mjs`

**Action**

- Add a focused digital guest pgTAP fixture. Submit with a valid prepared attempt id/proof, discard the first result, and retry. Assert one order/payment/line graph, identical metadata-only order handoff, `guest_secret_hash = sha256(proof)`, successful order authorization using that hash, and absence of `guestAccessToken`/raw proof in both RPC results and every persisted snapshot.
- Use a distinctive raw attempt-id fixture and assert it is absent from the private claim row, `checkout_orders.idempotency_key`, `payments.request_id`, quote/cart/address snapshots, and function results. Assert the claim key equals SHA-256(attemptId), while order/payment idempotency evidence uses the documented namespace plus that hash.
- Cover both transport-loss states at the application boundary: (a) submit response headers/body are lost, leaving only the pre-submit recovery cookie; retry restores the same order and sets its order cookie; (b) cookie headers are applied but the body/navigation is lost, leaving both cookies; retry remains idempotent and recovery is not cleared until order-page acknowledgement.
- Exercise missing/malformed proof and a different proof with the same attempt id. Results must be generic and contain no order id/number/token; counts must prove no duplicate graph. Add a true concurrent database test with two sessions/dblink or the repository concurrency harness: same attempt id, different valid proofs, overlapping transactions, exactly one claim/order winner and no orphan payment/reservation/line graph.
- Retain a signed-in fixture that succeeds without guest credentials and remains owned/idempotent by `auth.uid()`.
- Update the existing physical fixture in `08_checkout_shipping_submit_hardening.test.sql` to use the new guest attempt/proof contract. Preserve and reassert the same physical order id, one payment, one line/reservation/allocation graph, authoritative shipping allocation sums, non-US region behavior, and no guest token/proof in the result or snapshots.
- Add zero-discount verifier coverage: all-zero line allocations succeed; any nonzero allocation fails even with no discount rule. Keep a positive-discount fixture proving the existing proportional floor/largest-remainder result is unchanged.
- Unit-test preparation-cookie creation/reuse, 32-byte proof, independent random attempt id, strict parsing/rotation of malformed cookies, HttpOnly/SameSite/Secure/path/expiry, non-clearing on submit success/failure, and clearing only after authorized acknowledgement. No action state exposes cookie content.
- Extend static security contracts to ban proof/attempt content from client state, action results, logging, local/session storage and public RPC results, and require any private attempt helper/table to be inaccessible to browser roles.

**Verify**

- Run the new/updated pgTAP files before implementation and observe failures for retry access, metadata-only response, attempt uniqueness, and explicit zero-discount control flow.
- `npm run test:unit -- tests/unit/payments/guest-access.test.ts tests/unit/checkout/actions.test.ts tests/unit/checkout/submit-checkout.test.ts`
- `node --test tests/security/checkout-boundaries.test.mjs tests/security/payment-boundaries.test.mjs`

**Done**

- Recovery across both response-loss states, concurrent wrong-proof denial, physical graph preservation, RPC secrecy, signed-in compatibility, and discount branches are executable regression contracts.

## Task 2 - Add a forward-only attempt claim and metadata-only submit RPC

**Files**

- `supabase/migrations/20260714162000_secure_guest_checkout_retry_recovery.sql`
- `supabase/tests/database/08_checkout_guest_retry_recovery.test.sql`
- `supabase/tests/database/08_checkout_shipping_submit_hardening.test.sql`
- `src/types/supabase.ts`

**Action**

- Add one forward-only migration; do not edit `20260714150000_harden_checkout_submit_authority.sql` or older history. Replace only current function definitions and keep `public.submit_checkout(jsonb)` as the sole browser-executable submit boundary.
- Introduce a private, concurrency-safe guest attempt claim keyed uniquely by `attempt_id_hash = SHA-256(raw attempt id)`, with proof hash, optional claimed order id, and timestamps. The raw attempt id must never be stored. Revoke all access from `PUBLIC`, `anon`, and `authenticated`. Insert/select-lock the hashed claim before commercial, shipping, inventory, or legacy persistence work. The attempt hash, not actor/proof, is the uniqueness boundary.
- For anonymous calls, require canonical attempt/proof formats, hash both values immediately, and atomically claim by attempt hash. A pre-existing claim with a different proof hash returns a generic conflict without order metadata. A matching claim with an order id returns that order's handoff metadata. Concurrent first calls with different proofs must serialize at the unique hashed claim and only the winner may reach persistence; loser creates no committed dependent rows.
- Override the guest order idempotency key with a deterministic namespaced value derived only from the attempt hash (for example `guest-attempt:<sha256>`), never the raw attempt id. Verify the payment creation path derives `payments.request_id` from this sanitized order evidence and cannot retain the raw attempt id.
- Keep legacy actor compatibility by deriving the guest actor from proof hash and overriding legacy guestCartId internally. After successful legacy persistence, constrain an update by result order id, expected actor and attempt/idempotency data; replace the legacy random guest hash with the submitted proof hash and attach the order id to the locked claim. Handle identical-proof unique races idempotently.
- Strip `guestAccessToken` and all raw credential fields from every success path, including existing-order return, digital path, physical path, and unique-race normalization. public.submit_checkout returns only status, orderId, orderNumber and reservationExpiresAt. Raw proof and raw attempt id may exist only in transient function input/local variables; only their hashes may reach access, claim, order-idempotency, or payment evidence.
- Refactor `private.checkout_commercial_quote_is_current`: if `expected_discount = 0`, explicitly reject any nonzero line allocation; otherwise require non-null `discount_rule.id` and positive `eligible_subtotal` before running the unchanged largest-remainder CTE. Do not alter discount eligibility, amount, or rounding formulas.
- Add cleanup/indexing appropriate to the private claim table without deleting live retry claims prematurely. Generate Supabase types after the schema change and commit only expected public type changes; private-only schema should not introduce unrelated public drift.

**Verify**

- `npm run db:reset`
- `npm run db:lint`
- `npm run db:test`
- Run the concurrent attempt harness repeatedly and query claims/orders/payments/lines/reservations to confirm one committed graph and zero occurrences of the distinctive raw attempt id.
- `npm run db:types` and inspect `git diff -- src/types/supabase.ts`
- `npm run typecheck`

**Done**

- Attempt uniqueness is proof-independent and concurrency-safe, retries return metadata only, raw credentials never cross the RPC response, and zero-discount allocation is explicit.

## Task 3 - Exchange server-held proof for order access and acknowledge safely

**Files**

- `src/payments/guest-access.ts`
- `src/checkout/actions.ts`
- `src/checkout/schemas.ts`
- `src/checkout/submit-checkout.ts`
- `src/components/checkout/checkout-page.tsx`
- `src/components/payments/guest-recovery-acknowledger.tsx`
- `src/components/payments/order-payment-page.tsx`
- `tests/unit/payments/guest-access.test.ts`
- `tests/unit/checkout/actions.test.ts`
- `tests/unit/checkout/submit-checkout.test.ts`
- `tests/security/checkout-boundaries.test.mjs`

**Action**

- Extend the server-only guest-access module with a bounded checkout-recovery cookie containing a server-generated 256-bit proof plus independent random attempt id. Use HttpOnly, SameSite=Lax, production-only Secure and root path. Provide strict prepare/read/acknowledge helpers; preparation returns only ready/no-op and never raw values.
- Add `prepareGuestCheckoutRecoveryAction`. For guests it reuses a valid unacknowledged attempt bound to the current checkout intent or creates a new one; for signed-in users it no-ops. CheckoutPage must await this action before calling submit, so an undelivered preparation response cannot precede a database commit.
- In `submitCheckoutAction`, ignore browser-supplied guest proof, guestCartId and guest idempotency. For a guest, read the prepared cookie and pass its proof/attempt id only as transient internal RPC input; database hashing owns all persisted claim/order/payment identifiers. For a signed-in user, preserve the existing idempotency/auth path and omit guest credentials.
- Remove `guestAccessToken` from `SubmitCheckoutResult` and RPC mapping. After metadata-only guest success, submitCheckoutAction uses the proof it already read from HttpOnly recovery state to set the existing order-scoped HttpOnly cookie. It must not clear/rotate the recovery cookie in the submit response, for success or failure.
- Render a minimal client acknowledger only after `OrderPaymentPage` has server-authorized the order. Its Server Action rechecks the order-scoped cookie against the order and verifies it corresponds to the prepared proof/attempt before clearing recovery state. Failed authorization, missing order cookie, lost navigation, or lost acknowledgement keeps recovery available until bounded expiry.
- Bind reusable preparation state to the checkout intent so an unacknowledged completed attempt cannot silently hand a later different cart to the prior order; acknowledgement is the normal rotation point. Do not put the binding, attempt id or proof in rendered markup, URLs, monitoring facts, React state/ref, or browser storage.
- Preserve current checkout pending/error UX and payment handoff. Run all checkout/payment/security/database/build gates and verify `.gitignore` plus unrelated package/shipping behavior remain untouched.

**Verify**

- `npm run test:unit -- tests/unit/checkout tests/unit/payments/guest-access.test.ts tests/unit/payments/order-queries.test.ts tests/unit/payments/paypal-client.test.ts tests/unit/payments/vietqr.test.ts`
- `npm run test:security`
- `npm run db:reset && npm run db:lint && npm run db:test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `git status --short`; confirm the pre-existing `.gitignore` modification is unchanged and unstaged.

**Done**

- Guest proof remains server-held, submit is metadata-only, both response-loss variants recover safely, acknowledgement clears recovery only after verified order access, and full regression gates pass.

## Boundaries

- Do not mint/reissue access from email, quote hash, order number, browser idempotency, or any predictable value.
- Do not echo raw proof or raw attempt id from public.submit_checkout or expose either through a client-visible Server Action result. Do not persist either outside HttpOnly cookies; claims, order idempotency keys, payment request ids, and snapshots may contain hashes only.
- Do not clear recovery state in the submit response; acknowledgement must occur only after authorized order-page access.
- Do not rely on `(proof-derived actor, idempotency_key)` alone for uniqueness; the independent attempt claim must serialize different-proof concurrency.
- Do not rewrite historical migrations/hashes. New recovery guarantees apply to orders submitted through the prepared flow.
- Do not change catalog/shipping authority, package grouping, shipping formulas, payment state machines, reservation behavior, order authorization, or discount eligibility/rounding semantics.
- Preserve the user's existing `.gitignore` modification and exclude it from every commit.
