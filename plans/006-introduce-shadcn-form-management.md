# Plan 006: Introduce shadcn form management

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ca675636..HEAD -- package.json src/components/ui/ src/components/reviews/review-form.tsx src/components/account/address-form.tsx src/components/newsletter/subscribe-form.tsx src/components/checkout/exception-request-form.tsx src/components/auth/auth-forms.tsx src/components/fulfillment/guest-reopen-form.tsx src/components/market-switcher.tsx src/components/catalog/wishlist-heart.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `ca675636`, 2026-06-25

## Why this matters

The user requested using shadcn/ui to improve the project's UI/UX, especially for form management, across the entire project (in all necessary positions). Form management in React benefits from client-side validation, unified validation error indicators, and standardized input/textarea styling. Additionally, simple interactive elements like the market switcher and wishlist toggle heart should be refactored to use the unified `Button` component to ensure style alignment.

This plan installs the standard packages for shadcn/ui form management (`react-hook-form`, `@hookform/resolvers`, Radix UI primitives), defines the core Form UI components, and updates the following customer-facing interactive components:
1. `ReviewForm` (`src/components/reviews/review-form.tsx`)
2. `AddressForm` (`src/components/account/address-form.tsx`)
3. `SubscribeForm` (`src/components/newsletter/subscribe-form.tsx`)
4. `ExceptionRequestForm` (`src/components/checkout/exception-request-form.tsx`)
5. Auth forms: `SignInForm`, `RegisterForm`, `ForgotPasswordForm`, `ResetPasswordForm` (`src/components/auth/auth-forms.tsx`)
6. `GuestReopenForm` (`src/components/fulfillment/guest-reopen-form.tsx`)
7. `MarketSwitcher` (`src/components/market-switcher.tsx`)
8. `WishlistHeart` (`src/components/catalog/wishlist-heart.tsx`)

## Current state

- `package.json` — contains standard project dependencies but lacks `react-hook-form` and Radix form primitives.
- `src/components/ui/` — lacks form input components.
- `src/components/reviews/review-form.tsx` — uses native form elements and React 19 `useActionState` without client-side schema validation.
- `src/components/account/address-form.tsx` — uses raw inputs without client-side validation.
- `src/components/newsletter/subscribe-form.tsx` — uses standard form action.
- `src/components/checkout/exception-request-form.tsx` — uses transition and FormData read manually.
- `src/components/auth/auth-forms.tsx` — has a custom Field component using standard inputs.
- `src/components/fulfillment/guest-reopen-form.tsx` — uses native actions directly.
- `src/components/market-switcher.tsx` — uses standard `<button>` elements.
- `src/components/catalog/wishlist-heart.tsx` — uses standard `<button>` elements.

## Commands you will need

| Purpose   | Command                                         | Expected on success |
|-----------|-------------------------------------------------|---------------------|
| Install   | `npm install <packages>`                        | exit 0              |
| Typecheck | `npm run typecheck`                             | exit 0, no errors   |
| Tests     | `npm run test:unit`                             | all pass            |
| Lint      | `npm run lint`                                  | exit 0              |
| E2E Tests | `npx playwright test tests/e2e/reviews.spec.ts` | all pass            |

## Scope

**In scope**:
- `package.json`
- `src/account/addresses.ts`
- `src/components/ui/label.tsx` [NEW]
- `src/components/ui/input.tsx` [NEW]
- `src/components/ui/textarea.tsx` [NEW]
- `src/components/ui/form.tsx` [NEW]
- `src/components/reviews/review-form.tsx`
- `src/components/account/address-form.tsx`
- `src/components/newsletter/subscribe-form.tsx`
- `src/components/checkout/exception-request-form.tsx`
- `src/components/auth/auth-forms.tsx`
- `src/components/fulfillment/guest-reopen-form.tsx`
- `src/components/market-switcher.tsx`
- `src/components/catalog/wishlist-heart.tsx`

**Out of scope**:
- Database structure changes.

## Git workflow

- Branch: `advisor/006-shadcn-form-management`
- Commit per step; Conventional Commits style: `feat(ui): introduce shadcn form elements and refactor forms`

## Steps

### Step 1: Install Form Dependencies

1. Run the installation command:
   ```bash
   npm install react-hook-form @hookform/resolvers @radix-ui/react-label @radix-ui/react-slot
   ```

**Verify**: `package.json` contains the new packages.

---

### Step 2: Implement UI components

1. Create `src/components/ui/label.tsx`:
   ```typescript
   import * as React from 'react';
   import * as LabelPrimitive from '@radix-ui/react-label';
   import {cn} from '@/lib/utils';

   const Label = React.forwardRef<
     React.ElementRef<typeof LabelPrimitive.Root>,
     React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
   >(({className, ...props}, ref) => (
     <LabelPrimitive.Root
       ref={ref}
       className={cn(
         'text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
         className
       )}
       {...props}
     />
   ));
   Label.displayName = LabelPrimitive.Root.displayName;

   export {Label};
   ```

