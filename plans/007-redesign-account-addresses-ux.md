# Plan 007: Redesign account addresses UX with safer shadcn form flow

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ae41faf3..HEAD -- src/components/account/address-book.tsx src/components/account/address-form.tsx src/app/[locale]/account/addresses/address-book-page.tsx src/account/address-actions.ts src/account/addresses.ts src/messages/en.json src/messages/vi.json tests/e2e/account-retention.spec.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `ae41faf3`, 2026-07-10

## Why this matters

The account address page is the next account area that still feels more like a
raw settings panel than a polished commerce flow. The current implementation
already uses shadcn form primitives, React Hook Form, and Zod, so the deeper
opportunity is UX: make saved addresses quick to scan, keep add/edit flows
progressive, reduce competing actions on each card, and give validation/status
feedback in the right place. This must preserve the existing server actions,
localized routes, checkout saved-address reuse, and security boundaries.

## Current state

- `src/components/account/address-book.tsx` renders one large `Card`, a count,
  all saved addresses, inline edit forms, and an always-visible new-address
  form after a `Separator`.
- `src/components/account/address-form.tsx` is already a client form using
  `useActionState`, `react-hook-form`, `zodResolver`, `Form`, `FormField`,
  `FormItem`, `FormLabel`, `FormControl`, `FormMessage`, and `Input`.
- `src/account/address-actions.ts` owns create/update/delete/default server
  actions. These actions validate input with `parseCustomerShippingAddressInput`,
  require an authenticated user, call Supabase RPCs, and revalidate both
  `/en/account/addresses` and `/vi/tai-khoan/dia-chi`.
- `src/app/[locale]/account/addresses/address-book-page.tsx` wires localized
  labels from `src/messages/en.json` and `src/messages/vi.json` into
  `AddressBook`.
- `tests/e2e/account-retention.spec.ts` already covers opening the address
  route, creating/editing an address, setting a default address, delete
  confirmation copy, and checkout saved-address reuse.

Important excerpts at planning time:

```tsx
// src/components/account/address-book.tsx
const [editingId, setEditingId] = useState<string | null>(null);

<Card className="shadow-sm">
  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
    ...
  </CardHeader>
  <CardContent className="space-y-6">
    ...
    {addresses.length === 0 ? <AccountEmptyState ... /> : <div className="grid gap-3">...</div>}
    <Separator />
    <div className="space-y-4">
      <h3 className="text-xl font-semibold leading-[1.3]">{labels.newAddress}</h3>
      <AddressForm locale={locale} labels={labels} />
    </div>
  </CardContent>
</Card>
```

```tsx
// src/components/account/address-form.tsx
const form = useForm({
  resolver: zodResolver(customerShippingAddressInputSchema),
  defaultValues: {
    label: address?.label ?? '',
    recipientName: address?.recipientName ?? '',
    phoneNumber: address?.phoneNumber ?? '',
    countryCode: address?.countryCode ?? '',
    region: address?.region ?? '',
    locality: address?.locality ?? '',
    addressLine1: address?.addressLine1 ?? '',
    addressLine2: address?.addressLine2 ?? '',
    postalCode: address?.postalCode ?? '',
    isDefault: address?.isDefault ?? false
  }
});
```

Repo conventions and constraints:

- This storefront uses Next.js App Router and localized static/SSR routes.
  Do not change route paths, metadata, or cache behavior for the account page.
- Public product/category/blog SEO must remain indexable; account pages stay
  authenticated and dynamic. This plan should not touch public SEO files.
- Keep money/order/shipping security boundaries server-owned. The browser may
  submit address form values, but server actions must remain the source of
  validation and authorization.
- Use existing design tokens such as `var(--surface)`, `var(--muted-foreground)`,
  `var(--border)`, `var(--success)`, `var(--destructive)`, and
  `var(--radius-control)`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Drift check | `git diff --stat ae41faf3..HEAD -- src/components/account/address-book.tsx src/components/account/address-form.tsx src/app/[locale]/account/addresses/address-book-page.tsx src/account/address-actions.ts src/account/addresses.ts src/messages/en.json src/messages/vi.json tests/e2e/account-retention.spec.ts` | no unexpected in-scope drift, or reviewed and accepted before editing |
