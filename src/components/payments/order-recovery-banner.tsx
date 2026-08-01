'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {useCart} from '@/components/cart/cart-provider';
import {clearOrderSnapshot} from '@/cart/order-snapshot';
import {Alert, AlertTitle} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';

type OrderRecoveryBannerLabels = {
  heading: string;
  body: string;
  restore: string;
  restoring: string;
  unavailable: string;
};

export function OrderRecoveryBanner({
  orderNumber,
  recoverable,
  paid,
  cartHref,
  labels
}: {
  orderNumber: string;
  recoverable: boolean;
  paid: boolean;
  cartHref: string;
  labels: OrderRecoveryBannerLabels;
}) {
  const {restoreOrderSnapshot} = useCart();
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'restoring' | 'unavailable'>('idle');

  useEffect(() => {
    if (paid) {
      clearOrderSnapshot(orderNumber);
    }
  }, [orderNumber, paid]);

  if (paid || !recoverable) {
    return null;
  }

  async function handleRestore() {
    setState('restoring');
    const restored = await restoreOrderSnapshot(orderNumber);
    if (restored) {
      router.push(cartHref);
      return;
    }
    setState('unavailable');
  }

  if (state === 'unavailable') {
    return <Alert variant="warning">{labels.unavailable}</Alert>;
  }

  return (
    <Alert variant="warning" className="grid gap-3">
      <div>
        <AlertTitle>{labels.heading}</AlertTitle>
        <p>{labels.body}</p>
      </div>
      <Button
        type="button"
        variant="secondary"
        className="w-fit"
        disabled={state === 'restoring'}
        aria-busy={state === 'restoring'}
        onClick={() => void handleRestore()}
      >
        {state === 'restoring' ? labels.restoring : labels.restore}
      </Button>
    </Alert>
  );
}
