'use server';

import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {parseCustomerShippingAddressInput} from '@/account/addresses';
import {requireUser} from '@/auth/guards';
import type {Locale} from '@/i18n/routing';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {runMonitoredAction} from '@/operations/monitoring';

type RpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
};

const addressIdSchema = z.string().uuid();

export type AddressActionState =
  | {status: 'idle'}
  | {status: 'saved'; addressId: string}
  | {status: 'deleted'}
  | {status: 'default_set'}
  | {status: 'not_found'}
  | {status: 'invalid'; code: 'invalid_address' | 'invalid_address_id'}
  | {status: 'error'; code: 'address_action_failed'};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function localeFromForm(formData: FormData): Locale {
  return formData.get('locale') === 'en' ? 'en' : 'vi';
}

function addressPath(locale: Locale) {
  return locale === 'vi' ? '/vi/tai-khoan/dia-chi' : '/en/account/addresses';
}

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : undefined;
}

function formAddressInput(formData: FormData) {
  return {
    label: formValue(formData, 'label'),
    recipientName: formValue(formData, 'recipientName'),
    phoneNumber: formValue(formData, 'phoneNumber'),
    countryCode: formValue(formData, 'countryCode'),
    region: formValue(formData, 'region'),
    locality: formValue(formData, 'locality'),
    addressLine1: formValue(formData, 'addressLine1'),
    addressLine2: formValue(formData, 'addressLine2'),
    postalCode: formValue(formData, 'postalCode'),
    isDefault: formData.get('isDefault') === 'on'
  };
}

function actionStatus(data: unknown): string | null {
  return isRecord(data) && typeof data.status === 'string' ? data.status : null;
}

type AddressMutationAction = 'save' | 'delete' | 'set_default';

function addressActionName(action: AddressMutationAction) {
  return `address_${action === 'set_default' ? 'default' : action}`;
}

function addressFailureCode(action: AddressMutationAction) {
  return `account.address.${action === 'set_default' ? 'default' : action}_failed`;
}

export async function saveCustomerShippingAddress({
  addressId,
  input,
  client
}: {
  addressId: string | null;
  input: unknown;
  client: RpcClient;
}): Promise<AddressActionState> {
  const parsedAddress = parseCustomerShippingAddressInput(input);
  if (!parsedAddress.success) {
    return {status: 'invalid', code: 'invalid_address'};
  }
  if (addressId !== null && !addressIdSchema.safeParse(addressId).success) {
    return {status: 'invalid', code: 'invalid_address_id'};
  }

  const address = parsedAddress.data;
  let failureStatus: string | null = null;

  return runMonitoredAction({
    area: 'application',
    action: addressActionName('save'),
    errorCode: addressFailureCode('save'),
    summary: 'Customer address save failed',
    facts: {
      referenceId: addressId,
      code: 'address_action_failed'
    },
    errorResult: {status: 'error', code: 'address_action_failed'} as const,
    shouldRecordResult: (result) => result.status === 'error',
    factsFromResult: () => ({status: failureStatus}),
    operation: async () => {
      const {data, error} = await client.rpc('save_customer_shipping_address', {
        p_address_id: addressId,
        p_label: address.label,
        p_recipient_name: address.recipientName,
        p_phone_number: address.phoneNumber,
        p_country_code: address.countryCode,
        p_region: address.region,
        p_locality: address.locality,
        p_address_line_1: address.addressLine1,
        p_address_line_2: address.addressLine2,
        p_postal_code: address.postalCode,
        p_is_default: address.isDefault
      });
      if (error || !isRecord(data)) {
        return {status: 'error', code: 'address_action_failed'} as const;
      }
      if (data.status === 'saved' && typeof data.address_id === 'string') {
        return {status: 'saved', addressId: data.address_id} as const;
      }
      if (data.status === 'not_found') {
        return {status: 'not_found'} as const;
      }
      if (data.status === 'invalid') {
        return {status: 'invalid', code: 'invalid_address'} as const;
      }
      failureStatus = typeof data.status === 'string' ? data.status : null;
      return {status: 'error', code: 'address_action_failed'} as const;
    }
  });
}