| Typecheck | `npm run typecheck` | exit 0, no errors |
| Lint | `npm run lint` | exit 0, no errors |
| E2E focused | `npx playwright test tests/e2e/account-retention.spec.ts` | all tests pass when local test dependencies/Supabase are available |

## Suggested executor toolkit

- Use `ambertinybear-frontend-i18n` for localized account UI, route, and
  accessibility conventions.
- Use `redesign-existing-projects`, `design-taste-frontend`, and
  `minimalist-ui` for visual execution: simplify hierarchy, avoid heavy nested
  cards, and keep the tone aligned with the home/catalog/product/cart work.
- Use GSD before source edits, preferably `/gsd-quick`, because this is a
  focused but behavior-touching account UX change.

## Scope

**In scope**:
- `src/components/account/address-book.tsx`
- `src/components/account/address-form.tsx`
- `src/app/[locale]/account/addresses/address-book-page.tsx`
- `src/messages/en.json`
- `src/messages/vi.json`
- `tests/e2e/account-retention.spec.ts` only if selectors need to follow the
  improved UX

**Read-only unless a verified issue requires otherwise**:
- `src/account/address-actions.ts`
- `src/account/addresses.ts`
- `src/components/ui/form.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/button.tsx`

**Out of scope**:
- Database schema, Supabase RPCs, RLS, and storage policies.
- Checkout quote logic and saved-address business rules.
- Public SEO/ISR/static rendering behavior.
- Replacing delete confirmation with a custom dialog unless the user approves
  that interaction change separately.

## Git workflow

- Branch: keep the current working branch unless the operator asks for a new
  one.
- Commit message style observed in recent history: Conventional Commits, for
  example `fix(account): polish wishlist`.
- Do not stage unrelated current worktree changes, especially `.gitignore` or
  `next-env.d.ts` if they are still unrelated.

## Steps

### Step 1: Turn the page into a lighter address-management flow

In `src/components/account/address-book.tsx`:

1. Replace the outer heavy `Card` shell with a lighter section layout that
   matches the recently polished account pages: compact heading, short intro,
   subtle count, then content.
2. Remove the always-visible new-address form for non-empty address books.
   Add a single primary "Add an address" control near the top. Use state such
   as `const [showNewForm, setShowNewForm] = useState(addresses.length === 0);`.
3. When there are no addresses, show the empty state and the new-address form
   without forcing the user to click first.
4. When `showNewForm` is true, render the `AddressForm` in a clear but light
   inline panel. The panel should be visually connected to the add action, not
   a nested card inside a card.
5. Keep one edit form open at a time. Opening "Edit" should close the new form;
   opening "Add" should close any edit form.

**Verify**: `npm run typecheck` -> exit 0.

### Step 2: Make saved addresses easier to scan and act on

In `src/components/account/address-book.tsx`:

1. Render each saved address as a slim row/card with:
   - address label and default badge on the first line;
   - recipient and phone as compact secondary metadata;
   - formatted address lines with restrained text color;
   - actions grouped to the right on desktop and below on mobile.
2. Reduce action competition:
   - Keep `Edit` as the main secondary action.
   - Show `Set default` only when the address is not default.
   - Keep `Delete` visually quiet but destructive in text/color.
3. Avoid long uneven dividers. Prefer a consistent vertical list with equal
   row padding and one border per row, or a single `divide-y` container.
4. Keep existing form actions and hidden fields exactly:
   - `locale`
   - `addressId`
   - action functions from `src/account/address-actions.ts`
5. Keep the current `window.confirm(labels.deleteConfirm)` behavior unless the
   user explicitly asks for a custom shadcn dialog.

**Verify**: `npm run lint` -> exit 0.

### Step 3: Improve form control, validation, and submission feedback

In `src/components/account/address-form.tsx`:

1. Type the React Hook Form values with `CustomerShippingAddressInput` or
   `z.infer<typeof customerShippingAddressInputSchema>` if exported/available.
   Remove the current `any` in `onSubmit`.
2. Keep `zodResolver(customerShippingAddressInputSchema)` and all current
   `FormField`/`FormMessage` validation. Do not bypass server validation.
3. Add `FormDescription` only where it reduces uncertainty, especially:
   - country code should explain `US`, `VN`, etc. without adding visual bulk;
   - optional line 2/postal code can be gently marked as optional if copy is
     added to messages.
4. Group fields in a more natural order:
   - address label;
   - recipient name and phone;
   - country code and postal code;
   - address line 1 and line 2;
   - locality and region;
   - default checkbox;
   - submit/cancel controls.
   Keep autocomplete attributes intact.
