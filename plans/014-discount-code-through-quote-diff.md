# Plan 014: Route discount-code changes through the quote diff gate

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat b103bb42..HEAD -- src/components/checkout/discount-code-form.tsx src/components/checkout/order-summary.tsx src/components/checkout/checkout-page.tsx src/checkout/quote-lifecycle.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: correctness
- **Planned at**: commit `b103bb42`, 2026-08-01

## Why this matters

Every other requote path in checkout goes through the lifecycle state machine,
which compares the new quote against the accepted one and raises
`QuoteDiffDialog` when something material changed. Applying or removing a
discount code bypasses that gate: the returned quote is accepted wholesale.

If a product price or stock status changes in the seconds between the customer
opening the discount field and pressing Apply, the displayed total changes with
no confirmation — exactly the situation the diff dialog exists to prevent.

## Current state

```tsx
// src/components/checkout/discount-code-form.tsx:99
onAcceptedQuote(result.quote);
```

```tsx
// src/components/checkout/checkout-page.tsx:375
function acceptExternalQuote(nextQuote: CartQuote) {
  setSubmitResult(null);
  setLifecycle(createCheckoutQuoteLifecycleState(nextQuote, lifecycleRef.current.destination));
}
```

`createCheckoutQuoteLifecycleState` resets the machine with the new quote as
accepted — it cannot produce a proposal.

The correct comparison already exists in
`settleQuoteRequest` (`src/checkout/quote-lifecycle.ts`), which calls
`diffMaterialQuotes` and `diffLifecycleCartQuotes` and returns a `proposal` when
either is non-empty.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Drift check | see above | no unexpected in-scope drift |
| Typecheck / lint | `npm run typecheck && npm run lint` | exit 0 |
| Unit | `npx vitest run tests/unit/checkout` | all pass |
| E2E focused | `npx playwright test tests/e2e/checkout.spec.ts` | all pass |

## Scope

**In scope**:
- `src/components/checkout/discount-code-form.tsx`
- `src/components/checkout/order-summary.tsx` (prop plumbing only)
- `src/components/checkout/checkout-page.tsx`
- `tests/unit/checkout/quote-lifecycle.test.ts`

**Out of scope**:
- Discount validation rules, allocation maths, or
  `private.checkout_commercial_quote_is_current`.
- The visual design of the discount field.

## Steps

### Step 1: Lift the requote into the page

`DiscountCodeForm` should no longer call `refreshCheckoutQuoteAction` itself.
Change its contract to:

```ts
type DiscountCodeFormProps = {
  locale: Locale;
  acceptedQuote: CartQuote | null;
  feedbackRevision: number;
  pending: boolean;
  onApply: (code: string | null) => Promise<'applied' | 'not_eligible' | 'failed'>;
};
```

The form keeps ownership of its local UI state (expanded, typed code, inline
error) and renders based on the returned outcome. It no longer knows about
server actions or quote shapes beyond reading the applied code.

**Verify**: `npm run typecheck` -> exit 0.

### Step 2: Implement `onApply` on the checkout page

In `CheckoutPage`, add a handler that reuses the existing `requestQuote`
machinery rather than duplicating it:

1. Call `requestQuote(lifecycleRef.current.destination, undefined, acceptedQuote, 'discount')`
   with the discount code threaded through.
2. `requestQuote` currently derives the code from
   `activeDiscountCode(baseQuote)`; add an optional `discountCodeOverride`
   parameter so an explicit `null` (removal) is distinguishable from "unchanged".
   Use a sentinel type such as `{code: string | null} | undefined`, not a bare
   `null`, so the two intents cannot be confused.
3. Add `'discount'` to `CheckoutQuoteChangeSource` in
   `src/checkout/prefill.ts` and decide its behaviour in
   `shouldReviewCheckoutQuoteChange`: it **must** review, i.e. keep the accepted
   quote so `settleQuoteRequest` can produce a proposal.
4. Map the settled lifecycle back to the form's outcome:
   `not_eligible` when the settled quote's discount status says so, `failed` on
   an issue, `applied` otherwise.

**Verify**: `npx vitest run tests/unit/checkout` -> all pass.

### Step 3: Remove the bypass

Delete `acceptExternalQuote` and the `onAcceptedQuote` prop from
`OrderSummary` and `DiscountCodeForm` once nothing calls them. Leaving a dead
escape hatch invites the bug to come back.

**Verify**: `npm run lint` -> exit 0 with no unused-export warnings.

### Step 4: Tests

1. `tests/unit/checkout/quote-lifecycle.test.ts`: applying a discount while a
   line price changed produces a `proposal`, not a silently accepted quote.
2. Same file: applying a discount with no other change accepts directly and
   leaves `proposal === null`.
3. Removing a discount (`code: null`) behaves symmetrically.
4. `tests/e2e/checkout.spec.ts`: applying a valid code still updates the total
   and the submit button stays enabled — no regression in the happy path.

**Verify**: `npx playwright test tests/e2e/checkout.spec.ts` -> all pass.

## Test plan

- Unit and E2E above.
- Manual: apply a code, remove it, apply an ineligible code, and apply a code
  while the quote is mid-refresh; the submit button must be disabled whenever a
  proposal is open.

## Done criteria

- [ ] Discount apply/remove goes through `beginQuoteRequest` /
      `settleQuoteRequest` like every other requote.
- [ ] A concurrent material change raises `QuoteDiffDialog`.
- [ ] `onAcceptedQuote` / `acceptExternalQuote` no longer exist.
- [ ] Applying and removing codes still works end to end.
- [ ] `npm run typecheck`, `npm run lint`, `npx vitest run tests/unit/checkout` pass.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- Threading the discount override through `requestQuote` would require changing
  `refreshCheckoutQuoteAction`'s input schema in a way the server rejects.
- The diff gate fires on every discount apply because the discount itself is
  classified as a material change — in that case fix the classification in
  `diffMaterialQuotes` rather than reintroducing the bypass.

## Maintenance notes

- The rule to preserve: there is exactly one way for an accepted quote to be
  replaced, and it always goes through the diff comparison. Any future feature
  that changes the quote (gift wrap, tips, shipping method choice) must use the
  same path.
