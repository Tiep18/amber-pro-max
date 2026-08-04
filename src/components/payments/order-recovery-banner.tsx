'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {useCart} from '@/components/cart/cart-provider';
import {clearOrderSnapshot, readOrderSnapshot} from '@/cart/order-snapshot';
import {Alert} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {
  getOrderRecoveryAction,
  type OrderSnapshotEligibility
} from '@/payments/order-recovery';
import type {CustomerPaymentLifecycleStatus} from '@/payments/status';

type OrderRecoveryBannerLabels = {
  restore: string;
  restoring: string;
  unavailable: string;
  browse?: string;
};

export function OrderRecoveryBanner({
  orderNumber,
  paid,
  status,
  cartHref,
  catalogHref,
  labels
}: {
  orderNumber: string;
  paid: boolean;
  status: CustomerPaymentLifecycleStatus;
  cartHref: string;
  catalogHref?: string;
  labels: OrderRecoveryBannerLabels;
}) {
  const {restoreOrderSnapshot} = useCart();
  const router = useRouter();
  const [snapshotEligibility, setSnapshotEligibility] = useState<OrderSnapshotEligibility>('unknown');
  const [restoring, setRestoring] = useState(false);
  const action = useMemo(
    () => getOrderRecoveryAction({status, snapshotEligibility}),
    [status, snapshotEligibility]
  );
  const resolvedCatalogHref =
    catalogHref ?? (cartHref.startsWith('/vi/') ? '/vi/cua-hang' : '/en/catalog');

  useEffect(() => {
    if (paid) {
      clearOrderSnapshot(orderNumber);
      setSnapshotEligibility('ineligible');
      return;
    }
    if (getOrderRecoveryAction({status, snapshotEligibility: 'eligible'})) {
      setSnapshotEligibility(readOrderSnapshot(orderNumber) ? 'eligible' : 'ineligible');
    }
  }, [orderNumber, paid, status]);

  if (paid || !getOrderRecoveryAction({status, snapshotEligibility: 'eligible'})) {
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