5. Add an optional `onSaved?: () => void` prop. After the action state becomes
   `saved`, call `onSaved` in an effect and reset the form for create mode.
   If adding `router.refresh()` is necessary to make the updated server list
   visible immediately, use `useRouter` from `next/navigation` after the saved
   state, but do not introduce client-side data fetching.
6. Use a compact success/error notice style that does not shift the whole form
   awkwardly. It must retain `role="status"` for saved and `role="alert"` for
   errors.

**Verify**: `npm run typecheck` -> exit 0.

### Step 4: Localize only the new UX copy that is truly needed

In `src/messages/en.json`, `src/messages/vi.json`, and
`src/app/[locale]/account/addresses/address-book-page.tsx`:

1. Add only concise strings required by the improved flow. Candidate keys:
   - add-address trigger copy if `newAddress` is not suitable;
   - cancel-new-address copy if `cancel` is not suitable;
   - optional field descriptions if used.
2. Keep existing keys stable where possible so current tests and pages do not
   churn unnecessarily.
3. Use ASCII Vietnamese style consistent with the existing message files unless
   the project has intentionally moved these files to full diacritics.

**Verify**: `npm run typecheck` -> exit 0.

### Step 5: Update focused E2E coverage only if the UX selectors changed

In `tests/e2e/account-retention.spec.ts`:

1. If the new-address form is hidden by default for non-empty books, update the
   create/edit test to click the visible "Add an address" control before
   filling fields.
2. Preserve existing behavioral assertions:
   - address route opens in English and Vietnamese;
   - create/edit shows `Address saved.`;
   - exactly one default address can be selected;
   - delete confirmation warns that past order shipping details remain
     unchanged;
   - checkout can reuse a saved address and revalidate the quote.
3. Prefer role/label selectors over class selectors.

**Verify**: `npx playwright test tests/e2e/account-retention.spec.ts` -> all pass when the local Supabase/test environment is available. If unavailable, document the exact missing service/error in the final response.

## Test plan

- `npm run typecheck` must pass after the form value typing and callback changes.
- `npm run lint` must pass after UI refactors.
- `npx playwright test tests/e2e/account-retention.spec.ts` should pass in a
  fully seeded local environment. This is the regression guard for server
  action behavior, localized routes, and checkout saved-address reuse.
- Manual browser smoke test on desktop and mobile widths:
  - empty address page shows empty state plus form immediately;
  - non-empty page shows saved addresses first and a compact add action;
  - opening add closes edit; opening edit closes add;
  - validation errors appear below fields without collapsing layout;
  - successful save closes the relevant panel or clearly confirms success;
  - delete still asks for confirmation.

## Done criteria

- [ ] The address page lets customers see saved addresses before any form when
      addresses exist.
- [ ] The add-address form is progressive for non-empty lists and immediate for
      empty lists.
- [ ] Edit/default/delete actions are visually lighter and easier to distinguish.
- [ ] The form uses shadcn `Form*` primitives, Zod/RHF validation, typed submit
      values, accessible field errors, and server actions unchanged.
- [ ] No public SEO/ISR/static product/catalog/blog behavior changes.
- [ ] `npm run typecheck` exits 0.
- [ ] `npm run lint` exits 0.
- [ ] Focused address E2E is run or its environment blocker is documented.
- [ ] `plans/README.md` status row updated after execution.

## STOP conditions

Stop and report back if:

- `src/account/address-actions.ts` or `src/account/addresses.ts` must be changed
  to complete the UI work.
- A proposed UX change would alter checkout saved-address reuse behavior.
- The server action no longer returns `saved`, `deleted`, or `default_set` in
  the shape expected by current tests.
- The account page cannot show updated addresses after save without introducing
  client-side data fetching.
- The change requires adding a modal/dialog dependency that does not already
  exist.

## Maintenance notes

- A future enhancement can replace `window.confirm` with a shadcn Alert Dialog,
  but that should be a separate approved interaction change because delete
  confirmation touches destructive action UX.
- If checkout later adopts the same address form component, keep account and
  checkout validation copy aligned so customers do not learn two different
  address models.
- Reviewers should scrutinize the saved-state effect: it must not hide errors,
  double-submit, or collapse the form before the user sees validation feedback.