export async function deleteCustomerShippingAddress({
  addressId,
  client
}: {
  addressId: string;
  client: RpcClient;
}): Promise<AddressActionState> {
  if (!addressIdSchema.safeParse(addressId).success) {
    return {status: 'invalid', code: 'invalid_address_id'};
  }
  let failureStatus: string | null = null;

  return runMonitoredAction({
    area: 'application',
    action: addressActionName('delete'),
    errorCode: addressFailureCode('delete'),
    summary: 'Customer address delete failed',
    facts: {
      referenceId: addressId,
      code: 'address_action_failed'
    },
    errorResult: {status: 'error', code: 'address_action_failed'} as const,
    shouldRecordResult: (result) => result.status === 'error',
    factsFromResult: () => ({status: failureStatus}),
    operation: async () => {
      const {data, error} = await client.rpc('delete_customer_shipping_address', {p_address_id: addressId});
      if (error) {
        return {status: 'error', code: 'address_action_failed'} as const;
      }
      const status = actionStatus(data);
      if (status === 'deleted') return {status: 'deleted'} as const;
      if (status === 'not_found') return {status: 'not_found'} as const;
      failureStatus = status;
      return {status: 'error', code: 'address_action_failed'} as const;
    }
  });
}

export async function setDefaultCustomerShippingAddress({
  addressId,
  client
}: {
  addressId: string;
  client: RpcClient;
}): Promise<AddressActionState> {
  if (!addressIdSchema.safeParse(addressId).success) {
    return {status: 'invalid', code: 'invalid_address_id'};
  }
  let failureStatus: string | null = null;

  return runMonitoredAction({
    area: 'application',
    action: addressActionName('set_default'),
    errorCode: addressFailureCode('set_default'),
    summary: 'Customer address default failed',
    facts: {
      referenceId: addressId,
      code: 'address_action_failed'
    },
    errorResult: {status: 'error', code: 'address_action_failed'} as const,
    shouldRecordResult: (result) => result.status === 'error',
    factsFromResult: () => ({status: failureStatus}),
    operation: async () => {
      const {data, error} = await client.rpc('set_default_customer_shipping_address', {p_address_id: addressId});
      if (error) {
        return {status: 'error', code: 'address_action_failed'} as const;
      }
      const status = actionStatus(data);
      if (status === 'default_set') return {status: 'default_set'} as const;
      if (status === 'not_found') return {status: 'not_found'} as const;
      failureStatus = status;
      return {status: 'error', code: 'address_action_failed'} as const;
    }
  });
}

async function authenticatedClient(locale: Locale): Promise<RpcClient> {
  await requireUser({locale, next: addressPath(locale)});
  return createSupabaseServerClient() as unknown as RpcClient;
}

function revalidateAddressPages() {
  revalidatePath('/en/account/addresses');
  revalidatePath('/vi/tai-khoan/dia-chi');
}

export async function createCustomerShippingAddressAction(
  _previousState: AddressActionState,
  formData: FormData
): Promise<AddressActionState> {
  const locale = localeFromForm(formData);
  const client = await authenticatedClient(locale);
  const result = await saveCustomerShippingAddress({addressId: null, input: formAddressInput(formData), client});
  if (result.status === 'saved') revalidateAddressPages();
  return result;
}

export async function updateCustomerShippingAddressAction(
  _previousState: AddressActionState,
  formData: FormData
): Promise<AddressActionState> {
  const locale = localeFromForm(formData);
  const client = await authenticatedClient(locale);
  const result = await saveCustomerShippingAddress({
    addressId: formValue(formData, 'addressId') ?? '',
    input: formAddressInput(formData),
    client
  });
  if (result.status === 'saved') revalidateAddressPages();
  return result;
}

export async function deleteCustomerShippingAddressAction(
  _previousState: AddressActionState,
  formData: FormData
): Promise<AddressActionState> {
  const locale = localeFromForm(formData);
  const client = await authenticatedClient(locale);
  const result = await deleteCustomerShippingAddress({addressId: formValue(formData, 'addressId') ?? '', client});
  if (result.status === 'deleted') revalidateAddressPages();
  return result;
}

export async function setDefaultCustomerShippingAddressAction(
  _previousState: AddressActionState,
  formData: FormData
): Promise<AddressActionState> {
  const locale = localeFromForm(formData);
  const client = await authenticatedClient(locale);
  const result = await setDefaultCustomerShippingAddress({addressId: formValue(formData, 'addressId') ?? '', client});
  if (result.status === 'default_set') revalidateAddressPages();
  return result;
}
