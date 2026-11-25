'use server';

import { requireUser } from '@/auth/guards';
import type { ClaimGuestOrderResult } from '@/order-access/order-access';
import { createServerOrderAccess } from '@/order-access/server';

export type ClaimGuestOrderPanelState = ClaimGuestOrderResult | null;

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

export async function claimGuestOrderAction(
  formData: FormData
): Promise<ClaimGuestOrderResult> {
  const locale = formString(formData, 'locale') === 'vi' ? 'vi' : 'en';
  const orderNumber = formString(formData, 'orderNumber');
  const claimPath =
    '/' +
    locale +
    '/' +
    (locale === 'vi' ? 'don-hang' : 'orders') +
    '/' +
    encodeURIComponent(orderNumber) +
    '/claim';
  const user = await requireUser({ locale, next: claimPath });
  return createServerOrderAccess().claimGuestOrder({
    orderNumber,
    rawToken: formString(formData, 'token'),
    user: { id: user.id, email: user.email }
  });
}

export async function claimGuestOrderFromPanelAction(
  _previousState: ClaimGuestOrderPanelState,
  formData: FormData
): Promise<ClaimGuestOrderPanelState> {
  return claimGuestOrderAction(formData);
}