2. Create `src/components/ui/input.tsx`:
   ```typescript
   import * as React from 'react';
   import {cn} from '@/lib/utils';

   const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
     ({className, type, ...props}, ref) => {
       return (
         <input
           type={type}
           className={cn(
             'flex min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--muted-foreground)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
             className
           )}
           ref={ref}
           {...props}
         />
       );
     }
   );
   Input.displayName = 'Input';

   export {Input};
   ```

3. Create `src/components/ui/textarea.tsx`:
   ```typescript
   import * as React from 'react';
   import {cn} from '@/lib/utils';

   const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
     ({className, ...props}, ref) => {
       return (
         <textarea
           className={cn(
             'flex min-h-[80px] w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] p-3 text-base ring-offset-background placeholder:text-[var(--muted-foreground)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
             className
           )}
           ref={ref}
           {...props}
         />
       );
     }
   );
   Textarea.displayName = 'Textarea';

   export {Textarea};
   ```

4. Create `src/components/ui/form.tsx`:
   ```typescript
   import * as React from 'react';
   import * as LabelPrimitive from '@radix-ui/react-label';
   import {Slot} from '@radix-ui/react-slot';
   import {
     Controller,
     ControllerProps,
     FieldPath,
     FieldValues,
     FormProvider,
     useFormContext
   } from 'react-hook-form';

   import {cn} from '@/lib/utils';
   import {Label} from '@/components/ui/label';

   const Form = FormProvider;

   type FormFieldContextValue<
     TFieldValues extends FieldValues = FieldValues,
     TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
   > = {
     name: TName;
   };

   const FormFieldContext = React.createContext<FormFieldContextValue>(
     {} as FormFieldContextValue
   );

   const FormField = <
     TFieldValues extends FieldValues = FieldValues,
     TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
   >({
     ...props
   }: ControllerProps<TFieldValues, TName>) => {
     return (
       <FormFieldContext.Provider value={{name: props.name}}>
         <Controller {...props} />
       </FormFieldContext.Provider>
     );
   };

   const useFormField = () => {
     const fieldContext = React.useContext(FormFieldContext);
     const itemContext = React.useContext(FormItemContext);
     const {getFieldState, formState} = useFormContext();

     if (!fieldContext) {
       throw new Error('useFormField should be used within <FormField>');
     }

     const fieldState = getFieldState(fieldContext.name, formState);
     const {id} = itemContext;

     return {
       id,
       name: fieldContext.name,
       formItemId: `${id}-form-item`,
       formDescriptionId: `${id}-form-item-description`,
       formMessageId: `${id}-form-item-message`,
       ...fieldState
     };
   };

   type FormItemContextValue = {
     id: string;
   };

   const FormItemContext = React.createContext<FormItemContextValue>(
     {} as FormItemContextValue
   );

   const FormItem = React.forwardRef<
     HTMLDivElement,
     React.HTMLAttributes<HTMLDivElement>
   >(({className, ...props}, ref) => {
     const id = React.useId();

     return (
       <FormItemContext.Provider value={{id}}>
         <div ref={ref} className={cn('grid gap-1.5', className)} {...props} />
       </FormItemContext.Provider>
     );
   });
   FormItem.displayName = 'FormItem';

   const FormLabel = React.forwardRef<
     React.ElementRef<typeof LabelPrimitive.Root>,
     React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
   >(({className, ...props}, ref) => {
     const {error, formItemId} = useFormField();

     return (
       <Label
         ref={ref}
         className={cn(error && 'text-[var(--destructive)]', className)}
         htmlFor={formItemId}
         {...props}
       />
     );
   });
   FormLabel.displayName = 'FormLabel';

   const FormControl = React.forwardRef<
     React.ElementRef<typeof Slot>,
     React.ComponentPropsWithoutRef<typeof Slot>
   >(({...props}, ref) => {
     const {error, formItemId, formDescriptionId, formMessageId} = useFormField();

     return (
       <Slot
         ref={ref}
         id={formItemId}
         aria-describedby={
           !error
             ? `${formDescriptionId}`
             : `${formDescriptionId} ${formMessageId}`
         }
         aria-invalid={!!error}
         {...props}
       />
     );
   });
   FormControl.displayName = 'FormControl';

   const FormDescription = React.forwardRef<
     HTMLParagraphElement,
     React.HTMLAttributes<HTMLParagraphElement>
   >(({className, ...props}, ref) => {
     const {formDescriptionId} = useFormField();

     return (
       <p
         ref={ref}
         id={formDescriptionId}
         className={cn('text-sm text-[var(--muted-foreground)]', className)}
         {...props}
       />
     );
   });
   FormDescription.displayName = 'FormDescription';

   const FormMessage = React.forwardRef<
     HTMLParagraphElement,
     React.HTMLAttributes<HTMLParagraphElement>
   >(({className, children, ...props}, ref) => {
     const {error, formMessageId} = useFormField();
     const body = error ? String(error?.message) : children;

     if (!body) {
       return null;
     }

     return (
       <p
         ref={ref}
         id={formMessageId}
         className={cn('text-sm font-medium text-[var(--destructive)]', className)}
         {...props}
       >
         {body}
       </p>
     );
   });
   FormMessage.displayName = 'FormMessage';

   export {
     useFormField,
     Form,
     FormItem,
     FormLabel,
     FormControl,
     FormDescription,
     FormMessage,
     FormField
   };
   ```

