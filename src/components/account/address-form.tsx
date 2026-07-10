'use client';

import {startTransition, useActionState, useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {
  createCustomerShippingAddressAction,
  updateCustomerShippingAddressAction,
  type AddressActionState
} from '@/account/address-actions';
import {
  customerShippingAddressInputSchema,
  type CustomerShippingAddress,
  type CustomerShippingAddressInput
} from '@/account/addresses';
import {Button} from '@/components/ui/button';
import type {Locale} from '@/i18n/routing';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
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
  descriptions?: {
    countryCode?: string;
  };
};

const initialState: AddressActionState = {status: 'idle'};

function statusMessage(state: AddressActionState, labels: AddressFormLabels) {
  if (state.status === 'saved') return labels.saved;
  if (state.status === 'invalid' || state.status === 'not_found' || state.status === 'error') return labels.error;
  return null;
}

function defaultValues(address?: CustomerShippingAddress): CustomerShippingAddressInput {
  return {
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
  };
}

export function AddressForm({
  locale,
  labels,
  address,
  onCancel,
  onSaved
}: {
  locale: Locale;
  labels: AddressFormLabels;
  address?: CustomerShippingAddress;
  onCancel?: () => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const action = address ? updateCustomerShippingAddressAction : createCustomerShippingAddressAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const message = statusMessage(state, labels);

  const form = useForm<CustomerShippingAddressInput>({
    resolver: zodResolver(customerShippingAddressInputSchema),
    defaultValues: defaultValues(address)
  });

  useEffect(() => {
    if (state.status !== 'saved') return;
    if (!address) {
      form.reset(defaultValues());
    }
    router.refresh();
    onSaved?.();
  }, [address, form, onSaved, router, state.status]);

  const onSubmit = (values: CustomerShippingAddressInput) => {
    const formData = new FormData();
    formData.append('locale', locale);
    if (address) {
      formData.append('addressId', address.id);
    }
    formData.append('label', values.label);
    formData.append('recipientName', values.recipientName);
    formData.append('phoneNumber', values.phoneNumber);
    formData.append('countryCode', values.countryCode.toUpperCase());
    if (values.region) formData.append('region', values.region);
    if (values.locality) formData.append('locality', values.locality);
    formData.append('addressLine1', values.addressLine1);
    if (values.addressLine2) formData.append('addressLine2', values.addressLine2);
    if (values.postalCode) formData.append('postalCode', values.postalCode);
    if (values.isDefault) {
      formData.append('isDefault', 'on');
    }
    startTransition(() => {
      formAction(formData);
    });
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
                {labels.descriptions?.countryCode ? (
                  <FormDescription>{labels.descriptions.countryCode}</FormDescription>
                ) : null}
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
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] p-4">
              <FormControl>
                <input
                  type="checkbox"
                  checked={Boolean(field.value)}
                  onChange={(event) => field.onChange(event.target.checked)}
                  className="mt-0.5 size-5 cursor-pointer"
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

        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="submit" disabled={pending} className="min-h-10 cursor-pointer px-4 text-sm">
            {pending ? labels.saving : labels.save}
          </Button>
          {onCancel ? (
            <Button type="button" variant="secondary" onClick={onCancel} className="min-h-10 cursor-pointer px-4 text-sm">
              {labels.cancel}
            </Button>
          ) : null}
        </div>
      </form>
    </Form>
  );
}
