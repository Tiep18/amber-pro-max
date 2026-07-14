'use client';

import {useEffect} from 'react';
import {acknowledgeGuestCheckoutRecoveryAction} from '@/checkout/actions';

export function GuestRecoveryAcknowledger({orderNumber}: {orderNumber: string}) {
  useEffect(() => {
    void acknowledgeGuestCheckoutRecoveryAction(orderNumber);
  }, [orderNumber]);
  return null;
}