**Verify**: `npm run typecheck` passes.

---

### Step 3: Export the Address Schema

1. Modify `src/account/addresses.ts` around line 4:
   ```typescript
   export const customerShippingAddressInputSchema = shippingAddressSchema.extend({
     label: z.string().trim().min(1).max(80),
     isDefault: z.boolean().default(false)
   });
   ```

---

### Step 4: Refactor Project Forms & Interactive Elements

#### Refactor `src/components/reviews/review-form.tsx`
```tsx
'use client';

import {useActionState, useEffect} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {submitProductReviewAction, type ReviewActionState} from '@/reviews/actions';
import type {Locale} from '@/i18n/routing';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';

const initialState: ReviewActionState = {status: 'idle'};

const reviewSchema = z.object({
  productId: z.string().uuid(),
  locale: z.enum(['vi', 'en']),
  returnTo: z.string(),
  rating: z.coerce.number().int().min(1).max(5, {message: 'Rating must be between 1 and 5'}),
  title: z.string().max(120, {message: 'Title must be 120 characters or less'}).optional(),
  body: z.string().max(2000, {message: 'Body must be 2000 characters or less'}).optional()
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

export function ReviewForm({
  productId,
  locale,
  returnTo,
  labels
}: {
  productId: string;
  locale: Locale;
  returnTo: string;
  labels: {
    title: string;
    rating: string;
    reviewTitle: string;
    body: string;
    submit: string;
    pending: string;
    notEligible: string;
    error: string;
  };
}) {
  const [state, action, pending] = useActionState(submitProductReviewAction, initialState);

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      productId,
      locale,
      returnTo,
      rating: undefined,
      title: '',
      body: ''
    }
  });

  useEffect(() => {
    if (state.status === 'pending') {
      form.reset({
        productId,
        locale,
        returnTo,
        rating: undefined,
        title: '',
        body: ''
      });
    }
  }, [state, form, productId, locale, returnTo]);

  const onSubmit = (values: ReviewFormValues) => {
    const formData = new FormData();
    formData.append('productId', values.productId);
    formData.append('locale', values.locale);
    formData.append('returnTo', values.returnTo);
    formData.append('rating', String(values.rating));
    if (values.title) formData.append('title', values.title);
    if (values.body) formData.append('body', values.body);

    action(formData);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--border)] p-4"
      >
        <h2 className="text-xl font-semibold">{labels.title}</h2>
        {state.status === 'pending' ? (
          <p role="status" className="text-sm font-semibold text-[var(--success)]">
            {labels.pending}
          </p>
        ) : null}
        {state.status === 'not_eligible' ? (
          <p role="alert" className="text-sm font-semibold text-[var(--destructive)]">
            {labels.notEligible}
          </p>
        ) : null}
        {state.status === 'error' || state.status === 'invalid' ? (
          <p role="alert" className="text-sm font-semibold text-[var(--destructive)]">
            {labels.error}
          </p>
        ) : null}

        <input type="hidden" {...form.register('productId')} />
        <input type="hidden" {...form.register('locale')} />
        <input type="hidden" {...form.register('returnTo')} />

        <FormField
          control={form.control}
          name="rating"
          render={({field}) => (
            <FormItem>
              <FormLabel className="font-semibold">{labels.rating}</FormLabel>
              <FormControl>
                <fieldset className="flex gap-3" aria-label={labels.rating}>
                  {[1, 2, 3, 4, 5].map((rating) => {
                    const isSelected = field.value === rating;
                    return (
                      <label
                        key={rating}
                        className={`flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-[var(--radius-control)] border transition-colors ${
                          isSelected
                            ? 'border-[var(--accent)] bg-[var(--accent)] text-white font-bold'
                            : 'border-[var(--border)] hover:bg-[var(--surface-muted)]'
                        }`}
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          name={field.name}
                          value={rating}
                          checked={field.value === rating}
                          onChange={() => field.onChange(rating)}
                        />
                        {rating}
                      </label>
                    );
                  })}
                </fieldset>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({field}) => (
            <FormItem>
              <FormLabel className="font-semibold">{labels.reviewTitle}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  maxLength={120}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="body"
          render={({field}) => (
            <FormItem>
              <FormLabel className="font-semibold">{labels.body}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  maxLength={2000}
                  rows={4}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 w-fit items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent)] px-4 font-semibold text-white cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {labels.submit}
        </button>
      </form>
    </Form>
  );
}
```

