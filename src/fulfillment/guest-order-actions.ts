'use server';

import {
  requestGuestOrderClaimEmailWithAdminClient,
  requestGuestOrderReopenWithAdminClient,
  type GuestReopenResult
} from '@/fulfillment/order-claim';

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

export async function requestGuestOrderReopenAction(formData: FormData): Promise<GuestReopenResult> {
  return requestGuestOrderReopenWithAdminClient({
    orderNumber: formString(formData, 'orderNumber'),
    email: formString(formData, 'email'),
    locale: formString(formData, 'locale') === 'vi' ? 'vi' : 'en'
  });
}

export async function requestGuestOrderClaimEmailAction(formData: FormData): Promise<GuestReopenResult> {
  return requestGuestOrderClaimEmailWithAdminClient({
    orderNumber: formString(formData, 'orderNumber'),
    email: formString(formData, 'email'),
    locale: formString(formData, 'locale') === 'vi' ? 'vi' : 'en'
  });
}
