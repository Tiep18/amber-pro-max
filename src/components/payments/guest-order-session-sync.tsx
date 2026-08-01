'use client';

import {useEffect} from 'react';
import {acknowledgeGuestCheckoutRecoveryAction, refreshGuestOrderAccessCookieAction} from '@/checkout/actions';

export function GuestOrderSessionSync({orderNumber, paid}: {orderNumber: string; paid: boolean}) {
  useEffect(() => {
    void acknowledgeGuestCheckoutRecoveryAction(orderNumber);
  }, [orderNumber]);

  useEffect(() => {
    if (paid) {
      void refreshGuestOrderAccessCookieAction(orderNumber);
    }
  }, [orderNumber, paid]);

  return null;
}