#### Refactor `src/components/account/address-form.tsx`
```tsx
'use client';

import {useActionState, useEffect} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {
  createCustomerShippingAddressAction,
  updateCustomerShippingAddressAction,
  type AddressActionState
} from '@/account/address-actions';
import {
  customerShippingAddressInputSchema,
  type CustomerShippingAddress
} from '@/account/addresses';
import {Button} from '@/components/ui/button';
import type {Locale} from '@/i18n/routing';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';

export type AddressFormLabels = {
  fields: {
    label: string;
    recipientName: string;
    phoneNumber: string;
    countryCode: string;
    region: string;
    locality: string;
    addressLine1: string;
    addressLine2: string;
    postalCode: string;
    isDefault: string;
  };
  save: string;
  saving: string;
  cancel: string;
  saved: string;
  error: string;
};

const initialState: AddressActionState = {status: 'idle'};

function statusMessage(state: AddressActionState, labels: AddressFormLabels) {
  if (state.status === 'saved') return labels.saved;
  if (state.status === 'invalid' || state.status === 'not_found' || state.status === 'error') return labels.error;
  return null;
}

export function AddressForm({
  locale,
  labels,
  address,
  onCancel
}: {
  locale: Locale;
  labels: AddressFormLabels;
  address?: CustomerShippingAddress;
  onCancel?: () => void;
}) {
  const action = address ? updateCustomerShippingAddressAction : createCustomerShippingAddressAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const message = statusMessage(state, labels);

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

  const onSubmit = (values: any) => {
    const formData = new FormData();
    formData.append('locale', locale);
    if (address) {
      formData.append('addressId', address.id);
    }
    formData.append('label', values.label);
    formData.append('recipientName', values.recipientName);
    formData.append('phoneNumber', values.phoneNumber);
    formData.append('countryCode', values.countryCode);
    if (values.region) formData.append('region', values.region);
    if (values.locality) formData.append('locality', values.locality);
    formData.append('addressLine1', values.addressLine1);
    if (values.addressLine2) formData.append('addressLine2', values.addressLine2);
    if (values.postalCode) formData.append('postalCode', values.postalCode);
    if (values.isDefault) {
      formData.append('isDefault', 'on');
    }
    formAction(formData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        {message ? (
          <p role={state.status === 'saved' ? 'status' : 'alert'} className={state.status === 'saved' ? 'text-sm font-semibold text-[var(--success)]' : 'text-sm font-semibold text-[var(--destructive)]'}>
            {message}
          </p>
        ) : null}

        <FormField
          control={form.control}
          name="label"
          render={({field}) => (
            <FormItem>
              <FormLabel>{labels.fields.label}</FormLabel>
              <FormControl>
                <Input {...field} maxLength={80} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="recipientName"
            render={({field}) => (
              <FormItem>
                <FormLabel>{labels.fields.recipientName}</FormLabel>
                <FormControl>
                  <Input {...field} maxLength={120} autoComplete="name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phoneNumber"
            render={({field}) => (
              <FormItem>
                <FormLabel>{labels.fields.phoneNumber}</FormLabel>
                <FormControl>
                  <Input {...field} minLength={5} maxLength={40} autoComplete="tel" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="countryCode"
            render={({field}) => (
              <FormItem>
                <FormLabel>{labels.fields.countryCode}</FormLabel>
                <FormControl>
                  <Input {...field} minLength={2} maxLength={2} autoComplete="country" className="uppercase" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="postalCode"
            render={({field}) => (
              <FormItem>
                <FormLabel>{labels.fields.postalCode}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} maxLength={200} autoComplete="postal-code" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="addressLine1"
          render={({field}) => (
            <FormItem>
              <FormLabel>{labels.fields.addressLine1}</FormLabel>
              <FormControl>
                <Input {...field} maxLength={200} autoComplete="address-line1" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="addressLine2"
          render={({field}) => (
            <FormItem>
              <FormLabel>{labels.fields.addressLine2}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} maxLength={200} autoComplete="address-line2" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="locality"
            render={({field}) => (
              <FormItem>
                <FormLabel>{labels.fields.locality}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} maxLength={200} autoComplete="address-level2" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="region"
            render={({field}) => (
              <FormItem>
                <FormLabel>{labels.fields.region}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} maxLength={200} autoComplete="address-level1" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isDefault"
          render={({field}) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-[var(--surface)]">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="size-5 cursor-pointer mt-0.5"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="cursor-pointer text-sm font-semibold">
                  {labels.fields.isDefault}
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending} className="cursor-pointer">
            {pending ? labels.saving : labels.save}
          </Button>
          {onCancel ? (
            <Button type="button" variant="secondary" onClick={onCancel} className="cursor-pointer">
              {labels.cancel}
            </Button>
          ) : null}
        </div>
      </form>
    </Form>
  );
}
```

