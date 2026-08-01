# Plan 015: Fix Vietnamese diacritics and consolidate checkout/cart i18n

> **Execution note (2026-08-01, commit range from `b103bb42`)**: Executed with
> reduced scope after two discoveries mid-implementation:
>
> 1. `NextIntlClientProvider` is not set up anywhere in this codebase — no
>    client component uses `useTranslations()`. Every existing client
>    component either receives pre-translated strings as props from a server
>    component, or hardcodes `copy[locale]`. The "consolidate to next-intl"
>    portion of this plan (Steps 2-4) therefore requires introducing a new
>    provider at the root layout, which is a larger, app-wide architectural
>    change than "migrate 10 components" implied. **This portion was not
>    executed** and is left for a dedicated follow-up plan.
> 2. The unaccented-Vietnamese defect is not limited to cart/checkout —
>    `catalog`, `product`, `auth`, `account`, `footer`, `accountPurchases`,
>    `accountAddresses`, and `accountWishlist` in `src/messages/vi.json` have
>    the same issue. Fixing those is a full-site content pass outside this
>    checkout/payment-flow engagement's scope and was **not executed**.
>
> **What was actually delivered**: full diacritics fixes for
> `src/messages/vi.json`'s `orders`, `payments`, and `guestAccess`
> namespaces (91 strings), `src/emails/transactional.ts`'s Vietnamese
> branches, and the layout's "Skip to content" string — i.e., every
> Vietnamese string a customer sees on the checkout → payment → order-status
> path. A scoped regression guard,
> `scripts/check-vi-diacritics.mjs` (wired into `npm run ci` as
> `check:vi-diacritics`), fails CI if unaccented Vietnamese reappears in the
> `orders`, `payments`, `guestAccess`, `checkout`, or `cart` namespaces — the
> last two are pre-declared for whenever the full consolidation happens.
>
> Follow-up candidates, not filed as plans yet: (a) add
> `NextIntlClientProvider` scoped to a small picked namespace and migrate
> `cart-page.tsx`, `checkout-page.tsx`, and the other 8 components listed
> below; (b) a full-site Vietnamese diacritics content pass with a native
> speaker review, covering the namespaces listed in discovery 2.

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat b103bb42..HEAD -- src/components/cart src/components/checkout src/emails/transactional.ts src/messages`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (behaviour), MED (churn across many files)
- **Depends on**: none, but plans 008-014 add copy and should land their strings
  in the new structure
- **Category**: quality / maintainability
- **Planned at**: commit `b103bb42`, 2026-08-01

## Why this matters

Two problems that reinforce each other.

**Unaccented Vietnamese in customer-facing surfaces.** The cart page mixes
correct and broken strings inside one object:

```ts
// src/components/cart/cart-page.tsx:45
vi: {
  title: 'Gio hang',
  checkout: 'Tien hanh thanh toan',
  blocked: 'Kiem tra san pham khong kha dung truoc khi thanh toan.',
  ...
  paidNote: 'Mẫu PDF chỉ được cung cấp sau khi toàn bộ đơn hàng được xác nhận đã thanh toán.',
}
```

Every transactional email has the same defect ("Ban da dang ky ban tin",
"Mau PDF cho don hang"). To a Vietnamese customer this reads as broken or
machine-generated, at the exact moment they are deciding whether to send money.

**Two competing i18n systems.** `OrderPaymentPage` uses `next-intl`
(`getTranslations`), while cart and checkout hard-code `const copy = {en, vi}`
inside components. Nothing keeps them consistent, translators have no single
source, and every new feature has to pick a side.

## Current state

- `src/messages/en.json` and `src/messages/vi.json` exist and are used by
  `next-intl` for the order, account, and admin surfaces.
- Components with inline `copy` objects: `cart-page.tsx`, `cart-line.tsx`,
  `cart-change-summary.tsx`, `mini-cart.tsx`, `checkout-page.tsx`,
  `order-summary.tsx`, `contact-form.tsx`, `destination-form.tsx`,
  `discount-code-form.tsx`, `quote-diff-dialog.tsx`.
- Plan 007 explicitly told its executor to keep "ASCII Vietnamese style
  consistent with the existing message files". **This plan supersedes that
  instruction.** Full diacritics is now the standard.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Drift check | see above | no unexpected in-scope drift |
| Typecheck / lint | `npm run typecheck && npm run lint` | exit 0 |
| Unit | `npx vitest run tests/unit` | all pass |
| E2E focused | `npx playwright test tests/e2e/cart.spec.ts tests/e2e/checkout.spec.ts` | all pass |

## Scope

**In scope**:
- `src/messages/en.json`, `src/messages/vi.json`
- The ten components listed above
- `src/emails/transactional.ts`
- `scripts/check-inline-copy.mjs` (new)
- `package.json` (`ci` script)
- E2E specs whose selectors match on Vietnamese text

**Out of scope**:
- Adding a third locale.
- Changing routing or locale detection.
- Rewording English copy (translate faithfully; wording changes belong to the
  plans that own those screens).

## Steps

### Step 1: Fix diacritics first, as a standalone commit

Before any refactor, correct the Vietnamese strings in place:

1. `src/components/cart/cart-page.tsx` — the whole `vi` block.
2. `src/emails/transactional.ts` — every `locale === 'vi'` string.
3. Sweep the rest: `rg -n "Gio hang|don hang|thanh toan|san pham|dang ky|Mau PDF" src`
   and fix each hit that is customer-facing Vietnamese.

Ship this as its own commit so the fix is reviewable without refactor noise and
can be cherry-picked if the consolidation stalls.

**Verify**: `npx playwright test tests/e2e/cart.spec.ts` -> update any selector
that matched the old unaccented text, then all pass.

### Step 2: Define the namespaces

Add to both message files:

- `cart.*` — page, line, change summary, mini cart.
- `checkout.*` — page, summary, contact, destination, discount, diff dialog.

Mirror the existing file's nesting conventions. Keys must be behavioural
(`checkout.actions.paypalHandoff`), not positional (`checkout.button2`).

**Verify**: `npm run typecheck` -> exit 0.

### Step 3: Migrate components one at a time

For each of the ten components, in its own commit:

1. Replace the `copy` object with `useTranslations('cart')` /
   `useTranslations('checkout')`.
2. Function-valued copy such as
   `moreItems: (count: number) => ...` becomes an ICU plural message.
3. Keep `data-testid` attributes untouched so E2E selectors survive.
4. Delete the `copy` object and the `const t = copy[locale]` line entirely.

Order suggestion, cheapest first: `contact-form`, `discount-code-form`,
`quote-diff-dialog`, `cart-change-summary`, `cart-line`, `mini-cart`,
`destination-form`, `order-summary`, `cart-page`, `checkout-page`.

Client components need the `NextIntlClientProvider` messages for these
namespaces to be available — verify the provider setup covers them before
starting, and if it does not, fix that in Step 2.

**Verify** after each: `npm run typecheck && npm run lint` -> exit 0.

### Step 4: Guard against regression

Create `scripts/check-inline-copy.mjs`:

1. Fail if any file under `src/components/**` or `src/app/**` declares an object
   literal containing both an `en` and a `vi` key.
2. Fail if `vi.json` and `en.json` key sets differ.
3. Warn (do not fail) on likely-unaccented Vietnamese in `vi.json` using a word
   list: `khong, thanh toan, don hang, gio hang, san pham, dia chi, giao hang,
   mien phi, ma giam gia`. A warning, because legitimate ASCII values such as
   currency codes exist.

Wire it into the `ci` script in `package.json`, before `typecheck`.

**Verify**: `node scripts/check-inline-copy.mjs` -> exit 0 on the migrated tree,
and exit 1 when a test fixture reintroduces an inline `copy` object.

### Step 5: Full sweep

Run the full E2E suite — Vietnamese text selectors are the most likely
casualties of this change.

**Verify**: `npm run ci` -> exit 0.

## Test plan

- `npm run ci` including the new script.
- Manual read-through of the Vietnamese cart, checkout and order pages by
  someone who reads Vietnamese. Automated checks cannot catch a wrong-but-
  accented translation.

## Done criteria

- [ ] No unaccented Vietnamese remains in customer-facing copy or emails.
- [ ] Cart and checkout use `next-intl`; no `const copy = {en, vi}` remains in
      `src/components`.
- [ ] `vi.json` and `en.json` have identical key sets.
- [ ] CI fails if either regression is reintroduced.
- [ ] `npm run ci` passes.
- [ ] `plans/README.md` status row updated, and plan 007's ASCII instruction is
      annotated as superseded.

## STOP conditions

Stop and report if:

- Client components cannot access the new namespaces without restructuring the
  `NextIntlClientProvider` setup in a way that affects other routes.
- ICU plural syntax for Vietnamese produces awkward output that needs a copy
  decision from the shop owner.
- E2E selector churn exceeds what can be reviewed in one change — if so, split
  per component and land Step 1 alone first.

## Maintenance notes

- Vietnamese is the primary market language for this shop. Treat a missing
  diacritic as a bug, not a style choice.
- New user-facing strings go into the message files from the start; the CI guard
  makes that the path of least resistance.
