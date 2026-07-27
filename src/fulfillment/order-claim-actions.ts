'use server';

import { claimGuestOrderAction, type ClaimGuestOrderResult } from '@/fulfillment/order-claim';

export type ClaimGuestOrderPanelState = ClaimGuestOrderResult | null;

export async function claimGuestOrderFromPanelAction(
  _previousState: ClaimGuestOrderPanelState,
  formData: FormData
): Promise<ClaimGuestOrderPanelState> {
  return claimGuestOrderAction(formData);
}