#### Refactor `src/components/newsletter/subscribe-form.tsx`
```tsx
'use client';

import {useActionState, useEffect} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Mail} from 'lucide-react';
import {subscribeNewsletterAction} from '@/newsletter/actions';
import type {NewsletterSubscribeResult} from '@/newsletter/consent';
import type {Locale} from '@/i18n/routing';
import {Button} from '@/components/ui/button';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';

const initialState: NewsletterSubscribeResult = {status: 'idle'};

const subscribeSchema = z.object({
  email: z.string().trim().email({message: 'Invalid email address'}).max(320),
  locale: z.enum(['vi', 'en'])
});

export function SubscribeForm({
  locale,
  labels
}: {
  locale: Locale;
  labels: {
    title: string;
    consent: string;
    email: string;
    submit: string;
    pending: string;
    success: string;
    invalid: string;
    error: string;
  };
}) {
  const [state, action, pending] = useActionState(subscribeNewsletterAction, initialState);

  const form = useForm<z.infer<typeof subscribeSchema>>({
    resolver: zodResolver(subscribeSchema),
    defaultValues: {
      email: '',
      locale
    }
  });

  useEffect(() => {
    if (state.status === 'subscribed') {
      form.reset({email: '', locale});
    }
  }, [state, form, locale]);

  const onSubmit = (values: z.infer<typeof subscribeSchema>) => {
    const formData = new FormData();
    formData.append('email', values.email);
    formData.append('locale', values.locale);
    action(formData);
  };

  return (
    <Form {...form}>
      <form id="newsletter" onSubmit={form.handleSubmit(onSubmit)} className="grid w-full max-w-xl gap-2">
        <p className="font-semibold text-[var(--foreground)]">{labels.title}</p>
        <p>{labels.consent}</p>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <FormField
            control={form.control}
            name="email"
            render={({field}) => (
              <FormItem className="grid gap-1">
                <FormLabel className="font-semibold text-[var(--foreground)]">{labels.email}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    autoComplete="email"
                    maxLength={320}
                    className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 font-normal"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={pending} className="gap-2 whitespace-nowrap min-h-11 cursor-pointer">
            <Mail aria-hidden="true" className="size-4" />
            {pending ? labels.pending : labels.submit}
          </Button>
        </div>
        {state.status === 'subscribed' ? <p role="status">{labels.success}</p> : null}
        {state.status === 'invalid' ? <p role="status">{labels.invalid}</p> : null}
        {state.status === 'error' ? <p role="status">{labels.error}</p> : null}
      </form>
    </Form>
  );
}
```

#### Refactor `src/components/checkout/exception-request-form.tsx`
```tsx
'use client';

import {useActionState, useEffect} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {createExceptionRequestAction, type CreateExceptionRequestResult} from '@/checkout/exception-actions';
import type {Locale} from '@/i18n/routing';
import {Alert} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';

const copy = {
  en: {
    title: 'Request exception',
    email: 'Email',
    productId: 'Product ID',
    variantId: 'Variant ID',
    country: 'Destination country',
    note: 'Note',
    submit: 'Send request',
    pending: 'Sending',
    created: 'Request received. No inventory has been reserved.',
    invalid: 'Check the request details.'
  },
  vi: {
    title: 'Yeu cau ngoai le',
    email: 'Email',
    productId: 'Ma san pham',
    variantId: 'Ma tuy chon',
    country: 'Quoc gia giao hang',
    note: 'Ghi chu',
    submit: 'Gui yeu cau',
    pending: 'Dang gui',
    created: 'Da nhan yeu cau. Chua co hang nao duoc giu.',
    invalid: 'Kiem tra thong tin yeu cau.'
  }
} as const;

const exceptionRequestFormSchema = z.object({
  email: z.string().trim().email({message: 'Invalid email address'}).max(320),
  productId: z.guid(),
  variantId: z.string().trim().uuid().or(z.literal('')).optional().nullable(),
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, {message: 'Must be a 2-letter country code'}),
  note: z.string().trim().max(1000).optional()
});

type ExceptionRequestFormValues = z.infer<typeof exceptionRequestFormSchema>;

export function ExceptionRequestForm({locale}: {locale: Locale}) {
  const t = copy[locale];
  const [result, action, pending] = useActionState(
    async (_state: CreateExceptionRequestResult | null, formData: FormData): Promise<CreateExceptionRequestResult> => {
      return createExceptionRequestAction({
        locale,
        market: locale === 'vi' ? 'vn' : 'intl',
        contactEmail: formData.get('email'),
        productId: formData.get('productId'),
        variantId: formData.get('variantId') || null,
        destinationCountryCode: String(formData.get('countryCode') ?? '').toUpperCase(),
        customerNote: formData.get('note') ?? ''
      });
    },
    null
  );

  const form = useForm<ExceptionRequestFormValues>({
    resolver: zodResolver(exceptionRequestFormSchema),
    defaultValues: {
      email: '',
      productId: '',
      variantId: '',
      countryCode: '',
      note: ''
    }
  });

  useEffect(() => {
    if (result?.status === 'created') {
      form.reset({
        email: '',
        productId: '',
        variantId: '',
        countryCode: '',
        note: ''
      });
    }
  }, [result, form]);

  const onSubmit = (values: ExceptionRequestFormValues) => {
    const formData = new FormData();
    formData.append('email', values.email);
    formData.append('productId', values.productId);
    formData.append('variantId', values.variantId || '');
    formData.append('countryCode', values.countryCode);
    formData.append('note', values.note || '');
    action(formData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        {result?.status === 'created' ? <Alert variant="success">{t.created}</Alert> : null}
        {result && result.status !== 'created' ? <Alert variant="destructive">{t.invalid}</Alert> : null}

        <FormField
          control={form.control}
          name="email"
          render={({field}) => (
            <FormItem>
              <FormLabel className="font-semibold">{t.email}</FormLabel>
              <FormControl>
                <Input {...field} inputMode="email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="productId"
          render={({field}) => (
            <FormItem>
              <FormLabel className="font-semibold">{t.productId}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="variantId"
          render={({field}) => (
            <FormItem>
              <FormLabel className="font-semibold">{t.variantId}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="countryCode"
          render={({field}) => (
            <FormItem>
              <FormLabel className="font-semibold">{t.country}</FormLabel>
              <FormControl>
                <Input {...field} maxLength={2} className="uppercase" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="note"
          render={({field}) => (
            <FormItem>
              <FormLabel className="font-semibold">{t.note}</FormLabel>
              <FormControl>
                <Textarea {...field} className="min-h-24" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={pending} className="cursor-pointer">
          {pending ? t.pending : t.submit}
        </Button>
      </form>
    </Form>
  );
}
```

