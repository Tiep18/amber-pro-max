'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {useCart} from '@/components/cart/cart-provider';
import {clearOrderSnapshot, readOrderSnapshot} from '@/cart/order-snapshot';
import {Alert, AlertTitle} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {
  getOrderRecoveryAction,
  type OrderSnapshotEligibility
} from '@/payments/order-recovery';
import type {CustomerPaymentLifecycleStatus} from '@/payments/status';

type OrderRecoveryBannerLabels = {
  heading: string;
  body: string;
  restore: string;
  restoring: string;
  unavailable: string;
  browse?: string;
};

export function OrderRecoveryBanner({
  orderNumber,
  recoverable,
  paid,
  status,
  cartHref,
  catalogHref,
  labels
}: {
  orderNumber: string;
  recoverable: boolean;
  paid: boolean;
  status?: CustomerPaymentLifecycleStatus;
  cartHref: string;
  catalogHref?: string;
  labels: OrderRecoveryBannerLabels;
}) {
  const {restoreOrderSnapshot} = useCart();
  const router = useRouter();
  const [snapshotEligibility, setSnapshotEligibility] = useState<OrderSnapshotEligibility>('unknown');
  const [restoring, setRestoring] = useState(false);
  const recoveryStatus = status ?? (paid ? 'paid' : recoverable ? 'failed' : 'awaiting_payment');
  const action = useMemo(
    () => getOrderRecoveryAction({status: recoveryStatus, snapshotEligibility}),
    [recoveryStatus, snapshotEligibility]
  );
  const resolvedCatalogHref =
    catalogHref ?? (cartHref.startsWith('/vi/') ? '/vi/cua-hang' : '/en/catalog');

  useEffect(() => {
    if (paid) {
      clearOrderSnapshot(orderNumber);
      setSnapshotEligibility('ineligible');
      return;
    }
    if (recoverable) {
      setSnapshotEligibility(readOrderSnapshot(orderNumber) ? 'eligible' : 'ineligible');
    }
  }, [orderNumber, paid, recoverable]);

  if (paid || !recoverable) {
    return null;
  }

  async function handleRestore() {
    setRestoring(true);
    const restored = await restoreOrderSnapshot(orderNumber);
    if (restored) {
      router.push(cartHref);
      return;
    }
    setRestoring(false);
    setSnapshotEligibility('ineligible');
  }

  if (action?.kind === 'browse_catalog') {
    return (
      <Alert variant="warning" className="grid gap-3">
        <p>{labels.unavailable}</p>
        <Link
          href={resolvedCatalogHref}
          className="inline-flex min-h-11 w-fit items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent)] px-4 py-2 text-base font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
        >
          {labels.browse ?? labels.unavailable}
        </Link>
      </Alert>
    );
  }

  if (action?.kind !== 'restore_cart') {
    return null;
  }

  return (
    <Alert variant="warning" className="grid gap-3">
      <div>
        <AlertTitle>{labels.heading}</AlertTitle>
        <p>{labels.body}</p>
      </div>
      <Button
        type="button"
        variant="primary"
        className="w-fit"
        disabled={restoring}
        aria-busy={restoring}
        onClick={() => void handleRestore()}
      >
        {restoring ? labels.restoring : labels.restore}
      </Button>
    </Alert>
  );
}
