'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowRight, ShoppingBag} from 'lucide-react';
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
      <Alert variant="warning" className="grid gap-3 p-4">
        <p className="text-sm font-medium leading-relaxed text-[var(--foreground)]">{labels.unavailable}</p>
        <Link
          href={resolvedCatalogHref}
          className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--accent)] px-5 py-2.5 text-sm font-bold !text-white shadow-sm transition-all hover:bg-[var(--accent-hover)] hover:shadow-md active:scale-95"
        >
          <ShoppingBag className="size-4 text-white" aria-hidden="true" />
          <span className="!text-white">{labels.browse ?? labels.unavailable}</span>
        </Link>
      </Alert>
    );
  }

  if (action?.kind !== 'restore_cart') {
    return null;
  }

  return (
    <Alert variant="warning" className="grid gap-3 p-4">
      <Button
        type="button"
        variant="primary"
        className="min-h-11 w-fit gap-2 bg-[var(--accent)] px-5 text-sm font-bold !text-white hover:bg-[var(--accent-hover)]"
        disabled={restoring}
        aria-busy={restoring}
        onClick={() => void handleRestore()}
      >
        <ArrowRight className="size-4 text-white" aria-hidden="true" />
        <span className="!text-white">{restoring ? labels.restoring : labels.restore}</span>
      </Button>
    </Alert>
  );
}