#### Refactor `src/components/auth/auth-forms.tsx`
```tsx
'use client';

import {useActionState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {
  registerAction,
  requestPasswordResetAction,
  signInAction,
  updatePasswordAction,
  type AuthActionState
} from '@/auth/actions';
import {
  signInSchema,
  registerSchema,
  passwordResetRequestSchema,
  passwordUpdateSchema,
  type SignInInput,
  type RegisterInput,
  type PasswordResetRequestInput,
  type PasswordUpdateInput
} from '@/auth/schemas';
import type {Locale} from '@/i18n/routing';
import {Alert} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';

type AuthMessages = {
  email: string;
  password: string;
  confirmPassword: string;
  submit: string;
  pending: string;
  successTitle: string;
  successBody: string;
  genericError: string;
};

const initialState: AuthActionState = {status: 'idle'};

function FormShell({children, state, messages}: {children: React.ReactNode; state: AuthActionState; messages: AuthMessages}) {
  if (state.status === 'success') {
    return (
      <Alert variant="success">
        <h2 className="text-base font-semibold">{messages.successTitle}</h2>
        <p className="mt-2">{messages.successBody}</p>
      </Alert>
    );
  }

  return (
    <>
      {state.status === 'error' ? (
        <Alert variant="destructive" id="auth-form-error">
          {messages.genericError}
        </Alert>
      ) : null}
      {children}
    </>
  );
}

export function SignInForm({locale, next, messages}: {locale: Locale; next?: string; messages: AuthMessages}) {
  const [state, action, pending] = useActionState(signInAction, initialState);

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
      locale,
      next: next || ''
    }
  });

  const onSubmit = (values: SignInInput) => {
    const formData = new FormData();
    formData.append('email', values.email);
    formData.append('password', values.password);
    formData.append('locale', values.locale);
    if (values.next) formData.append('next', values.next);
    action(formData);
  };

  return (
    <FormShell state={state} messages={messages}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({field}) => (
              <FormItem>
                <FormLabel>{messages.email}</FormLabel>
                <FormControl>
                  <Input {...field} type="email" autoComplete="email" className="min-h-12" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({field}) => (
              <FormItem>
                <FormLabel>{messages.password}</FormLabel>
                <FormControl>
                  <Input {...field} type="password" autoComplete="current-password" className="min-h-12" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full min-h-11 cursor-pointer" disabled={pending}>
            {pending ? messages.pending : messages.submit}
          </Button>
        </form>
      </Form>
    </FormShell>
  );
}

export function RegisterForm({locale, next, messages}: {locale: Locale; next?: string; messages: AuthMessages}) {
  const [state, action, pending] = useActionState(registerAction, initialState);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      locale,
      next: next || ''
    }
  });

  const onSubmit = (values: RegisterInput) => {
    const formData = new FormData();
    formData.append('email', values.email);
    formData.append('password', values.password);
    formData.append('confirmPassword', values.confirmPassword);
    formData.append('locale', values.locale);
    if (values.next) formData.append('next', values.next);
    action(formData);
  };

  return (
    <FormShell state={state} messages={messages}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({field}) => (
              <FormItem>
                <FormLabel>{messages.email}</FormLabel>
                <FormControl>
                  <Input {...field} type="email" autoComplete="email" className="min-h-12" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({field}) => (
              <FormItem>
                <FormLabel>{messages.password}</FormLabel>
                <FormControl>
                  <Input {...field} type="password" autoComplete="new-password" className="min-h-12" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({field}) => (
              <FormItem>
                <FormLabel>{messages.confirmPassword}</FormLabel>
                <FormControl>
                  <Input {...field} type="password" autoComplete="new-password" className="min-h-12" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full min-h-11 cursor-pointer" disabled={pending}>
            {pending ? messages.pending : messages.submit}
          </Button>
        </form>
      </Form>
    </FormShell>
  );
}

export function ForgotPasswordForm({locale, messages}: {locale: Locale; messages: AuthMessages}) {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initialState);

  const form = useForm<PasswordResetRequestInput>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: {
      email: '',
      locale
    }
  });

  const onSubmit = (values: PasswordResetRequestInput) => {
    const formData = new FormData();
    formData.append('email', values.email);
    formData.append('locale', values.locale);
    action(formData);
  };

  return (
    <FormShell state={state} messages={messages}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({field}) => (
              <FormItem>
                <FormLabel>{messages.email}</FormLabel>
                <FormControl>
                  <Input {...field} type="email" autoComplete="email" className="min-h-12" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full min-h-11 cursor-pointer" disabled={pending}>
            {pending ? messages.pending : messages.submit}
          </Button>
        </form>
      </Form>
    </FormShell>
  );
}

export function ResetPasswordForm({locale, next, messages}: {locale: Locale; next?: string; messages: AuthMessages}) {
  const [state, action, pending] = useActionState(updatePasswordAction, initialState);

  const form = useForm<PasswordUpdateInput>({
    resolver: zodResolver(passwordUpdateSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
      locale,
      next: next || ''
    }
  });

  const onSubmit = (values: PasswordUpdateInput) => {
    const formData = new FormData();
    formData.append('password', values.password);
    formData.append('confirmPassword', values.confirmPassword);
    formData.append('locale', values.locale);
    if (values.next) formData.append('next', values.next);
    action(formData);
  };

  return (
    <FormShell state={state} messages={messages}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="password"
            render={({field}) => (
              <FormItem>
                <FormLabel>{messages.password}</FormLabel>
                <FormControl>
                  <Input {...field} type="password" autoComplete="new-password" className="min-h-12" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({field}) => (
              <FormItem>
                <FormLabel>{messages.confirmPassword}</FormLabel>
                <FormControl>
                  <Input {...field} type="password" autoComplete="new-password" className="min-h-12" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full min-h-11 cursor-pointer" disabled={pending}>
            {pending ? messages.pending : messages.submit}
          </Button>
        </form>
      </Form>
    </FormShell>
  );
}
```

