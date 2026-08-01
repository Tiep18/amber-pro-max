'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export type RecheckTiming = {
  cooldownMs: number;
  pollIntervalMs: number;
  pollWindowMs: number;
};

// PayPal settles in seconds after redirect, so poll aggressively for a short
// window. VietQR settlement is a human checking a bank statement — polling
// every five seconds would be pure waste.
export const PAYPAL_RECHECK_TIMING: RecheckTiming = {
  cooldownMs: 5000,
  pollIntervalMs: 5000,
  pollWindowMs: 30000
};
export const VIETQR_RECHECK_TIMING: RecheckTiming = {
  cooldownMs: 15000,
  pollIntervalMs: 60000,
  pollWindowMs: 600000
};

type PaymentRecheckLabels = {
  checkStatus: string;
  checking: string;
  lastChecked: string;
};

export function PaymentStatusRecheck({
  labels,
  timing = PAYPAL_RECHECK_TIMING
}: {
  labels: PaymentRecheckLabels;
  timing?: RecheckTiming;
}) {
  const router = useRouter();
  const [pending, startRefresh] = useTransition();
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  const refreshStatus = useCallback(
    (announce: boolean) => {
      const now = Date.now();
      if (now < cooldownUntil || pending) {
        return;
      }
      setCooldownUntil(now + timing.cooldownMs);
      startRefresh(() => router.refresh());
      if (announce) {
        setLastCheckedAt(new Date(now));
      }
    },
    [cooldownUntil, pending, router, startRefresh, timing.cooldownMs]
  );

  useEffect(() => {
    startedAtRef.current = Date.now();
    const interval = window.setInterval(() => {
      const startedAt = startedAtRef.current;
      if (!startedAt || Date.now() - startedAt > timing.pollWindowMs) {
        window.clearInterval(interval);
        return;
      }
      if (document.visibilityState === 'visible') {
        refreshStatus(false);
      }
    }, timing.pollIntervalMs);

    return () => window.clearInterval(interval);
  }, [refreshStatus, timing.pollIntervalMs, timing.pollWindowMs]);

  return (
    <div className="grid gap-2" aria-busy={pending}>
      <Button
        variant="secondary"
        disabled={pending || Date.now() < cooldownUntil}
        onClick={() => refreshStatus(true)}
      >
        {pending ? labels.checking : labels.checkStatus}
      </Button>
      {lastCheckedAt ? (
        <p className="text-sm text-[var(--muted-foreground)]" aria-live="polite">
          {labels.lastChecked}: {lastCheckedAt.toLocaleTimeString()}
        </p>
      ) : null}
    </div>
  );
}
