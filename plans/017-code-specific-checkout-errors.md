# Plan 017: Give checkout failures accurate, actionable messages

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat b103bb42..HEAD -- src/components/checkout/checkout-page.tsx src/checkout/actions.ts src/checkout/submit-checkout.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plan 015 (messages live in `next-intl` by then)
- **Category**: UX
- **Planned at**: commit `b103bb42`, 2026-08-01

## Why this matters

The submit path already returns precise machine-readable codes. The UI throws
that precision away:

```tsx
// src/components/checkout/checkout-page.tsx:699
{submitResult.status === 'invalid' ? t.invalid
  : submitResult.status === 'stale' ? t.stale
    : t.conflict}
```

So `conflict`, `retryable` and `error` all render "Checkout could not reserve
the current items. Review your cart and try again." — which is simply false when
the real cause was a dropped network request. Worse, `guest_recovery_required`
(the browser is blocking cookies) renders "Check your contact details and cart
before continuing", which no customer can act on. They will retry forever.

## Current state

Codes reaching the client today:

| Code | Origin | Real cause |
|---|---|---|
| `guest_recovery_required` | `submitCheckoutAction` | cookies blocked / private mode |
| `invalid_payment_method_for_market` | `canonicalCheckoutInput` | quote/market drift |
| `invalid_checkout_submit` | `submitCheckout` schema | malformed payload |
| `stale_commercial_quote` | `submit_checkout` SQL | price/stock/discount moved |
| `stale_shipping_quote` | `submit_checkout` SQL | shipping config moved |
| `shipping_address_required` | `submit_checkout` SQL | address missing/mismatched |
| `us_shipping_address_incomplete` | `submit_checkout` SQL | US state or ZIP missing |
| `retryable_checkout_conflict` | `submitCheckout` retry loop | lock contention |
| `checkout_submit_failed` | action error path | server or network failure |

`SubmitCheckoutActionState` already carries an optional `errorId` from
`runMonitoredAction`, which is currently never displayed.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Drift check | see above | no unexpected in-scope drift |
| Typecheck / lint | `npm run typecheck && npm run lint` | exit 0 |
| Unit | `npx vitest run tests/unit/checkout` | all pass |
| E2E focused | `npx playwright test tests/e2e/checkout.spec.ts` | all pass |

## Scope

**In scope**:
- `src/checkout/submit-error-copy.ts` (new mapping module)
- `src/components/checkout/checkout-page.tsx`
- `src/messages/{en,vi}.json`
- `tests/unit/checkout/submit-error-copy.test.ts` (new)

**Out of scope**:
- Changing which codes the server returns.
- Retry-on-behalf-of-the-user behaviour.

## Steps

### Step 1: Mapping module

Create `src/checkout/submit-error-copy.ts`:

```ts
export type SubmitErrorPresentation = {
  messageKey: string;
  variant: 'warning' | 'destructive';
  recoverable: boolean;   // is retrying the same action sensible?
  focusTarget?: 'contact' | 'destination' | 'cart';
};

export function presentSubmitError(result: {status: string; code: string}): SubmitErrorPresentation;
```

Map every code in the table above, with an explicit fallback for unknown codes
(`checkout.errors.unknown`, `destructive`, `recoverable: true`). The fallback
must never be reached silently — log through the existing monitoring facts so a
new server code surfaces in operations rather than as mystery copy.

**Verify**: `npm run typecheck` -> exit 0.

### Step 2: Message content

Add `checkout.errors.*` to both locales. Each message names the cause and the
next action:

| Key | Vietnamese intent |
|---|---|
| `cookiesBlocked` | Trình duyệt đang chặn cookie nên không giữ được đơn. Bật cookie hoặc thoát chế độ ẩn danh rồi thử lại. |
| `staleQuote` | Giá hoặc tình trạng hàng vừa thay đổi. Xem lại tổng tiền rồi thử lại. |
| `staleShipping` | Phí giao hàng vừa thay đổi. Xác nhận lại địa chỉ giao hàng. |
| `addressRequired` | Địa chỉ giao hàng chưa đầy đủ. |
| `addressIncompleteUs` | Đơn giao tới Mỹ cần bang và mã ZIP. |
| `paymentMethodDrift` | Phương thức thanh toán chưa khớp thị trường. Hãy tải lại trang. |
| `conflict` | Không giữ được sản phẩm trong giỏ. Xem lại giỏ hàng rồi thử lại. |
| `network` | Không kết nối được máy chủ. Đơn của bạn **chưa** được tạo — hãy thử lại. |
| `unknown` | Có lỗi xảy ra. Hãy thử lại; nếu vẫn lỗi, gửi cho chúng tôi mã sự cố bên dưới. |

The network message must state that no order was created — a customer who fears
a double charge will not retry.

**Verify**: `npm run typecheck` -> exit 0.

### Step 3: Render

In `CheckoutPage`, replace the nested ternary with `presentSubmitError`:

1. Use the returned `variant` for the `Alert`.
2. When `focusTarget` is set, call the existing `focusFirstIncompleteField`
   logic — extend it to accept a target so an address error moves focus to the
   address section, not to the email field.
3. When `errorId` is present, render it in small muted text as
   "Mã sự cố: {errorId}" so support can correlate with `operations` records.
4. Keep the alert in the same DOM position so screen readers announce it via the
   existing live region rather than a new one.

**Verify**: `npm run lint` -> exit 0.

### Step 4: Tests

1. Unit: every known code maps to a distinct key; the fallback triggers for an
   invented code; `recoverable` is false for `paymentMethodDrift` (reload
   required).
2. E2E: block cookies in a Playwright context, attempt checkout, assert the
   cookie-specific message appears — this is the case that currently misleads
   customers most.

**Verify**: `npx playwright test tests/e2e/checkout.spec.ts` -> all pass.

## Test plan

- Unit and E2E above.
- Manual: force each code where feasible (offline mode for network, stale quote
  via a price change in admin, US address without a ZIP).

## Done criteria

- [ ] Each server code produces a distinct, actionable message in both locales.
- [ ] The cookie-blocked case tells the customer to enable cookies.
- [ ] Network failures state clearly that no order was created.
- [ ] Unknown codes fall back safely and are visible in operations.
- [ ] `errorId` is shown when present.
- [ ] `npm run ci` passes.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- A code cannot be distinguished on the client because the action collapses it
  before returning — fix the action, do not guess in the UI.
- Showing `errorId` would leak anything beyond an opaque identifier.

## Maintenance notes

- Any new failure code added to `submit_checkout` or `submitCheckoutAction` must
  be added to the mapping in the same change; the unit test enumerating codes is
  the enforcement point.