#### Refactor `src/components/fulfillment/guest-reopen-form.tsx`
```tsx
'use client';

import {useActionState, useEffect} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Mail} from 'lucide-react';
import {requestGuestOrderClaimEmailAction, requestGuestOrderReopenAction} from '@/fulfillment/order-claim';
import type {Locale} from '@/i18n/routing';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';

export type GuestReopenLabels = {
  title: string;
  intro: string;
  orderNumber: string;
  email: string;
  reopenSubmit: string;
  claimSubmit: string;
  genericSuccess: string;
};

const guestReopenFormSchema = z.object({
  orderNumber: z.string().trim().min(1, {message: 'Order number is required'}).max(80),
  email: z.string().trim().email({message: 'Invalid email address'})
});

type GuestReopenFormValues = z.infer<typeof guestReopenFormSchema>;

export function GuestReopenForm({locale, labels}: {locale: Locale; labels: GuestReopenLabels}) {
  const [reopenState, reopenAction, reopenPending] = useActionState(
    async (_state: {status: 'idle' | 'sent'}, formData: FormData) => {
      const res = await requestGuestOrderReopenAction(formData);
      return {status: res.status};
    },
    {status: 'idle' as const}
  );

  const [claimState, claimAction, claimPending] = useActionState(
    async (_state: {status: 'idle' | 'sent'}, formData: FormData) => {
      const res = await requestGuestOrderClaimEmailAction(formData);
      return {status: res.status};
    },
    {status: 'idle' as const}
  );

  const reopenForm = useForm<GuestReopenFormValues>({
    resolver: zodResolver(guestReopenFormSchema),
    defaultValues: {orderNumber: '', email: ''}
  });

  const claimForm = useForm<GuestReopenFormValues>({
    resolver: zodResolver(guestReopenFormSchema),
    defaultValues: {orderNumber: '', email: ''}
  });

  useEffect(() => {
    if (reopenState.status === 'sent') {
      reopenForm.reset();
    }
  }, [reopenState, reopenForm]);

  useEffect(() => {
    if (claimState.status === 'sent') {
      claimForm.reset();
    }
  }, [claimState, claimForm]);

  const onReopenSubmit = (values: GuestReopenFormValues) => {
    const formData = new FormData();
    formData.append('orderNumber', values.orderNumber);
    formData.append('email', values.email);
    formData.append('locale', locale);
    reopenAction(formData);
  };

  const onClaimSubmit = (values: GuestReopenFormValues) => {
    const formData = new FormData();
    formData.append('orderNumber', values.orderNumber);
    formData.append('email', values.email);
    formData.append('locale', locale);
    claimAction(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">{labels.intro}</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Form {...reopenForm}>
              <form onSubmit={reopenForm.handleSubmit(onReopenSubmit)} className="grid gap-3">
                <FormField
                  control={reopenForm.control}
                  name="orderNumber"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>{labels.orderNumber}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={reopenForm.control}
                  name="email"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>{labels.email}</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={reopenPending} className="gap-2 cursor-pointer">
                  <Mail aria-hidden="true" className="size-4" />
                  {labels.reopenSubmit}
                </Button>
                {reopenState.status === 'sent' && (
                  <p className="text-sm text-[var(--muted-foreground)]">{labels.genericSuccess}</p>
                )}
              </form>
            </Form>
          </div>

          <div>
            <Form {...claimForm}>
              <form onSubmit={claimForm.handleSubmit(onClaimSubmit)} className="grid gap-3">
                <FormField
                  control={claimForm.control}
                  name="orderNumber"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>{labels.orderNumber}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={claimForm.control}
                  name="email"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>{labels.email}</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" variant="secondary" disabled={claimPending} className="gap-2 cursor-pointer">
                  <Mail aria-hidden="true" className="size-4" />
                  {labels.claimSubmit}
                </Button>
                {claimState.status === 'sent' && (
                  <p className="text-sm text-[var(--muted-foreground)]">{labels.genericSuccess}</p>
                )}
              </form>
            </Form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### Refactor `src/components/market-switcher.tsx`
```tsx
'use client';

import {usePathname} from 'next/navigation';
import {setActiveMarketAction} from '@/catalog/market-actions';
import type {MarketCode} from '@/catalog/market';
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';

type MarketSwitcherLabels = {
  label: string;
  current: string;
  markets: Record<MarketCode, string>;
  short: Record<MarketCode, string>;
  switchTo: Record<MarketCode, string>;
};

const markets: MarketCode[] = ['vn', 'intl'];

export function MarketSwitcher({
  activeMarket,
  labels,
  className
}: {
  activeMarket: MarketCode;
  labels: MarketSwitcherLabels;
  className?: string;
}) {
  const pathname = usePathname() || '/vi';

  return (
    <nav
      aria-label={labels.label}
      className={cn(
        'inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] p-1',
        className
      )}
    >
      <span
        aria-label={labels.current}
        data-testid="active-market-label"
        className="max-w-[5.5rem] truncate px-2 text-sm font-semibold text-[var(--foreground)]"
      >
        {labels.markets[activeMarket]}
      </span>
      <span className="flex items-center gap-1">
        {markets.map((market) => {
          const active = market === activeMarket;
          return (
            <form key={market} action={setActiveMarketAction}>
              <input type="hidden" name="market" value={market} />
              <input type="hidden" name="returnTo" value={pathname} />
              <Button
                type="submit"
                aria-label={labels.switchTo[market]}
                aria-pressed={active}
                variant={active ? 'secondary' : 'ghost'}
                className={cn(
                  'min-h-9 min-w-9 rounded-[calc(var(--radius-control)-2px)] px-2 text-xs font-semibold cursor-pointer',
                  active && 'bg-[var(--surface-muted)] text-[var(--accent)]'
                )}
              >
                {labels.short[market]}
              </Button>
            </form>
          );
        })}
      </span>
    </nav>
  );
}
```

#### Refactor `src/components/catalog/wishlist-heart.tsx`
```tsx
'use client';

import {Heart} from 'lucide-react';
import {useActionState, useEffect, useState} from 'react';
import {
  addCustomerWishlistItemAction,
  removeCustomerWishlistItemAction,
  type WishlistActionState
} from '@/account/wishlist-actions';
import type {Locale} from '@/i18n/routing';
import {Button} from '@/components/ui/button';

type WishlistHeartLabels = {
  save: string;
  remove: string;
  saving: string;
  removing: string;
};

const initialState: WishlistActionState = {status: 'idle'};

export function WishlistHeart({
  productId,
  productTitle,
  locale,
  returnTo,
  initiallySaved = false,
  labels
}: {
  productId: string;
  productTitle: string;
  locale: Locale;
  returnTo: string;
  initiallySaved?: boolean;
  labels: WishlistHeartLabels;
}) {
  const [addState, addAction, adding] = useActionState(addCustomerWishlistItemAction, initialState);
  const [removeState, removeAction, removing] = useActionState(removeCustomerWishlistItemAction, initialState);
  const serverSelected = addState.status === 'saved' || (initiallySaved && removeState.status !== 'removed' && removeState.status !== 'not_found');
  const [optimisticSelected, setOptimisticSelected] = useState<boolean | null>(null);
  const selected = optimisticSelected ?? serverSelected;
  const pending = adding || removing;
  const action = serverSelected ? removeAction : addAction;
  const labelTemplate = selected ? labels.remove : labels.save;
  const label = labelTemplate.replace('{title}', productTitle);

  useEffect(() => {
    setOptimisticSelected(null);
  }, [serverSelected, addState.status, removeState.status]);

  return (
    <form action={action} className="contents">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Button
        type="submit"
        onClick={() => setOptimisticSelected(!serverSelected)}
        aria-label={pending ? (serverSelected ? labels.removing : labels.saving) : label}
        aria-pressed={selected}
        disabled={pending}
        variant="secondary"
        className="rounded-full min-h-11 min-w-11 px-0 cursor-pointer shadow-sm"
      >
        <Heart
          aria-hidden="true"
          className={selected ? 'h-5 w-5 fill-[var(--accent)] text-[var(--accent)]' : 'h-5 w-5'}
        />
      </Button>
    </form>
  );
}
```

---

### Step 5: Verify Changes

1. Run the TypeScript build checking:
   ```bash
   npm run typecheck
   ```
2. Run unit tests to verify no regressions:
   ```bash
   npm run test:unit
   ```
3. Run ESLint checks:
   ```bash
   npm run lint
   ```
4. Run review E2E tests:
   ```bash
   npx playwright test tests/e2e/reviews.spec.ts
   ```

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test:unit` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npx playwright test tests/e2e/reviews.spec.ts` exits 0
- [ ] `plans/README.md` status row updated

## STOP conditions

- If package installation encounters version conflicts with React 19 or Next 16.
- If form controller bindings fail to validate nested/custom inputs.

## Maintenance notes

- Any additional forms added in later development stages should leverage these form controls in `src/components/ui/` to maintain UX consistency.
